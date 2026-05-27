import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Flag,
  Github,
  ScanText,
  Loader2,
  AlertTriangle,
  Cpu,
  Clock,
  BookOpen,
  Trophy,
  Flame,
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import Tesseract from "tesseract.js";

import RecentScams from "./components/RecentScams";
import ReportModal from "./components/ReportModal";
import RedFlags from "./components/RedFlags";
import QuizWidget from "./components/QuizWidget";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Report Modal States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("create"); // 'create' | 'view'
  const [reports, setReports] = useState([
    {
      id: 1,
      text: "Mobil di atas 1.400 cc Dilarang Beli Pertalite per 1 Juni 2026",
      category: "POLITIK",
      status: "HOAX",
      date: "27 Mei 2026",
    },
    {
      id: 2,
      text: "Bansos Kemensos Rp 150 Juta Cair lewat klik link whatsapp-bansos.xyz",
      category: "PENIPUAN",
      status: "HOAX",
      date: "27 Mei 2026",
    },
    {
      id: 3,
      text: "Pemenang undian gratis kuota 100GB dari provider telekomunikasi resmi",
      category: "PENIPUAN",
      status: "HOAX",
      date: "26 Mei 2026",
    },
    {
      id: 4,
      text: "Restorasi terumbu karang laut Jawa oleh KLHK berjalan sukses",
      category: "KESEHATAN",
      status: "FAKTA",
      date: "25 Mei 2026",
    },
  ]);

  // Tabs State (Main Detector)
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'image'
  const [selectedImage, setSelectedImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  // Sidebar Tab State
  const [activeSidebarTab, setActiveSidebarTab] = useState("trends"); // 'trends' | 'quiz'

  // Stats State (Interactive feature)
  const [totalScannedWords, setTotalScannedWords] = useState(1480);
  const [scanSpeed, setScanSpeed] = useState(0.42);

  const handlePredict = async (textToAnalyze = inputText) => {
    if (!textToAnalyze?.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Calculate words count for statistics
    const wordCount = textToAnalyze.trim().split(/\s+/).length;
    const startTime = performance.now();

    try {
      const response = await axios.post("/api/predict", {
        text: textToAnalyze,
      });
      setResult(response.data);

      // Update statistics live
      setTotalScannedWords((prev) => prev + wordCount);
      const endTime = performance.now();
      setScanSpeed(parseFloat(((endTime - startTime) / 1000).toFixed(2)));
    } catch (err) {
      console.error(err);
      setError("Koneksi gagal. Backend Flask tidak merespon.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleScanImage = async () => {
    if (!selectedImage) return;
    setOcrLoading(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(
        selectedImage,
        "ind", // Indonesian language
        {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrProgress(parseInt(m.progress * 100));
            }
          },
        }
      );

      const extractedText = result.data.text;
      if (!extractedText.trim()) {
        setError("Teks tidak terbaca dari gambar. Gunakan gambar yang lebih jelas.");
        setOcrLoading(false);
        return;
      }

      setInputText(extractedText);
      setActiveTab("text");
      setOcrLoading(false);

      // Auto predict
      handlePredict(extractedText);
    } catch (err) {
      console.error(err);
      setError("Gagal memindai gambar. Silakan coba lagi.");
      setOcrLoading(false);
    }
  };

  const handleAddReport = (text, category) => {
    const newReport = {
      id: Date.now(),
      text,
      category,
      status: "HOAX", // Default status for user submitted report
      date: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const openReportModal = (tab = "create") => {
    setActiveModalTab(tab);
    setIsReportOpen(true);
  };

  return (
    <div className="min-h-screen text-[#18181b] p-4 md:p-6 bg-[#f5f4ef] flex flex-col items-center justify-start gap-4">
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reports={reports}
        onAddReport={handleAddReport}
        activeModalTab={activeModalTab}
        setActiveModalTab={setActiveModalTab}
      />

      {/* 📰 FAKE NEWS LIVE TICKER */}
      <div className="w-full max-w-6xl brutalist-card bg-[#18181b] text-white py-2 px-4 overflow-hidden relative flex items-center shadow-[3px_3px_0px_rgba(0,0,0,0.15)]">
        <div className="bg-rose-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 z-10 mr-4 border border-white/20 shrink-0">
          KAWAT BERITA / HOAX TERHANGAT:
        </div>
        <div className="flex-1 overflow-hidden relative h-4 font-mono text-[10px] uppercase tracking-wider">
          <div className="absolute whitespace-nowrap animate-marquee flex gap-12">
            <span>[SIAGA] HOAX pembatasan pembelian BBM subsidi per 1 Juni 2026 adalah salah •</span>
            <span>[FINANCE] HOAX BLT modal usaha UMKM mengatasnamakan Bank Indonesia •</span>
            <span>[HEALTH] HOAX pengobatan gratis BPJS dengan mendaftar di link luar •</span>
            <span>[SIAGA] Lindungi data pribadi anda, jangan klik tautan hadiah tidak dikenal •</span>
          </div>
        </div>
      </div>

      {/* 📰 HEADER & BRANDING */}
      <header className="w-full max-w-6xl brutalist-card bg-white p-5 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
        {/* Stamp Decoration */}
        <div className="absolute -right-6 -top-6 w-20 h-20 border-4 border-dashed border-black/10 rounded-full flex items-center justify-center rotate-12 select-none pointer-events-none">
          <span className="text-[10px] text-black/15 font-bold font-mono">VERIFIED</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-900 rounded-lg p-2.5 flex items-center justify-center border border-zinc-800 shrink-0">
            <img
              src="/assets/img/logo.png"
              alt="Logo"
              className="w-full h-full object-contain filter invert"
            />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-[#18181b] leading-tight">
              FaktaNesia.
            </h1>
            <p className="text-slate-500 text-[10px] md:text-xs font-mono leading-relaxed mt-0.5">
              [ ANTI-HOAX ENGINE ] - Klasifikasi Teks TF-IDF &amp; Heuristic Booster
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 font-mono text-xs w-full md:w-auto justify-start md:justify-end">
          <button
            onClick={() => openReportModal("create")}
            className="btn-brutal-solid px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]"
          >
            <Flag size={14} /> LAPORKAN HOAX
          </button>
          <a
            href="https://github.com/Rangga11268/FaktaNesia"
            target="_blank"
            className="btn-brutal-outline px-4 py-2.5 flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-black shrink-0"
          >
            <Github size={14} /> CONTRIBUTE
          </a>
        </div>
      </header>

      {/* 2-COLUMN MAIN CONTENT LAYOUT */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Main Detector (8 cols) */}
        <div className="md:col-span-8 flex flex-col gap-6">
          <div className="brutalist-card p-6 md:p-8 min-h-[460px] flex flex-col relative overflow-hidden bg-white">
            {/* Header with Clipper Tabs */}
            <div className="flex justify-between items-center mb-6 border-b-2 border-black/10 pb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "flex items-center gap-2 font-heading px-4 py-1.5 transition text-base border-2 font-bold",
                    activeTab === "text"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "text-slate-500 border-transparent hover:text-black"
                  )}
                >
                  <Search size={16} /> Arsip Teks
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={cn(
                    "flex items-center gap-2 font-heading px-4 py-1.5 transition text-base border-2 font-bold",
                    activeTab === "image"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "text-slate-500 border-transparent hover:text-black"
                  )}
                >
                  <ScanText size={16} /> Pindai Gambar
                </button>
              </div>

              <div className="hidden sm:flex gap-1.5 font-mono text-[10px] text-slate-600 bg-slate-100 px-2.5 py-1 border border-black/5">
                STATUS: ONLINE
              </div>
            </div>

            <div className="relative flex-1 flex flex-col justify-between">
              {activeTab === "text" ? (
                <>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Tempel naskah berita, pesan berantai, atau judul artikel yang mencurigakan di sini..."
                    className="input-brutal w-full p-4 text-xs resize-none placeholder:text-slate-400 min-h-[160px] flex-1"
                  />

                  {/* RedFlags triggered keywords component */}
                  {result && result.triggers && (
                    <div className="mt-4">
                      <RedFlags triggers={result.triggers} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-6">
                    {/* Bold Brutalist Verdict Stamp */}
                    {result ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "sm:col-span-7 border-2.5 p-3 flex items-center justify-between gap-4 font-mono select-none relative overflow-hidden",
                          result.is_hoax
                            ? "bg-rose-50 border-rose-600 text-rose-700 shadow-[3px_3px_0px_#e11d48]"
                            : "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-[3px_3px_0px_#059669]"
                        )}
                      >
                        {/* Stamp texture overlay */}
                        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000_1px,transparent_1px)] bg-[size:3px_3px]" />

                        <div className="relative z-10">
                          <span className="text-[9px] block font-bold uppercase tracking-widest opacity-80">
                            VERDIK SISTEM
                          </span>
                          <span className="font-heading text-2xl font-black italic tracking-tighter uppercase block leading-none mt-1">
                            {result.is_hoax ? "DUSTA / HOAX" : "ABSAH / FAKTA"}
                          </span>
                        </div>
                        <div className="relative z-10 shrink-0">
                          {result.is_hoax ? (
                            <ShieldAlert size={30} className="text-rose-600" />
                          ) : (
                            <ShieldCheck size={30} className="text-emerald-600" />
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="hidden sm:block sm:col-span-7 border border-dashed border-black/15 rounded p-3 flex items-center justify-center text-xs text-slate-500 font-mono bg-slate-50">
                        Belum ada analisis dilakukan.
                      </div>
                    )}

                    <button
                      onClick={() => handlePredict()}
                      disabled={loading || !inputText}
                      className="sm:col-span-5 btn-brutal-solid py-3 flex items-center justify-center gap-2 text-xs leading-none disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          MEMINDAI...
                        </>
                      ) : (
                        "VERIFIKASI"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* IMAGE TAB CONTENT */
                <div className="flex flex-col h-full items-center justify-center border-2 border-dashed border-black/10 bg-slate-50 p-6 min-h-[250px] relative">
                  {selectedImage ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="relative max-h-48 rounded border border-black/10 mb-4 overflow-hidden bg-black/5">
                        <img
                          src={selectedImage}
                          alt="Upload"
                          className="max-h-48 object-contain mx-auto"
                        />

                        {/* Brutalist Scanning Effect */}
                        {ocrLoading && (
                          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center font-mono">
                            <Loader2 className="animate-spin text-black mb-2" size={30} />
                            <div className="text-black font-bold text-xs tracking-widest">
                              OCR SCANNING...
                            </div>
                            <div className="text-slate-600 text-[10px] mt-1">
                              PROSES: {ocrProgress}%
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full font-mono text-xs">
                        <label
                          className={cn(
                            "btn-brutal-outline py-2 flex items-center justify-center cursor-pointer transition text-center",
                            ocrLoading && "opacity-50 pointer-events-none"
                          )}
                        >
                          GANTI
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>

                        <button
                          onClick={handleScanImage}
                          disabled={ocrLoading}
                          className="btn-brutal-solid py-2 flex items-center justify-center gap-2"
                        >
                          <ScanText size={14} />
                          PINDAI &amp; ANALISIS
                        </button>
                      </div>

                      <p className="text-[9px] text-slate-500 mt-3 text-center font-mono max-w-xs">
                        Teks di dalam tangkapan layar akan diekstrak otomatis dan dialihkan ke penganalisis kebenaran AI.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center font-mono">
                      <div className="w-12 h-12 bg-black/5 border border-black/10 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <ScanText size={20} />
                      </div>
                      <h3 className="font-heading text-base font-bold text-slate-700">
                        Pindai Kliping / Gambar
                      </h3>
                      <p className="text-slate-500 text-[10px] mb-4 max-w-xs mx-auto leading-relaxed">
                        Unggah tangkapan layar berita medsos atau pesan WA. Sistem akan membaca teks gambar tersebut secara instan.
                      </p>
                      <label className="btn-brutal-solid px-5 py-2 cursor-pointer inline-block text-[11px] font-bold">
                        PILIH GAMBAR
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Error Toast */}
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-rose-50 border border-rose-500 text-rose-700 px-4 py-2 text-xs font-mono shadow-xl flex items-center gap-2 z-50">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (4 cols) */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="brutalist-card bg-white flex flex-col relative overflow-hidden h-full min-h-[460px]">
            {/* Sidebar Tabs */}
            <div className="flex border-b-2 border-black/10 font-mono text-xs">
              <button
                onClick={() => setActiveSidebarTab("trends")}
                className={cn(
                  "flex-1 py-3 text-center font-bold border-r-2 border-black/10 flex items-center justify-center gap-1.5 transition",
                  activeSidebarTab === "trends"
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-500 hover:bg-slate-50"
                )}
              >
                <Flame size={14} /> Tren &amp; Metrik
              </button>
              <button
                onClick={() => setActiveSidebarTab("quiz")}
                className={cn(
                  "flex-1 py-3 text-center font-bold flex items-center justify-center gap-1.5 transition",
                  activeSidebarTab === "quiz"
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-500 hover:bg-slate-50"
                )}
              >
                <Trophy size={14} /> Kuis Hoax
              </button>
            </div>

            {/* Tab Panels */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              {activeSidebarTab === "trends" ? (
                <div className="flex flex-col gap-5 flex-1 justify-between">
                  <RecentScams onReportClick={openReportModal} />

                  {/* 📊 REAL-TIME AI SCAN STATS */}
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-black/10 flex flex-col font-mono text-[10px] text-slate-600 gap-2.5">
                    <h3 className="font-heading text-xs font-bold text-zinc-900 uppercase flex items-center gap-1.5">
                      <Cpu size={12} className="text-blue-600" /> Metrik Analisis AI
                    </h3>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div className="border-2 border-black p-2 bg-[#f5f4ef]/50 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-bold text-slate-400">AKURASI</span>
                        <span className="font-bold text-[10px] text-emerald-700 mt-0.5">99.22%</span>
                      </div>
                      <div className="border-2 border-black p-2 bg-[#f5f4ef]/50 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-bold text-slate-400">SPEED</span>
                        <span className="font-bold text-[10px] text-zinc-900 mt-0.5 flex items-center gap-0.5">
                          <Clock size={8} /> {scanSpeed}s
                        </span>
                      </div>
                      <div className="border-2 border-black p-2 bg-[#f5f4ef]/50 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-bold text-slate-400">KATA</span>
                        <span className="font-bold text-[10px] text-zinc-900 mt-0.5 flex items-center gap-0.5">
                          <BookOpen size={8} /> {totalScannedWords}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <QuizWidget />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full max-w-6xl mt-6 brutalist-card bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-slate-500 shadow-[3px_3px_0px_#18181b]">
        <div>
          <span>© 2026 FAKTANESIA GAZETTE. HAK CIPTA DILINDUNGI.</span>
          <span className="hidden sm:inline mx-2 text-slate-300">|</span>
          <span className="block sm:inline mt-1 sm:mt-0">SISTEM ANALISIS MULTI-KLASIFIKASI AI</span>
        </div>
        <div className="flex gap-4">
          <span className="border-b border-[#18181b] pb-0.5">TF-IDF BOOSTER v1.4</span>
          <span className="border-b border-[#18181b] pb-0.5">EST. 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
