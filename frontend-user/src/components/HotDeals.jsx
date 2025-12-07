// src/components/HotDeals.jsx
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function HotDeals({ products = [] }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const { requireAuth } = useContext(AuthContext);

  if (products.length === 0) {
    return <p>Không có ưu đãi hot nào.</p>;
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
        }}
      >
        {products.map((p) => {
          const finalPrice = p.salePrice ?? p.price;
          const inWishlist = isInWishlist(p.id);

          return (
            <div
              key={p.id}
              style={{
                background: "#222",
                padding: 20,
                borderRadius: 12,
                border: "1px solid #333",
              }}
            >
              {/* Img */}
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <img
                  src={`http://localhost:5173${p.image}`}
                  alt={p.name}
                  style={{
                    width: "100%",
                    borderRadius: 8,
                    height: "clamp(160px, 32vw, 300px)",
                    objectFit: "contain",
                    display: "block"
                  }}
                />
              </div>

              {/* Name */}
              <h3 style={{ marginBottom: 6 }}>{p.name}</h3>

              {/* Price */}
              <p style={{ textDecoration: "line-through", opacity: 0.6 }}>
                {p.price.toLocaleString()}₫
              </p>
              <p style={{ color: "red", fontWeight: 700 }}>
                {finalPrice.toLocaleString()}₫
              </p>

              {/* Btn */}
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  onClick={() => {
                    if (!requireAuth()) return;
                    addToCart(p);
                  }}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 8,
                    border: "none",
                    background: "#000",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Thêm vào giỏ
                </button>

                <button
                  onClick={() => {
                    if (!requireAuth()) return;
                    inWishlist
                      ? removeFromWishlist(p.id)
                      : addToWishlist(p)
                  }}
                  style={{
                    flex: 1,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #444",
                    cursor: "pointer",
                    background: inWishlist ? "#f58282ff" : "#222",
                    color: "#fff",
                  }}
                >
                  {inWishlist ? "♥ Đã thích" : "♥ Yêu thích"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
