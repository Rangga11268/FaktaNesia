import { Flame, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export default function RecentScams({ onReportClick }) {
  const [scams, setScams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axios
      .get("/api/trending-hoaxes?limit=6")
      .then((res) => {
        if (!mounted) return;
        const rows = res.data.data || [];
        setScams(rows.map((r, i) => ({ title: r.title, views: r.search_count })));
      })
      .catch((e) => {
        console.warn("Failed to load trending hoaxes", e);
      })
      .finally(() => mounted && setLoading(false));

    return () => (mounted = false);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 text-red-600">
        <Flame size={18} fill="currentColor" />
        <h2 className="font-heading text-lg font-bold text-[#18181b]">Trending Hoaxes</h2>
      </div>

      <div className="space-y-3 flex-1 font-mono max-h-[250px] overflow-y-auto pr-1 select-none">
        {loading && <div className="text-xs text-slate-500">Memuat trending...</div>}
        {!loading && scams.length === 0 && (
          <div className="text-xs text-slate-500">Belum ada data trending.</div>
        )}
        {scams.map((scam, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 border-2 border-[#18181b] bg-[#f5f4ef]/50 hover:bg-[#f5f4ef] transition cursor-pointer group shadow-[2px_2px_0px_#18181b]"
            onClick={() => onReportClick("view")}
          >
            <div className="flex gap-3 items-center">
              <span className="text-lg font-bold text-slate-400 group-hover:text-black">0{i + 1}</span>
              <div>
                <h4 className="font-bold text-[11px] text-[#18181b] leading-tight">{scam.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">HOAX</span>
                </div>
              </div>
            </div>
            <div className="flex items-center text-[9px] text-slate-500 gap-1 shrink-0 ml-1">
              <TrendingUp size={10} />
              {scam.views}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onReportClick("view")}
        className="w-full mt-5 py-2 text-xs font-bold btn-brutal-outline shadow-[2px_2px_0px_#18181b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
      >
        LIHAT SEMUA LAPORAN
      </button>
    </div>
  );
}
