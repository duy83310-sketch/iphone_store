import { createContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  // ----- Auto login from token -----
  // Check for token on mount and fetch user data if valid.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("http://localhost:5000/auth/me", {
      headers: {
        "x-auth-token": token
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.email) {
          setUser(data);   // user authenticated
        }
      })
      .catch(() => {
        // Token invalid or expired
        localStorage.removeItem("token");
      });
  }, []);

  /**
   * Login user, store token, and fetch initial data
   * @param {{ token: string, user: Object }} data
   */
  function login(data) {
    localStorage.setItem("token", data.token);
    setUser(data.user);

    // (Optional) preload wishlist or cart here
    fetch("http://localhost:5000/auth/wishlist", {
      headers: {
        "x-auth-token": data.token
      }
    })
      .then(res => res.json());
  }

  /**
   * Logout user and clear auth data
   */
  function logout() {
    localStorage.removeItem("token");
    setUser(null);

    localStorage.removeItem("wishlist");

    navigate("/");
  }

  /**
   * Check if user is authenticated
   * Show warning and redirect if not logged in
   * @returns {boolean}
   */
  function requireAuth() {
    if (!user) {
      toast.warn("Vui lòng đăng nhập để tiếp tục");
      setTimeout(() => navigate("/login"), 800);
      return false;
    }
    return true;
  }

  // ----- Context value -----
  return (
    <AuthContext.Provider value={{ user, login, logout, requireAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
