import { AlertTriangle } from "lucide-react";

export default function RedFlags({ triggers }) {
  if (!triggers || triggers.length === 0) return null;

  return (
    <div className="mt-4 p-4 border-2 border-rose-600 bg-rose-50/50 font-mono text-xs shadow-[3px_3px_0px_#e11d48]">
      <div className="flex items-center gap-2 mb-3 text-rose-700 font-bold uppercase tracking-wider">
        <AlertTriangle size={14} /> ANALISIS POLA: KATA KUNCI PEMICU
      </div>
      <div className="flex flex-wrap gap-2">
        {triggers.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 bg-white border-2 border-rose-600 px-2.5 py-1.5 shadow-[1.5px_1.5px_0px_#e11d48]"
          >
            <span className="text-rose-700 font-bold">
              "{item.word}"
            </span>
            <span className="text-[9px] uppercase bg-rose-600 text-white px-1.5 py-0.5 ml-1">
              {item.category}
            </span>
          </div>
        ))}
      </div>
      <p className="text-rose-700/70 text-[10px] mt-3">
        * Kata-kata di atas terdeteksi memiliki probabilitas disinformasi / umpan klik (clickbait) yang tinggi.
      </p>
    </div>
  );
}
