"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, ExternalLink, Trash2, Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/reports", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports || []);
        } else {
          setReports(getDummyData());
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
        setReports(getDummyData());
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const getDummyData = () => [
    { id: 101, type: "review", target_name: "Review by FakeUser", reason: "Inappropriate language", reported_by: "Rahul S.", date: "2024-04-10T14:20:00Z", status: "pending", severity: "high" },
    { id: 102, type: "vendor", target_name: "Sharma Ji Chaat", reason: "Stall permanently closed", reported_by: "Priya D.", date: "2024-04-12T09:15:00Z", status: "pending", severity: "medium" },
    { id: 103, type: "vendor", target_name: "Raju Fast Food", reason: "Wrong location pin", reported_by: "Amit K.", date: "2024-04-05T16:40:00Z", status: "resolved", severity: "low" },
  ];

  const handleAction = async (id, actionType) => {
    const newStatus = actionType === 'dismiss' ? 'dismissed' : 'resolved';
    
    // Optimistic UI update
    setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));

    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"}/api/admin/reports/${id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: actionType, status: newStatus })
      });
    } catch (err) {
      console.error("Failed to action report", err);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const statusOptions = [
    { value: "all", label: "All Reports" },
    { value: "pending", label: "Pending Action" },
    { value: "resolved", label: "Resolved" },
    { value: "dismissed", label: "Dismissed" },
  ];

  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.target_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.reported_by.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filter === "all" || r.status === filter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Reported Content</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Review content flagged by the community.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="relative z-50 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 group z-10">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-500 transition-colors">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by target name or reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <CustomSelect 
            value={filter}
            onChange={setFilter}
            options={statusOptions}
            icon={Filter}
          />
        </div>
      </div>

      <div className="admin-card">

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-10">
            <ShieldCheck size={40} className="mx-auto text-green-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">All clear!</h3>
            <p className="text-slate-400 text-sm">No {filter !== 'all' ? filter : ''} reports to show.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Target / Reason</th>
                  <th>Severity</th>
                  <th>Reporter</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr key={report.id} className={report.status !== "pending" ? "opacity-60 bg-slate-50" : ""}>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        report.type === 'vendor' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {report.type}
                      </span>
                    </td>
                    <td>
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        {report.target_name}
                        <ExternalLink size={14} className="text-slate-400 cursor-pointer hover:text-brand-500" />
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5"><span className="font-semibold text-slate-600">Reason:</span> {report.reason}</div>
                    </td>
                    <td>
                      <span className={`flex items-center gap-1 text-xs font-bold ${
                        report.severity === 'high' ? 'text-rose-600' :
                        report.severity === 'medium' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        <AlertTriangle size={14} />
                        {report.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-slate-600 text-sm font-medium">{report.reported_by}</td>
                    <td className="text-slate-500 text-sm">
                      {new Date(report.date).toLocaleDateString()}
                    </td>
                    <td>
                      {report.status === "pending" ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAction(report.id, 'resolve')}
                            className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md font-semibold border border-green-200 transition-colors"
                          >
                            Take Action
                          </button>
                          <button 
                            onClick={() => handleAction(report.id, 'dismiss')}
                            className="text-xs px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-md font-medium border border-slate-200 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{report.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
