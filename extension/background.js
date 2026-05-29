const LOCAL_API = "http://127.0.0.1:5001/predict";
const PROD_API = "https://darell123-faktanesia-backend.hf.space/predict";

// 1. Create context menu when installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "cek-faktanesia",
    title: "Cek Fakta di FaktaNesia",
    contexts: ["selection"]
  });
});

// 2. Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "cek-faktanesia") {
    const selectedText = info.selectionText;
    if (!selectedText || !selectedText.trim()) return;

    // Show loading notification
    chrome.notifications.create("faktanesia-loading", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "FaktaNesia sedang memindai...",
      message: "Sedang menganalisis kredibilitas teks yang Anda sorot.",
      priority: 0
    });

    try {
      // Try local server first, fallback to production HF space API
      let response;
      try {
        response = await fetch(LOCAL_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectedText })
        });
      } catch (err) {
        console.warn("Server lokal tidak aktif, mencoba server Hugging Face...");
        response = await fetch(PROD_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: selectedText })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      chrome.notifications.clear("faktanesia-loading");

      // Show result notification
      const isHoax = data.is_hoax;
      const verdict = isHoax ? "⚠️ DUSTA / HOAX" : "🟢 ABSAH / FAKTA";
      const category = data.category ? ` [Kategori: ${data.category}]` : "";
      const confidence = data.confidence_score ? ` (Akurasi: ${(data.confidence_score * 100).toFixed(1)}%)` : "";
      const explanation = data.ai_explanation || "Analisis selesai. Teks terindikasi " + (isHoax ? "Hoax." : "Fakta.");

      chrome.notifications.create("faktanesia-result-" + Date.now(), {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: `${verdict}${category}`,
        message: `${explanation}${confidence}`,
        priority: 2
      });

    } catch (error) {
      console.error(error);
      chrome.notifications.clear("faktanesia-loading");
      chrome.notifications.create("faktanesia-error", {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: "Pindai Gagal",
        message: "Tidak dapat terhubung ke server FaktaNesia. Pastikan backend aktif.",
        priority: 1
      });
    }
  }
});
