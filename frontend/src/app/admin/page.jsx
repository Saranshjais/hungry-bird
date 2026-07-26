"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Store, MapPin, TrendingUp, Play } from "lucide-react";
import { motion } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { name: 'Mon', submissions: 12, vendors: 5 },
  { name: 'Tue', submissions: 19, vendors: 7 },
  { name: 'Wed', submissions: 15, vendors: 8 },
  { name: 'Thu', submissions: 25, vendors: 12 },
  { name: 'Fri', submissions: 22, vendors: 14 },
  { name: 'Sat', submissions: 35, vendors: 20 },
  { name: 'Sun', submissions: 42, vendors: 24 },
];

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
            <div className="admin-metric-card amber">
              <div className="admin-metric-header">
                <div className="admin-metric-icon">
                  <Users size={20} />
                </div>
                <span className="admin-metric-badge">
                  Pending Review
                </span>
              </div>
              <h3 className="admin-metric-value">{stats.submissions}</h3>
              <p className="admin-metric-label">User Submissions</p>
              <Link href="/admin/submissions" className="admin-metric-link">
                Review Submissions <TrendingUp size={14} />
              </Link>
            </div>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card brand">
              <div className="admin-metric-header">
                <div className="admin-metric-icon">
                  <Store size={20} />
                </div>
                <span className="admin-metric-badge">
                  Active
                </span>
              </div>
              <h3 className="admin-metric-value">{stats.vendors}</h3>
              <p className="admin-metric-label">Verified Vendors</p>
              <Link href="/admin/vendors" className="admin-metric-link">
                Manage Vendors <TrendingUp size={14} />
              </Link>
            </div>
          </motion.div>

          <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card blue">
              <div className="admin-metric-header">
                <div className="admin-metric-icon">
                  <MapPin size={20} />
                </div>
              </div>
              <h3 className="admin-metric-value">{stats.cities}</h3>
              <p className="admin-metric-label">Supported Cities</p>
              <Link href="/admin/cities" className="admin-metric-link">
                Manage Regions <TrendingUp size={14} />
              </Link>
            </div>
          </motion.div>

          <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="admin-metric-card rose">
              <div className="admin-metric-header">
                <div className="admin-metric-icon">
                  <Play size={20} />
                </div>
                <span className="admin-metric-badge">
                  Pending Review
                </span>
              </div>
              <h3 className="admin-metric-value">{stats.reels}</h3>
              <p className="admin-metric-label">Video Reels</p>
              <Link href="/admin/reels" className="admin-metric-link">
                Review Videos <TrendingUp size={14} />
              </Link>
            </div>
          </motion.div>

        </div>
      )}

      {!loading && (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 admin-card">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-500" /> Platform Growth (Last 7 Days)
            </h3>
            
            <div className="h-64 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eb6e4b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#eb6e4b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVendors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="submissions" name="Submissions" stroke="#eb6e4b" strokeWidth={3} fillOpacity={1} fill="url(#colorSubmissions)" />
                  <Area type="monotone" dataKey="vendors" name="Active Vendors" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVendors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2 border-t border-slate-100 pt-6">
              <Users size={18} className="text-blue-500" /> Recent Activity
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { time: "10 mins ago", action: "New user registered", detail: "Priya Desai joined the platform", icon: <Users size={16}/>, color: "text-blue-600 bg-blue-50" },
                { time: "1 hour ago", action: "New vendor submission", detail: "Raju Fast Food submitted a request", icon: <Store size={16}/>, color: "text-amber-600 bg-amber-50" },
                { time: "3 hours ago", action: "Report filed", detail: "A review was flagged for inappropriate language", icon: <TrendingUp size={16}/>, color: "text-rose-600 bg-rose-50" },
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
          </div>

          <div className="flex flex-col gap-6">
            <div className="dashboard-list-card">
              <h3 className="font-semibold text-sm text-slate-800 mb-4 uppercase tracking-wider">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                <Link href="/admin/inbox" className="dashboard-list-item hover:bg-slate-50 transition-colors rounded-md -mx-2 px-2">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                    <Users size={14} />
                  </div>
                  <span className="font-medium text-sm text-slate-700 mt-1">Check Support Inbox</span>
                </Link>
                <Link href="/admin/reports" className="dashboard-list-item hover:bg-slate-50 transition-colors rounded-md -mx-2 px-2">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                    <TrendingUp size={14} />
                  </div>
                  <span className="font-medium text-sm text-slate-700 mt-1">Review Flagged Content</span>
                </Link>
                <Link href="/admin/categories" className="dashboard-list-item hover:bg-slate-50 transition-colors rounded-md -mx-2 px-2">
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-600">
                    <Store size={14} />
                  </div>
                  <span className="font-medium text-sm text-slate-700 mt-1">Manage Cuisines</span>
                </Link>
              </div>
            </div>
            
            <div className="system-status-card">
               <h3 className="font-semibold text-sm text-white mb-2 uppercase tracking-wider">System Status</h3>
               <p className="text-slate-400 text-xs mb-4">All services are operating normally.</p>
               <div className="flex flex-col gap-3">
                 <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                   <span className="text-slate-300 text-sm">API Uptime</span>
                   <span className="text-emerald-400 font-mono text-sm">99.99%</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-slate-300 text-sm">Database</span>
                   <span className="text-emerald-400 font-mono text-sm">Healthy</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

