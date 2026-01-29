import { Flame, TrendingUp } from "lucide-react";

export default function RecentScams() {
  const scams = [
    { title: "Bansos Rp 150 Juta Cair", views: "125k", tag: "Finance" },
    { title: "Gempa Megathrust Besok", views: "98k", tag: "Disaster" },
    { title: "Kuota Gratis 100GB", views: "45k", tag: "Phishing" },
  ];

  return (
    <div className="bento-card p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6 text-orange-500">
        <Flame size={24} fill="currentColor" />
        <h2 className="font-heading text-xl font-bold text-white">
          Trending Hoaxes
        </h2>
      </div>

      <div className="space-y-4 flex-1">
        {scams.map((scam, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl bg-black/20 hover:bg-black/40 transition cursor-pointer group"
          >
            <div className="flex gap-4 items-center">
              <span className="text-2xl font-bold text-zinc-700 group-hover:text-zinc-500">
                0{i + 1}
              </span>
              <div>
                <h4 className="font-bold text-sm text-zinc-200">
                  {scam.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {scam.tag}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center text-xs text-zinc-500 gap-1">
              <TrendingUp size={12} />
              {scam.views}
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 py-3 text-sm font-bold text-zinc-400 hover:text-white transition">
        View All Reports
      </button>
    </div>
  );
}
