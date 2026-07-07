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
    </div>
  );
}

