// src/components/FeaturedProduct.jsx
import { useWishlist } from "../../context/WishlistContext";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { API } from "../../utils/config";
import { computeFinalPrice, computeFinalPriceFromBase, getDiscountLabel, getLowestVariantBasePrice, getLowestPriceVariant } from "../../utils/price"; 

export default function FeaturedProduct({ product, onAddToCart }) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { requireAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!product) return null;

  const baseMin = getLowestVariantBasePrice(product);
  const lowestVariant = getLowestPriceVariant(product);
  const finalPrice = computeFinalPriceFromBase(baseMin, product.discount);
  const activeVariant = product.selectedVariant ?? lowestVariant;

  // determine a sensible default color (first variant color or product.colors if present)
  const firstColor = Array.isArray(product.variants) && product.variants.length ? product.variants[0].color : (Array.isArray(product.colors) && product.colors[0]) || null;

  // small color map for common names (kept minimal)
  const RAW_COLORMAP = {
    "Đen": "#000000",
    "Trắng": "#ffffff",
    "Hồng": "#ff6b9a",
    "Xanh dương": "#2563eb",
    "Xanh lá": "#10b981",
    "Titan": "#9ca3af",
    "Black": "#000000",
    "White": "#ffffff",
  };
  const resolveColor = (label) => {
    if (!label) return null;
    const t = String(label).trim();
    if (RAW_COLORMAP[t]) return RAW_COLORMAP[t];
    return t;
  };

  const selectedColor = product.selectedColor ?? firstColor;
  const selectedColorValue = product.selectedColorValue ?? resolveColor(selectedColor);

  const inWishlist = isInWishlist(product.id);

  const resolveAssetUrl = (p) => {
    if (!p) return "";
    const s = String(p);
    if (/^(https?:)?\/\//i.test(s) || s.startsWith("data:")) return s;
    if (s.startsWith("/")) return `${API}${s}`; // backend serves /images and /uploads
    return `${API}/${s}`;
  };

  return (
    <section style={containerStyle}>
      {/* LEFT */}
      <div style={leftStyle}>
        <h3 style={titleStyle}>{product.name}</h3>

        {product.description && (
          <p style={descStyle}>{product.description}</p>
        )}

        {(product.selectedVariant?.storage) && (
          <div style={{ marginTop: 6, color: '#ddd' }}>Dung lượng: <strong style={{ color: '#fff' }}>{product.selectedVariant.storage}</strong></div>
        )}

        {getDiscountLabel(product.discount) ? (
          <p style={{ margin: 0 }}>
            <span style={{ textDecoration: 'line-through', color: '#999', marginRight: 8 }}>{(baseMin ?? 0).toLocaleString()}₫</span>
            <span style={priceStyle}>{finalPrice.toLocaleString()}₫ <span style={{ fontSize: 12, marginLeft: 8, color: '#fff', background: '#ef4444', padding: '2px 6px', borderRadius: 6 }}>{getDiscountLabel(product.discount)}</span></span>
          </p>
        ) : (
          <p style={priceStyle}>{(baseMin ?? 0).toLocaleString()}₫</p>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          {/* ADD TO CART */}
          <button
            onClick={() => {
              if (!requireAuth()) return;
              // Build a single checkout item and navigate to checkout with it
              const buyItem = {
                productId: product.id ?? product._id ?? null,
                name: product.name,
                price: finalPrice,
                quantity: 1,
                selectedColor: selectedColor ?? null,
                selectedColorValue: selectedColorValue ?? null,
                selectedStorage: activeVariant?.storage ?? null,
                selectedVariant: activeVariant ? {
                  version: activeVariant.version ?? null,
                  storage: activeVariant.storage ?? null,
                  color: activeVariant.color ?? null,
                  price: Number(activeVariant.price ?? baseMin) || 0
                } : null,
                image: resolveAssetUrl(product.featuredImg || product.image)
              };

              // use react-router navigation
              navigate('/checkout', { state: { selectedItems: [buyItem] } });
            }}
            className="btn-gold"
          >
            Mua ngay
          </button>

          {/* WISHLIST */}
          <button
            onClick={() => {
              if (!requireAuth()) return;
              inWishlist
                ? removeFromWishlist(product.id, { color: selectedColor, storage: activeVariant?.storage ?? null })
                : addToWishlist({
                    ...product,
                    selectedColor: selectedColor ?? null,
                    selectedColorValue: selectedColorValue ?? null,
                    selectedVariant: {
                      version: activeVariant?.version ?? null,
                      storage: activeVariant?.storage ?? null,
                      color: activeVariant?.color ?? null,
                      price: Number(activeVariant?.price ?? baseMin) || 0
                    }
                  });
            }}
            className={`btn-wishlist ${inWishlist ? "is-active" : ""}`}
          >
            {inWishlist ? "♥ Đã thích" : "♥ Yêu thích"}
          </button>
        </div>
      </div>

      {/* RIGHT */}
      <div style={rightStyle}>
        <img
          src={resolveAssetUrl(product.featuredImg || product.image)}
          alt={product.name}
          style={imgStyle}
        />
      </div>
    </section>
  );
}

/* ================= STYLES ================= */

const containerStyle = {
  display: "flex",
  gap: 32,
  alignItems: "center",
  padding: 24,
  marginLeft: "14px",
  borderRadius: 16,
   background:
    "linear-gradient(90deg, rgba(198,121,45,0.18), rgba(241, 133, 0, 0.28),  rgba(198,121,45,0.18))",

  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

const leftStyle = {
  flex: 1,
  paddingLeft: 32,
  color: "#eaeaea",
};

const rightStyle = {
  width: 260,
  flexShrink: 0,
};

const titleStyle = {
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 8,
  color: "#f5e6c8",
};

const descStyle = {
  marginBottom: 14,
  opacity: 0.85,
  lineHeight: 1.6,
};

const priceStyle = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 18,
  color: "#e0b36a",
};

const imgStyle = {
  width: "100%",
  borderRadius: 12,
  objectFit: "cover",
};
