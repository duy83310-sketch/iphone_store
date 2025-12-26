import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import { toast } from "react-toastify";

export default function Orders() {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    async function fetchOrders() {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API}/orders`, { headers: { "x-auth-token": token } });
        if (!res.ok) throw new Error("Không thể tải đơn hàng");
        const data = await res.json();
        setOrders(data || []);
      } catch (err) {
        console.error("fetchOrders", err);
        toast.error("Không thể tải đơn hàng");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  async function handleCancel() {
    if (!selectedOrder || !cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }

    setProcessing(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/orders/${selectedOrder._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ cancelReason })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.msg || "Không thể hủy đơn");
      }

      const updated = await res.json();
      setOrders(orders.map(o => o._id === updated._id ? updated : o));
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedOrder(null);
      toast.success("Đơn hàng đã bị hủy");
    } catch (err) {
      console.error("Cancel error", err);
      toast.error(err.message || "Lỗi khi hủy đơn");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Đang tải đơn hàng...</div>;

  function renderOrder(o) {
    const st = String(o.status || "").toUpperCase();
    return (
      <div key={o._id} style={{ background: "#222", padding: 12, borderRadius: 8, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {/* Show orderCode if available */}
            <div style={{ fontWeight: "bold" }}>Mã đơn: {o.orderCode || String(o._id).slice(-8)}</div>
            <div style={{ fontSize: 12, color: "#ccc" }}>{new Date(o.createdAt).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: "bold", color: "#e5d6b9" }}>{(o.totalPrice || 0).toLocaleString()}₫</div>
            <div style={{ fontSize: 12, color: st === "CANCELLED" ? "#ff6b6b" : "#fff" }}>
              {st === "PENDING" ? "Chờ xử lý" : st === "CONFIRMED" ? "Đã xác nhận" : st === "CANCELLED" ? "Đã hủy" : st === "SHIPPING" ? "Đang giao" : st === "DELIVERED" ? "Đã giao" : o.status}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ fontWeight: "bold" }}>Sản phẩm:</div>
          <div
            style={{
              margin: 6,
              paddingLeft: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxHeight: Array.isArray(o.items) && o.items.length > 4 ? 200 : "auto",
              overflowY: Array.isArray(o.items) && o.items.length > 4 ? "auto" : "visible"
            }}
          >
            {Array.isArray(o.items) && o.items.map((it, idx) => {
              // Use name from backend if available, fallback to "Sản phẩm #{productId}"
              const iName = it.name || it.productName || `Sản phẩm #${it.productId}`;
              const unit = Number(it.unitPrice ?? it.price ?? 0);
              const qty = Number(it.quantity || 0);

              // variant info from order (no extra fetch)
              const v = it.variantSnapshot || it.selectedVariant || {};
              const vColor = v.color ?? it.selectedColor ?? null;
              const vStorage = v.storage ?? it.selectedStorage ?? null;
              const vVersion = v.version ?? null;

              return (
                <div
                  key={`${it.productId}-${idx}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    maxWidth: 560,
                    padding: "6px 8px",
                    background: "#171717",
                    borderRadius: 6,
                    color: "#fff"
                  }}
                >
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{iName}</div>

                    {(vVersion || vColor || vStorage) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                        {vVersion && <span style={{ fontSize: 12, color: '#ddd' }}>{String(vVersion).toUpperCase()}</span>}
                        {vColor && <span style={{ fontSize: 12, color: '#ddd' }}>{vColor}</span>}
                        {vStorage && <span style={{ fontSize: 12, color: '#ddd' }}>{vStorage}</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ marginLeft: 12, color: "#e5d6b9", whiteSpace: "nowrap" }}>
                    {qty} × {unit.toLocaleString()}₫
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 13 }}>
          <div style={{ fontWeight: "bold" }}>Địa chỉ:</div>
          <div>{o.address?.label} — {o.address?.details}</div>
          <div>{o.address?.province}, {o.address?.country} — SĐT: {o.address?.phone}</div>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13 }}>Thanh toán: {o.paymentMethod}</div>
          <div style={{ fontSize: 13 }}>Vận chuyển: {o.shippingMethod}</div>
          {o.deliveryEstimate && <div style={{ fontSize: 13 }}>Dự kiến: {o.deliveryEstimate}</div>}
        </div>

        {o.cancelReason && <div style={{ marginTop: 8, fontSize: 13, color: "#ffb3b3" }}>Lý do hủy: {o.cancelReason}</div>}

        {/* Action buttons */}
        {st === "PENDING" && (
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setSelectedOrder(o);
                setCancelReason("");
                setShowCancelModal(true);
              }}
              className="btn-danger"
            >
              Hủy
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Đơn hàng của tôi</h2>
      {orders.length === 0 ? (
        <div style={{ padding: 12, background: "#222", borderRadius: 8, color: "#fff" }}>Bạn chưa có đơn hàng nào.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map(renderOrder)}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#222", borderRadius: 8, padding: 20, maxWidth: 400, width: "90%" }}>
            <h3 style={{ marginTop: 0, color: "#fff" }}>Xác nhận hủy đơn</h3>
            <label style={{ color: "#ddd", display: "block", marginBottom: 8 }}>Lý do hủy:</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy đơn hàng..."
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #555", background: "#111", color: "#fff", boxSizing: "border-box", minHeight: 80 }}
            />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                onClick={handleCancel}
                disabled={processing}
                style={{ flex: 1, padding: "8px 12px", background: "#c54646", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                {processing ? "Đang xử lý..." : "Xác nhận hủy"}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{ flex: 1, padding: "8px 12px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

