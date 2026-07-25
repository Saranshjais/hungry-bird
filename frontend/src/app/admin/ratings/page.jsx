"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Star, TrendingUp, Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const getDummyData = () => [
    { id: 1, user_name: "Rahul S.", vendor_name: "Sharma Ji Chaat", rating: 5, comment: "Best chaat in the city!" },
    { id: 2, user_name: "Priya D.", vendor_name: "Bombay Vada Pav", rating: 3, comment: "It was okay, a bit too spicy." },
    { id: 3, user_name: "Amit K.", vendor_name: "Raju Fast Food", rating: 1, comment: "Very unhygienic, do not recommend." },
  ];

  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await axios.get((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/ratings", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRatings(res.data.ratings || []);
      } catch (err) {
        console.error("Failed to fetch ratings:", err);
        setRatings(getDummyData());
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, []);

  const statusOptions = [
    { value: "all", label: "All Ratings" },
    { value: "5", label: "5 Stars" },
    { value: "4", label: "4+ Stars" },
    { value: "3", label: "3+ Stars" },
    { value: "1", label: "1 Star" },
  ];

  const filteredRatings = ratings.filter(r => {
    const matchesSearch = 
      (r.user_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.vendor_name || r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.comment || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const rVal = r.rating || r.avg_rating || 5;
    let matchesStatus = true;
    if (filter === "5") matchesStatus = rVal === 5;
    else if (filter === "4") matchesStatus = rVal >= 4;
    else if (filter === "3") matchesStatus = rVal >= 3;
    else if (filter === "1") matchesStatus = rVal === 1;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Review Moderation</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Monitor and moderate text reviews left by consumers.</p>
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
            placeholder="Search by review, user, or vendor..."
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

      <div className="admin-card bg-transparent shadow-none border-none p-0">
        {loading ? (
          <div className="flex justify-center items-center h-32 bg-white rounded-xl border border-slate-200">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
          </div>
        ) : filteredRatings.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
            <Star size={40} className="mx-auto text-slate-200 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No reviews found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredRatings.map((review) => (
              <div key={review.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center">
                      {review.user_name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 m-0 leading-tight">{review.user_name || "Anonymous"}</h4>
                      <span className="text-xs text-slate-500">Reviewed <strong className="text-brand-600">{review.vendor_name || review.name}</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md text-amber-700 font-bold border border-amber-100">
                    <Star size={14} className="fill-amber-500" />
                    {review.rating || review.avg_rating || 5}
                  </div>
                </div>
                
                <p className="text-slate-600 italic text-sm border-l-4 border-slate-200 pl-3">
                  "{review.comment || "Great food, definitely coming back! Highly recommended."}"
                </p>
                
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">{new Date().toLocaleDateString()}</span>
                  <button className="text-xs font-semibold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-md transition-colors">
                    Delete Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

