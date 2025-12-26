import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { API } from "../utils/config";

const WishlistContext = createContext();
export default WishlistContext;

export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [wishlist, setWishlist] = useState([]); // ["1","2","5"]

  // ===== Load wishlist when user login =====
  useEffect(() => {
    if (!user) {
      setWishlist([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/auth/wishlist`, {
      headers: { "x-auth-token": token }
    })
      .then(res => res.json())
      .then(data => {
        // data is an array of product objects returned by GET /auth/wishlist
        setWishlist(Array.isArray(data) ? data : []);
      })
      .catch(() => setWishlist([]));
  }, [user]);

  /** ===== Add wishlist (productId only) ===== */
  async function addToWishlist(product) {
    const token = localStorage.getItem("token");
    if (!user || !token) return;

    const res = await fetch(`${API}/auth/wishlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      },
      body: JSON.stringify({
        productId: product.id
      })
    });

    const data = await res.json();
    setWishlist(Array.isArray(data) ? data : []);
  }

  /** ===== Remove wishlist (by productId) ===== */
  async function removeFromWishlist(productId) {
    const token = localStorage.getItem("token");
    if (!user || !token) return;

    const res = await fetch(`${API}/auth/wishlist/${productId}`, {
      method: "DELETE",
      headers: {
        "x-auth-token": token
      }
    });

    const data = await res.json();
    setWishlist(Array.isArray(data) ? data : []);
  }

  /** ===== Check wishlist (by productId only) ===== */
  function isInWishlist(productId) {
    return wishlist.some(p => String(p.productId) === String(productId));
  }

  const value = {
    wishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}