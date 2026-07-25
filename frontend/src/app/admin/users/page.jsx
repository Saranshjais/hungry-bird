"use client";

import { useState, useEffect } from "react";
import { User, Shield, ShieldOff, Search, MoreVertical, Filter } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/users", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        } else {
          setUsers(getDummyData());
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
        setUsers(getDummyData());
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getDummyData = () => [
    { id: 1, name: "Arjun Verma", email: "arjun.v@example.com", role: "consumer", joined: "2024-01-15T08:00:00Z", status: "active", reviews_count: 14 },
    { id: 2, name: "Sneha Patel", email: "sneha.p@example.com", role: "moderator", joined: "2023-11-20T12:30:00Z", status: "active", reviews_count: 52 },
    { id: 3, name: "Fake User99", email: "spam99@example.com", role: "consumer", joined: "2024-03-24T18:45:00Z", status: "suspended", reviews_count: 0 },
  ];

  const toggleUserStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    
    // Optimistic update
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));

    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"}/api/admin/users/${id}/status`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Failed to update user status", err);
    }
  };

  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">User Management</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">View, manage, and moderate registered users.</p>
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
            placeholder="Search users by name or email..."
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
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <User size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No users found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Contributions</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={user.status === "suspended" ? "opacity-60 bg-red-50/20" : ""}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{user.name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        user.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        user.role === 'moderator' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="text-slate-600 font-medium text-sm">
                      {user.reviews_count} Reviews
                    </td>
                    <td className="text-slate-500 text-sm">
                      {new Date(user.joined).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleUserStatus(user.id, user.status)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold transition-colors ${
                          user.status === 'active' 
                            ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' 
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {user.status === 'active' ? (
                          <><ShieldOff size={14}/> Suspend</>
                        ) : (
                          <><Shield size={14}/> Reactivate</>
                        )}
                      </button>
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
