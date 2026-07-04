"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Star, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchRatings();
  }, []);

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Vendor Ratings</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Monitor public ratings for all street vendors.</p>
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full" />
          </div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-10">
            <Star size={40} className="mx-auto text-slate-200 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No ratings yet</h3>
            <p className="text-slate-400 text-sm">Vendors will appear here once users start rating them.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>City</th>
                  <th>Cuisine</th>
                  <th>Average Rating</th>
                  <th>Total Ratings</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((v) => (
                  <tr key={v.id}>
                    <td className="font-bold text-slate-800">{v.name}</td>
                    <td>{v.city_name}</td>
                    <td className="text-slate-500">{v.cuisine_type}</td>
                    <td>
                      <div className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-50 w-fit px-2.5 py-1 rounded-full border border-amber-100">
                        <Star size={14} className="fill-amber-500" />
                        {v.avg_rating.toFixed(1)}
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <TrendingUp size={14} className="text-brand-500" />
                        {v.total_ratings} reviews
                      </span>
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

