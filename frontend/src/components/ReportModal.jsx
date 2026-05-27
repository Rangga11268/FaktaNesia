import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReportModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
          className="brutalist-card w-full max-w-lg p-6 bg-white relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-400 hover:text-black transition"
          >
            <X size={20} />
          </button>

          <h2 className="font-heading text-2xl font-bold mb-1 text-[#18181b]">Laporkan Hoax</h2>
          <p className="text-slate-500 text-xs mb-6 font-mono">
            Menemukan disinformasi baru? Bantu latih model AI kami dengan data lapangan.
          </p>

          <form
            className="space-y-5 font-mono text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              onClose();
              alert("Laporan berhasil dikirim! Terima kasih.");
            }}
          >
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Naskah / Link Berita
              </label>
              <textarea
                className="input-brutal w-full h-28 mt-2 p-3 text-xs resize-none"
                placeholder="Tempel link artikel atau salin teks pesan di sini..."
                required
              ></textarea>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Kategori Laporan
              </label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 border-2 border-[#18181b] bg-[#f5f4ef] text-[10px] font-bold hover:bg-[#18181b] hover:text-white transition shadow-[1.5px_1.5px_0px_#18181b]"
                >
                  POLITIK
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 border-2 border-[#18181b] bg-[#f5f4ef] text-[10px] font-bold hover:bg-[#18181b] hover:text-white transition shadow-[1.5px_1.5px_0px_#18181b]"
                >
                  KESEHATAN
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 border-2 border-[#18181b] bg-[#f5f4ef] text-[10px] font-bold hover:bg-[#18181b] hover:text-white transition shadow-[1.5px_1.5px_0px_#18181b]"
                >
                  PENIPUAN
                </button>
              </div>
            </div>

            <button className="btn-brutal-solid w-full py-3 flex items-center justify-center gap-2 mt-4 text-xs">
              <Send size={14} />
              KIRIM LAPORAN
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
