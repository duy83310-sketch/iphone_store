// src/components/FeaturedProduct.jsx
import { useWishlist } from "../context/WishlistContext";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function FeaturedProduct({ product, onAddToCart }) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const { requireAuth } = useContext(AuthContext);

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);

  const containerStyle = {
    display: "flex",
    gap: 24,
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    background: "linear-gradient(90deg, rgba(255,191,112,0.30), rgba(198,121,45,0.18), rgba(255,191,112,0.30))",
    border: "1px solid rgba(212,191,130,0.35)",

  };

  return (
    <section style={containerStyle}>
      <div style={{ flex: 1, marginLeft: 50}}>
        <h3 style={{ marginBottom: 8, fontSize: "24px" }}>{product.name}</h3>
        <p style={{ marginBottom: 12 }}>{product.description}</p>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>
          {product.price.toLocaleString()}₫
        </p>

        <div>
          <button
            onClick={() => {
              if (!requireAuth()) return;
              onAddToCart && onAddToCart(product)
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: "#111",
              color: "#fff",
              marginRight: 10,
            }}
          >
            Mua ngay
          </button>

          <button
            onClick={() => {
              if (!requireAuth()) return;
              inWishlist
                ? removeFromWishlist(product.id)
                : addToWishlist(product);
            }}

            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              cursor: "pointer",
              background: inWishlist ? "#f58282ff" : "#fff",
            }}
          >
            {inWishlist ? "♥ Đã thích" : "♥ Yêu thích"}
          </button>
        </div>
      </div>

      <div style={{ width: 260 }}>
        <img
          src={`http://localhost:5173${product.featuredImg}`}
          alt={product.name}
          style={{ width: "100%", borderRadius: 8 }}
        />
      </div>
    </section>
  );
}
