chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "image-to-prompt",
    title: "Generate Image Prompt ✨",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "image-to-prompt") return;

  const imageUrl = info.srcUrl;
  if (!imageUrl) return;

  // 注入 content script 并显示 loading 面板
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: showLoadingPanel
  });

  // 获取 API Key
  const { apiKey } = await chrome.storage.sync.get("apiKey");
  if (!apiKey) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showError,
      args: ["请先在插件设置中填入 Anthropic API Key"]
    });
    return;
  }

  try {
    // 将图片转为 base64
    const imageData = await fetchImageAsBase64(imageUrl);
    
    // 调用 Claude API
    const prompt = await callClaude(apiKey, imageData.base64, imageData.mediaType);
    
    // 显示结果
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showResult,
      args: [prompt]
    });
  } catch (err) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showError,
      args: [err.message || "生成失败，请检查 API Key 或网络"]
    });
  }
});

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("无法获取图片");
  
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const mediaType = contentType.split(";")[0].trim();
  
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  return { base64, mediaType };
}

async function callClaude(apiKey, base64, mediaType) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64
              }
            },
            {
              type: "text",
              text: `Analyze this image and generate a detailed image-to-image prompt for AI image generation tools like Midjourney, Stable Diffusion, or DALL-E.

The prompt should include:
- Subject and composition
- Art style and medium
- Lighting and atmosphere
- Colors and tones
- Camera/perspective details (if applicable)
- Quality modifiers

Output ONLY the prompt text, no explanations or extra commentary. Write in English.`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── Content script functions (injected into page) ──────────────────────────

function showLoadingPanel() {
  const existing = document.getElementById("__i2p_panel__");
  if (existing) existing.remove();

  const panel = document.createElement("div");
  panel.id = "__i2p_panel__";
  panel.style.cssText = `
    position: fixed; top: 20px; right: 20px; width: 420px;
    background: #0f0f0f; color: #f0f0f0;
    border-radius: 14px; box-shadow: 0 8px 40px rgba(0,0,0,0.7);
    z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    overflow: hidden; border: 1px solid #2a2a2a;
  `;
  panel.innerHTML = `
    <div style="padding:14px 16px;background:#111;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
      <div style="font-weight:600;font-size:13px;">✨ Image to Prompt</div>
      <button onclick="document.getElementById('__i2p_panel__').remove()" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:0;">✕</button>
    </div>
    <div style="padding:24px;display:flex;align-items:center;gap:12px;">
      <div style="width:20px;height:20px;border:2px solid #444;border-top-color:#a78bfa;border-radius:50%;animation:__i2p_spin__ 0.8s linear infinite;flex-shrink:0;"></div>
      <span style="color:#888;font-size:13px;">正在分析图片，生成 prompt...</span>
    </div>
    <style>@keyframes __i2p_spin__ { to { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(panel);
}

function showResult(prompt) {
  const panel = document.getElementById("__i2p_panel__");
  if (!panel) return;

  panel.innerHTML = `
    <div style="padding:14px 16px;background:#111;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
      <div style="font-weight:600;font-size:13px;">✨ Image to Prompt</div>
      <button onclick="document.getElementById('__i2p_panel__').remove()" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:0;">✕</button>
    </div>
    <div style="padding:16px;">
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:12px;font-size:12px;line-height:1.7;color:#d4d4d4;word-break:break-word;max-height:240px;overflow-y:auto;">
        ${prompt.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
      </div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="__i2p_copy__" style="flex:1;background:#7c3aed;color:#fff;border:none;padding:9px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;">复制 Prompt</button>
        <button onclick="document.getElementById('__i2p_panel__').remove()" style="background:#2a2a2a;color:#ccc;border:none;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;">关闭</button>
      </div>
    </div>
    <style>@keyframes __i2p_spin__ { to { transform: rotate(360deg); } }</style>
  `;

  document.getElementById("__i2p_copy__").addEventListener("click", () => {
    navigator.clipboard.writeText(prompt).then(() => {
      const btn = document.getElementById("__i2p_copy__");
      btn.textContent = "✓ 已复制！";
      btn.style.background = "#16a34a";
      setTimeout(() => {
        btn.textContent = "复制 Prompt";
        btn.style.background = "#7c3aed";
      }, 2000);
    });
  });
}

function showError(message) {
  const panel = document.getElementById("__i2p_panel__");
  if (!panel) return;

  panel.innerHTML = `
    <div style="padding:14px 16px;background:#111;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
      <div style="font-weight:600;font-size:13px;">✨ Image to Prompt</div>
      <button onclick="document.getElementById('__i2p_panel__').remove()" style="background:none;border:none;color:#888;cursor:pointer;font-size:16px;padding:0;">✕</button>
    </div>
    <div style="padding:16px;">
      <div style="background:#2a1515;border:1px solid #5a2020;border-radius:8px;padding:12px;font-size:13px;color:#f87171;">
        ❌ ${message}
      </div>
      <button onclick="document.getElementById('__i2p_panel__').remove()" style="margin-top:12px;width:100%;background:#2a2a2a;color:#ccc;border:none;padding:9px;border-radius:8px;cursor:pointer;font-size:13px;">关闭</button>
    </div>
  `;
}
