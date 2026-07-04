"use client";

import { useState, useEffect } from "react";

export default function AdminCities() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCity, setNewCity] = useState({ name: "", slug: "", state: "", country: "India", lat: "", lng: "" });

  const fetchCities = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/cities", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCities(data.cities || []);
      }
    } catch (err) {
      console.error("Failed to fetch cities", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  const handleAddCity = async (e) => {
    e.preventDefault();
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/cities", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(newCity)
      });
      const data = await res.json();
      if (res.ok) {
        alert("City added successfully");
        setShowAddForm(false);
        setNewCity({ name: "", slug: "", state: "", country: "India", lat: "", lng: "" });
        fetchCities();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add city");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1>Manage Cities</h1>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "+ Add City"}
        </button>
      </div>

      {showAddForm && (
        <div className="admin-card" style={{ marginBottom: "30px" }}>
          <h3>Add New City</h3>
          <form onSubmit={handleAddCity} style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "400px" }}>
            <input 
              type="text" 
              placeholder="City Name (e.g. Jaipur)" 
              required
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
              value={newCity.name} 
              onChange={e => setNewCity({...newCity, name: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="Slug (e.g. jaipur)" 
              required
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
              value={newCity.slug} 
              onChange={e => setNewCity({...newCity, slug: e.target.value})} 
            />
            <input 
              type="text" 
              placeholder="State (e.g. Rajasthan)" 
              style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
              value={newCity.state} 
              onChange={e => setNewCity({...newCity, state: e.target.value})} 
            />
            <button type="submit" className="admin-btn admin-btn-primary">Save City</button>
          </form>
        </div>
      )}

      <div className="admin-card">
        {loading ? (
          <p>Loading...</p>
        ) : cities.length === 0 ? (
          <p>No cities found.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>State</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city.id}>
                    <td>{city.id}</td>
                    <td>{city.name}</td>
                    <td>{city.slug}</td>
                    <td>{city.state || "N/A"}</td>
                    <td>{city.country}</td>
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

