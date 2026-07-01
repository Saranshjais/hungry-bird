"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminAuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const isLoginPage = pathname === "/admin/login";

    if (!token && !isLoginPage) {
      router.push("/admin/login");
    } else if (token && isLoginPage) {
      router.push("/admin");
    } else {
      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  // Don't render content until auth check completes to prevent flashing protected content
  if (!isAuthenticated && pathname !== "/admin/login") {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading secure area...</div>;
  }

  // If it's the login page, we don't want the sidebar layout, just return children
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>HB Admin</h2>
        </div>
        <nav className="admin-nav">
          <a href="/admin" className="admin-nav-link">Dashboard</a>
          <a href="/admin/submissions" className="admin-nav-link">Submissions</a>
          <a href="/admin/vendors" className="admin-nav-link">Vendors</a>
          <a href="/admin/cities" className="admin-nav-link">Cities</a>
          <a href="/" className="admin-nav-link back-to-site">← Back to Site</a>
        </nav>
      </aside>
      <main className="admin-main">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={() => {
              localStorage.removeItem("admin_token");
              router.push("/admin/login");
            }}
          >
            Logout
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
