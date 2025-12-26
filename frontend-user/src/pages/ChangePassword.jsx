import React, { useState } from "react";
import { API } from "../utils/config";
import { toast } from "react-toastify";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  async function handleChangePassword(e) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng điền tất cả các trường");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.msg || "Không thể đổi mật khẩu");
      }

      toast.success("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password error", err);
      toast.error(err.message || "Không thể đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "20px 0" }}>
      <h2 style={{ marginTop: 0, color: "#fff" }}>Đổi mật khẩu</h2>
      <form
        onSubmit={handleChangePassword}
        style={{
          background: "#222",
          borderRadius: 8,
          padding: "20px",
          maxWidth: "500px",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}
      >
        {/* Current Password */}
        <div>
          <label style={{ color: "#fff", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
            Mật khẩu hiện tại
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPasswords.current ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #555",
                background: "#333",
                color: "#fff",
                boxSizing: "border-box",
                paddingRight: "40px"
              }}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={showPasswords.current ? "/images/visibility_off.png" : "/images/visibility.png"}
                alt={showPasswords.current ? "hide" : "show"}
                style={{ width: 20, height: 20 }}
              />
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label style={{ color: "#fff", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
            Mật khẩu mới
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPasswords.new ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #555",
                background: "#333",
                color: "#fff",
                boxSizing: "border-box",
                paddingRight: "40px"
              }}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={showPasswords.new ? "/images/visibility_off.png" : "/images/visibility.png"}
                alt={showPasswords.new ? "hide" : "show"}
                style={{ width: 20, height: 20 }}
              />
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ color: "#fff", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
            Xác nhận mật khẩu mới
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPasswords.confirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Xác nhận mật khẩu mới"
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 6,
                border: "1px solid #555",
                background: "#333",
                color: "#fff",
                boxSizing: "border-box",
                paddingRight: "40px"
              }}
            />
            <button
              type="button"
              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={showPasswords.confirm ? "/images/visibility_off.png" : "/images/visibility.png"}
                alt={showPasswords.confirm ? "hide" : "show"}
                style={{ width: 20, height: 20 }}
              />
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold btn-gold--lg"
        >
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>
    </div>
  );
}

