import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Search, Info } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function App() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePredict = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Use full URL for robustness if proxy fails, or relative if proxy works.
      // We will try relative first as per Vite config.
      const response = await axios.post("/api/predict", { text: inputText });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      {/* Ambient Background */}
      <div className="ambient-light">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="w-full max-w-3xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 md:p-12 mb-8"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative w-24 h-24 mb-4 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            >
              <img
                src="/assets/img/logo.png"
                alt="FaktaNesia"
                className="w-full h-full object-cover"
              />
            </motion.div>
            <h1 className="title-font text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-2 text-center">
              FaktaNesia
            </h1>
            <p className="text-blue-100/70 text-lg tracking-wide">
              AI-Powered Hoax Detection Engine
            </p>
          </div>

          {/* Input Area */}
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste the news headline or article content here to verify its authenticity..."
                className="relative w-full h-48 bg-black/40 text-white p-6 rounded-xl border border-white/10 focus:border-blue-400/50 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none text-lg leading-relaxed placeholder-white/20"
              />
            </div>

            <button
              onClick={handlePredict}
              disabled={loading || !inputText}
              className={cn(
                "btn-glow w-full py-4 rounded-xl font-bold text-xl tracking-wide text-white shadow-lg transition-all flex items-center justify-center gap-3",
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500",
              )}
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Analyzing Patterns...
                </>
              ) : (
                <>
                  <Search className="w-6 h-6" />
                  Verify Content
                </>
              )}
            </button>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20"
              >
                <Info className="w-5 h-5" />
                {error}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "glass-panel p-8 border-2 overflow-hidden relative",
                result.is_hoax
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-emerald-500/30 bg-emerald-500/5",
              )}
            >
              {/* Decorative Glow */}
              <div
                className={cn(
                  "absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 pointer-events-none",
                  result.is_hoax ? "bg-red-500" : "bg-emerald-500",
                )}
              ></div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-6">
                  <div
                    className={cn(
                      "p-5 rounded-2xl shadow-inner",
                      result.is_hoax
                        ? "bg-red-500/20 text-red-400"
                        : "bg-emerald-500/20 text-emerald-400",
                    )}
                  >
                    {result.is_hoax ? (
                      <ShieldAlert className="w-12 h-12" />
                    ) : (
                      <ShieldCheck className="w-12 h-12" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm uppercase tracking-widest text-white/50 font-semibold mb-1">
                      Analysis Result
                    </h2>
                    <div
                      className={cn(
                        "text-4xl font-bold title-font",
                        result.is_hoax
                          ? "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]"
                          : "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]",
                      )}
                    >
                      {result.is_hoax ? "POTENTIAL HOAX" : "LIKELY REAL"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                  <div className="text-sm text-white/50 font-medium">
                    AI Confidence Score
                  </div>
                  <div className="text-3xl font-bold text-white tabular-nums">
                    {(result.confidence_score * 100).toFixed(1)}%
                  </div>
                  <div className="w-32 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence_score * 100}%` }}
                      className={cn(
                        "h-full rounded-full",
                        result.is_hoax ? "bg-red-500" : "bg-emerald-500",
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-white/40">
                <p>
                  Disclaimer: This is an AI-generated probability. Always check
                  official sources.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
