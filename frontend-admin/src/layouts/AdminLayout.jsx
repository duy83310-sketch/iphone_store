import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "#111a22" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Header />
        <div style={{ padding: 24 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
