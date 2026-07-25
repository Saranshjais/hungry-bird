"use client";

import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { Search, Filter, MapPin, ChevronDown, Check, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const fetchSubmissions = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
      const res = await fetch(`${API_URL}/api/admin/submissions`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
    const socket = io(API_URL);

    socket.on("new_submission", (newSub) => {
      // Create a notification or just refresh
      fetchSubmissions();
    });

    return () => socket.disconnect();
  }, []);

  const handleApprove = async (id) => {
    if (!confirm("Are you sure you want to approve this and create a vendor?")) return;
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/api/admin/submissions/${id}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchSubmissions(); // refresh list
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to approve submission");
    }
  };

  const handleReject = async (id) => {
    if (!confirm("Are you sure you want to reject and delete this submission?")) return;
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000'}/api/admin/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchSubmissions(); // refresh list
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject submission");
    }
  };

  // Derive unique cities for dropdown
  const uniqueCities = useMemo(() => {
    const cities = submissions.map(v => v.city_name).filter(Boolean);
    return [...new Set(cities)];
  }, [submissions]);

  const cityOptions = [
    { value: "all", label: "All Cities" },
    ...uniqueCities.map(c => ({ value: c, label: c }))
  ];

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" }
  ];

  // Apply filters
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        s.stall_name.toLowerCase().includes(searchLower) || 
        (s.cuisine_type || "").toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesCity = cityFilter === "all" || s.city_name === cityFilter;
      
      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [submissions, searchQuery, statusFilter, cityFilter]);

  return (
    <div>
      <div className="admin-page-header flex-col items-start gap-4 md:flex-row md:items-center">
        <h1>User Submissions</h1>
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
            placeholder="Search by stall name or cuisine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <CustomSelect 
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            icon={Filter}
          />
          <CustomSelect 
            value={cityFilter}
            onChange={setCityFilter}
            options={cityOptions}
            icon={MapPin}
          />
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No user submissions found in the database.</div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <Search size={32} className="text-slate-300 mb-2" />
            <p>No submissions match your current filters.</p>
            <button 
              onClick={() => { setSearchQuery(""); setStatusFilter("all"); setCityFilter("all"); }}
              className="text-brand-500 hover:underline mt-2 text-sm font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Stall Name</th>
                  <th>City</th>
                  <th>Cuisine</th>
                  <th>Submitted By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="font-bold text-slate-800">{sub.stall_name}</td>
                    <td className="capitalize text-slate-600">{sub.city_name}</td>
                    <td className="text-slate-600">{sub.cuisine_type || "N/A"}</td>
                    <td className="text-slate-600 font-medium">{sub.submitted_by_name || "Anonymous"}</td>
                    <td>
                      <span className={`admin-badge ${sub.status || "pending"}`}>
                        {sub.status || "Pending"}
                      </span>
                    </td>
                    <td>
                      {(!sub.status || sub.status === "pending") ? (
                        <div className="admin-actions flex gap-2">
                          <button 
                            className="admin-btn bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 text-xs px-3 py-1.5 flex items-center gap-1.5" 
                            onClick={() => handleApprove(sub.id)}
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button 
                            className="admin-btn admin-btn-danger text-xs px-3 py-1.5 flex items-center gap-1.5" 
                            onClick={() => handleReject(sub.id)}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm italic">No actions available</span>
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

