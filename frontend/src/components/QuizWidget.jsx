import { useState } from "react";
import { Trophy, CheckCircle, XCircle } from "lucide-react";
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
    <div className="brutalist-card p-6 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 z-10 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-zinc-900 font-bold">
          <Trophy size={16} className="text-amber-600" />
          <span>Hoax Buster</span>
        </div>
        <div className="font-bold px-2 py-1 bg-zinc-900 text-white">
          Streak: {streak}
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 flex flex-col justify-center z-10 min-h-[140px]">
        <AnimatePresence mode="wait">
          {feedback ? (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-center font-mono"
            >
              {feedback === "correct" ? (
                <>
                  <CheckCircle size={36} className="text-emerald-600 mb-2" />
                  <h3 className="font-bold text-lg text-emerald-700">LUAR BIASA!</h3>
                  <p className="text-[10px] text-slate-500 mt-1">+1 Point</p>
                </>
              ) : (
                <>
                  <XCircle size={36} className="text-rose-600 mb-2" />
                  <h3 className="font-bold text-lg text-rose-700">SALAH!</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Coba lagi lebih jeli.</p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="question"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col h-full justify-between"
            >
              <p className="text-xs font-semibold text-slate-700 leading-relaxed mb-4 italic">
                "{QUESTIONS[currentIndex].text}"
              </p>

              <div className="grid grid-cols-2 gap-3 mt-auto font-mono text-xs">
                <button
                  onClick={() => handleAnswer(false)} // Guess Real
                  className="py-2 btn-brutal-solid bg-emerald-600 border-emerald-600 text-white shadow-[2px_2px_0px_#18181b] hover:bg-emerald-500"
                >
                  FAKTA
                </button>
                <button
                  onClick={() => handleAnswer(true)} // Guess Hoax
                  className="py-2 btn-brutal-solid bg-rose-600 border-rose-600 text-white shadow-[2px_2px_0px_#18181b] hover:bg-rose-500"
                >
                  HOAX
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
