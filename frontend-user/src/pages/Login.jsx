import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import { toast } from "react-toastify";
import "../styles/pages/login.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [data, setData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    setData({ ...data, [e.target.name]: e.target.value });
  }

  async function handleForgotPassword() {
    const email = window.prompt("Nhập email để đặt lại mật khẩu:")?.trim();
    if (!email) return;

    const emailRe = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailRe.test(email)) {
      toast.warn("Email không hợp lệ!");
      return;
    }

    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.msg || "Không thể tạo reset token!");
        return;
      }

      toast.success("Đã tạo reset token. Xem token trong terminal backend (nơi chạy server).");

      const token = window.prompt("Nhập reset token:")?.trim();
      if (!token) return;

      const newPassword = window.prompt("Nhập mật khẩu mới (>= 6 ký tự):") || "";
      if (newPassword.length < 6) {
        toast.warn("Mật khẩu mới phải có ít nhất 6 ký tự!");
        return;
      }

      const res2 = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });

      const raw2 = await res2.text();
      const json2 = (() => { try { return JSON.parse(raw2); } catch { return null; } })();

      if (!res2.ok) {
        const msg = (json2 && json2.msg) || raw2 || `Đặt lại mật khẩu thất bại! (HTTP ${res2.status})`;
        toast.error(msg);
        if (String(msg).includes("Token không hợp lệ") || String(msg).includes("hết hạn")) {
          toast.info("Hãy bấm 'Quên mật khẩu?' để tạo token mới rồi thử lại.");
        }
        return;
      }

      toast.success((json2 && json2.msg) || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.");
    } catch {
      toast.error("Lỗi kết nối server!");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!data.email || !data.password) {
      toast.warn("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(async res => {
        const json = await res.json();

        if (!res.ok) {
          toast.error(json.msg || "Đăng nhập thất bại!");
          return;
        }

        // block admin/staff accounts from logging in on the user frontend
        const u = json.user;
        const hasBlockedRole = (usr) => {
          if (!usr) return false;
          const r = usr.role ?? usr.roles ?? null;
          if (!r) return false;
          if (typeof r === 'string') return ['admin','staff'].includes(r.toLowerCase());
          if (Array.isArray(r)) return r.map(x => String(x).toLowerCase()).some(x => ['admin','staff'].includes(x));
          return false;
        };

        if (hasBlockedRole(u)) {
          toast.error("Tài khoản quản trị/nhân viên không được đăng nhập trên trang người dùng.");
          return;
        }

        toast.success("Đăng nhập thành công!");
        login(json);
        navigate("/");
      })
      .catch(() => {
        toast.error("Lỗi kết nối server!");
      });
  }

  return (
    <div className="login-wrapper">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2 className="login-title">Đăng nhập</h2>

        <label>Email:</label>
        <input
          name="email"
          type="email"
          placeholder="Nhập email..."
          onChange={handleChange}
        />

        <label>Mật khẩu:</label>
        <div className="password-field">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Nhập mật khẩu..."
            onChange={handleChange}
          />
          <span
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            <img
              src={showPassword ? "/images/visibility_off.png" : "/images/visibility.png"}
              alt="toggle"
            />
          </span>
        </div>

        {/* to do later
        <div className="login-remember">
          <label>
            <input type="checkbox" /> Nhớ mật khẩu
          </label>
        </div> */}

        <button className="login-btn">Đăng nhập</button>

        {/* Forgot password */}
        <button
          type="button"
          onClick={handleForgotPassword}
          style={{
            marginTop: 10,
            background: "transparent",
            border: "none",
            color: "#f6c177",
            cursor: "pointer",
            textDecoration: "underline"
          }}
        >
          Quên mật khẩu?
        </button>

        <p className="login-register">
          Bạn chưa có tài khoản?{" "}
          <Link to="/register">Tạo tài khoản ngay</Link>
        </p>
      </form>
    </div>
  );
}
