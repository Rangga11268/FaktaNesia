import { X, Send, FileText, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import clsx from "clsx";

export default function ReportModal({
  isOpen,
  onClose,
  reports = [],
  onAddReport,
  activeModalTab = "create",
  setActiveModalTab,
}) {
  const [reportText, setReportText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("POLITIK");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reportText.trim()) return;

    onAddReport(reportText, selectedCategory);
    setReportText("");
    // Switch to view tab to see the report
    setActiveModalTab("view");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <motion.div
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          className="brutalist-card w-full max-w-xl p-6 bg-white relative flex flex-col max-h-[90vh]"
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
            <h2 className="font-heading text-2xl font-bold mb-3 text-[#18181b]">
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
                <FileText size={14} /> Laporan Warga ({reports.length})
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
                    className="input-brutal w-full h-28 p-3 text-xs resize-none"
                    placeholder="Tempel link artikel, judul berita, atau isi pesan berantai WhatsApp yang mencurigakan di sini..."
                    required
                  />
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
                  className="btn-brutal-solid w-full py-3 flex items-center justify-center gap-2 text-xs"
                >
                  <Send size={14} />
                  KIRIM LAPORAN SEKARANG
                </button>
              </form>
            ) : (
              <div className="space-y-3.5 font-mono">
                <p className="text-slate-500 text-xs mb-2">
                  Daftar laporan disinformasi yang dikirimkan oleh komunitas warga digital FaktaNesia.
                </p>
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed border-black/10 bg-slate-50">
                    Belum ada laporan masuk.
                  </div>
                ) : (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2 text-[10px]">
                        <span className="font-bold px-1.5 py-0.5 bg-[#f5f4ef] border border-black/20">
                          {report.category}
                        </span>
                        <span className="text-slate-500">{report.date}</span>
                      </div>
                      <p className="text-xs text-slate-800 font-semibold mb-3 leading-relaxed">
                        "{report.text}"
                      </p>
                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-black/5">
                        <span className="text-slate-500">Status Verifikasi:</span>
                        <span
                          className={clsx(
                            "font-bold px-2 py-0.5 border border-black",
                            report.status === "HOAX"
                              ? "bg-rose-50 text-rose-700 border-rose-300"
                              : "bg-emerald-50 text-emerald-700 border-emerald-300"
                          )}
                        >
                          [ {report.status} ]
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
