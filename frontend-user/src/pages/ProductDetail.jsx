// src/pages/ProductDetail.jsx
import ReviewSection from "../components/review/ReviewSection";
import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import { computeFinalPrice, computeFinalPriceFromBase, getDiscountLabel } from "../utils/price";
import { toast } from "react-toastify";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const { requireAuth } = useContext(AuthContext);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();

  // derive swatches from variants/colors (safe even when product is null)
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
    if (!product) return [];
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
    if (/^#([0-9a-f]{3,8})$/i.test(trimmed)) return trimmed;
    if (/^rgb\(/i.test(trimmed) || /^hsl\(/i.test(trimmed)) return trimmed;
    if (RAW_COLORMAP[trimmed]) return RAW_COLORMAP[trimmed];
    const en = trimmed.toLowerCase();
    for (const key of Object.keys(RAW_COLORMAP)) {
      if (key.toLowerCase() === en) return RAW_COLORMAP[key];
    }
    return trimmed;
  };

  const swatchRaw = getRawColors();
  const swatchList = Array.from(new Set(swatchRaw.map((s) => (s ? String(s).trim() : s)).filter(Boolean)));
  const swatches = swatchList.map((label) => ({ label, color: resolveColor(label) }));

  // selected color state - must be initialized and declared BEFORE any early return
  const [selectedColor, setSelectedColor] = useState(() => swatches[0]?.label ?? null);
  useEffect(() => setSelectedColor(swatches[0]?.label ?? null), [product?.id, swatchList.join(',')]);

  const selectedColorValue = swatches.find((x) => x.label === (selectedColor ?? swatches[0]?.label))?.color ?? null;

  // selected storage (variant) — default to first variant when product loads
  const [selectedStorage, setSelectedStorage] = useState(null);
  useEffect(() => {
    const firstStorage = (product?.variants && product.variants[0] && product.variants[0].storage) || null;
    setSelectedStorage(firstStorage);
  }, [product?.id]);

  useEffect(() => {
    setLoading(true);

    fetch(`${API}/products/${id}`)
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

  const { name, image, price, description, discount, variants = [] } = product;

  // storage options (unique)
  const storages = Array.from(new Set((variants || []).map(v => v.storage).filter(Boolean)));

  // find the active variant prioritizing matching color + storage, else storage-only
  const activeVariant = (variants || []).find(v => String(v.storage) === String(selectedStorage) && (selectedColor ? String(v.color) === String(selectedColor) : true))
    || (variants || []).find(v => String(v.storage) === String(selectedStorage))
    || null;

  // NEW: exact match variant for current selection (color + storage)
  const norm = (v) => String(v ?? "").trim().toLowerCase();
  const matchedVariant = (variants || []).find(v =>
    norm(v.color) === norm(selectedColor ?? swatches[0]?.label) &&
    norm(v.storage) === norm(selectedStorage)
  ) ?? null;

  // Mark out of stock when current selection doesn't exist or has zero stock
  const outOfStockSelected = (!matchedVariant || Number(matchedVariant.stock ?? 0) <= 0);

  const basePrice = Number((matchedVariant?.price ?? activeVariant?.price ?? price)) || 0;
  const finalPrice = computeFinalPriceFromBase(basePrice, discount);

  const inWishlist = isInWishlist(product.id, { color: selectedColor, storage: selectedStorage });

  const resolveAssetUrl = (p) => {
    if (!p) return "";
    const s = String(p);
    if (/^(https?:)?\/\//i.test(s) || s.startsWith("data:")) return s;
    if (s.startsWith("/")) return `${API}${s}`; // backend serves /images and /uploads
    return `${API}/${s}`;
  };

  return (
    <>
      <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 60 }}>
          {/* IMAGE */}
          <div style={{ flex: 1 }}>
            <img
              src={resolveAssetUrl(image)}
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

            {/* SWATCHES - hiển thị dưới tên sản phẩm */}
            {swatches && swatches.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 14, color: '#ddd', marginBottom: 6 }}>Màu sắc:</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {swatches.map((s, idx) => {
                    const isSelected = s.label === selectedColor;
                    const lightBorder = s.color && (String(s.color).toLowerCase() === "white" || s.color === "#fff" || s.color === "#ffffff" || s.color === "transparent");

                    return (
                      <button
                        key={idx}
                        type="button"
                        title={s.label}
                        aria-pressed={isSelected}
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedColor(s.label);
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: s.color || "transparent",
                          display: "inline-block",
                          boxShadow: isSelected ? "0 0 0 3px rgba(255,255,255,0.08)" : "inset 0 0 0 1px rgba(0,0,0,0.06)",
                          border: isSelected ? "2px solid rgba(255,255,255,0.85)" : (lightBorder ? "1px solid #ccc" : "none"),
                          cursor: "pointer",
                          padding: 0,
                          transform: isSelected ? "scale(1.08)" : "none",
                          filter: isSelected ? "brightness(1.12)" : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Storage selector */}
            {storages && storages.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 14, color: '#ddd', marginBottom: 6 }}>Dung lượng:</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {storages.map((s, idx) => {
                    const v = (variants || []).find(vv => String(vv.storage) === String(s) && (String(vv.color) === String(selectedColor) || true)) || (variants || []).find(vv => String(vv.storage) === String(s));
                    const priceFor = Number(v?.price ?? price) || 0;
                    const isSelectedStorage = String(s) === String(selectedStorage);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedStorage(s)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: isSelectedStorage ? '#ef4444' : '#1b2430',
                          color: isSelectedStorage ? '#fff' : '#ddd',
                          border: isSelectedStorage ? 'none' : '1px solid #2f3b45',
                          cursor: 'pointer',
                          minWidth: 100,
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{s}</div>
                        <div style={{ fontSize: 12, opacity: 0.9 }}>{priceFor.toLocaleString()}₫</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {getDiscountLabel(discount) ? (
              <>
                <p style={{ textDecoration: "line-through", color: "#999" }}>
                  {basePrice.toLocaleString()}₫
                </p>
                <p style={{ fontSize: 24, color: "red", fontWeight: 700 }}>
                  {finalPrice.toLocaleString()}₫
                  <span style={{ marginLeft: 12, fontSize: 14, color: '#fff', background: '#ef4444', padding: '2px 6px', borderRadius: 6 }}>{getDiscountLabel(discount)}</span>
                  {/* Show out-of-stock badge for current color+storage selection */}
                  {outOfStockSelected && (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#fff', background: '#6b7280', padding: '2px 8px', borderRadius: 6 }}>Hết hàng</span>
                  )}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 24, fontWeight: 700 }}>
                {basePrice.toLocaleString()}₫
                {/* Show out-of-stock badge for current color+storage selection */}
                {outOfStockSelected && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#fff', background: '#6b7280', padding: '2px 8px', borderRadius: 6 }}>Hết hàng</span>
                )}
              </p>
            )}

            <p style={{ marginTop: 20 }}>{description}</p>

            {/* BUTTONS */}
            <div style={{ marginTop: 30 }}>
              {/* ADD TO CART + WISHLIST */}
              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  onClick={() => {
                    if (!requireAuth()) return;

                    const selected = selectedColor ?? swatches[0]?.label ?? null;
                    const selectedValue = selectedColorValue;

                    // Find exact variant by current color + selected storage
                    const mv = (variants || []).find(v =>
                      norm(v.color) === norm(selected) &&
                      norm(v.storage) === norm(selectedStorage)
                    );

                    if (!mv) {
                      toast.warn("Không tìm thấy phiên bản phù hợp (màu/dung lượng)!");
                      return;
                    }
                    if (Number(mv.stock ?? 0) <= 0) {
                      toast.warn("Phiên bản này đã hết hàng!");
                      return;
                    }

                    const priceFor = computeFinalPriceFromBase(Number(mv.price ?? price) || 0, discount);

                    addToCart({
                      ...product,
                      price: priceFor,
                      selectedColor: selected,
                      selectedColorValue: selectedValue,
                      selectedVariant: {
                        version: mv.version ?? null,
                        storage: mv.storage ?? selectedStorage,
                        color: mv.color ?? selected,
                        price: Number(mv.price ?? price) || 0
                      }
                    });
                  }}
                  className="btn-gold"
                  disabled={outOfStockSelected}
                  style={outOfStockSelected ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                  Thêm vào giỏ
                </button>

                <button
                  onClick={() => {
                    if (!requireAuth()) return;

                    const selected = selectedColor ?? swatches[0]?.label ?? null;
                    const selectedValue = selectedColorValue;

                    // Find exact variant by current color + selected storage
                    const mv = (variants || []).find(v =>
                      norm(v.color) === norm(selected) &&
                      norm(v.storage) === norm(selectedStorage)
                    );

                    if (!mv) {
                      toast.warn("Không tìm thấy phiên bản phù hợp (màu/dung lượng)!");
                      return;
                    }
                    if (Number(mv.stock ?? 0) <= 0) {
                      toast.warn("Phiên bản này đã hết hàng!");
                      return;
                    }

                    const priceFor = computeFinalPriceFromBase(Number(mv.price ?? price) || 0, discount);

                    const buyItem = {
                      productId: product.id ?? product._id ?? null,
                      name: product.name, // kept for UI display only
                      unitPrice: priceFor,
                      quantity: 1,
                      selectedColor: selected ?? null, // UI display only
                      selectedColorValue: selectedValue ?? null, // UI display only
                      selectedStorage: mv.storage ?? null, // UI display only
                      variantSnapshot: {
                        version: mv.version ?? null,
                        color: mv.color ?? null,
                        storage: mv.storage ?? null
                      },
                      image: resolveAssetUrl(product.image || image)
                    };

                    navigate('/checkout', { state: { selectedItems: [buyItem] } });
                  }}
                  className="btn-gold btn-gold--lg"
                  disabled={outOfStockSelected}
                  style={outOfStockSelected ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                  Mua ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReviewSection productId={product._id} />
    </>
  );
}