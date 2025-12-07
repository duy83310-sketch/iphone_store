import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";

const CartContext = createContext();
export default CartContext;

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem("token");

  const [cart, setCart] = useState([]);

  // ----- Load cart on login -----
  // Fetch cart from DB when user changes.
  // Clear cart if guest or logout.
  useEffect(() => {
    if (!user) {
      setCart([]);
      return;
    }

    fetch("http://localhost:5000/auth/cart", {
      headers: { "x-auth-token": token }
    })
      .then(res => res.json())
      .then(data => setCart(data))
      .catch(() => setCart([]));
  }, [user]);

  /**
   * Add product to cart (DB)
   * If item exists, confirm before increasing quantity.
   * @param {Object} product
   * @param {number|string} product.id
   */
  function addToCart(product) {
    if (!user) return;

    const exist = cart.find(i => i.id === product.id);

    if (exist) {
      const ok = window.confirm("Sản phẩm đã có trong giỏ. Bạn có muốn tăng số lượng không?");
      if (!ok) return;
    }

    fetch("http://localhost:5000/auth/cart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      },
      body: JSON.stringify({ 
        product: {
          id: product.id
        }
      })
    })
    .then(res => res.json())
    .then(data => setCart(data))
    .catch(err => console.log("ERROR ADDCART:", err));
  }

  /**
   * Remove product from cart (DB)
   * @param {number|string} id
   */
  function removeFromCart(id) {
    if (!user) return;

    fetch(`http://localhost:5000/auth/cart/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      }
    })
      .then(res => res.json())
      .then(data => setCart(data));
  }

  /**
   * Update quantity for item in cart (DB)
   * @param {number|string} id
   * @param {number} quantity
   */
  function updateQuantity(id, quantity) {
    if (!user) return;

    fetch(`http://localhost:5000/auth/cart/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      },
      body: JSON.stringify({ quantity })
    })
      .then(res => res.json())
      .then(data => setCart(data));
  }

  // ----- Totals -----
  const totalItems = cart.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.quantity || 1) * item.price,
    0
  );

  // ----- Context value -----
  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
