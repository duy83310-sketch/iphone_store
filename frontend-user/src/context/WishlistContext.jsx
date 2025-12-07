import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

const WishlistContext = createContext();
export default WishlistContext;

// ----- Custom hook -----
export function useWishlist() {
  return useContext(WishlistContext);
}

export function WishlistProvider({ children }) {
  const { user } = useContext(AuthContext);

  // ----- Storage key based on user -----
  // Logged-in user gets their own wishlist.
  // Guests share a generic one.
  const storageKey = user ? `wishlist_${user.id}` : `wishlist_guest`;

  const [wishlist, setWishlist] = useState([]);

  // ----- Load initial wishlist -----
  // Retrieve stored data whenever storageKey changes (user login/logout).
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setWishlist(JSON.parse(stored));
  }, [storageKey]);

  // ----- Persist wishlist -----
  // Save wishlist after any change to keep data across refresh.
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(wishlist));
  }, [wishlist, storageKey]);

  /**
   * Add product if not already present
   * @param {Object} product
   */
  const addToWishlist = (product) => {
    if (!wishlist.some((p) => p.id === product.id)) {
      setWishlist([...wishlist, product]);
    }
  };

  /**
   * Remove product by ID
   * @param {number|string} id
   */
  const removeFromWishlist = (id) => {
    setWishlist(wishlist.filter((p) => p.id !== id));
  };

  /**
   * Check if product is already in wishlist
   * @param {number|string} id
   * @returns {boolean}
   */
  const isInWishlist = (id) => {
    return wishlist.some((p) => p.id === id);
  };

  // ----- Context value exposed to components -----
  const value = {
    wishlist,
    setWishlist,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}
