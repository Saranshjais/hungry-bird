"use client";

import { useState, useEffect } from "react";

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="admin-page-header">
        <h1>Manage Vendors</h1>
      </div>

      <div className="admin-card">
        {loading ? (
          <p>Loading...</p>
        ) : vendors.length === 0 ? (
          <p>No vendors found.</p>
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
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>{vendor.name}</td>
                    <td>{vendor.city_name}</td>
                    <td>{vendor.cuisine_type || "N/A"}</td>
                    <td>{vendor.avg_rating || "N/A"}</td>
                    <td>
                      <span className={`admin-badge ${vendor.verified_status}`}>
                        {vendor.verified_status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button 
                          className="admin-btn admin-btn-danger" 
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
    </div>
  );
}
