"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminAuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
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
          <Link href="/admin" className={`admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}>
            Dashboard
          </Link>
          <Link href="/admin/submissions" className={`admin-nav-link ${pathname === '/admin/submissions' ? 'active' : ''}`}>
            Submissions
          </Link>
          <Link href="/admin/vendors" className={`admin-nav-link ${pathname === '/admin/vendors' ? 'active' : ''}`}>
            Vendors
          </Link>
          <Link href="/admin/cities" className={`admin-nav-link ${pathname === '/admin/cities' ? 'active' : ''}`}>
            Cities
          </Link>
          <Link href="/admin/ratings" className={`admin-nav-link ${pathname === '/admin/ratings' ? 'active' : ''}`}>
            Ratings
          </Link>
          <Link href="/" className="admin-nav-link back-to-site">
            ← Back to Site
          </Link>
        </nav>
      </aside>
      <main className="admin-main">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
          <button 
            className="admin-btn admin-btn-secondary" 
            onClick={() => {
              sessionStorage.removeItem("admin_token");
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

