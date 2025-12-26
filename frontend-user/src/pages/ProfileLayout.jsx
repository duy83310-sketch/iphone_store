import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function ProfileLayout() {
  return (
    <div style={{ display: "flex", gap: 20, padding: 20 }}>
      <aside style={{ width: 300 }}>
        <div style={{ background: "#111", padding: 8, borderRadius: 8 }}>
          <ul style={{ listStyle: "none", padding: 8, margin: 0 }}>
            <li>
              <NavLink
                to=""
                end
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: isActive ? "#fff" : "#ddd",
                  background: isActive ? "#2b2b2b" : "transparent",
                  textDecoration: "none"
                })}
              >
                Thông tin tài khoản
              </NavLink>
            </li>

            <li>
              <NavLink
                to="addresses"
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: isActive ? "#fff" : "#ddd",
                  background: isActive ? "#2b2b2b" : "transparent",
                  textDecoration: "none"
                })}
              >
                Địa chỉ nhận hàng
              </NavLink>
            </li>

            <li>
              <NavLink
                to="orders"
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: isActive ? "#fff" : "#ddd",
                  background: isActive ? "#2b2b2b" : "transparent",
                  textDecoration: "none"
                })}
              >
                Đơn đặt hàng
              </NavLink>
            </li>

            <li>
              <NavLink
                to="change-password"
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: isActive ? "#fff" : "#ddd",
                  background: isActive ? "#2b2b2b" : "transparent",
                  textDecoration: "none"
                })}
              >
                Đổi mật khẩu
              </NavLink>
            </li>

            <li>
              <NavLink
                to="avatar"
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: isActive ? "#fff" : "#ddd",
                  background: isActive ? "#2b2b2b" : "transparent",
                  textDecoration: "none"
                })}
              >
                Ảnh đại diện
              </NavLink>
            </li>

            <li>
              <NavLink
                to="reviews"
                style={({ isActive }) => ({
                  display: "block",
                  padding: "12px 16px",
                  borderRadius: 6,
                  marginBottom: 10,
                  color: isActive ? "#fff" : "#ddd",
                  background: isActive ? "#2b2b2b" : "transparent",
                  textDecoration: "none"
                })}
              >
                Lịch sử đánh giá sản phẩm
              </NavLink>
            </li>
          </ul>
        </div>
      </aside>

      <main style={{ flex: 1 }}>
        <div style={{ background: "#111", padding: 24, borderRadius: 8 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
