import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { API } from "../utils/config";
import { toast } from "react-toastify";

const CartContext = createContext();
export default CartContext;

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);

  const [cart, setCart] = useState([]);

  // ----- Load cart on login -----
  // Fetch cart from DB when user changes.
  // Clear cart if guest or logout.
  useEffect(() => {
    if (!user) {
      setCart([]);
      return;
    }

    const token = localStorage.getItem("token");

    fetch(`${API}/auth/cart`, {
      headers: { "x-auth-token": token }
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) setCart(data);
        else setCart([]);
      })
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

    const token = localStorage.getItem("token");

    // Determine existence by productId + selectedColor + selectedVariant.storage
    const exist = cart.find(i => (
      String(i.productId) === String(product.id) &&
      ((i.selectedColor ?? null) === (product.selectedColor ?? null)) &&
      ((i.selectedVariant?.storage ?? null) === (product.selectedVariant?.storage ?? null))
    ));

    if (exist) {
      const ok = window.confirm("Sản phẩm đã có trong giỏ. Bạn có muốn tăng số lượng không?");
      if (!ok) return;
    }

    const payload = {
      product: {
        productId: product.id,
        selectedColor: product.selectedColor ?? product.selected_color ?? null,
        selectedColorValue: product.selectedColorValue ?? product.selected_color_value ?? null
      }
    };
    if (product.selectedVariant && typeof product.selectedVariant === 'object') {
      payload.product.selectedVariant = {
        version: product.selectedVariant.version ?? null,
        storage: product.selectedVariant.storage ?? null,
        color: product.selectedVariant.color ?? null,
        price: Number(product.selectedVariant.price) || 0
      };
    }

    fetch(`${API}/auth/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      },
      // send product payload with optional variant
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data)) {
        setCart(data);
        if (exist) toast.info("Đã tăng số lượng sản phẩm trong giỏ 🛒");
        else toast.success("Đã thêm sản phẩm vào giỏ 🛍️");
      } else {
        console.error('addToCart failed', data);
        toast.error((data && data.msg) || 'Lỗi thêm vào giỏ');
      }
    })
    .catch(err => console.log("ERROR ADDCART:", err));
  }

  /**
   * Remove product from cart (DB)
   * @param {number|string} id
   */
  function removeFromCart(id) {
    if (!user) return;

    const token = localStorage.getItem("token");

    // return the promise so callers can await removal
    return fetch(`${API}/auth/cart/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      }
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) {
          setCart(data);
          return data;
        }
        // if server returns error, don't clobber cart; throw to let caller handle
        const err = (data && data.msg) || 'Lỗi xóa sản phẩm';
        throw new Error(err);
      });
  }


  /**
   * Update quantity for item in cart (DB)
   * @param {number|string} id
   * @param {number} quantity
   */
  function updateQuantity(id, quantity) {
    if (!user) return;

    const token = localStorage.getItem("token");

    fetch(`${API}/auth/cart/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": token
      },
      body: JSON.stringify({ quantity })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) setCart(data);
        else console.error('updateQuantity failed', data);
      });
  }

  /**
   * Clear the entire cart on server and update state
   */
  function clearCart() {
    if (!user) return;

    const token = localStorage.getItem("token");
    fetch(`${API}/auth/cart`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-auth-token": token }
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) setCart(data);
        else console.error('clearCart failed', data);
      })
      .catch(err => console.error("clearCart error", err));
  }

  // ----- Totals -----
  const totalItems = cart.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.quantity || 1) * (item.price ?? 0),
    0
  );


  // ----- Context value -----
  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
