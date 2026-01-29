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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bento-card w-full max-w-lg p-6 bg-[#18181b] relative"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white"
          >
            <X size={24} />
          </button>

          <h2 className="font-heading text-2xl font-bold mb-1">Report Hoax</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Found something suspicious? Help us train our AI.
          </p>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              onClose();
              alert("Report Sent!");
            }}
          >
            <div>
              <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                Content / Link
              </label>
              <textarea
                className="input-solid w-full h-32 mt-2 p-4 text-sm"
                placeholder="Paste the link or text here..."
              ></textarea>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">
                Category (Optional)
              </label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Politics
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Health
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  Scam
                </button>
              </div>
            </div>

            <button className="btn-solid w-full py-3 flex items-center justify-center gap-2 mt-4">
              <Send size={18} />
              Submit Report
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
