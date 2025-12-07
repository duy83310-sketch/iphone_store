import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/pages/login.css";

export default function Register() {
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const navigate = useNavigate();

  function handleChange(e) {
    setData({ ...data, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!data.name || !data.email || !data.password) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    if (data.password !== data.confirmPassword) {
      alert("Mật khẩu nhập lại không khớp!");
      return;
    }

    fetch("http://localhost:5000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(res => {
        alert(res.msg);
        navigate("/login");
      })
      .catch(err => console.log(err));
  }

  return (
    <div className="login-wrapper">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2 className="login-title">Đăng ký</h2>

        <label>Tên người dùng:</label>
        <input
          name="name"
          type="text"
          placeholder="Nhập họ và tên..."
          onChange={handleChange}
        />

        <label>Email:</label>
        <input
          name="email"
          type="email"
          placeholder="Nhập email..."
          onChange={handleChange}
        />

        <label>Mật khẩu:</label>
        <input
          name="password"
          type="password"
          placeholder="Nhập mật khẩu..."
          onChange={handleChange}
        />

        <label>Nhập lại mật khẩu:</label>
        <input
          name="confirmPassword"
          type="password"
          placeholder="Nhập lại mật khẩu..."
          onChange={handleChange}
        />

        <button className="login-btn">Đăng ký</button>

        <p className="login-register">
          Đã có tài khoản?{" "}
          <Link to="/login">Đăng nhập ngay</Link>
        </p>
      </form>
    </div>
  );
}
