// src/pages/ProductDetail.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    setLoading(true);

    fetch(`http://localhost:5000/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Lỗi API:", err);
        setProduct(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <h2 style={{ padding: 20 }}>Đang tải...</h2>;
  if (!product) return <h2 style={{ padding: 20 }}>Không tìm thấy sản phẩm</h2>;

  const { name, image, price, salePrice, description } = product;
  const finalPrice = salePrice ?? price;

  const inWishlist = isInWishlist(product._id);

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 30 }}>
        {/* IMAGE */}
        <div style={{ flex: 1 }}>
          <img
            src={image}
            alt={name}
            style={{
              width: "100%",
              maxHeight: 450,
              objectFit: "contain",
              background: "#fff",
              padding: 20,
              borderRadius: 12,
            }}
          />
        </div>

        {/* INFO */}
        <div style={{ flex: 1 }}>
          <h1 style={{ marginBottom: 10 }}>{name}</h1>

          {salePrice ? (
            <>
              <p style={{ textDecoration: "line-through", color: "#999" }}>
                {price.toLocaleString()}₫
              </p>
              <p style={{ fontSize: 24, color: "red", fontWeight: 700 }}>
                {salePrice.toLocaleString()}₫
              </p>
            </>
          ) : (
            <p style={{ fontSize: 24, fontWeight: 700 }}>
              {price.toLocaleString()}₫
            </p>
          )}

          <p style={{ marginTop: 20 }}>{description}</p>

          {/* BUTTONS */}
          <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
            <button
              onClick={() =>
                addToCart({ ...product, price: finalPrice })
              }
              style={{
                padding: "12px 20px",
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Thêm vào giỏ
            </button>

            <button
              onClick={() =>
                inWishlist
                  ? removeFromWishlist(product.id)
                  : addToWishlist(product)
              }
              style={{
                padding: "12px 20px",
                background: inWishlist ? "#ffe6e6" : "#fff",
                border: "1px solid #ddd",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {inWishlist ? "♥ Đã thích" : "♥ Yêu thích"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
