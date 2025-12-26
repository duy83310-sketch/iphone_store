import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { logoutAdmin } from "../utils/auth";
import DashboardIcon from "./icons/DashboardIcon";
import ProductIcon from "./icons/ProductIcon";
import OrderIcon from "./icons/OrderIcon";
import PromotionIcon from "./icons/PromotionIcon";
import SupportIcon from "./icons/SupportIcon";
import StatsIcon from "./icons/StatsIcon";
import UserIcon from "./icons/UserIcon";

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const MENUS = [
    {
      label: "Tổng quan",
      path: "/",
      icon: DashboardIcon,
    },
    {
      label: "Quản lý sản phẩm",
      path: "/products",
      icon: ProductIcon,
    },
    {
      label: "Quản lý đơn hàng",
      path: "/orders",
      icon: OrderIcon,
    },
    {
      label: "Quản lý khách hàng",
      path: "/customers",
      icon: UserIcon,
    },
    {
      label: "Quản lý khuyến mãi",
      path: "/promotions",
      icon: PromotionIcon,
    },
    {
      label: "Yêu cầu hỗ trợ",
      path: "/support-requests",
      icon: SupportIcon,
    },
    {
      label: "Thống kê và báo cáo",
      path: "/reports",
      icon: StatsIcon,
    },
    {
      label: "Quản lý người dùng",
      path: "/users",
      icon: UserIcon,
    },
  ];

  return (
    <div className="admin-sidebar"
      style={{
        width: "15rem",
        background: "#111a22",
        color: "#fff",
        padding: "1.25rem",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "1.875rem",
          top: "1.875rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <img
          src="/images/admin.png"
          alt="Admin avatar"
          style={{ width: "2.5rem", height: "2.5rem", borderRadius: 9999, objectFit: "cover", flex: "0 0 2.5rem" }}
        />

        <div style={{ color: "#fff", lineHeight: 1 }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem" }}>iPhone Admin</h3>
          <p style={{ opacity: 0.6, margin: 0, fontSize: "0.75rem" }}>Trang quản trị</p>
        </div>
      </div>

      <div className="sidebar-menu">
        {MENUS.map((m) => {
          const Icon = m.icon;

          // improved active matching (supports nested routes)
          const active =
            m.path === "/"
              ? pathname === "/"
              : pathname === m.path || pathname.startsWith(m.path + "/");

          return (
            <MenuItem
              key={m.path}
              label={m.label}
              icon={<Icon color="#fff" />}
              active={active}
              onClick={() => navigate(m.path)}
            />
          );
        })}
      </div>

      <div style={{ position: "absolute", bottom: "1.25rem", left: "1.25rem", right: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <MenuItem
          label="Đăng xuất"
          icon={
            <svg width="20" height="22" viewBox="0 0 25 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.20445 22.75C4.66972 22.75 4.21197 22.5596 3.83118 22.1788C3.4504 21.798 3.26 21.3403 3.26 20.8056V7.19444C3.26 6.65972 3.4504 6.20197 3.83118 5.82118C4.21197 5.44039 4.66972 5.25 5.20445 5.25H12.01V7.19444H5.20445V20.8056H12.01V22.75H5.20445ZM15.8989 18.8611L14.5621 17.4514L17.0413 14.9722H9.09334V13.0278H17.0413L14.5621 10.5486L15.8989 9.13889L20.76 14L15.8989 18.8611Z" fill="#fff" />
            </svg>
          }
          onClick={() => {
            logoutAdmin();
            navigate("/login");
          }}
        />
      </div>
    </div>
  );
}

const MenuItem = ({ label, icon, onClick, active }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.625rem 0.75rem",
        borderRadius: "0.5rem",
        cursor: "pointer",
        marginBottom: "0.5rem",
        background: active ? "#137fec" : "#111a22",
        color: "#fff",
        transition: "transform 0.15s ease, background 0.15s ease",
        transform: hover ? "scale(1.03)" : "scale(1)",
      }}
    >
      {icon}
      <span style={{ color: "#fff" }}>{label}</span>
    </div>
  );
};

