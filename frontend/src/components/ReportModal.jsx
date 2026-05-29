import { X, Send, FileText, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import clsx from "clsx";
import axios from "axios";

export default function ReportModal({
  isOpen,
  onClose,
  activeModalTab = "create",
  setActiveModalTab,
}) {
  const [reportText, setReportText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("POLITIK");
  const [userClaim, setUserClaim] = useState("HOAX");
  const [remoteReports, setRemoteReports] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch reports list dynamically when modal opens
  const fetchReportsList = () => {
    setLoadingList(true);
    axios
      .get("/api/reports?limit=50")
      .then((res) => {
        const data = res.data.data || [];
        setRemoteReports(data);
        setTotalCount(res.data.count || data.length);
      })
      .catch((e) => console.warn("Failed to fetch reports", e))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchReportsList();
    }
  }, [isOpen, activeModalTab]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    setSubmitting(true);
    
    axios
      .post("/api/predict", { 
        text: reportText, 
        user_claim: userClaim 
      })
      .then((res) => {
        setReportText("");
        setUserClaim("HOAX");
        // Reload list and switch to view tab
        fetchReportsList();
        setActiveModalTab("view");
      })
      .catch((err) => {
        console.error(err);
        alert("Gagal mengirim laporan. Silakan coba lagi.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs text-[#18181b]"
      >
        <motion.div
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          className="brutalist-card w-full max-w-xl p-6 bg-white relative border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col max-h-[90vh]"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-black transition"
          >
            <X size={20} />
          </button>

          {/* Modal Header & Tabs */}
          <div className="border-b-2 border-black/10 pb-4 mb-4">
            <h2 className="font-heading text-2xl font-bold mb-3">
              Pusat Laporan Disinformasi
            </h2>
            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => setActiveModalTab("create")}
                className={clsx(
                  "px-4 py-1.5 border-2 border-black font-bold flex items-center gap-1.5 transition",
                  activeModalTab === "create"
                    ? "bg-zinc-900 text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-zinc-700 hover:bg-slate-50"
                )}
              >
                <PlusCircle size={14} /> Buat Laporan
              </button>
              <button
                onClick={() => setActiveModalTab("view")}
                className={clsx(
                  "px-4 py-1.5 border-2 border-black font-bold flex items-center gap-1.5 transition",
                  activeModalTab === "view"
                    ? "bg-zinc-900 text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    : "bg-white text-zinc-700 hover:bg-slate-50"
                )}
              >
                <FileText size={14} /> Laporan Warga ({totalCount})
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeModalTab === "create" ? (
              <form onSubmit={handleSubmit} className="space-y-5 font-mono text-xs">
                <p className="text-slate-500 text-xs">
                  Menemukan disinformasi atau berita mencurigakan? Laporkan di sini untuk membantu memperkuat database deteksi AI kami.
                </p>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Naskah / Link Berita
                  </label>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    className="w-full border-2 border-black p-3 text-xs resize-none outline-none focus:bg-stone-50 h-28"
                    placeholder="Tempel link artikel, judul berita, atau isi pesan berantai WhatsApp yang mencurigakan di sini..."
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Saya menduga ini adalah
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700">
                      <input
                        type="radio"
                        name="user_claim"
                        value="HOAX"
                        checked={userClaim === "HOAX"}
                        onChange={() => setUserClaim("HOAX")}
                        className="accent-rose-600 w-4 h-4 cursor-pointer"
                      />
                      Hoax / Dusta
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-700">
                      <input
                        type="radio"
                        name="user_claim"
                        value="REAL"
                        checked={userClaim === "REAL"}
                        onChange={() => setUserClaim("REAL")}
                        className="accent-emerald-600 w-4 h-4 cursor-pointer"
                      />
                      Fakta / Absah
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                    Kategori Laporan
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["POLITIK", "KESEHATAN", "PENIPUAN", "FINANCE", "LAINNYA"].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={clsx(
                          "px-3 py-1.5 border-2 border-black text-[10px] font-bold transition shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
                          selectedCategory === cat
                            ? "bg-zinc-900 text-white"
                            : "bg-[#f5f4ef] text-zinc-800 hover:bg-[#e4e3de]"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-zinc-950 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-black hover:bg-zinc-800 disabled:opacity-70 transition shadow-[4px_4px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>MENGIRIM LAPORAN...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>KIRIM LAPORAN SEKARANG</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-3.5 font-mono">
                <p className="text-slate-500 text-xs mb-2">
                  Daftar laporan disinformasi yang dikirimkan oleh komunitas warga digital FaktaNesia.
                </p>
                {loadingList ? (
                  <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-black/10 bg-slate-50 flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memuat laporan...</span>
                  </div>
                ) : remoteReports.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-black/10 bg-slate-50">
                    Belum ada laporan masuk.
                  </div>
                ) : (
                  remoteReports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2 text-[10px]">
                        <span className="font-bold px-1.5 py-0.5 bg-[#f5f4ef] border border-black/20">
                          {report.category || "UMUM"}
                        </span>
                        <span className="text-slate-500">
                          {report.created_at ? new Date(report.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-semibold mb-3 leading-relaxed">
                        "{report.text_content || report.text || "-"}"
                      </p>
                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-black/5">
                        <span className="text-slate-500">Prediksi AI:</span>
                        <span
                          className={clsx(
                            "font-bold px-2 py-0.5 border border-black",
                            report.ai_prediction === "HOAX" || report.status === "HOAX"
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : report.ai_prediction === "REAL" || report.status === "FAKTA"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-slate-50 text-slate-600"
                          )}
                        >
                          [ {report.ai_prediction || report.status || "PENDING"} ]
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
