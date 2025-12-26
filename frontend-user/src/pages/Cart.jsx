import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import "../styles/pages/cart.css";

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();
  // Use cart item subdoc id (`id`) for selection so items with same product but different colors are independent
  const [selectedIds, setSelectedIds] = useState(() =>
    cart.map((i) => String(i.id))
  );

  // Sync selected items if cart changes
  useEffect(() => {
    const idsInCart = cart.map((i) => String(i.id));
    setSelectedIds((prev) => {
      const filtered = prev.filter((id) => idsInCart.includes(id));
      if (filtered.length === 0 && idsInCart.length > 0) return idsInCart;
      return filtered;
    });
  }, [cart]);

  // Total of selected items
  const selectedTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const id = String(item.id);
      if (!selectedIds.includes(id)) return sum;
      return sum + (item.price || 0) * (item.quantity || 0);
    }, 0);
  }, [cart, selectedIds]);

  function handleCheckout() {
    const selectedItems = cart.filter((i) =>
      selectedIds.includes(String(i.id))
    );

    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán");
      return;
    }

    navigate("/checkout", { state: { selectedItems } });
  }

  return (
    <div style={{ padding: "20px", maxWidth: "90%", margin: "auto" }}>
      <h1 className="title">Giỏ hàng</h1>

      {/* Nếu giỏ hàng trống */}
      {cart.length === 0 ? (
        <p>Giỏ hàng của bạn đang trống.</p>
      ) : (
        <>
          <div style={{ maxHeight: cart.length > 4 ? 600 : "auto", overflowY: cart.length > 4 ? "auto" : "visible" }}>
            {cart.map((item) => (
            <div
              key={`${item.id}-${item.selectedColor ?? ''}`}
              style={{
                display: "flex",
                alignItems: "center",
                borderBottom: "1px solid #555",
                borderRadius: 8,
                padding: "20px",
                background: "#222",
                marginBottom: 12,
              }}
            >
              {/* Checkbox */}
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginRight: 12 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(String(item.id))}
                  onChange={(e) => {
                    const id = String(item.id);
                    if (e.target.checked)
                      setSelectedIds((prev) => [...new Set([...prev, id])]);
                    else setSelectedIds((prev) => prev.filter((x) => x !== id));
                  }}
                  style={{ display: "none" }}
                />

                <span className="cart-checkbox" />
              </label>

              {/* Image */}
              <img
                src={item.image}
                alt={item.name}
                style={{ width: 90, height: 90, objectFit: "contain" }}
              />

              {/* Info */}
              <div style={{ flex: 1, marginLeft: 20 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.name}

                  {(item.selectedColor || item.selectedVariant?.storage) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 8, fontSize: 12, color: '#ddd' }}>
                      {item.selectedColor && (
                        <>
                          <span style={{ width: 14, height: 14, borderRadius: 14, background: item.selectedColorValue || 'transparent', display: 'inline-block', border: (item.selectedColorValue && (String(item.selectedColorValue).toLowerCase() === 'white' || item.selectedColorValue === '#fff' || item.selectedColorValue === '#ffffff' || item.selectedColorValue === 'transparent')) ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.15)' }} />
                          <span>{item.selectedColor}</span>
                        </>
                      )}

                      {item.selectedVariant?.storage && (
                        <span style={{ color: '#ddd' }}>{item.selectedVariant.storage}</span>
                      )}
                    </span>
                  )}
                </h3>
                <p>{item.price?.toLocaleString() ?? "0"}₫</p>

                {/* Quantity */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 8,
                    border: "1px solid #444",
                    overflow: "hidden",
                    width: "fit-content",
                    marginTop: 5,
                  }}
                >
                  <button
                    onClick={() =>
                      updateQuantity(item.id, Math.max(1, item.quantity - 1))
                    }
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      color: "#fff",
                      border: "none",
                      borderRight: "1px solid #444",
                      cursor: "pointer",
                    }}
                  >
                    −
                  </button>

                  <span
                    style={{
                      padding: "6px 12px",
                      color: "#fff",
                      fontSize: "14px",
                      minWidth: 40,
                      textAlign: "center",
                    }}
                  >
                    {item.quantity}
                  </span>

                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      color: "#fff",
                      border: "none",
                      borderLeft: "1px solid #444",
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeFromCart(item.id)}
                style={{
                  padding: "6px 12px",
                  background: "#9e3a3a",
                  color: "#fff",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  transition: "background 0.2s ease, transform 0.1s ease"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#b04848"}
                onMouseLeave={e => e.currentTarget.style.background = "#9e3a3a"}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                Xóa
              </button>
            </div>
          ))}
          </div>

          {/* Total */}
          <h2 style={{ marginTop: 20 }}>
            Tổng tiền: {selectedTotal.toLocaleString()}₫
          </h2>

          {/* Checkout button */}
          <button
            onClick={handleCheckout}
            className="btn-gold"
          >
            Thanh toán
          </button>
        </>
      )}
    </div>
  );
}
