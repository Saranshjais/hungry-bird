"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Filter, MapPin, ChevronDown, Check, X, Edit, Save, UploadCloud, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Custom Dropdown Component
function CustomSelect({ value, onChange, options, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative group min-w-[160px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-700 font-medium capitalize"
      >
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
          <Icon size={16} />
        </div>
        <span>{selectedOption.label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                    value === opt.value ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="capitalize">{opt.label}</span>
                  {value === opt.value && <Check size={14} className="text-brand-500" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVendor, setEditingVendor] = useState(null);
  
  // Bulk upload
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://127.0.0.1:5000/api/admin/vendors/bulk-upload", {
        method: 'POST',
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchVendors();
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://127.0.0.1:5000/api/admin/vendors", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this vendor? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://127.0.0.1:5000/api/admin/vendors/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchVendors(); // refresh list
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete vendor");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://127.0.0.1:5000/api/admin/vendors/${editingVendor.id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: editingVendor.name,
          cuisine_type: editingVendor.cuisine_type,
          is_hidden_gem: editingVendor.is_hidden_gem,
          is_famous: editingVendor.is_famous,
          verified_status: editingVendor.verified_status
        })
      });
      if (res.ok) {
        setEditingVendor(null);
        fetchVendors();
      } else {
        const data = await res.json();
        alert("Error updating vendor: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update vendor.");
    }
  };

  // Derive unique cities for dropdown
  const uniqueCities = useMemo(() => {
    const cities = vendors.map(v => v.city_name).filter(Boolean);
    return [...new Set(cities)];
  }, [vendors]);

  const cityOptions = [
    { value: "all", label: "All Cities" },
    ...uniqueCities.map(c => ({ value: c, label: c }))
  ];

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "verified", label: "Verified" },
    { value: "pending", label: "Pending" }
  ];

  // Apply filters
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        v.name.toLowerCase().includes(searchLower) || 
        (v.cuisine_type || "").toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === "all" || v.verified_status === statusFilter;
      const matchesCity = cityFilter === "all" || v.city_name === cityFilter;
      
      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [vendors, searchQuery, statusFilter, cityFilter]);

  return (
    <div>
      <div className="admin-page-header flex-col items-start gap-4 md:flex-row md:items-center justify-between">
        <h1>Manage Vendors</h1>
        
        <div>
          <input 
            type="file" 
            accept=".csv, .xlsx" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="admin-btn admin-btn-primary flex items-center gap-2"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {uploading ? "Uploading..." : "Bulk Upload (.csv, .xlsx)"}
          </button>
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
            placeholder="Search by vendor name or cuisine..."
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
          <div className="p-8 text-center text-slate-500">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No vendors found in the database.</div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <Search size={32} className="text-slate-300 mb-2" />
            <p>No vendors match your current filters.</p>
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
                  <th>Name</th>
                  <th>City</th>
                  <th>Cuisine</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="font-bold text-slate-800">{vendor.name}</td>
                    <td className="capitalize text-slate-600">{vendor.city_name}</td>
                    <td className="text-slate-600">{vendor.cuisine_type || "N/A"}</td>
                    <td className="text-slate-600 font-medium">
                      {vendor.avg_rating ? <span className="text-amber-500">★ {vendor.avg_rating}</span> : "N/A"}
                    </td>
                    <td>
                      <span className={`admin-badge ${vendor.verified_status || "pending"}`}>
                        {vendor.verified_status || "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions flex gap-2">
                        <button 
                          className="admin-btn admin-btn-secondary bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs px-3 py-1.5 flex items-center gap-1.5" 
                          onClick={() => setEditingVendor(vendor)}
                        >
                          <Edit size={14} /> Edit
                        </button>
                        <button 
                          className="admin-btn admin-btn-danger text-xs px-3 py-1.5" 
                          onClick={() => handleDelete(vendor.id)}
                        >
                          Delete
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

      <AnimatePresence>
        {editingVendor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setEditingVendor(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">Edit Vendor</h2>
                <button 
                  onClick={() => setEditingVendor(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vendor Name</label>
                  <input 
                    type="text" 
                    value={editingVendor.name || ""} 
                    onChange={e => setEditingVendor({...editingVendor, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cuisine Type</label>
                  <input 
                    type="text" 
                    value={editingVendor.cuisine_type || ""} 
                    onChange={e => setEditingVendor({...editingVendor, cuisine_type: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                  <select 
                    value={editingVendor.verified_status || "pending"} 
                    onChange={e => setEditingVendor({...editingVendor, verified_status: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex gap-6 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingVendor.is_hidden_gem || false} 
                      onChange={e => setEditingVendor({...editingVendor, is_hidden_gem: e.target.checked})}
                      className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Hidden Gem</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingVendor.is_famous || false} 
                      onChange={e => setEditingVendor({...editingVendor, is_famous: e.target.checked})}
                      className="w-4 h-4 text-brand-500 rounded border-slate-300 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Famous</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setEditingVendor(null)}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/30"
                  >
                    <Save size={16} /> Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
