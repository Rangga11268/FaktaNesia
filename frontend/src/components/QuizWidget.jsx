import { useState } from "react";
import { Trophy, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUESTIONS = [
  { text: "Kominfo akan memblokir WhatsApp mulai besok.", isHoax: true },
  {
    text: "Timnas Indonesia lolos ke putaran ketiga Kualifikasi Piala Dunia.",
    isHoax: false,
  },
  {
    text: "Minum air es menyebabkan pembekuan darah di jantung.",
    isHoax: true,
  },
  {
    text: "Pemerintah tetapkan 1 Ramadhan jatuh pada hari Selasa.",
    isHoax: false,
  },
  { text: "Link pendaftaran CPNS jalur khusus tanpa tes.", isHoax: true },
];

export default function QuizWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'

  const handleAnswer = (userGuessedHoax) => {
    const isActuallyHoax = QUESTIONS[currentIndex].isHoax;
    const isCorrect = userGuessedHoax === isActuallyHoax;

    if (isCorrect) {
      setStreak((s) => s + 1);
      setFeedback("correct");
    } else {
      setStreak(0);
      setFeedback("wrong");
    }

    setTimeout(() => {
      setFeedback(null);
      setCurrentIndex((prev) => (prev + 1) % QUESTIONS.length);
    }, 1500);
  };

  return (
    <div className="bento-card p-6 flex flex-col h-full bg-gradient-to-br from-[#18181b] to-zinc-900 border-zinc-800 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 z-10">
        <div className="flex items-center gap-2 text-yellow-500">
          <Trophy size={20} />
          <span className="font-bold text-lg">Hoax Buster</span>
        </div>
        <div className="text-xs font-bold px-2 py-1 bg-zinc-800 rounded-lg text-zinc-400">
          Streak: <span className="text-white">{streak}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col justify-center z-10">
        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center h-full"
            >
              {feedback === "correct" ? (
                <>
                  <CheckCircle size={48} className="text-green-500 mb-2" />
                  <h3 className="font-bold text-xl text-green-400">Genius!</h3>
                  <p className="text-xs text-zinc-400">+1 Point</p>
                </>
              ) : (
                <>
                  <XCircle size={48} className="text-red-500 mb-2" />
                  <h3 className="font-bold text-xl text-red-400">Oops!</h3>
                  <p className="text-xs text-zinc-400">
                    Better luck next time.
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="question"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <p className="text-sm font-medium text-zinc-300 leading-relaxed mb-6 flex-1">
                "{QUESTIONS[currentIndex].text}"
              </p>

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button
                  onClick={() => handleAnswer(false)} // Guess Real
                  className="py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold text-sm hover:bg-emerald-500/20 transition"
                >
                  FAKTA
                </button>
                <button
                  onClick={() => handleAnswer(true)} // Guess Hoax
                  className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/20 transition"
                >
                  HOAX
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decor */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
    </div>
  );
}
