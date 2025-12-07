import "../styles/components/header.css";
import SearchBar from "./SearchBar";
import { useNavigate, Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

//Riple nav-bar
function ripple(e) {
  const link = e.target.closest("a");
  if (!link) return;

  const circle = document.createElement("span");
  const diameter = Math.max(link.clientWidth, link.clientHeight);
  const radius = diameter / 2;
  const rect = link.getBoundingClientRect();

  //const navigate = useNavigate();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${e.clientX - rect.left - radius}px`;
  circle.style.top = `${e.clientY - rect.top - radius}px`;
  circle.classList.add("ripple");

  const exist = link.querySelector(".ripple");
  if (exist) exist.remove();
  link.appendChild(circle);
}

export default function Header() {
  const { wishlist } = useWishlist();
  const { totalItems } = useCart();
  const { user, logout, requireAuth } = useContext(AuthContext);

  function handleAccountClick() {
    if (!requireAuth()) {
      //navigate("/login");
      return;
    }
    //navigate("/profile"); to do later
  }  

  return (
    <header className="header">
      <div className="header-top">
        <div className="logo">iStore</div>

        <SearchBar />

        <div className="header-actions">
          {user ? (
            <>
              <span>Xin chào, {user.name}</span>
              <button onClick={logout} className="logout-btn">Đăng xuất</button>
            </>
          ) : (
            <button onClick={handleAccountClick} className="account-btn">
              Người dùng ẩn danh
            </button>
          )}

        </div>
      </div>

      <ul className="nav" onClick={ripple}>
        <li><Link to="/">Trang chủ</Link></li>
        <li><Link to="/products">Sản phẩm</Link></li>
        <li><Link to="/wishlist">Yêu thích ({wishlist.length})</Link></li>
        <li><Link to="/cart">Giỏ hàng ({totalItems})</Link></li>
        {!user && (
          <>
            <li><Link to="/login">Đăng nhập</Link></li>
            <li><Link to="/register">Đăng kí</Link></li>
          </>
        )}
        {user && (
          <li><Link to="/profile">Tài khoản</Link></li>
        )}
      </ul>
    </header>
  );
}
