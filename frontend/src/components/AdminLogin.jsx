import { useState } from "react";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin({ onLogin }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      // Test the token against the stats endpoint
      const response = await fetch("/api/stats", {
        headers: {
          "X-Admin-Token": token,
        },
      });

      if (response.ok) {
        onLogin(token);
      } else {
        setError("Token admin tidak valid atau tidak memiliki akses.");
      }
    } catch (err) {
      setError("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="brutalist-card p-8 max-w-md w-full bg-white"
      >
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 bg-black text-white flex items-center justify-center mb-4 border-2 border-black brutalist-shadow">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Otoritas Admin</h2>
          <p className="text-zinc-600 mt-2 text-sm font-medium">
            Silakan masukkan token akses administrator untuk masuk ke dashboard pemantauan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase mb-2">Admin Token</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-black focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-shadow hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                placeholder="Masukkan token rahasia..."
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-xs font-bold bg-red-50 border border-red-200 p-2 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-4 bg-black text-white font-bold uppercase flex items-center justify-center gap-2 border-2 border-black hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? "Memverifikasi..." : "Akses Dashboard"}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
