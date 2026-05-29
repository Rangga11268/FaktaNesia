import { useState, useEffect } from "react";
import { LogOut, Activity, Database, AlertOctagon, CheckCircle2, ShieldCheck, RefreshCw, BarChart3, Trash2, X, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

export default function AdminDashboard({ adminToken, onLogout }) {
  const [stats, setStats] = useState({
    total_reports: 0,
    total_hoax: 0,
    total_real: 0,
    hoax_percentage: 0
  });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 15;

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Admin Actions State
  const [editingReport, setEditingReport] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewVerdict, setReviewVerdict] = useState("HOAX");

  // Custom Alert & Confirm Modals State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "", type: "success" });
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: "", message: "", onConfirm: null });

  const showAlert = (title, message, type = "success") => {
    setAlertConfig({ isOpen: true, title, message, type });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, reportsRes] = await Promise.all([
        axios.get("/api/stats", { headers: { "X-Admin-Token": adminToken } }),
        axios.get(`/api/reports?limit=${LIMIT}&offset=${page * LIMIT}`, { headers: { "X-Admin-Token": adminToken } })
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data.data || []);
    } catch (err) {
      console.error("Error fetching admin data", err);
      if (err.response?.status === 403) {
        onLogout(); // Token invalid/expired
      } else {
        showAlert("Error", "Gagal memuat data dari server.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async (reportId) => {
    try {
      await axios.post(
        `/api/reports/${reportId}/review`,
        {
          note: reviewNote,
          verdict: reviewVerdict,
          reviewed: true
        },
        { headers: { "X-Admin-Token": adminToken } }
      );
      setEditingReport(null);
      setReviewNote("");
      showAlert("Sukses", "Review laporan berhasil disimpan.", "success");
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan review:", err);
      showAlert("Gagal", "Gagal menyimpan review laporan.", "error");
    }
  };

  const handleDeleteReport = (reportId) => {
    showConfirm(
      "Hapus Laporan",
      "Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.",
      async () => {
        try {
          await axios.delete(`/api/reports/${reportId}`, {
            headers: { "X-Admin-Token": adminToken }
          });
          showAlert("Sukses", "Laporan berhasil dihapus.", "success");
          setSelectedIds(prev => prev.filter(id => id !== reportId));
          fetchData();
        } catch (err) {
          console.error("Gagal menghapus laporan:", err);
          showAlert("Gagal", "Gagal menghapus laporan.", "error");
        }
      }
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    showConfirm(
      "Hapus Banyak Laporan",
      `Apakah Anda yakin ingin menghapus ${selectedIds.length} laporan terpilih secara permanen?`,
      async () => {
        try {
          await axios.post(
            "/api/reports/bulk-delete",
            { ids: selectedIds },
            { headers: { "X-Admin-Token": adminToken } }
          );
          showAlert("Sukses", `${selectedIds.length} laporan berhasil dihapus.`, "success");
          setSelectedIds([]);
          fetchData();
        } catch (err) {
          console.error("Gagal menghapus banyak laporan:", err);
          showAlert("Gagal", "Gagal menghapus beberapa laporan.", "error");
        }
      }
    );
  };

  const handleSelectToggle = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map(r => r.id));
    }
  };

  useEffect(() => {
    setSelectedIds([]);
    fetchData();
  }, [page]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col p-4 animate-fade-in text-[#18181b]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button 
            onClick={onLogout}
            className="text-xs font-bold uppercase mb-2 flex items-center gap-1 hover:underline text-slate-500"
          >
            ← Kembali ke Detektor
          </button>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <ShieldCheck className="text-zinc-800" size={32} />
            Admin Dashboard
          </h1>
          <p className="text-zinc-600 font-medium">Pemantauan Sistem & Histori Analisis AI</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2 border-2 border-black hover:bg-zinc-100 disabled:opacity-50 brutalist-shadow transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold text-sm uppercase border-2 border-black hover:bg-red-700 brutalist-shadow transition-all"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          title="Total Analisis" 
          value={stats.total_reports} 
          icon={<Database size={24} className="text-blue-600" />} 
          bg="bg-blue-50" border="border-blue-200" 
        />
        <MetricCard 
          title="Terdeteksi Hoax" 
          value={stats.total_hoax} 
          icon={<AlertOctagon size={24} className="text-red-600" />} 
          bg="bg-red-50" border="border-red-200" 
        />
        <MetricCard 
          title="Terdeteksi Fakta" 
          value={stats.total_real} 
          icon={<CheckCircle2 size={24} className="text-green-600" />} 
          bg="bg-green-50" border="border-green-200" 
        />
        <MetricCard 
          title="Rasio Hoax" 
          value={`${stats.hoax_percentage}%`} 
          icon={<Activity size={24} className="text-yellow-600" />} 
          bg="bg-yellow-50" border="border-yellow-200" 
        />
      </div>

      {/* Category Distribution Chart */}
      {stats.categories && Object.keys(stats.categories).length > 0 && (
        <div className="brutalist-card bg-white p-6 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-8">
          <h2 className="font-black uppercase text-base mb-4 tracking-tight flex items-center gap-2">
            <BarChart3 size={18} className="text-zinc-800" />
            Distribusi Kategori Hoax Terdeteksi
          </h2>
          <div className="flex flex-col gap-3 font-mono text-xs">
            {Object.entries(stats.categories).map(([cat, count]) => {
              const maxCount = Math.max(...Object.values(stats.categories));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={cat} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="w-32 font-bold uppercase">{cat}</span>
                  <div className="flex-1 bg-zinc-100 border border-black h-5 relative">
                    <div 
                      className="bg-rose-500 border-r border-black h-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-y-0 right-2 flex items-center font-bold text-[10px]">
                      {count} Laporan
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="brutalist-card bg-white overflow-hidden flex flex-col flex-1">
        <div className="bg-zinc-100 p-4 border-b-2 border-black flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-bold uppercase text-sm">Riwayat Laporan & Analisis Pengguna</h2>
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white font-bold text-xs uppercase border-2 border-black hover:bg-rose-700 brutalist-shadow transition-all"
            >
              <Trash2 size={14} /> Hapus Terpilih ({selectedIds.length})
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-zinc-50 border-b-2 border-black text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-bold border-r border-black/10 w-12 text-center">
                  <input
                    type="checkbox"
                    className="accent-black cursor-pointer w-4 h-4"
                    checked={reports.length > 0 && selectedIds.length === reports.length}
                    onChange={handleSelectAllToggle}
                  />
                </th>
                <th className="px-4 py-3 font-bold border-r border-black/10 w-16">ID</th>
                <th className="px-4 py-3 font-bold border-r border-black/10">Teks / Konten</th>
                <th className="px-4 py-3 font-bold border-r border-black/10 w-32">Kategori</th>
                <th className="px-4 py-3 font-bold border-r border-black/10 w-32">Prediksi AI</th>
                <th className="px-4 py-3 font-bold border-r border-black/10 w-24">Akurasi</th>
                <th className="px-4 py-3 font-bold border-r border-black/10 w-48">Waktu (WIB)</th>
                <th className="px-4 py-3 font-bold w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {loading && reports.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-zinc-500 font-medium">Memuat data histori...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-zinc-500 font-medium">Belum ada riwayat laporan.</td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 border-r border-black/10 text-center">
                      <input
                        type="checkbox"
                        className="accent-black cursor-pointer w-4 h-4"
                        checked={selectedIds.includes(report.id)}
                        onChange={() => handleSelectToggle(report.id)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r border-black/10 font-mono text-zinc-500">#{report.id}</td>
                    <td className="px-4 py-3 border-r border-black/10 truncate max-w-[300px] md:max-w-[400px]">
                      {report.text_content || (report.url_submitted ? `[URL] ${report.url_submitted}` : "-")}
                    </td>
                    <td className="px-4 py-3 border-r border-black/10 font-bold text-xs uppercase font-mono text-zinc-700">
                      <span className="px-1.5 py-0.5 border border-black/20 bg-zinc-100">{report.category || "Umum"}</span>
                    </td>
                    <td className="px-4 py-3 border-r border-black/10">
                      {report.ai_prediction === "HOAX" ? (
                        <span className="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-sm text-xs font-bold uppercase">Hoax</span>
                      ) : report.ai_prediction === "REAL" ? (
                        <span className="bg-green-100 text-green-800 border border-green-300 px-2 py-0.5 rounded-sm text-xs font-bold uppercase">Fakta</span>
                      ) : (
                        <span className="text-zinc-400 text-xs italic">Menunggu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-black/10 font-mono text-xs">
                      {report.ai_confidence ? `${(report.ai_confidence * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 border-r border-black/10 font-mono text-xs text-zinc-500">
                      {formatDate(report.created_at)}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingReport(report);
                          setReviewNote(report.review_note || "");
                          setReviewVerdict(report.ai_prediction || "HOAX");
                        }}
                        className="px-2.5 py-1 border border-black bg-yellow-50 text-[10px] font-bold shadow-[1px_1px_0px_#000] hover:bg-yellow-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        REVIEW
                      </button>
                      <button 
                        onClick={() => handleDeleteReport(report.id)}
                        className="px-2.5 py-1 border border-black bg-rose-50 text-[10px] font-bold shadow-[1px_1px_0px_#000] hover:bg-rose-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-rose-700"
                      >
                        HAPUS
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 bg-zinc-50 border-t-2 border-black flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-500 uppercase">Halaman {page + 1}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-3 py-1.5 border-2 border-black bg-white text-xs font-bold hover:bg-zinc-100 disabled:opacity-50 brutalist-shadow transition-all"
            >
              SEBELUMNYA
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={reports.length < LIMIT || loading}
              className="px-3 py-1.5 border-2 border-black bg-white text-xs font-bold hover:bg-zinc-100 disabled:opacity-50 brutalist-shadow transition-all"
            >
              SELANJUTNYA
            </button>
          </div>
        </div>
      </div>

      {/* Review Modal Overlay */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs">
          <div className="brutalist-card w-full max-w-md p-6 bg-white relative flex flex-col gap-4 border-2 border-black">
            <h3 className="font-heading text-lg font-bold uppercase tracking-tight text-zinc-950">Review Laporan #{editingReport.id}</h3>
            
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500">Konten Laporan:</span>
              <p className="bg-zinc-50 p-2.5 border border-black/10 rounded-sm text-slate-700 max-h-24 overflow-y-auto leading-relaxed select-text">
                "{editingReport.text_content}"
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500">Status / Verdik:</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-rose-700">
                  <input
                    type="radio"
                    name="review_verdict"
                    value="HOAX"
                    checked={reviewVerdict === "HOAX"}
                    onChange={() => setReviewVerdict("HOAX")}
                    className="accent-rose-600"
                  />
                  Hoax / Dusta
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-700">
                  <input
                    type="radio"
                    name="review_verdict"
                    value="REAL"
                    checked={reviewVerdict === "REAL"}
                    onChange={() => setReviewVerdict("REAL")}
                    className="accent-emerald-600"
                  />
                  Fakta / Absah
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500">Catatan Klarifikasi:</span>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full border-2 border-black p-2 h-20 resize-none outline-none focus:bg-stone-50"
                placeholder="Tuliskan alasan verifikasi atau catatan klarifikasi resmi di sini..."
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => setEditingReport(null)}
                className="px-4 py-2 border-2 border-black bg-white font-bold hover:bg-zinc-100"
              >
                BATAL
              </button>
              <button
                onClick={() => handleSaveReview(editingReport.id)}
                className="px-4 py-2 border-2 border-black bg-zinc-950 text-white font-bold hover:bg-zinc-800"
              >
                SIMPAN REVIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs animate-fade-in">
          <div className="brutalist-card w-full max-w-sm p-6 bg-white border-4 border-black shadow-[8px_8px_0px_#000] relative flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle size={24} className="shrink-0" />
              <h3 className="font-heading text-base font-black uppercase tracking-tight text-zinc-950">
                {confirmConfig.title}
              </h3>
            </div>
            
            <p className="text-[#18181b] font-medium leading-relaxed">
              {confirmConfig.message}
            </p>

            <div className="flex gap-3 justify-end mt-2">
              <button
                onClick={() => setConfirmConfig({ isOpen: false, title: "", message: "", onConfirm: null })}
                className="px-4 py-2 border-2 border-black bg-white font-bold hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[2px_2px_0px_#000]"
              >
                BATAL
              </button>
              <button
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                  setConfirmConfig({ isOpen: false, title: "", message: "", onConfirm: null });
                }}
                className="px-4 py-2 border-2 border-black bg-rose-600 text-white font-bold hover:bg-rose-700 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[2px_2px_0px_#000]"
              >
                KONFIRMASI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono text-xs animate-fade-in">
          <div className="brutalist-card w-full max-w-sm p-6 bg-white border-4 border-black shadow-[8px_8px_0px_#000] relative flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              {alertConfig.type === "success" ? (
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertOctagon size={24} className="text-rose-600 shrink-0" />
              )}
              <h3 className="font-heading text-base font-black uppercase tracking-tight text-zinc-950">
                {alertConfig.title}
              </h3>
            </div>
            
            <p className="text-[#18181b] font-medium leading-relaxed">
              {alertConfig.message}
            </p>

            <div className="flex justify-end mt-2">
              <button
                onClick={() => setAlertConfig({ isOpen: false, title: "", message: "", type: "success" })}
                className="px-6 py-2 border-2 border-black bg-zinc-950 text-white font-bold hover:bg-zinc-800 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all shadow-[2px_2px_0px_#000]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon, bg, border }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`brutalist-card p-5 flex items-center gap-4 ${bg} border-2 ${border} border-black`}
    >
      <div className="p-3 bg-white border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-md">
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase text-zinc-600 tracking-wider mb-1">{title}</h3>
        <p className="text-3xl font-black">{value}</p>
      </div>
    </motion.div>
  );
}
