"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Lock, ArrowRight, ShieldCheck, User } from "lucide-react";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        sessionStorage.setItem("admin_token", data.token);
        router.push("/admin");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-stone-950 font-sans">
      {/* Animated Background Gradients */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-brand-600/20 blur-[120px] pointer-events-none"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-orange-500/10 blur-[100px] pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Glassmorphic Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 sm:p-10 rounded-[2rem] shadow-2xl overflow-hidden relative">
          
          {/* Top highlight glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-60" />

          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-500/30"
            >
              <ShieldCheck className="text-brand-500" size={32} />
            </motion.div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">Admin Portal</h2>
            <p className="text-stone-400 font-medium mt-2 text-sm">Restricted access area.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <User size={18} className="text-stone-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Enter Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-stone-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium placeholder:text-stone-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-stone-400 group-focus-within:text-brand-500 transition-colors" />
              </div>
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-stone-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-medium placeholder:text-stone-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
              />
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.p>
            )}

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-lg shadow-brand-500/25"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  Authenticate <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

