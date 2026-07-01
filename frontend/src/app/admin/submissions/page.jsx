"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubmissions = async () => {
    try {
      const token = localStorage.getItem("admin_token");
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
      alert(`New vendor submitted: ${newSub.stall_name}!`);
      fetchSubmissions();
    });

    return () => socket.disconnect();
  }, []);

  const handleApprove = async (id) => {
    if (!confirm("Are you sure you want to approve this and create a vendor?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://127.0.0.1:5000/api/admin/submissions/${id}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
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
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`http://127.0.0.1:5000/api/admin/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchSubmissions(); // refresh list
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reject submission");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Vendor Submissions</h1>
      </div>

      <div className="admin-card">
        {loading ? (
          <p>Loading...</p>
        ) : submissions.length === 0 ? (
          <p>No submissions found.</p>
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
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.stall_name}</td>
                    <td>{sub.city_name}</td>
                    <td>{sub.cuisine_type}</td>
                    <td>{sub.submitted_by_name || "Anonymous"}</td>
                    <td>
                      <span className={`admin-badge ${sub.status}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button 
                          className="admin-btn admin-btn-primary" 
                          onClick={() => handleApprove(sub.id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="admin-btn admin-btn-danger" 
                          onClick={() => handleReject(sub.id)}
                        >
                          Reject
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
