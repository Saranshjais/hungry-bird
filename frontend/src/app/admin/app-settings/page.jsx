"use client";

import { useState } from "react";
import { Image, Bell, Settings, UploadCloud, Smartphone, Activity, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AppSettings() {
  const [activeTab, setActiveTab] = useState("banners");
  const [loading, setLoading] = useState(false);

  // Banners State
  const [banners, setBanners] = useState([
    { id: 1, title: "Top Trending Vendors", imageUrl: "https://via.placeholder.com/600x250/f97316/ffffff?text=Trending+Vendors", isActive: true },
    { id: 2, title: "Hidden Gems in City", imageUrl: "https://via.placeholder.com/600x250/10b981/ffffff?text=Hidden+Gems", isActive: false },
  ]);

  // Notifications State
  const [notification, setNotification] = useState({ title: "", body: "", target: "all" });

  // System Settings State
  const [systemConfig, setSystemConfig] = useState({
    maintenanceMode: false,
    minAppVersion: "1.0.4",
    currentAppVersion: "1.1.0",
    maintenanceMessage: "HungryBird is currently down for scheduled maintenance. We will be back shortly!"
  });

  const handleToggleBanner = (id) => {
    setBanners(banners.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
  };

  const handleSendNotification = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert(`Push notification sent to ${notification.target} users!`);
      setNotification({ title: "", body: "", target: "all" });
    }, 800);
  };

  const handleSaveSystemConfig = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("App configuration saved successfully.");
    }, 600);
  };

  return (
    <div className="font-sans pb-20">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0 leading-none">Mobile App Settings</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Control the mobile experience, send push notifications, and manage app configuration.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <button 
          onClick={() => setActiveTab("banners")}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'banners' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Image size={18} /> Home Banners
        </button>
        <button 
          onClick={() => setActiveTab("push")}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'push' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Bell size={18} /> Push Notifications
        </button>
        <button 
          onClick={() => setActiveTab("system")}
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'system' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <Settings size={18} /> App Configuration
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* --- BANNERS TAB --- */}
        {activeTab === "banners" && (
          <motion.div key="banners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Add New Banner */}
              <div className="admin-card h-fit">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><UploadCloud size={18} className="text-brand-500"/> Upload Banner</h3>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer mb-4">
                  <Image size={32} className="text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Click to upload image</p>
                  <p className="text-xs text-slate-500 mt-1">Recommended: 1200x500px (JPG/PNG)</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Banner Title (Internal)</label>
                  <input type="text" placeholder="e.g. Street Food Festival" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 mb-4 text-sm" />
                </div>
                <button className="admin-btn admin-btn-primary w-full">Save & Upload</button>
              </div>

              {/* Active Banners List */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {banners.map((banner) => (
                  <div key={banner.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-center shadow-sm relative overflow-hidden">
                    <img src={banner.imageUrl} alt={banner.title} className="w-40 h-20 object-cover rounded-lg border border-slate-100" />
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{banner.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">Status: <span className={banner.isActive ? "text-emerald-600 font-bold" : "text-slate-400 font-bold"}>{banner.isActive ? "Active on App" : "Inactive"}</span></p>
                    </div>
                    <div>
                      <button 
                        onClick={() => handleToggleBanner(banner.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${banner.isActive ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}
                      >
                        {banner.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </motion.div>
        )}

        {/* --- PUSH NOTIFICATIONS TAB --- */}
        {activeTab === "push" && (
          <motion.div key="push" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="admin-card h-fit">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><Send size={18} className="text-blue-500"/> Compose Broadcast</h3>
                <form onSubmit={handleSendNotification} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Audience</label>
                    <select 
                      value={notification.target}
                      onChange={e => setNotification({...notification, target: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    >
                      <option value="all">All Registered Users</option>
                      <option value="active">Active Users (last 7 days)</option>
                      <option value="inactive">Inactive Users (30+ days)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notification Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 🌶️ New Spicy Spots!" 
                      value={notification.title}
                      onChange={e => setNotification({...notification, title: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Message Body</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="e.g. Discover the best new chaat spots added this week near you." 
                      value={notification.body}
                      onChange={e => setNotification({...notification, body: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none" 
                    />
                  </div>
                  <button type="submit" disabled={loading} className="admin-btn bg-blue-600 text-white hover:bg-blue-700 w-full mt-2">
                    {loading ? "Sending..." : "Broadcast Notification"}
                  </button>
                </form>
              </div>

              {/* Live Preview */}
              <div className="flex flex-col items-center pt-8">
                <div className="relative w-[300px] h-[600px] bg-slate-900 rounded-[40px] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col">
                  {/* Notch */}
                  <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-2xl w-40 mx-auto z-20"></div>
                  
                  {/* Wallpaper */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20"></div>
                  
                  {/* Mock Screen Content */}
                  <div className="relative z-10 flex flex-col h-full pt-16 px-4">
                    <div className="text-white text-center opacity-50 text-sm mb-4">10:41 AM</div>
                    
                    {/* The Notification Card */}
                    <motion.div 
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring" }}
                      className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg mb-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-brand-500 rounded flex items-center justify-center">
                          <Smartphone size={12} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">HungryBird</span>
                        <span className="text-xs text-slate-400 ml-auto">now</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{notification.title || "Notification Title"}</h4>
                      <p className="text-sm text-slate-600 mt-1 leading-snug">{notification.body || "This is how your message will appear on a user's lock screen."}</p>
                    </motion.div>

                  </div>
                </div>
                <p className="text-sm text-slate-500 font-medium mt-6">Live iOS Preview</p>
              </div>

            </div>
          </motion.div>
        )}

        {/* --- SYSTEM CONFIG TAB --- */}
        {activeTab === "system" && (
          <motion.div key="system" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              
              <div className="admin-card border-l-4 border-l-amber-500">
                <h3 className="font-bold text-lg text-slate-800 mb-1 flex items-center gap-2"><Activity size={18} className="text-amber-500"/> System Maintenance</h3>
                <p className="text-xs text-slate-500 mb-6">Put the mobile app into maintenance mode during backend upgrades. Users will not be able to log in.</p>
                
                <form onSubmit={handleSaveSystemConfig} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-sm text-slate-800">Enable Maintenance Mode</div>
                      <div className="text-xs text-slate-500">Block all traffic to the mobile app.</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={systemConfig.maintenanceMode}
                        onChange={() => setSystemConfig({...systemConfig, maintenanceMode: !systemConfig.maintenanceMode})}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Maintenance Message</label>
                    <textarea 
                      disabled={!systemConfig.maintenanceMode}
                      rows={3}
                      value={systemConfig.maintenanceMessage}
                      onChange={e => setSystemConfig({...systemConfig, maintenanceMessage: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm resize-none disabled:opacity-50" 
                    />
                  </div>

                  <button type="submit" disabled={loading} className="admin-btn admin-btn-primary mt-2">
                    Save Config
                  </button>
                </form>
              </div>

              <div className="admin-card border-l-4 border-l-purple-500 h-fit">
                <h3 className="font-bold text-lg text-slate-800 mb-1 flex items-center gap-2"><Smartphone size={18} className="text-purple-500"/> Version Control</h3>
                <p className="text-xs text-slate-500 mb-6">Force older versions of the app to update via the App Store / Play Store.</p>
                
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Current App Version</label>
                    <input 
                      type="text" 
                      value={systemConfig.currentAppVersion}
                      disabled
                      className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Minimum Required Version</label>
                    <input 
                      type="text" 
                      value={systemConfig.minAppVersion}
                      onChange={e => setSystemConfig({...systemConfig, minAppVersion: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-mono" 
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Users below this version will be locked out and forced to update.</p>
                  </div>
                  
                  <button onClick={handleSaveSystemConfig} className="admin-btn bg-purple-600 text-white hover:bg-purple-700 mt-2">
                    Update Requirements
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
