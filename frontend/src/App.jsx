import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Info,
  Flag,
  Menu,
  Github,
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

import RecentScams from "./components/RecentScams";
import ReportModal from "./components/ReportModal";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handlePredict = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post("/api/predict", { text: inputText });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Connection failed. Backend might be sleeping.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-8 flex items-center justify-center">
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Navbar & Branding */}
        <div className="md:col-span-3 flex flex-col gap-6">
          <div className="bento-card p-6 flex flex-col items-start">
            <div className="w-12 h-12 bg-white rounded-xl mb-4 p-2 flex items-center justify-center">
              <img
                src="/assets/img/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="font-heading text-3xl font-bold">FaktaNesia.</h1>
            <p className="text-zinc-500 text-sm mt-2">
              AI-Powered Anti-Hoax Engine.
            </p>

            <div className="mt-8 space-y-2 w-full">
              <button
                onClick={() => setIsReportOpen(true)}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2 text-sm"
              >
                <Flag size={16} /> Report Content
              </button>
              <a
                href="https://github.com/Rangga11268/FaktaNesia"
                target="_blank"
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
              >
                <Github size={16} /> Contribute
              </a>
            </div>
          </div>

          <div className="bento-card p-6 flex-1 hidden md:flex flex-col justify-end bg-gradient-to-b from-transparent to-blue-900/10 border-blue-900/30">
            <h3 className="font-bold text-lg mb-2">Did You Know?</h3>
            <p className="text-sm text-zinc-400">
              90% of hoaxes spread via WhatsApp groups. Always verify before
              forwarding.
            </p>
          </div>
        </div>

        {/* MIDDLE COLUMN: Main Detector */}
        <div className="md:col-span-6 flex flex-col gap-6">
          <div className="bento-card p-6 md:p-8 min-h-[500px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
                <Search className="text-blue-500" />
                Analyze Content
              </h2>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
            </div>

            <div className="relative flex-1 flex flex-col">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste suspicious text or headline here..."
                className="input-solid w-full flex-1 p-6 text-lg resize-none placeholder:text-zinc-700 font-medium"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Confidence Indicator if Result */}
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "rounded-xl p-4 border flex items-center gap-4",
                      result.is_hoax
                        ? "bg-red-500/10 border-red-500/20 text-red-500"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                    )}
                  >
                    {result.is_hoax ? (
                      <ShieldAlert size={32} />
                    ) : (
                      <ShieldCheck size={32} />
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase opacity-70">
                        Verdict
                      </div>
                      <div className="font-bold text-xl">{result.label}</div>
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={handlePredict}
                  disabled={loading || !inputText}
                  className="btn-solid h-full min-h-[60px] flex items-center justify-center gap-2 text-lg hover:scale-[1.02] shadow-xl shadow-white/5"
                >
                  {loading ? "Scanning..." : "Verify Now"}
                </button>
              </div>
            </div>

            {/* Error Toast */}
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2">
                <Info size={16} /> {error}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Trending */}
        <div className="md:col-span-3">
          <RecentScams />
        </div>
      </div>
    </div>
  );
}

export default App;
