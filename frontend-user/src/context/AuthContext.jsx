import { createContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { API } from "../utils/config";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const BLOCKED_ROLES = new Set(["admin", "staff"]);
  function hasBlockedRole(u) {
    if (!u) return false;
    const r = u.role ?? u.roles ?? null;
    if (!r) return false;
    if (typeof r === 'string') return BLOCKED_ROLES.has(r.toLowerCase());
    if (Array.isArray(r)) return r.map(x => String(x).toLowerCase()).some(x => BLOCKED_ROLES.has(x));
    return false;
  }

  // ----- Auto login from token -----
  // Check for token on mount and fetch user data if valid.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/auth/me`, {
      headers: {
        "x-auth-token": token
      }
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, json };
      })
      .then(({ ok, status, json }) => {
        if (!ok) {
          // disabled or invalid token
          localStorage.removeItem("token");
          if (status === 403) {
            toast.error(json.msg || "Tài khoản của bạn đã bị vô hiệu hóa");
          }
          return;
        }

        const data = json;
        if (data && data.email) {
          if (hasBlockedRole(data)) {
            // blocked role: remove token and don't set user
            localStorage.removeItem("token");
            toast.error("Tài khoản quản trị/nhân viên không được đăng nhập trên trang người dùng.");
            return;
          }
          setUser(data); // user authenticated
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
    // Reject immediately if server returned a blocked role in the payload
    if (data && data.user && hasBlockedRole(data.user)) {
      toast.error("Tài khoản quản trị/nhân viên không được đăng nhập trên trang người dùng.");
      return;
    }

    localStorage.setItem("token", data.token);
    // save token then fetch full profile from server to ensure we have all fields
    setUser(data.user);

    fetch(`${API}/auth/me`, {
      headers: { "x-auth-token": data.token }
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, json };
      })
      .then(({ ok, status, json }) => {
        if (!ok) {
          if (status === 403) {
            toast.error(json.msg || "Tài khoản của bạn đã bị vô hiệu hóa");
          }
          localStorage.removeItem("token");
          setUser(null);
          return;
        }

        const full = json;
        if (full && full.email) {
          if (hasBlockedRole(full)) {
            // Block login if role is admin/staff
            localStorage.removeItem("token");
            setUser(null);
            toast.error("Tài khoản quản trị/nhân viên không được đăng nhập trên trang người dùng.");
            return;
          }
          setUser(full);
        }
      })
      .catch(() => {
        // ignore
      });
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
      setShowAuthModal(true);
      return false;
    }
    return true;
  }

  function goLogin() {
    setShowAuthModal(false);
    navigate("/login");
  }

  function goRegister() {
    setShowAuthModal(false);
    navigate("/register");
  }

  function closeModal() {
    setShowAuthModal(false);
  }

  // ----- Context value -----
  return (
    <AuthContext.Provider
      value={{ 
        user, 
        setUser, 
        login,
        logout,
        requireAuth, 
        showAuthModal, 
        goLogin, 
        goRegister, 
        closeModal 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
