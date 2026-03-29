chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "showLoading") showLoading();
  if (msg.action === "showResult") showResult(msg.prompt);
  if (msg.action === "showError") showError(msg.message);
});

function getPanel() {
  let panel = document.getElementById("__i2p__");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "__i2p__";
    document.body.appendChild(panel);
  }
  return panel;
}

function showLoading() {
  const p = getPanel();
  p.style.cssText = `
    position:fixed;top:20px;right:20px;width:400px;
    background:#0f0f0f;color:#f0f0f0;border-radius:14px;
    box-shadow:0 8px 40px rgba(0,0,0,0.8);z-index:2147483647;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    border:1px solid #2a2a2a;overflow:hidden;
  `;
  p.innerHTML = `
    <div style="padding:13px 16px;background:#111;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
      <span style="font-weight:600;font-size:13px;">✨ Image to Prompt</span>
      <button onclick="document.getElementById('__i2p__').remove()" style="background:none;border:none;color:#666;cursor:pointer;font-size:18px;line-height:1;">×</button>
    </div>
    <div style="padding:20px 16px;display:flex;align-items:center;gap:12px;">
      <div style="width:18px;height:18px;border:2px solid #444;border-top-color:#a78bfa;border-radius:50%;flex-shrink:0;animation:i2pspin 0.7s linear infinite;"></div>
      <span style="color:#888;font-size:13px;">正在分析图片，生成 prompt...</span>
    </div>
    <style>#__i2p__ @keyframes i2pspin{to{transform:rotate(360deg)}}</style>
  `;
  // 单独注入动画
  const style = document.createElement("style");
  style.textContent = "@keyframes i2pspin{to{transform:rotate(360deg)}}";
  style.id = "__i2p_style__";
  if (!document.getElementById("__i2p_style__")) document.head.appendChild(style);
}

function showResult(prompt) {
  const p = getPanel();
  p.innerHTML = `
    <div style="padding:13px 16px;background:#111;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
      <span style="font-weight:600;font-size:13px;">✨ Image to Prompt</span>
      <button onclick="document.getElementById('__i2p__').remove()" style="background:none;border:none;color:#666;cursor:pointer;font-size:18px;line-height:1;">×</button>
    </div>
    <div style="padding:14px 16px;">
      <div id="__i2p_text__" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:12px;font-size:12px;line-height:1.7;color:#d4d4d4;word-break:break-word;max-height:220px;overflow-y:auto;"></div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="__i2p_copy__" style="flex:1;background:#7c3aed;color:#fff;border:none;padding:9px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;">📋 复制 Prompt</button>
        <button onclick="document.getElementById('__i2p__').remove()" style="background:#222;color:#aaa;border:1px solid #333;padding:9px 14px;border-radius:8px;cursor:pointer;font-size:13px;">关闭</button>
      </div>
    </div>
  `;
  document.getElementById("__i2p_text__").textContent = prompt;
  document.getElementById("__i2p_copy__").onclick = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      const btn = document.getElementById("__i2p_copy__");
      if (!btn) return;
      btn.textContent = "✅ 已复制！";
      btn.style.background = "#16a34a";
      setTimeout(() => {
        btn.textContent = "📋 复制 Prompt";
        btn.style.background = "#7c3aed";
      }, 2000);
    });
  };
}

function showError(message) {
  const p = getPanel();
  p.innerHTML = `
    <div style="padding:13px 16px;background:#111;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #222;">
      <span style="font-weight:600;font-size:13px;">✨ Image to Prompt</span>
      <button onclick="document.getElementById('__i2p__').remove()" style="background:none;border:none;color:#666;cursor:pointer;font-size:18px;line-height:1;">×</button>
    </div>
    <div style="padding:14px 16px;">
      <div style="background:#1f0a0a;border:1px solid #5a1a1a;border-radius:8px;padding:12px;font-size:13px;color:#f87171;line-height:1.6;">❌ ${message}</div>
      <button onclick="document.getElementById('__i2p__').remove()" style="margin-top:12px;width:100%;background:#222;color:#aaa;border:1px solid #333;padding:9px;border-radius:8px;cursor:pointer;font-size:13px;">关闭</button>
    </div>
  `;
}
