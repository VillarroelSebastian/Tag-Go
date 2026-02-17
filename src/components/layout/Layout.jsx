import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../../styles/admin.css";

export default function Layout() {
  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="main">
        <Header />
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
