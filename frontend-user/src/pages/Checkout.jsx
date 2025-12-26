import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import "../styles/pages/cart.css";
import { toast } from "react-toastify";

export default function Checkout() {
  const { cart, totalPrice, removeFromCart } = useCart();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("fast"); // "fast" = Chuyển phát nhanh, "express" = Hỏa tốc
  const [deliveryEstimate, setDeliveryEstimate] = useState("");

  useEffect(() => {
    // Determine items to checkout: either passed selectedItems or full cart
    const selectedFromState = location.state?.selectedItems;
    const itemsForCheckout = Array.isArray(selectedFromState) && selectedFromState.length > 0 ? selectedFromState : cart;

    // Redirect if no items to checkout
    if (itemsForCheckout.length === 0) {
      toast.warn("Giỏ hàng trống!");
      navigate("/cart");
      return;
    }

    // Fetch all addresses
    fetchAddresses();
  }, [cart, navigate, location]);

  // Items to display/use for totals and order creation
  const selectedFromState = location.state?.selectedItems;
  const itemsForCheckout = useMemo(() => (Array.isArray(selectedFromState) && selectedFromState.length > 0 ? selectedFromState : cart), [selectedFromState, cart]);

  const computedTotal = useMemo(
    () => itemsForCheckout.reduce(
      (s, it) => s + (Number(it.unitPrice ?? it.price ?? 0) * Number(it.quantity || 0)),
      0
    ),
    [itemsForCheckout]
  );

  async function fetchAddresses() {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/auth/addresses`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setAddresses(data);
        // Auto-select default address if it exists
        const defaultAddr = data.find(a => a.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr._id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0]._id);
        }
      }
    } catch (err) {
      console.error("Fetch addresses error", err);
      toast.error("Không thể tải địa chỉ");
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase() {
    if (!user) {
      toast.error("Vui lòng đăng nhập để tiếp tục");
      return;
    }

    if (!selectedAddressId) {
      toast.error("Vui lòng chọn địa chỉ giao hàng");
      return;
    }

    setProcessing(true);
    const token = localStorage.getItem("token");
    try {
      const payload = {
        items: itemsForCheckout.map(i => {
          const unit = Number(i.unitPrice ?? i.price) || 0;
          return {
            productId: String(Number(i.productId)),
            unitPrice: unit,
            quantity: i.quantity,
            variantSnapshot: {
              version: i.selectedVariant?.version ?? null,
              color: i.selectedVariant?.color ?? null,
              storage: i.selectedStorage ?? i.selectedVariant?.storage ?? null
            }
          };
        }),
        addressId: selectedAddressId,
        paymentMethod,
        shippingMethod,
        deliveryEstimate,
        totalPrice: computedTotal
      };

      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          // If backend indicates insufficient stock, present a friendly message with details
          if (errData && errData.msg === "Số lượng hàng tồn kho không đủ" && Array.isArray(errData.details)) {
           const parts = errData.details.map(d => `${d.name || d.productId} (còn ${d.available})`);
           throw new Error(`Số lượng hàng tồn kho không đủ: ${parts.join(", ")}`);
          }
          throw new Error(errData.msg || "Lỗi khi tạo đơn hàng");
      }

      const data = await res.json();
      toast.success("Đơn hàng của bạn đã được tạo!");
      // remove only the ordered items from cart
      try {
        const removePromises = itemsForCheckout.map(it => {
          if (!it?.id) return Promise.resolve();
          return removeFromCart(it.id).catch(err => {
            console.warn("removeFromCart failed", err);
          });
        });

        await Promise.all(removePromises);
      } catch (e) {
        console.warn("removing selected items failed", e);
      }

      // Optionally navigate to orders page
      navigate("/profile/orders");
    } catch (err) {
      console.error("Purchase error", err);
      toast.error(err.message || "Lỗi khi tạo đơn hàng");
    } finally {
      setProcessing(false);
    }
  }

  // Helpers to compute delivery estimate based on province and shipping method
  function formatDate(d) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  }

  function computeEstimate(province, method) {
    const today = new Date();
    const p = (province || "").toLowerCase();

    const isHN = p.includes("hà nội") || p.includes("ha noi");
    const isHCM = p.includes("hồ chí minh") || p.includes("ho chi minh") || p.includes("hcm");

    if (method === "fast") {
      // Chuyển phát nhanh: HN 1-2 days, HCM 3-4 days
      if (isHN) {
        const d1 = new Date(today); d1.setDate(today.getDate() + 1);
        const d2 = new Date(today); d2.setDate(today.getDate() + 2);
        return `Nhận trong ${formatDate(d1)} - ${formatDate(d2)}`;
      }
      if (isHCM) {
        const d1 = new Date(today); d1.setDate(today.getDate() + 3);
        const d2 = new Date(today); d2.setDate(today.getDate() + 4);
        return `Nhận trong ${formatDate(d1)} - ${formatDate(d2)}`;
      }
      // default: 2-3 days
      const d1 = new Date(today); d1.setDate(today.getDate() + 2);
      const d2 = new Date(today); d2.setDate(today.getDate() + 3);
      return `Nhận trong ${formatDate(d1)} - ${formatDate(d2)}`;
    }

    if (method === "express") {
      // Hỏa tốc: HN hôm nay, HCM 1-2 days
      if (isHN) {
        return `Nhận trong hôm nay (${formatDate(today)})`;
      }
      if (isHCM) {
        const d1 = new Date(today); d1.setDate(today.getDate() + 1);
        const d2 = new Date(today); d2.setDate(today.getDate() + 2);
        return `Nhận trong ${formatDate(d1)} - ${formatDate(d2)}`;
      }
      // default: tomorrow
      const d1 = new Date(today); d1.setDate(today.getDate() + 1);
      return `Nhận trong ${formatDate(d1)}`;
    }

    return "";
  }

  useEffect(() => {
    const addr = addresses.find(a => a._id === selectedAddressId);
    const province = addr?.province || "";
    const est = computeEstimate(province, shippingMethod);
    setDeliveryEstimate(est);
  }, [selectedAddressId, shippingMethod, addresses]);

  if (loading) {
    return <h2 style={{ padding: 20 }}>Đang tải...</h2>;
  }

  return (
    <div style={{padding: "20px", maxWidth: "70%", margin: "auto"}}>
      <h1   className="title">Thanh toán</h1>

      <div style={{ display: "flex", gap: 24}}>
        {/* Left: Products */}
        <div style={{ flex: 1 }}>
          <div style={{ background: "#222", borderRadius: 8, overflow: "hidden" }}>
            <h3 style={{ color: "#fff", fontSize: "18px", padding: "12px", textAlign: "center", borderBottom: "1px solid #555" }}>Đơn hàng</h3>
            <div style={{ maxHeight: itemsForCheckout.length > 4 ? 400 : "auto", overflowY: itemsForCheckout.length > 4 ? "auto" : "visible" }}>
              {itemsForCheckout.map((item, idx) => (
              <div
                key={`${item.productId}-${item.selectedColor ?? ''}-${item.selectedStorage ?? item.selectedVariant?.storage ?? ''}`}
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  padding: "16px",
                  borderBottom: idx < itemsForCheckout.length - 1 ? "1px solid #555" : "none"
                }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: 60, height: 60, objectFit: "contain" }}
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px 0", color: "#fff" }}>{item.name}</h4>

                  {/* selected color / storage display */}
                  { (item.selectedColor || item.selectedColorValue || item.selectedStorage || item.selectedVariant?.storage) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {(item.selectedColor || item.selectedColorValue) && (
                        <>
                          <span
                            title={item.selectedColor ?? ''}
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 12,
                              background: item.selectedColorValue ?? 'transparent',
                              display: 'inline-block',
                              border: (item.selectedColorValue && (String(item.selectedColorValue).toLowerCase() === 'white' || item.selectedColorValue === '#fff' || item.selectedColorValue === '#ffffff' || item.selectedColorValue === 'transparent')) ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.12)'
                            }}
                          />
                          <span style={{ fontSize: 13, color: '#ddd' }}>{item.selectedColor}</span>
                        </>
                      )}
                      {(item.selectedStorage || item.selectedVariant?.storage) && (
                        <span style={{ fontSize: 13, color: '#ddd', marginLeft: 6 }}>{item.selectedStorage ?? item.selectedVariant?.storage}</span>
                      )}
                    </div>
                  )}

                  <p style={{ margin: 0, color: "#fff", fontSize: "14px" }}>
                    {(Number(item?.unitPrice ?? item?.price ?? 0)).toLocaleString()}₫ × {item.quantity} = <strong>{(Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity || 0)).toLocaleString()}₫</strong>
                  </p>
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Total */}
          <div style={{ marginTop: 16, padding: "12px 16px", background: "#222", borderRadius: 8}}>
            <h3 style={{ margin: 0, color: "#fff" }}>
              Tổng tiền: <span style={{ color: "#e5d6b9", fontSize: "24px" }}>{computedTotal.toLocaleString()}₫</span>
            </h3>
          </div>
        </div>

        {/* Right: Address & Purchase */}
        <div style={{ flex: 0.6, minWidth: 280 }}>
          <div style={{ background: "#222", borderRadius: 8, padding: 16 }}>
            <h2 style={{ color: "#fff", fontSize: "18px", marginTop: 0, marginBottom: 12, textAlign: "center"}}>Địa chỉ giao hàng</h2>

            {addresses.length > 0 ? (
              <div
                style={{ position: "relative" }}
                onMouseLeave={() => setShowDropdown(false)}
              >
                {/* Selected/Default Address Display */}
                <div
                  onClick={() => setShowDropdown(!showDropdown)}
                  style={{
                    padding: 10,
                    border: "1px solid #555",
                    borderRadius: 6,
                    background: "#333",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {addresses.find(a => a._id === selectedAddressId) ? (
                      <>
                        <div style={{ fontWeight: "bold", color: "#fff" }}>
                          {addresses.find(a => a._id === selectedAddressId)?.label || "Địa chỉ"}
                          {addresses.find(a => a._id === selectedAddressId)?.isDefault && (
                            <span style={{ color: "#0a66d1", fontSize: "12px", marginLeft: 6 }}>Mặc định</span>
                          )}
                        </div>
                        <div style={{ color: "#fff", fontSize: "13px", marginTop: 4 }}>
                          {addresses.find(a => a._id === selectedAddressId)?.details}
                        </div>
                        <div style={{ color: "#fff", fontSize: "13px" }}>
                          {addresses.find(a => a._id === selectedAddressId)?.province}, {addresses.find(a => a._id === selectedAddressId)?.country}
                        </div>
                        <div style={{ color: "#fff", fontSize: "13px" }}>
                          SĐT: {addresses.find(a => a._id === selectedAddressId)?.phone}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 20, color: "#fff", marginTop: 2, transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                    ▼
                  </span>
                </div>

                {/* Dropdown List */}
                {showDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#333",
                      border: "1px solid #555",
                      borderTop: "none",
                      borderRadius: "0 0 6px 6px",
                      maxHeight: "300px",
                      overflowY: "auto",
                      zIndex: 10,
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}
                  >
                    {addresses.map((addr) => (
                      <div
                        key={addr._id}
                        onClick={() => {
                          setSelectedAddressId(addr._id);
                          setShowDropdown(false);
                        }}
                        style={{
                          padding: 10,
                          borderBottom: "1px solid #555",
                          cursor: "pointer",
                          background: selectedAddressId === addr._id ? "#333" : "#333",
                          transition: "background 0.2s",
                          color: "#fff"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#555"}
                        onMouseLeave={(e) => e.currentTarget.style.background = selectedAddressId === addr._id ? "#333" : "#333"}
                      >
                        <div style={{ fontWeight: "bold", color: "#fff", fontSize: "14px" }}>
                          {addr.label || "Địa chỉ"}
                          {addr.isDefault && <span style={{ color: "#0a66d1", fontSize: "11px", marginLeft: 6 }}>Mặc định</span>}
                        </div>
                        <div style={{ color: "#fff", fontSize: "12px", marginTop: 2 }}>{addr.details}</div>
                        <div style={{ color: "#fff", fontSize: "12px" }}>
                          {addr.province}, {addr.country}
                        </div>
                        <div style={{ color: "#fff", fontSize: "12px" }}>SĐT: {addr.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#333", border: "2px dashed #555", borderRadius: 6, padding: 12, marginBottom: 16, textAlign: "center", color: "#fff" }}>
                <p>Chưa có địa chỉ giao hàng</p>
              </div>
            )}

            {/* Payment & Shipping */}
            <div style={{ marginTop: 12, padding: 12, background: "#2a2a2a", borderRadius: 6, border: "1px solid #444" }}>
              <div style={{ color: "#fff", fontWeight: "bold", marginBottom: 8 }}>Phương thức thanh toán</div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #555", background: "#333", color: "#fff" }}
              >
                <option value="cod">Thanh toán khi nhận hàng (COD)</option>
              </select>

              <div style={{ height: 12 }} />

              <div style={{ color: "#fff", fontWeight: "bold", marginBottom: 8 }}>Hình thức vận chuyển</div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="shipping"
                    value="fast"
                    checked={shippingMethod === "fast"}
                    onChange={() => setShippingMethod("fast")}
                    hidden
                  />
                  <span className="cart-radio"></span>
                  <div>
                    <div style={{ fontWeight: "bold" }}>Chuyển phát nhanh</div>
                    <div style={{ fontSize: 12, color: "#e5d6b9" }}>{shippingMethod === "fast" && deliveryEstimate}</div>
                  </div>
                </label>

                <label style={{ flex: 1, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="shipping"
                    value="express"
                    checked={shippingMethod === "express"}
                    onChange={() => setShippingMethod("express")}
                    hidden
                  />
                  <span className="cart-radio"></span>
                  <div>
                    <div style={{ fontWeight: "bold" }}>Hỏa tốc</div>
                    <div style={{ fontSize: 12, color: "#e5d6b9" }}>{shippingMethod === "express" && deliveryEstimate}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={processing || !selectedAddressId || !user}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "12px 16px",
                background:
                  selectedAddressId && user
                    ? "linear-gradient(135deg, #e6c27a, #c8943f, #9a6732)"
                    : "linear-gradient(135deg, #4a3a28, #3a2e22)",
                color: "#1b1b1b",
                border: "none",
                borderRadius: 8,
                cursor:
                  selectedAddressId && user && !processing
                    ? "pointer"
                    : "not-allowed",
                fontSize: 16,
                fontWeight: 700,
                boxShadow:
                  selectedAddressId && user
                    ? "0 6px 18px rgba(198,121,45,0.35)"
                    : "none",
                transition:
                  "background 0.3s ease, box-shadow 0.3s ease, transform 0.15s"
              }}
              onMouseEnter={(e) => {
                if (selectedAddressId && user) {
                  e.currentTarget.style.boxShadow =
                    "0 10px 28px rgba(198,121,45,0.5)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  selectedAddressId && user
                    ? "0 6px 18px rgba(198,121,45,0.35)"
                    : "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              {processing ? "Đang xử lý..." : "Mua hàng"}
            </button>

            <button
              onClick={() => navigate("/cart")}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "10px 16px",
                background: "transparent",
                color: "#e6c27a",
                border: "1px solid rgba(230,194,122,0.6)",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                transition:
                  "background 0.25s ease, color 0.25s ease, border 0.25s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(230,194,122,0.12)";
                e.currentTarget.style.border =
                  "1px solid rgba(230,194,122,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.border =
                  "1px solid rgba(230,194,122,0.6)";
              }}
            >
              Quay lại giỏ hàng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
