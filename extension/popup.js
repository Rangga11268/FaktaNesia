const LOCAL_API = "http://127.0.0.1:5001/predict";
const PROD_API = "https://darell123-faktanesia-backend.hf.space/predict";

document.addEventListener("DOMContentLoaded", () => {
  const inputTextEl = document.getElementById("inputText");
  const scanBtn = document.getElementById("scanBtn");
  const loader = document.getElementById("loader");
  const errorBox = document.getElementById("errorBox");
  const resultBox = document.getElementById("resultBox");
  const verdictStamp = document.getElementById("verdictStamp");
  const verdictMeta = document.getElementById("verdictMeta");
  const verdictTitle = document.getElementById("verdictTitle");
  const explanationText = document.getElementById("explanationText");
  const aiSource = document.getElementById("aiSource");

  // Try to automatically grab selection text from the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => window.getSelection().toString()
      }, (results) => {
        if (results && results[0] && results[0].result) {
          const selectedText = results[0].result.trim();
          if (selectedText) {
            inputTextEl.value = selectedText;
          }
        }
      });
    }
  });

  scanBtn.addEventListener("click", async () => {
    const text = inputTextEl.value.trim();
    if (!text) {
      showError("Tuliskan atau tempel teks terlebih dahulu.");
      return;
    }

    // Reset UI states
    errorBox.style.display = "none";
    resultBox.style.display = "none";
    loader.style.display = "block";
    scanBtn.disabled = true;

    try {
      let response;
      try {
        response = await fetch(LOCAL_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
      } catch (err) {
        console.warn("Local server not running, trying production HF Space...");
        response = await fetch(PROD_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      loader.style.display = "none";
      scanBtn.disabled = false;

      // Display results
      displayResult(data);

    } catch (error) {
      console.error(error);
      loader.style.display = "none";
      scanBtn.disabled = false;
      showError("Koneksi gagal. Pastikan backend server aktif.");
    }
  });

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
    resultBox.style.display = "none";
  }

  function displayResult(data) {
    const isHoax = data.is_hoax;
    
    // Set Stamp classes
    verdictStamp.className = "verdict-stamp " + (isHoax ? "hoax" : "real");
    
    // Set text labels
    const catText = data.category ? ` • KATEGORI: ${data.category.toUpperCase()}` : "";
    verdictMeta.textContent = `VERDIK SISTEM${catText}`;
    verdictTitle.textContent = isHoax ? "DUSTA / HOAX" : "ABSAH / FAKTA";
    
    // Explanation
    explanationText.textContent = `"${data.ai_explanation || 'Tidak ada penjelasan detail dari AI.'}"`;
    
    // AI source and confidence
    const confidence = data.confidence_score ? ` (${(data.confidence_score * 100).toFixed(0)}% akurasi)` : "";
    aiSource.textContent = (data.ai_source || "AI Model") + confidence;

    resultBox.style.display = "block";
  }
});
