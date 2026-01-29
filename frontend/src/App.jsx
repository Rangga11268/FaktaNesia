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
  ScanText,
  Loader2,
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
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Tabs State
  const [activeTab, setActiveTab] = useState("text"); // 'text' | 'image'
  const [selectedImage, setSelectedImage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handlePredict = async (textToAnalyze = inputText) => {
    if (!textToAnalyze?.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post("/api/predict", {
        text: textToAnalyze,
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Connection failed. Backend might be sleeping.");
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
        },
      );

      const extractedText = result.data.text;
      if (!extractedText.trim()) {
        setError("Could not read text from image. Try a clearer image.");
        setOcrLoading(false);
        return;
      }

      // Success
      setInputText(extractedText);
      setActiveTab("text");
      setOcrLoading(false);

      // Auto predict
      handlePredict(extractedText);
    } catch (err) {
      console.error(err);
      setError("Failed to scan image. Please try again.");
      setOcrLoading(false);
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
          <div className="bento-card p-6 flex flex-col items-start bg-[#09090b]">
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

          <div className="flex-1 hidden md:block">
            <QuizWidget />
          </div>
        </div>

        {/* MIDDLE COLUMN: Main Detector */}
        <div className="md:col-span-6 flex flex-col gap-6">
          <div className="bento-card p-6 md:p-8 min-h-[500px] flex flex-col relative overflow-hidden bg-[#09090b]">
            {/* Header with Tabs */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("text")}
                  className={cn(
                    "flex items-center gap-2 font-heading text-xl font-bold transition",
                    activeTab === "text"
                      ? "text-blue-500 border-b-2 border-blue-500 pb-1"
                      : "text-zinc-600 hover:text-zinc-400 pb-1",
                  )}
                >
                  <Search size={22} /> Text
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={cn(
                    "flex items-center gap-2 font-heading text-xl font-bold transition",
                    activeTab === "image"
                      ? "text-purple-500 border-b-2 border-purple-500 pb-1"
                      : "text-zinc-600 hover:text-zinc-400 pb-1",
                  )}
                >
                  <ScanText size={22} /> I-Scan
                </button>
              </div>

              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              </div>
            </div>

            <div className="relative flex-1 flex flex-col">
              {activeTab === "text" ? (
                <>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste suspicious text or headline here..."
                    className="input-solid w-full flex-1 p-6 text-lg resize-none placeholder:text-zinc-700 font-medium font-sans"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {/* Confidence Indicator */}
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
                          <div className="font-bold text-xl">
                            {result.label}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <button
                      onClick={() => handlePredict()}
                      disabled={loading || !inputText}
                      className="btn-solid h-full min-h-[60px] flex items-center justify-center gap-2 text-lg hover:scale-[1.02] shadow-xl shadow-white/5"
                    >
                      {loading ? "Scanning..." : "Verify Now"}
                    </button>
                  </div>

                  {/* X-Ray Analysis Result */}
                  {result && result.triggers && (
                    <RedFlags triggers={result.triggers} />
                  )}
                </>
              ) : (
                /* IMAGE TAB CONTENT */
                <div className="flex flex-col h-full items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30 p-8">
                  {selectedImage ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="relative max-h-64 rounded-xl mb-6 shadow-2xl overflow-hidden group">
                        <img
                          src={selectedImage}
                          alt="Upload"
                          className="max-h-64 object-contain bg-black"
                        />
                        {/* Scanning Effect Overlay */}
                        {ocrLoading && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <Loader2
                              className="animate-spin text-purple-500 mb-2"
                              size={48}
                            />
                            <div className="text-purple-400 font-bold text-lg">
                              Scanning Text...
                            </div>
                            <div className="text-zinc-400 text-sm">
                              {ocrProgress}%
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full">
                        <label
                          className={cn(
                            "btn-secondary py-3 flex items-center justify-center cursor-pointer transition",
                            ocrLoading && "opacity-50 pointer-events-none",
                          )}
                        >
                          Change
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
                          className="btn-solid py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                        >
                          <ScanText size={18} />
                          {ocrLoading ? "Scanning..." : "Scan & Analyze"}
                        </button>
                      </div>

                      <p className="text-xs text-zinc-500 mt-6 text-center px-4 max-w-sm">
                        Our AI will extract text from this image and check its
                        credibility instantly.
                      </p>
                      <div className="mt-2 text-center">
                        <a
                          href="https://lens.google.com/"
                          target="_blank"
                          className="text-[10px] text-zinc-600 hover:text-zinc-400 underline"
                        >
                          Or check image source on Google Lens
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500/50 group-hover:text-purple-500 transition">
                        <ScanText size={32} />
                      </div>
                      <h3 className="font-bold text-lg text-zinc-200">
                        Image Scanner
                      </h3>
                      <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
                        Upload a screenshot of a news article or chat. We'll
                        read the text and verify it.
                      </p>
                      <label className="btn-solid px-8 py-3 cursor-pointer border border-zinc-700 hover:border-zinc-500">
                        Select Image
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
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 z-50">
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
