"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Store, MapPin, TrendingUp, Play } from "lucide-react";
import { motion } from "motion/react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    vendors: 0,
    submissions: 0,
    cities: 0,
    reels: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        const headers = { "Authorization": `Bearer ${token}` };
        
        const [vRes, sRes, cRes, rRes] = await Promise.all([
          fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/vendors", { headers }),
          fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/submissions", { headers }),
          fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/cities", { headers }),
          fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/reels/pending", { headers }),
        ]);
        
        const vendors = await vRes.json();
        const submissions = await sRes.json();
        const cities = await cRes.json();
        const reels = await rRes.json();
        
        setStats({
          vendors: vendors.vendors?.length || 0,
          submissions: submissions.submissions?.length || 0,
          cities: cities.cities?.length || 0,
          reels: reels.reels?.length || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    }),
  };

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Welcome back to the HungryBird Admin Portal.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full"
          />
        </div>
      ) : (
        <div className="admin-dashboard-grid">
          
          <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card group">
              <div className="admin-metric-bg-circle bg-amber" />
              <div className="admin-metric-header">
                <div className="admin-metric-icon bg-amber">
                  <Users size={24} />
                </div>
                <span className="admin-metric-badge bg-amber">
                  Pending Review
                </span>
              </div>
              <h3 className="admin-metric-value">{stats.submissions}</h3>
              <p className="admin-metric-label">User Submissions</p>
              <Link href="/admin/submissions" className="admin-metric-link text-amber">
                Review Submissions <TrendingUp size={16} />
              </Link>
            </div>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card group">
              <div className="admin-metric-bg-circle bg-brand" />
              <div className="admin-metric-header">
                <div className="admin-metric-icon bg-brand">
                  <Store size={24} />
                </div>
                <span className="admin-metric-badge bg-brand">
                  Active
                </span>
              </div>
              <h3 className="admin-metric-value">{stats.vendors}</h3>
              <p className="admin-metric-label">Verified Vendors</p>
              <Link href="/admin/vendors" className="admin-metric-link text-brand">
                Manage Vendors <TrendingUp size={16} />
              </Link>
            </div>
          </motion.div>

          <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card group">
              <div className="admin-metric-bg-circle bg-blue" />
              <div className="admin-metric-header">
                <div className="admin-metric-icon bg-blue">
                  <MapPin size={24} />
                </div>
              </div>
              <h3 className="admin-metric-value">{stats.cities}</h3>
              <p className="admin-metric-label">Supported Cities</p>
              <Link href="/admin/cities" className="admin-metric-link text-blue">
                Manage Regions <TrendingUp size={16} />
              </Link>
            </div>
          </motion.div>

          <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card group">
              <div className="admin-metric-bg-circle bg-rose" />
              <div className="admin-metric-header">
                <div className="admin-metric-icon bg-rose">
                  <Play size={24} />
                </div>
                <span className="admin-metric-badge bg-rose">
                  Pending Review
                </span>
              </div>
              <h3 className="admin-metric-value">{stats.reels}</h3>
              <p className="admin-metric-label">Video Reels</p>
              <Link href="/admin/reels" className="admin-metric-link text-rose">
                Review Videos <TrendingUp size={16} />
              </Link>
            </div>
          </motion.div>

        </div>
      )}

      {!loading && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 admin-card">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-500" /> Recent Platform Activity
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { time: "10 mins ago", action: "New user registered", detail: "Priya Desai joined the platform", icon: <Users size={16}/>, color: "text-blue-600 bg-blue-50" },
                { time: "1 hour ago", action: "New vendor submission", detail: "Raju Fast Food submitted a request", icon: <Store size={16}/>, color: "text-amber-600 bg-amber-50" },
                { time: "3 hours ago", action: "Report filed", detail: "A review was flagged for inappropriate language", icon: <TrendingUp size={16}/>, color: "text-rose-600 bg-rose-50" },
                { time: "5 hours ago", action: "New video reel", detail: "A 15s reel was uploaded in Mumbai", icon: <Play size={16}/>, color: "text-purple-600 bg-purple-50" },
              ].map((act, i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className={`p-2 rounded-full ${act.color}`}>
                    {act.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 text-sm m-0">{act.action}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{act.detail}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors">
              View All Activity
            </button>
          </div>

          <div className="admin-card">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <Link href="/admin/inbox" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center text-slate-500 group-hover:text-brand-600">
                  <Users size={14} />
                </div>
                <span className="font-semibold text-sm text-slate-700 group-hover:text-brand-700">Check Support Inbox</span>
              </Link>
              <Link href="/admin/reports" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-rose-500 hover:bg-rose-50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-rose-100 flex items-center justify-center text-slate-500 group-hover:text-rose-600">
                  <TrendingUp size={14} />
                </div>
                <span className="font-semibold text-sm text-slate-700 group-hover:text-rose-700">Review Flagged Content</span>
              </Link>
              <Link href="/admin/categories" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center text-slate-500 group-hover:text-amber-600">
                  <Store size={14} />
                </div>
                <span className="font-semibold text-sm text-slate-700 group-hover:text-amber-700">Manage Cuisines</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

