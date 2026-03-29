// 注册右键菜单
function registerMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "i2p",
      title: "Generate Image Prompt ✨",
      contexts: ["image"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.log("Menu error:", chrome.runtime.lastError);
      } else {
        console.log("✅ Menu registered");
      }
    });
  });
}

registerMenu();
chrome.runtime.onInstalled.addListener(registerMenu);
chrome.runtime.onStartup.addListener(registerMenu);

// 右键点击处理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "i2p") return;
  
  const imageUrl = info.srcUrl;
  console.log("Image URL:", imageUrl);

  // 通知 content script 显示 loading
  chrome.tabs.sendMessage(tab.id, { action: "showLoading" });

  // 获取 API Key
  const result = await chrome.storage.sync.get("apiKey");
  const apiKey = result.apiKey;
  
  if (!apiKey) {
    chrome.tabs.sendMessage(tab.id, { 
      action: "showError", 
      message: "请先点击插件图标，填入 Anthropic API Key" 
    });
    return;
  }

  try {
    // 获取图片 base64
    const imgData = await getImageBase64(imageUrl);
    
    // 调用 Claude
    const prompt = await callClaude(apiKey, imgData.base64, imgData.mediaType);
    
    chrome.tabs.sendMessage(tab.id, { action: "showResult", prompt });
  } catch (err) {
    console.error(err);
    chrome.tabs.sendMessage(tab.id, { 
      action: "showError", 
      message: err.message || "生成失败，请重试" 
    });
  }
});

async function getImageBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("无法获取图片（可能有跨域限制）");
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  const mediaType = contentType.split(";")[0].trim();
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return { base64: btoa(str), mediaType };
}

async function callClaude(apiKey, base64, mediaType) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 }
          },
          {
            type: "text",
            text: "Analyze this image and generate a detailed image-to-image prompt for AI tools like Midjourney or Stable Diffusion. Include: subject, composition, art style, lighting, colors, camera details, quality modifiers. Output ONLY the prompt, no explanations. Write in English."
          }
        ]
      }]
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error?.message || `API Error ${resp.status}`);
  }
  const data = await resp.json();
  return data.content[0].text;
}
