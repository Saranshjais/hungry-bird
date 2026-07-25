"use client";

import { useState, useEffect } from "react";
import { Tag, Trash2, Edit, Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", icon_url: "" });

  const fetchCategories = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/categories", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      } else {
        setCategories(getDummyData());
      }
    } catch (err) {
      console.error("Failed to fetch categories", err);
      setCategories(getDummyData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const getDummyData = () => [
    { id: 1, name: "South Indian", slug: "south-indian", count: 45 },
    { id: 2, name: "Chaat", slug: "chaat", count: 120 },
    { id: 3, name: "Beverages", slug: "beverages", count: 32 },
    { id: 4, name: "Desserts", slug: "desserts", count: 18 },
  ];

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/categories", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(newCategory)
      });
      
      if (res.ok) {
        alert("Category added successfully");
        setShowAddForm(false);
        setNewCategory({ name: "", slug: "", icon_url: "" });
        fetchCategories();
      } else {
        // Fallback for demo when backend isn't ready
        alert("Simulating addition (backend not ready)");
        setCategories([...categories, { id: Date.now(), name: newCategory.name, slug: newCategory.slug, count: 0 }]);
        setShowAddForm(false);
        setNewCategory({ name: "", slug: "", icon_url: "" });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add category");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    
    // Optimistic delete
    setCategories(categories.filter(c => c.id !== id));
    
    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"}/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [sortFilter, setSortFilter] = useState("az");

  const sortOptions = [
    { value: "az", label: "A-Z" },
    { value: "za", label: "Z-A" },
    { value: "most_vendors", label: "Most Vendors" },
    { value: "least_vendors", label: "Least Vendors" },
  ];

  const filteredCategories = categories
    .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortFilter === "az") return a.name.localeCompare(b.name);
      if (sortFilter === "za") return b.name.localeCompare(a.name);
      if (sortFilter === "most_vendors") return (b.count || 0) - (a.count || 0);
      if (sortFilter === "least_vendors") return (a.count || 0) - (b.count || 0);
      return 0;
    });

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Cuisines & Categories</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage the food categories available for filtering on the app.</p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "+ Add Category"}
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
            placeholder="Search categories by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <CustomSelect 
            value={sortFilter}
            onChange={setSortFilter}
            options={sortOptions}
            icon={Filter}
          />
        </div>
      </div>

      {showAddForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="admin-card mb-6">
          <h3 className="font-bold text-lg mb-4 text-slate-800">Add New Category</h3>
          <form onSubmit={handleAddCategory} className="flex flex-col gap-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category Name</label>
              <input 
                type="text" 
                placeholder="e.g. North Indian" 
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={newCategory.name} 
                onChange={e => setNewCategory({...newCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">URL Slug</label>
              <input 
                type="text" 
                placeholder="e.g. north-indian" 
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={newCategory.slug} 
                onChange={e => setNewCategory({...newCategory, slug: e.target.value})} 
              />
            </div>
            <button type="submit" className="admin-btn admin-btn-primary self-start mt-2">Save Category</button>
          </form>
        </motion.div>
      )}

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl">
            <Tag size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No categories found</h3>
            <p className="text-slate-400 text-sm">Add some cuisines to get started.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>URL Slug</th>
                  <th>Active Vendors</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="font-bold text-slate-800">{cat.name}</td>
                    <td className="text-slate-500 font-mono text-sm">{cat.slug}</td>
                    <td>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                        {cat.count || 0} Vendors
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
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
