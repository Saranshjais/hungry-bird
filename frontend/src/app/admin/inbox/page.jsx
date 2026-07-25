"use client";

import { useState, useEffect } from "react";
import { Mail, CheckCircle, Clock, Search, Filter } from "lucide-react";
import { motion } from "motion/react";
import CustomSelect from "../components/CustomSelect";

export default function AdminInbox() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = sessionStorage.getItem("admin_token");
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/inbox", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        } else {
          // Fallback dummy data if backend route is not ready
          setMessages(getDummyData());
        }
      } catch (err) {
        console.error("Failed to fetch messages", err);
        setMessages(getDummyData());
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const getDummyData = () => [
    { id: 1, name: "Rahul Sharma", email: "rahul.s@example.com", subject: "Partnership Inquiry", message: "Hi, I own a chain of food stalls and want to partner with HungryBird.", status: "unread", date: "2024-03-20T10:30:00Z" },
    { id: 2, name: "Priya Desai", email: "priya.d@example.com", subject: "Bug Report", message: "The map feature is not loading on my iPhone 13.", status: "read", date: "2024-03-19T14:15:00Z" },
  ];

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "unread" ? "read" : "unread";
    
    // Optimistic UI update
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, status: newStatus } : m));

    try {
      const token = sessionStorage.getItem("admin_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"}/api/admin/inbox/${id}`, {
        method: "PUT",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "read", label: "Read" },
    { value: "unread", label: "Unread" },
  ];

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Contact Inbox</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage incoming support and partnership messages.</p>
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
            placeholder="Search by sender name or subject..."
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
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <Mail size={40} className="mx-auto text-slate-200 mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Inbox Zero!</h3>
            <p className="text-slate-400 text-sm">You have no new messages at the moment.</p>
          </div>
        ) : (
          <div className="admin-table-container overflow-hidden">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Message Preview</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((msg) => (
                  <tr key={msg.id} className={msg.status === "unread" ? "bg-brand-50/30 font-semibold" : ""}>
                    <td>
                      {msg.status === "unread" ? (
                        <span className="flex items-center gap-1.5 text-brand-600 bg-brand-100 px-2 py-1 rounded-full text-xs w-fit">
                          <Clock size={12} /> New
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-full text-xs w-fit">
                          <CheckCircle size={12} /> Read
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="text-slate-800 whitespace-nowrap">{msg.name}</div>
                      <div className="text-xs text-slate-500 font-normal">{msg.email}</div>
                    </td>
                    <td className="text-slate-700 whitespace-nowrap">{msg.subject}</td>
                    <td className="text-slate-500 max-w-[150px] sm:max-w-[200px] truncate" title={msg.message}>
                      {msg.message}
                    </td>
                    <td className="text-slate-500 text-sm whitespace-nowrap">
                      {new Date(msg.date).toLocaleDateString()}
                    </td>
                    <td>
                      <button 
                        onClick={() => toggleStatus(msg.id, msg.status)}
                        className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors whitespace-nowrap ${
                          msg.status === "unread" 
                            ? "border-brand-200 text-brand-600 hover:bg-brand-50" 
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Mark as {msg.status === "unread" ? "Read" : "Unread"}
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
