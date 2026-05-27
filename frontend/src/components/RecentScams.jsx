import { Flame, TrendingUp } from "lucide-react";

export default function RecentScams() {
  const scams = [
    { title: "Bansos Rp 150 Juta Cair", views: "125k", tag: "Finance" },
    { title: "Gempa Megathrust Besok", views: "98k", tag: "Disaster" },
    { title: "Kuota Gratis 100GB", views: "45k", tag: "Phishing" },
  ];

  return (
    <div className="brutalist-card p-6 h-full flex flex-col bg-white">
      <div className="flex items-center gap-2 mb-6 text-red-600">
        <Flame size={20} fill="currentColor" />
        <h2 className="font-heading text-xl font-bold text-[#18181b]">
          Trending Hoaxes
        </h2>
      </div>

      <div className="space-y-3.5 flex-1 font-mono">
        {scams.map((scam, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 border-2 border-[#18181b] bg-[#f5f4ef]/50 hover:bg-[#f5f4ef] transition cursor-pointer group shadow-[2px_2px_0px_#18181b]"
          >
            <div className="flex gap-3.5 items-center">
              <span className="text-xl font-bold text-slate-400 group-hover:text-black">
                0{i + 1}
              </span>
              <div>
                <h4 className="font-bold text-xs text-[#18181b] leading-tight">
                  {scam.title}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                    {scam.tag}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center text-[10px] text-slate-500 gap-1 shrink-0 ml-1">
              <TrendingUp size={11} />
              {scam.views}
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-2.5 text-xs font-bold btn-brutal-outline">
        LIHAT SEMUA LAPORAN
      </button>
    </div>
  );
}
