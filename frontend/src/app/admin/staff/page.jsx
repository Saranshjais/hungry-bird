"use client";

import { useState, useEffect } from "react";
import { UserPlus, ShieldAlert, Key, Trash2, Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "moderator" });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/staff", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setStaff(data.staff || []);
        } else {
          setStaff(getDummyData());
        }
      } catch (err) {
        console.error("Failed to fetch staff", err);
        setStaff(getDummyData());
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const getDummyData = () => [
    { id: 1, name: "Super Admin", email: "admin@hungrybird.com", role: "super_admin", last_login: "2024-04-12T08:30:00Z" },
    { id: 2, name: "Neha Sharma", email: "neha.s@hungrybird.com", role: "moderator", last_login: "2024-04-11T14:20:00Z" },
    { id: 3, name: "Rohan Das", email: "rohan.d@hungrybird.com", role: "support", last_login: "2024-04-10T09:15:00Z" },
  ];

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/staff", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(newAdmin)
      });
      
      if (res.ok) {
        alert("Admin account created successfully");
        setShowAddForm(false);
        setNewAdmin({ name: "", email: "", role: "moderator" });
        // Re-fetch
      } else {
        // Fallback for demo
        alert("Simulating admin creation (backend not ready). An invite email would be sent.");
        setStaff([...staff, { id: Date.now(), name: newAdmin.name, email: newAdmin.email, role: newAdmin.role, last_login: null }]);
        setShowAddForm(false);
        setNewAdmin({ name: "", email: "", role: "moderator" });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to create admin");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to revoke this user's admin access?")) return;
    
    // Optimistic delete
    setStaff(staff.filter(s => s.id !== id));
    
    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"}/api/admin/staff/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to delete admin", err);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const roleOptions = [
    { value: "all", label: "All Roles" },
    { value: "super_admin", label: "Super Admin" },
    { value: "moderator", label: "Moderator" },
    { value: "support", label: "Support" },
    { value: "city_manager", label: "City Manager" },
    { value: "app_manager", label: "App Manager" },
  ];

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Staff Admins</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage internal roles, permissions, and team access.</p>
        </div>
        <button className="admin-btn admin-btn-primary flex items-center gap-2" onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus size={16} /> {showAddForm ? "Cancel" : "Invite Admin"}
        </button>
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
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <CustomSelect 
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleOptions}
            icon={Filter}
          />
        </div>
      </div>

      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="admin-card mb-6 border-l-4 border-l-brand-500">
          <h3 className="font-bold text-lg mb-4 text-slate-800 flex items-center gap-2">
            <Key size={18} className="text-brand-500" /> Create New Admin Account
          </h3>
          <form onSubmit={handleAddAdmin} className="flex flex-col gap-4 max-w-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  value={newAdmin.name} 
                  onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@hungrybird.com"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  value={newAdmin.email} 
                  onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Permission Role</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-2">
                
                <label className={`cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col ${newAdmin.role === 'super_admin' ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="super_admin" checked={newAdmin.role === 'super_admin'} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${newAdmin.role === 'super_admin' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300'}`}>
                      {newAdmin.role === 'super_admin' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold text-sm text-indigo-900 truncate">Super Admin</span>
                  </div>
                  <p className="text-xs text-indigo-700/70 ml-6 leading-tight">Full unrestricted access.</p>
                </label>

                <label className={`cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col ${newAdmin.role === 'moderator' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="moderator" checked={newAdmin.role === 'moderator'} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${newAdmin.role === 'moderator' ? 'border-brand-500 bg-brand-500' : 'border-slate-300'}`}>
                      {newAdmin.role === 'moderator' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold text-sm text-brand-900 truncate">Moderator</span>
                  </div>
                  <p className="text-xs text-brand-700/70 ml-6 leading-tight">Manage vendors & reviews.</p>
                </label>

                <label className={`cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col ${newAdmin.role === 'support' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="support" checked={newAdmin.role === 'support'} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${newAdmin.role === 'support' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                      {newAdmin.role === 'support' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold text-sm text-emerald-900 truncate">Support</span>
                  </div>
                  <p className="text-xs text-emerald-700/70 ml-6 leading-tight">Read-only, Inbox & Reports.</p>
                </label>

                <label className={`cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col ${newAdmin.role === 'city_manager' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="city_manager" checked={newAdmin.role === 'city_manager'} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${newAdmin.role === 'city_manager' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                      {newAdmin.role === 'city_manager' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold text-sm text-blue-900 truncate">City Manager</span>
                  </div>
                  <p className="text-xs text-blue-700/70 ml-6 leading-tight">Manage supported cities.</p>
                </label>
                
                <label className={`cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col ${newAdmin.role === 'app_manager' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <input type="radio" name="role" value="app_manager" checked={newAdmin.role === 'app_manager'} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})} className="hidden" />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${newAdmin.role === 'app_manager' ? 'border-purple-500 bg-purple-500' : 'border-slate-300'}`}>
                      {newAdmin.role === 'app_manager' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="font-bold text-sm text-purple-900 truncate">App Manager</span>
                  </div>
                  <p className="text-xs text-purple-700/70 ml-6 leading-tight">Manage Banners & Settings.</p>
                </label>
                
              </div>
            </div>

            <button type="submit" className="admin-btn admin-btn-primary self-start mt-4">Send Invite Link</button>
          </form>
        </motion.div>
      )}

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <ShieldAlert size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No staff found</h3>
            <p className="text-slate-400 text-sm">Add some team members to help manage the platform.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Permission Role</th>
                  <th>Last Login</th>
                  <th className="text-right">Access</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          member.role === 'super_admin' ? 'bg-indigo-100 text-indigo-700' :
                          member.role === 'moderator' ? 'bg-brand-100 text-brand-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
                        member.role === 'super_admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        member.role === 'moderator' ? 'bg-brand-50 text-brand-700 border-brand-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-slate-500 text-sm">
                      {member.last_login ? new Date(member.last_login).toLocaleString() : 'Never logged in'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => handleDelete(member.id)}
                          className="flex items-center gap-1.5 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold"
                        >
                          <Trash2 size={16} /> Revoke
                        </button>
                      </div>
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
