// src/components/ProductCard.jsx
import PropTypes from "prop-types";
import { useContext } from "react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProductCard({ product }) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();

  const { id, name, price, salePrice, image } = product;

  const { requireAuth } = useContext(AuthContext);

  const inWishlist = isInWishlist(id);
  const finalPrice = salePrice ?? price; //onscreen price

  return (
    <div
      style={{
        border: "1px solid #3f3f3f",
        borderRadius: 12,
        padding: 12,
        textAlign: "center",
        background: "#222",
      }}
    >
      {/* click products */}
      <Link
        to={`/products/${product._id}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div
          style={{
            height: 160,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={`http://localhost:5173${product.image}`}
            alt={name}
            style={{
              maxWidth: "100%",
              maxHeight: "140px",
              borderRadius: "8px",
              objectFit: "contain",
            }}
          />
        </div>

        <h3 style={{ fontSize: 16, margin: "10px 0 6px" }}>{name}</h3>
      </Link>

      {/* price */}
      {salePrice ? (
        <>
          <p style={{ textDecoration: "line-through", color: "#999", margin: 0 }}>
            {price.toLocaleString()}₫
          </p>
          <p style={{ fontWeight: 700, color: "red", margin: "4px 0" }}>
            {salePrice.toLocaleString()}₫
          </p>
        </>
      ) : (
        <p style={{ fontWeight: 700, margin: "6px 0" }}>
          {price.toLocaleString()}₫
        </p>
      )}

      {/* btn */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <button
          onClick={() => {
            if (!requireAuth()) return;
            addToCart({
              ...product,
              price: finalPrice, //using discount
            })
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            background: "#111",
            color: "#fff",
          }}
        >
          Thêm vào giỏ
        </button>

        <button
          onClick={() => {
            if (!requireAuth()) return;
            inWishlist ? removeFromWishlist(id) : addToWishlist(product)
          }}
          style={{
            padding: "8px 10px",
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
  );
}

ProductCard.propTypes = {
  product: PropTypes.object.isRequired,
};
