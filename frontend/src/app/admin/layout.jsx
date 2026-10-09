import "./admin.css";
import AdminAuthProvider from "./AdminAuthProvider";

export const metadata = {
  title: "Admin Panel | HungryBird",
  description: "Admin panel for managing HungryBird vendors and cities",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
