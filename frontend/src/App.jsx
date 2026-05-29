import { useState, useEffect } from "react";
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
  FileText,
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import Tesseract from "tesseract.js";

import RecentScams from "./components/RecentScams";
import ReportModal from "./components/ReportModal";
import RedFlags from "./components/RedFlags";
import QuizWidget from "./components/QuizWidget";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";

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

  // Admin States
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem("faktanesia_admin_token") || "";
  });
  const [isAdmin, setIsAdmin] = useState(() => {
    return !!localStorage.getItem("faktanesia_admin_token");
  });

  // Stats State (Interactive feature)
  const [totalScannedWords, setTotalScannedWords] = useState(1480);
  const [totalReportsAnalyses, setTotalReportsAnalyses] = useState(12);
  const [scanSpeed, setScanSpeed] = useState(0.42);
  const [similarReports, setSimilarReports] = useState([]);

  useEffect(() => {
    axios
      .get("/api/public-stats")
      .then((res) => {
        setTotalScannedWords(res.data.total_words);
        setTotalReportsAnalyses(res.data.total_reports);
        setScanSpeed(res.data.avg_speed);
      })
      .catch((e) => console.warn("Gagal memuat statistik publik:", e));
  }, []);

  // Encyclopedia State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("Semua");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotal, setSearchTotal] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);

  const fetchSearchReports = async (pageIndex = 0) => {
    setSearchLoading(true);
    try {
      const limit = 5;
      const offset = pageIndex * limit;
      const response = await axios.get(
        `/api/reports/search?query=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(
          searchCategory
        )}&limit=${limit}&offset=${offset}`
      );
      setSearchResults(response.data.data || []);
      setSearchTotal(response.data.total || 0);
      setSearchPage(pageIndex);
    } catch (err) {
      console.error("Gagal melakukan pencarian aduan:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto trigger search when category changes or when entering tab
  useEffect(() => {
    if (activeTab === "encyclopedia") {
      fetchSearchReports(0);
    }
  }, [activeTab, searchCategory]);

  const handlePredict = async (textToAnalyze = inputText) => {
    if (!textToAnalyze?.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSimilarReports([]);

    // Calculate words count for statistics
    const wordCount = textToAnalyze.trim().split(/\s+/).length;
    const startTime = performance.now();

    try {
      const response = await axios.post("/api/predict", {
        text: textToAnalyze,
      });
      setResult(response.data);

      // Fetch similar reports
      try {
        const simResponse = await axios.get(
          `/api/reports/similar?text=${encodeURIComponent(textToAnalyze)}`
        );
        setSimilarReports(simResponse.data.data || []);
      } catch (simErr) {
        console.error("Gagal memuat aduan serupa:", simErr);
        setSimilarReports([]);
      }

      // Update statistics live
      setTotalScannedWords((prev) => prev + wordCount);
      setTotalReportsAnalyses((prev) => prev + 1);
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

  const handleAdminLogin = (token) => {
    localStorage.setItem("faktanesia_admin_token", token);
    setAdminToken(token);
    setIsAdmin(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("faktanesia_admin_token");
    setAdminToken("");
    setIsAdmin(false);
    setShowAdminLogin(false);
  };

  if (isAdmin) {
    return <AdminDashboard adminToken={adminToken} onLogout={handleAdminLogout} />;
  }

  if (showAdminLogin && !isAdmin) {
    return (
      <div className="min-h-screen text-[#18181b] p-4 md:p-6 bg-[#f5f4ef] flex flex-col items-center justify-center relative">
        <button 
          onClick={() => setShowAdminLogin(false)}
          className="absolute top-6 left-6 font-bold uppercase text-xs border-b-2 border-black hover:-translate-y-0.5 transition-transform"
        >
          ← Kembali ke Detektor
        </button>
        <AdminLogin onLogin={handleAdminLogin} />
      </div>
    );
  }

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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "flex items-center gap-2 font-heading px-4 py-1.5 transition text-base border-2 font-bold",
                    activeTab === "text"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "text-slate-500 border-transparent hover:text-black"
                  )}
                >
                  <Search size={16} /> Pindai Teks
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
                <button
                  onClick={() => setActiveTab("encyclopedia")}
                  className={cn(
                    "flex items-center gap-2 font-heading px-4 py-1.5 transition text-base border-2 font-bold",
                    activeTab === "encyclopedia"
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
                      : "text-slate-500 border-transparent hover:text-black"
                  )}
                >
                  <BookOpen size={16} /> Ensiklopedia Hoax
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
                            VERDIK SISTEM {result.category ? `• KATEGORI: ${result.category.toUpperCase()}` : ""}
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

                  {/* Kominfo Clarification Match Box */}
                  {result && result.komdigi_match && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3.5 border-2 border-black bg-sky-50 text-[11px] font-mono shadow-[2px_2px_0px_rgba(0,0,0,1)] text-left flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-zinc-950">
                        <ShieldCheck size={14} className="text-sky-600" />
                        <span>RUJUKAN RESMI KOMINFO TERDETEKSI (Kecocokan {result.komdigi_match.similarity}%)</span>
                      </div>
                      <p className="text-zinc-800 font-bold leading-relaxed">
                        "{result.komdigi_match.title}"
                      </p>
                      {result.komdigi_match.url && (
                        <a 
                          href={result.komdigi_match.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[9px] font-bold text-sky-700 hover:underline mt-1"
                        >
                          Buka Klarifikasi Resmi Kominfo →
                        </a>
                      )}
                    </motion.div>
                  )}

                  {/* AI Explanation Box */}
                  {result && result.ai_explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3.5 border-2 border-black bg-yellow-50 text-[11px] font-mono shadow-[2px_2px_0px_rgba(0,0,0,1)] text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                          <Cpu size={12} className="text-zinc-800" />
                          <span>ANALISIS SEMANTIK AI HYBRID</span>
                        </div>
                        {result.ai_source && (
                          <span className="text-[8px] text-slate-500 border border-black/20 px-1.5 py-0.5 bg-white">
                            via {result.ai_source}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 leading-relaxed italic">
                        "{result.ai_explanation}"
                      </p>
                    </motion.div>
                  )}

                  {/* Domain Credibility & URL Checker Box */}
                  {result && (result.domain_credibility || result.url_checked) && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "mt-4 p-3.5 border-2 border-black text-[11px] font-mono shadow-[2px_2px_0px_rgba(0,0,0,1)] text-left flex flex-col gap-2",
                        result.domain_credibility?.typosquatting_warning || result.url_safety === "MALWARE"
                          ? "bg-rose-50 border-rose-600"
                          : result.domain_credibility?.is_trusted
                          ? "bg-emerald-50 border-emerald-600"
                          : "bg-[#f5f4ef]"
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                        <ScanText size={12} className="text-zinc-800" />
                        <span>ANALISIS SUMBER URL</span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex justify-between border-b border-black/10 pb-1.5">
                          <span className="text-slate-500">Tautan Terdeteksi:</span>
                          <span className="font-bold truncate max-w-[200px]" title={result.url_checked}>
                            {result.url_checked}
                          </span>
                        </div>
                        
                        {result.domain_credibility && (
                          <>
                            <div className="flex justify-between border-b border-black/10 pb-1.5">
                              <span className="text-slate-500">Reputasi Domain:</span>
                              <span className={cn(
                                "font-bold px-1.5 border border-black/20",
                                result.domain_credibility.is_trusted ? "bg-emerald-200 text-emerald-800" :
                                result.domain_credibility.is_blacklisted ? "bg-rose-200 text-rose-800" : "bg-slate-200 text-slate-800"
                              )}>
                                {result.domain_credibility.is_trusted ? "TERPERCAYA" : 
                                 result.domain_credibility.is_blacklisted ? "MENCURIGAKAN" : "NETRAL"}
                              </span>
                            </div>

                            {result.domain_credibility.typosquatting_warning && (
                              <div className="flex gap-2 items-start bg-rose-100 p-2 border border-rose-300 text-rose-800 font-bold mt-1">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <span>{result.domain_credibility.typosquatting_warning}</span>
                              </div>
                            )}
                          </>
                        )}

                        {result.url_safety && (
                          <div className="flex gap-2 items-start bg-rose-100 p-2 border border-rose-300 text-rose-800 font-bold mt-1">
                            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                            <span>Terdeteksi oleh Google Safe Browsing sebagai ancaman: {result.url_safety}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Similar Laporan Warga Section */}
                  {result && similarReports && similarReports.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3.5 border-2 border-black bg-cyan-50 text-[11px] font-mono shadow-[2px_2px_0px_rgba(0,0,0,1)] text-left flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-zinc-950">
                        <FileText size={12} className="text-zinc-900" />
                        <span>LAPORAN WARGA SERUPA TERKAIT ({similarReports.length})</span>
                      </div>
                      <div className="flex flex-col gap-2 mt-1">
                        {similarReports.map((report) => (
                          <div key={report.id} className="p-2 border border-black bg-white flex flex-col gap-1 shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                            <div className="flex justify-between items-center text-[9px] border-b border-black/5 pb-1">
                              <span className={cn(
                                "font-bold px-1.5 border border-black/20 uppercase text-[8px]",
                                report.ai_prediction === "HOAX" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                              )}>
                                {report.ai_prediction}
                              </span>
                              <span className="text-slate-500 font-bold">Kemiripan: {report.similarity}%</span>
                            </div>
                            <p className="text-zinc-700 italic font-mono text-[10px] line-clamp-2">
                              "{report.text_content}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              ) : activeTab === "image" ? (
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
              ) : (
                /* ENCYCLOPEDIA TAB CONTENT */
                <div className="flex flex-col h-full text-left font-mono">
                  <p className="text-slate-500 text-[10px] mb-4 leading-relaxed">
                    Arsip Pencarian Hoax. Temukan hoax dan disinformasi yang telah dilaporkan dan diverifikasi oleh sistem kecerdasan buatan FaktaNesia.
                  </p>

                  {/* Search controls */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchSearchReports(0)}
                      placeholder="Cari kata kunci hoax (misal: bansos, blt)..."
                      className="input-brutal flex-1 px-3 py-2 text-xs"
                    />
                    <button
                      onClick={() => fetchSearchReports(0)}
                      className="btn-brutal-solid px-4 py-2 text-xs font-bold shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] hover:shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)]"
                    >
                      Cari
                    </button>
                  </div>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Semua", "Kesehatan", "Keuangan", "Politik", "Bencana", "SARA", "Lainnya"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSearchCategory(cat)}
                        className={cn(
                          "px-2.5 py-1 border border-black text-[9px] font-bold uppercase transition",
                          searchCategory === cat
                            ? "bg-zinc-900 text-white"
                            : "bg-[#f5f4ef] text-zinc-700 hover:bg-[#e4e3de]"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Search results list */}
                  <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[350px]">
                    {searchLoading ? (
                      <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-black/10 bg-slate-50">
                        Mencari data...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-black/10 bg-slate-50">
                        Tidak ada arsip yang cocok.
                      </div>
                    ) : (
                      searchResults.map((report) => {
                        const isExpanded = expandedCard === report.id;
                        return (
                          <div
                            key={report.id}
                            className="p-3 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-1.5"
                          >
                            <div className="flex justify-between items-center text-[9px] border-b border-black/5 pb-1">
                              <span className="font-bold px-1.5 py-0.5 bg-[#f5f4ef] border border-black/20 uppercase text-[8px]">
                                {report.category || "Umum"}
                              </span>
                              <span
                                className={cn(
                                  "font-bold px-1.5 border border-black/20 uppercase text-[8px]",
                                  report.ai_prediction === "HOAX" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                )}
                              >
                                {report.ai_prediction}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 font-bold leading-relaxed">
                              "{report.text_content}"
                            </p>
                            
                            {isExpanded && (
                              <div className="mt-2 pt-2 border-t border-dashed border-black/10 text-[10px] text-slate-700 flex flex-col gap-1.5 bg-yellow-50/50 p-2 border border-black/5">
                                <div className="font-bold text-zinc-950">HASIL VERIFIKASI:</div>
                                <p className="italic text-zinc-600">
                                  {report.review_note || "Laporan teridentifikasi sistem sebagai hoax/disinformasi berdasarkan pola kalimat dan sumber domain."}
                                </p>
                              </div>
                            )}

                            <button
                              onClick={() => setExpandedCard(isExpanded ? null : report.id)}
                              className="text-[9px] font-bold text-left hover:underline text-slate-500 uppercase mt-1 flex items-center gap-1"
                            >
                              {isExpanded ? "Tutup Detail" : "Baca Penjelasan →"}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Search pagination */}
                  {searchTotal > 5 && (
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-black/10 text-[9px] font-bold">
                      <span className="uppercase text-slate-500">Total: {searchTotal} Hasil</span>
                      <div className="flex gap-2">
                        <button
                          disabled={searchPage === 0 || searchLoading}
                          onClick={() => fetchSearchReports(searchPage - 1)}
                          className="px-2 py-1 border border-black hover:bg-zinc-100 disabled:opacity-50"
                        >
                          PREV
                        </button>
                        <button
                          disabled={(searchPage + 1) * 5 >= searchTotal || searchLoading}
                          onClick={() => fetchSearchReports(searchPage + 1)}
                          className="px-2 py-1 border border-black hover:bg-zinc-100 disabled:opacity-50"
                        >
                          NEXT
                        </button>
                      </div>
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
                        <span className="text-[8px] font-bold text-slate-400">LAPORAN</span>
                        <span className="font-bold text-[10px] text-zinc-900 mt-0.5 flex items-center gap-0.5" title={`${totalScannedWords} kata dipindai`}>
                          <BookOpen size={8} /> {totalReportsAnalyses}
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
          <button onClick={() => setShowAdminLogin(true)} className="border-b border-[#18181b] pb-0.5 hover:text-black hover:font-bold transition-all uppercase">Admin Portal</button>
          <span className="border-b border-[#18181b] pb-0.5">TF-IDF BOOSTER v1.4</span>
          <span className="border-b border-[#18181b] pb-0.5">EST. 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
