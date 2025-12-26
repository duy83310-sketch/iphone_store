import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../services/axiosClient";
import { loginUser } from "../utils/auth";
import { toast } from "react-toastify";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axiosClient.post('/auth/login', { email, password });
      const token = res.data?.token;
      const role = res.data?.user?.role;
      if (!token) return toast.error('Không nhận được token');
      loginUser(token, role);

      // If role not returned, fetch /auth/me to get role and ensure localStorage is set
      if (!role) {
        try {
          const meRes = await axiosClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          const meRole = meRes.data?.role;
          if (meRole) loginUser(token, meRole);
        } catch (err) {
          // ignore: we already logged in, but couldn't fetch user; leave role as-is
          console.warn('Failed to fetch /auth/me after login', err?.response?.data || err.message);
        }
      }

      toast.success('Đăng nhập thành công');
      navigate('/');
    } catch (err) {
      console.error('login', err);
      toast.error(err?.response?.data?.msg || 'Đăng nhập thất bại');
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1220",
      }}
    >
      <div
        style={{
          background: "#0f1a2b",
          padding: 32,
          borderRadius: 12,
          width: 360,
          color: "#fff",
          boxSizing: "border-box",
        }}
      >
        <h2
          style={{
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Admin Login
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />

          <button onClick={handleLogin} style={btnStyle}>
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  )
}
const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "none",
  outline: "none",
  boxSizing: "border-box",
};

const btnStyle = {
  width: "100%",
  padding: 10,
  background: "#3b82f6",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 500,
};
