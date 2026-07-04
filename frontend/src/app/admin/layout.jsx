import Link from "next/link";
import "./admin.css";

export const metadata = {
  title: "Admin Panel | HungryBird",
  description: "Admin panel for managing HungryBird vendors and cities",
};

import AdminAuthProvider from "./AdminAuthProvider";

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      {children}
    </AdminAuthProvider>
  );
}

