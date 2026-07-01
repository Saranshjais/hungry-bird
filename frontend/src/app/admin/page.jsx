"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    vendors: 0,
    submissions: 0,
    cities: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd fetch actual stats from a dashboard endpoint.
    // For now, we'll fetch all lists to count them.
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const headers = { "Authorization": `Bearer ${token}` };
        
        const [vRes, sRes, cRes] = await Promise.all([
          fetch("http://127.0.0.1:5000/api/admin/vendors", { headers }),
          fetch("http://127.0.0.1:5000/api/admin/submissions", { headers }),
          fetch("http://127.0.0.1:5000/api/admin/cities", { headers }),
        ]);
        
        const vendors = await vRes.json();
        const submissions = await sRes.json();
        const cities = await cRes.json();
        
        setStats({
          vendors: vendors.vendors?.length || 0,
          submissions: submissions.submissions?.length || 0,
          cities: cities.cities?.length || 0,
        });
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Dashboard Overview</h1>
      </div>

      <div className="admin-card">
        <h3>Welcome to HungryBird Admin</h3>
        <p>Manage vendors, approve user submissions, and handle city data.</p>
      </div>

      {loading ? (
        <p>Loading stats...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="admin-card" style={{ textAlign: 'center' }}>
            <h2>{stats.submissions}</h2>
            <p>Total Submissions</p>
            <Link href="/admin/submissions" className="admin-btn admin-btn-secondary" style={{ display: 'inline-block', marginTop: '10px', textDecoration: 'none' }}>View Submissions</Link>
          </div>
          <div className="admin-card" style={{ textAlign: 'center' }}>
            <h2>{stats.vendors}</h2>
            <p>Active Vendors</p>
            <Link href="/admin/vendors" className="admin-btn admin-btn-secondary" style={{ display: 'inline-block', marginTop: '10px', textDecoration: 'none' }}>Manage Vendors</Link>
          </div>
          <div className="admin-card" style={{ textAlign: 'center' }}>
            <h2>{stats.cities}</h2>
            <p>Cities</p>
            <Link href="/admin/cities" className="admin-btn admin-btn-secondary" style={{ display: 'inline-block', marginTop: '10px', textDecoration: 'none' }}>Manage Cities</Link>
          </div>
        </div>
      )}
    </div>
  );
}
