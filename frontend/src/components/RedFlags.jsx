import { AlertTriangle } from "lucide-react";

export default function RedFlags({ triggers }) {
  if (!triggers || triggers.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
      <div className="flex items-center gap-2 mb-3 text-red-500 font-bold uppercase text-xs tracking-wider">
        <AlertTriangle size={14} /> X-Ray Analysis: Detected Patterns
      </div>
      <div className="flex flex-wrap gap-2">
        {triggers.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1.5 "
          >
            <span className="text-red-200 font-bold text-sm">
              "{item.word}"
            </span>
            <span className="text-[10px] uppercase bg-red-950/50 text-red-400 px-1.5 py-0.5 rounded ml-1">
              {item.category}
            </span>
          </div>
        ))}
      </div>
      <p className="text-red-400/60 text-xs mt-3">
        These words are commonly found in scams or hoaxes.
      </p>
    </div>
  );
}
