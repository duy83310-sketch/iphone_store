import { useContext, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/pages/login.css";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [data, setData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    setData({ ...data, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!data.email || !data.password) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(res => {
        login(res);  
        navigate("/");
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

        {/* to do later */}
        <div className="login-remember">
          <label>
            <input type="checkbox" /> Nhớ mật khẩu
          </label>
        </div>

        <button className="login-btn">Đăng nhập</button>

        <p className="login-register">
          Bạn chưa có tài khoản?{" "}
          <Link to="/register">Tạo tài khoản ngay</Link>
        </p>
      </form>
    </div>
  );
}
