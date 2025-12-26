// src/components/ProductCard.jsx
import PropTypes from "prop-types";
import { useContext, useState, useEffect } from "react";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { computeFinalPriceFromBase, getDiscountLabel, getLowestVariantBasePrice, getLowestPriceVariant } from "../../utils/price";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import ConfirmDialog from "../common/ConfirmDialog";

export default function ProductCard({ product }) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const location = useLocation();
  const isWishlistPage = String(location.pathname).toLowerCase().startsWith("/wishlist");

  const { id, name, price, image, discount } = product;

  const { requireAuth } = useContext(AuthContext);

  // compute lowest variant base price (fallback to product.price when no variants)
  const baseMin = getLowestVariantBasePrice(product);
  const lowestVariant = getLowestPriceVariant(product);
  const finalPrice = computeFinalPriceFromBase(baseMin, discount); // onscreen price (considers discount)

  // Wishlist items may include a pre-computed final `price` (already applied discount) and/or `basePrice` and `discount`.
  // Prefer product.price when provided (it's the final displayed price). Also allow using `product.basePrice` and `product.discount` if available.
  const displayFinalPrice = Number(product.price ?? finalPrice) || 0;
  const displayBasePrice = Number(product.basePrice ?? baseMin) || 0;
  const displayDiscount = product.discount ?? discount;
  const hasDiscount = !!getDiscountLabel(displayDiscount);

  // derive color strings from variants/colors (handle Vietnamese names from DB)
  const RAW_COLORMAP = {
    "Đen": "#000000",
    "Trắng": "#ffffff",
    "Hồng": "#ff6b9a",
    "Xanh dương": "#2563eb",
    "Xanh lá": "#10b981",
    "Titan": "#9ca3af",
    // english fallbacks
    "Black": "#000000",
    "White": "#ffffff",
    "Pink": "#ff6b9a",
    "Blue": "#2563eb",
    "Gray": "#9ca3af",
  };

  const getRawColors = () => {
    if (Array.isArray(product.colors) && product.colors.length) return product.colors;
    if (Array.isArray(product.color) && product.color.length) return product.color;
    if (Array.isArray(product.variants) && product.variants.length) {
      return product.variants.map((v) => v?.color).filter(Boolean);
    }
    return [];
  };

  const resolveColor = (label) => {
    if (!label) return null;
    const trimmed = String(label).trim();
    // if it's already a hex or valid css word, return it
    if (/^#([0-9a-f]{3,8})$/i.test(trimmed)) return trimmed;
    if (/^rgb\(/i.test(trimmed) || /^hsl\(/i.test(trimmed)) return trimmed;
    // map known local names
    if (RAW_COLORMAP[trimmed]) return RAW_COLORMAP[trimmed];
    // try simple english lowercase match
    const en = trimmed.toLowerCase();
    for (const key of Object.keys(RAW_COLORMAP)) {
      if (key.toLowerCase() === en) return RAW_COLORMAP[key];
    }
    // fallback to label (CSS can accept color names like 'pink')
    return trimmed;
  };

  const swatchRaw = getRawColors();
  const swatchList = Array.from(new Set(swatchRaw.map((s) => (s ? String(s).trim() : s)).filter(Boolean)));
  const swatches = swatchList.map((label) => ({ label, color: resolveColor(label) }));

  // selected color state — prefer product.selectedColor (from wishlist), otherwise default to first swatch
  const [selectedColor, setSelectedColor] = useState(() => product.selectedColor ?? swatches[0]?.label ?? null);
  useEffect(() => {
    setSelectedColor(product.selectedColor ?? swatches[0]?.label ?? null);
  }, [product.id, product.selectedColor]);

  // activeVariant: prefer a selectedVariant snapshot on the product (e.g., from wishlist) otherwise fallback to lowestVariant
  const activeVariant = product.selectedVariant ?? lowestVariant;

  const inWishlist = isInWishlist(id);

  // NEW: dialog state for choosing storage when multiple variants match color
  const [chooseOpen, setChooseOpen] = useState(false);
  const [chooseOptions, setChooseOptions] = useState([]);
  const [pendingCandidates, setPendingCandidates] = useState([]);

  // NEW: track hover state to avoid direct DOM mutations
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        border: "1px solid #3f3f3f",
        borderRadius: 12,
        padding: 12,
        textAlign: "center",
        background: "#222",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 360,
        position: "relative",
        transition: "box-shadow .2s ease",
        // NEW: only toggle shadow on the outer box; keep it stationary
        boxShadow: hovered ? "0 10px 28px rgba(224,179,106,0.18)" : "none",
      }}
      // NEW: remove direct style mutations; just toggle hovered state
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* NEW: wrap card content in an inner container and translate it on hover */}
      <div
        style={{
          transition: "transform .2s ease",
          transform: hovered ? "translateY(-3px)" : "none",
        }}
      >
        {/* BADGES */}
        {(product.new || product.hot) && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              zIndex: 2,
            }}
          >
            {product.new && (
              <span
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #34d399, #059669)",
                  color: "#fff",
                  boxShadow: "0 4px 10px rgba(16,185,129,0.35)",
                  letterSpacing: 0.5,
                }}
              >
                NEW
              </span>
            )}

            {product.hot && (
              <span
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #fb7185, #ef4444)",
                  color: "#fff",
                  boxShadow: "0 4px 10px rgba(239,68,68,0.35)",
                  letterSpacing: 0.5,
                }}
              >
                HOT
              </span>
            )}
          </div>
        )}

        {/* click products */}
        <Link
          to={`/products/${product.id}`}
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
              src={product.image}
              alt={name}
              style={{
                maxWidth: "100%",
                maxHeight: "140px",
                borderRadius: "8px",
                objectFit: "contain",
              }}
            />
          </div>

          {/* color swatches (from product.variants / product.colors) */}
          {swatches && swatches.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
              {swatches.map((s, idx) => {
                const isSelected = s.label === selectedColor;
                const lightBorder = s.color && (String(s.color).toLowerCase() === "white" || s.color === "#fff" || s.color === "#ffffff" || s.color === "transparent");

                return (
                  <button
                    key={idx}
                    type="button"
                    title={s.label}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedColor(s.label);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: s.color || "transparent",
                      display: "inline-block",
                      boxShadow: isSelected ? "0 0 0 3px rgba(255,255,255,0.12)" : "inset 0 0 0 1px rgba(0,0,0,0.05)",
                      border: isSelected ? "2px solid rgba(255,255,255,0.85)" : (lightBorder ? "1px solid #ccc" : "none"),
                      cursor: "pointer",
                      padding: 0,
                      transform: isSelected ? "scale(1.07)" : "none",
                      filter: isSelected ? "brightness(1.12)" : "none",
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* FIX: reserve consistent height for product name */}
          <div style={{ minHeight: 42, margin: "10px 0 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>{name}</h3>
          </div>
        </Link>

        {/* price (consistent height across discounted/non-discounted) */}
        <div style={{ minHeight: 58 }}>
          <p
            style={{
              textDecoration: "line-through",
              color: "#999",
              margin: 0,
              // keep height even when there's no discount
              visibility: hasDiscount ? "visible" : "hidden"
            }}
          >
            {(displayBasePrice ?? 0).toLocaleString()}₫
          </p>
          <p
            style={{
              fontWeight: 700,
              margin: "4px 0",
              color: hasDiscount ? "#d18b3b" : undefined
            }}
          >
            {(displayFinalPrice ?? 0).toLocaleString()}₫
            {hasDiscount && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  color: "#fff",
                  background: "#ef4444",
                  padding: "2px 6px",
                  borderRadius: 6
                }}
              >
                {getDiscountLabel(displayDiscount)}
              </span>
            )}
          </p>
        </div>

        {/* btn */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 8,
          }}
        >
          {!isWishlistPage && (
            <button
              onClick={() => {
                if (!requireAuth()) return;

                const selected = selectedColor ?? swatches[0]?.label ?? null;
                const selectedValue = swatches.find((x) => x.label === selected)?.color ?? null;
                const norm = (v) => String(v ?? "").trim().toLowerCase();

                // Candidates: variants by selected color
                const candidates = Array.isArray(product.variants)
                  ? product.variants.filter(v => norm(v.color) === norm(selected))
                  : [];

                if (!candidates.length) {
                  toast.warn("Không tìm thấy phiên bản phù hợp (màu) trong kho!");
                  return;
                }

                // If multiple storages exist for the same color -> open chooser
                if (candidates.length > 1) {
                  const options = candidates
                    .slice()
                    .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0))
                    .map(v => ({
                      label: `${v.storage} - ${(Number(v.price ?? 0) || 0).toLocaleString()}₫${Number(v.stock ?? 0) <= 0 ? " (Hết hàng)" : ""}`,
                      value: v.storage,
                      disabled: Number(v.stock ?? 0) <= 0,
                      title: v.version ? `${v.version.toUpperCase()} - ${v.storage}` : v.storage
                    }));

                  if (options.every(o => o.disabled)) {
                    toast.warn("Tất cả dung lượng của màu này đã hết hàng!");
                    return;
                  }

                  setPendingCandidates(candidates);
                  setChooseOptions(options);
                  setChooseOpen(true);
                  return;
                }

                // Single candidate flow
                const matchedVariant = candidates[0];
                if (Number(matchedVariant.stock ?? 0) <= 0) {
                  toast.warn("Phiên bản bạn chọn đã hết hàng!");
                  return;
                }

                const matchedFinalPrice = computeFinalPriceFromBase(Number(matchedVariant.price ?? 0) || 0, displayDiscount);

                addToCart({
                  ...product,
                  id: product.id,
                  price: matchedFinalPrice,
                  selectedColor: selected,
                  selectedColorValue: selectedValue,
                  selectedVariant: {
                    version: matchedVariant.version ?? null,
                    storage: matchedVariant.storage ?? null,
                    color: matchedVariant.color ?? null,
                    price: Number(matchedVariant.price ?? 0) || 0
                  }
                });
              }}
              className="btn-gold"
            >
              Thêm vào giỏ
            </button>
          )}
          <button
            onClick={() => {
              if (!requireAuth()) return;
              inWishlist ? removeFromWishlist(id) : addToWishlist({ id: product.id });
            }}
            className={`btn-wishlist btn-wishlist--icon ${
              inWishlist ? "is-active" : ""
            }`}
          >
            {inWishlist ? "♥ Đã thích" : "♥ Yêu thích"}
          </button>
        </div>
      </div>

      {/* NEW: Storage chooser dialog */}
      <ConfirmDialog
        open={chooseOpen}
        title="Chọn dung lượng"
        message="Sản phẩm này có nhiều dung lượng, bạn muốn chọn loại nào?"
        options={chooseOptions}
        onOptionSelect={(opt) => {
          const selected = selectedColor ?? swatches[0]?.label ?? null;
          const selectedValue = swatches.find((x) => x.label === selected)?.color ?? null;
          const matchedVariant = pendingCandidates.find(v => String(v.storage) === String(opt.value));
          if (!matchedVariant) {
            toast.warn("Không tìm thấy dung lượng đã chọn!");
            return;
          }
          if (Number(matchedVariant.stock ?? 0) <= 0) {
            toast.warn("Dung lượng này đã hết hàng!");
            return;
          }
          const matchedFinalPrice = computeFinalPriceFromBase(Number(matchedVariant.price ?? 0) || 0, displayDiscount);
          addToCart({
            ...product,
            id: product.id,
            price: matchedFinalPrice,
            selectedColor: selected,
            selectedColorValue: selectedValue,
            selectedVariant: {
              version: matchedVariant.version ?? null,
              storage: matchedVariant.storage ?? null,
              color: matchedVariant.color ?? null,
              price: Number(matchedVariant.price ?? 0) || 0
            }
          });
          setChooseOpen(false);
        }}
        onCancel={() => setChooseOpen(false)}
      />
    </div>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.any.isRequired,
    name: PropTypes.string,
    price: PropTypes.number,

    image: PropTypes.string,
    // product may have: colors (array of strings), color (array), or variants: [{ color }]
    colors: PropTypes.arrayOf(PropTypes.string),
    color: PropTypes.arrayOf(PropTypes.string),
    variants: PropTypes.arrayOf(
      PropTypes.shape({
        color: PropTypes.string,
      })
    ),
    // optional preselected color (from wishlist)
    selectedColor: PropTypes.string,
    selectedColorValue: PropTypes.string,
  }).isRequired,
};
