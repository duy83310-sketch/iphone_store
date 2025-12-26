import React from "react";

const statusLabel = {
  PENDING: { text: "Chờ xử lý", color: "#f59e0b" },
  CONFIRMED: { text: "Đã xác nhận", color: "#60a5fa" },
  SHIPPING: { text: "Đang giao", color: "#2563eb" },
  DELIVERED: { text: "Đã giao", color: "#16a34a" },
  CANCELLED: { text: "Đã hủy", color: "#ef4444" },
};

export default function StatusBadge({ status }) {
  const key = String(status || "").toUpperCase();
  const s = statusLabel[key] || { text: status, color: "#94a3b8" };
  return (
    <span className="status-badge" style={{ display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: 9999, background: "rgba(0,0,0,0.08)", color: s.color, fontWeight: 600, fontSize: "0.85rem" }}>
      {s.text}
    </span>
  );
}
