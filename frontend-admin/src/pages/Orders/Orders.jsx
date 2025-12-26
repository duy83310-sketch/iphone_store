import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { FiSearch } from "react-icons/fi";
import { format as formatDate, parseISO } from "date-fns";
import { fetchOrders } from "../../services/orders.service";

import StatusBadge from "../../components/StatusBadge";
import { updateOrderStatus, deleteOrders } from "../../services/orders.service";
import { toast } from "react-toastify";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 7; // show 7 orders per page
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const status = statusFilter === 'all' ? null : statusFilter;
    fetchOrders({ page, limit, status }).then((res) => {
      if (!mounted) return;
      // res should be { data, total }
      const data = res.data || res;
      const t = res.total ?? (Array.isArray(res) ? res.length : 0);
      setOrders(data);
      setTotal(t);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setOrders([]);
      setTotal(0);
      setLoading(false);
    });

    return () => (mounted = false);
  }, [page, statusFilter]);

  const [updatingId, setUpdatingId] = useState(null);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const role = String(localStorage.getItem('userRole') || '').toLowerCase();
  const isNoSelection = selectedIds.length === 0;
  const canUpdateStatus = role === 'admin' || role === 'staff';

  const formatOrderCode = (id) => (id ? `#${String(id).slice(-8)}` : '');

  async function handleStatusChange(order, targetStatus) {
    // allow only admin/staff to update status (UI guard)
    if (!canUpdateStatus) {
      toast.error('Bạn không có quyền cập nhật trạng thái đơn hàng');
      setOpenMenuId(null);
      return;
    }

    const id = order.id || order._id;
    if (!id) return;
    setUpdatingId(id);
    try {
      const updated = await updateOrderStatus(id, targetStatus);
      // updated is the order from server; reflect status immediately
      setOrders((prev) => prev.map((p) => {
        const pid = p.id || p._id;
        if (String(pid) === String(id)) {
          return { ...p, status: String(updated.status).toUpperCase(), shippedAt: updated.shippedAt, deliveredAt: updated.deliveredAt };
        }
        return p;
      }));
      toast.success("Đã cập nhật trạng thái");
    } catch (err) {
      console.error("update status", err);

      const httpStatus = err?.response?.status;
      const serverMsg = err?.response?.data?.msg;

      // If UI allows (staff/admin) but server still returns 403 => backend guard is still admin-only OR token/role in JWT is stale
      if (httpStatus === 403 && canUpdateStatus) {
        toast.error(serverMsg || "API từ chối (403). Hãy đăng xuất/đăng nhập lại; nếu vẫn lỗi thì backend vẫn đang yêu cầu quyền admin cho endpoint cập nhật trạng thái.");
      } else {
        toast.error(serverMsg || "Không thể cập nhật trạng thái");
      }
    } finally {
      setUpdatingId(null);
      setOpenMenuId(null);
    }
  }

  async function handleConfirmDelete() {
    // only admin can delete
    const role = String(localStorage.getItem('userRole') || '').toLowerCase();
    if (role !== 'admin') {
      toast.error('Bạn không có quyền này');
      setShowDeleteConfirm(false);
      return;
    }

    setShowDeleteConfirm(false);
    if (selectedIds.length === 0) return;
    try {
      await deleteOrders(selectedIds);
      setOrders((prev) => prev.filter((o) => !selectedIds.includes(o.id || o._id)));
      setSelectedIds([]);
      toast.success("Đã xóa đơn hàng đã chọn");
    } catch (err) {
      console.error("delete orders", err);
      toast.error(err?.response?.data?.msg || "Không thể xóa đơn hàng");
    }
  }

  return (
    <div className="orders-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Quản lý Đơn hàng</h2>
          <p style={{ margin: 0, opacity: 0.6 }}>Theo dõi và quản lý tất cả các đơn hàng tại đây.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (role !== 'admin') {
                toast.error('Bạn không có quyền này');
                return;
              }
              if (selectedIds.length > 0) setShowDeleteConfirm(true);
            }}
            disabled={isNoSelection}
            title={role !== 'admin' ? 'Bạn không có quyền này' : undefined}
            style={{ background: isNoSelection ? '#374151' : (role === 'admin' ? '#ef4444' : '#9ca3af'), color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: isNoSelection ? 'not-allowed' : 'pointer', opacity: isNoSelection ? 0.6 : 1 }}
          >
            Xóa đã chọn
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#0f1724", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #324d67" }}>
            <FiSearch color="#94a3b8" />
            <input placeholder="Tìm theo mã đơn, tên khách hàng" style={{ background: "transparent", border: "none", outline: "none", color: "#fff", width: "100%" }} />
          </div>
        </div>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ background: "#0f1724", color: "#fff", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #324d67" }}>
          <option value="all">Tất cả trạng thái</option>
          <option value="PENDING">Chờ xử lý</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="SHIPPING">Đang giao</option>
          <option value="DELIVERED">Đã giao</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>

        <select style={{ background: "#0f1724", color: "#fff", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid #324d67" }}>
          <option value="all">Khoảng thời gian</option>
          <option value="7">7 ngày</option>
          <option value="30">30 ngày</option>
          <option value="90">90 ngày</option>
        </select>
      </div>

      <div style={{ background: "#0b1115", borderRadius: "0.5rem", padding: "1rem", color: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#94a3b8", fontSize: "0.9rem" }}>
              <th style={{ padding: "0.75rem" }}><input type="checkbox" checked={selectedIds.length === orders.length && orders.length > 0} onChange={(e) => { if (e.target.checked) setSelectedIds(orders.map((o) => o.id || o._id)); else setSelectedIds([]); }} /></th>
              <th style={{ padding: "0.75rem" }}>Mã ĐH</th>
              <th style={{ padding: "0.75rem" }}>Khách hàng</th>
              <th style={{ padding: "0.75rem" }}>Ngày đặt</th>
              <th style={{ padding: "0.75rem" }}>Tổng tiền</th>
              <th style={{ padding: "0.75rem" }}>Trạng thái</th>
              <th style={{ padding: "0.75rem", textAlign: "right" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: "1.25rem", textAlign: "center", color: "#94a3b8" }}>Đang tải...</td>
              </tr>
            ) : (
              orders.map((o, idx) => (
                <tr
                  key={o.id || o._id}
                  style={{
                    borderTop: "1px solid #fff",
                    background: (function(){
                      const id = o.id || o._id;
                      const shipping = String(o.shippingMethod || "").toLowerCase();
                      const isExpress = shipping.includes("express") || shipping.includes("hỏa") || shipping.includes("hoa") || shipping.includes("express");
                      if (openMenuId === id) return "#1f2937";
                      if (isExpress) return "linear-gradient(90deg, #344454ff 0%, #1f2933 20%)";
                    })(),
                    transform:
                    openMenuId === (o.id || o._id) ? "scale(1.05)" : "scale(1)",
                    transition: "all 0.2s ease",
                    position: openMenuId === (o.id || o._id) ? "relative" : "static",
                    zIndex: openMenuId === (o.id || o._id) ? 5 : 1
                  }}
                >
                  <td style={{ padding: "0.75rem" }}><input type="checkbox" checked={selectedIds.includes(o.id || o._id)} onChange={(e) => { const id = o.id || o._id; if (e.target.checked) setSelectedIds((p) => Array.from(new Set([...p, id]))); else setSelectedIds((p) => p.filter((x) => String(x) !== String(id))); }} /></td>
                  <td style={{ padding: "0.75rem", color: "#fff", fontWeight: 600 }}>
                    {o.orderCode || formatOrderCode(o.id)}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>{o.customer}</span>
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{o.phone}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem", color: "#94a3b8" }}>{formatDate(parseISO(o.date), "dd/MM/yyyy")}</td>
                  <td style={{ padding: "0.75rem", fontWeight: 700 }}>{o.total.toLocaleString("vi-VN")}đ</td>
                  <td style={{ padding: "0.75rem", display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={o.status} />
                  </td>
                  <td
                    onClick={() => setOpenMenuId((id) => (id === (o.id || o._id) ? null : (o.id || o._id)))}
                    style={{ padding: "0.75rem", textAlign: "right", position: 'relative' }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId((id) => (id === (o.id || o._id) ? null : (o.id || o._id))); }}
                      style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer" }}
                    >
                      ⋮
                    </button>

                    {openMenuId === (o.id || o._id) && (
                      <div onMouseEnter={() => setOpenMenuId((o.id || o._id))} onMouseLeave={() => setOpenMenuId(null)} style={{ position: 'absolute', right: 0, top: (idx >= (limit - 2) ? 'auto' : '120%'), bottom: (idx >= (limit - 2) ? '120%' : 'auto'), background: '#071018', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, zIndex: 1000 }}>
                        <button
                          disabled={!canUpdateStatus || String(o.status).toUpperCase() !== 'PENDING'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(o, 'CONFIRMED'); }}
                          onMouseEnter={() => setHoveredAction((o.id || o._id) + '_confirm')}
                          onMouseLeave={() => setHoveredAction(null)}
                          style={{
                            textAlign: 'left',
                            padding: '6px 8px',
                            border: 'none',
                            background: hoveredAction === (o.id || o._id) + '_confirm' ? '#333' : 'transparent',
                            color: (!canUpdateStatus || String(o.status).toUpperCase() !== 'PENDING') ? '#6b7280' : '#fff',
                            cursor: (!canUpdateStatus || String(o.status).toUpperCase() !== 'PENDING') ? 'not-allowed' : 'pointer',
                            fontSize: hoveredAction === (o.id || o._id) + '_confirm' ? '1.03rem' : '1rem'
                          }}
                        >
                          Xác nhận
                        </button>

                        <button
                          disabled={!canUpdateStatus || String(o.status).toUpperCase() !== 'CONFIRMED'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(o, 'SHIPPING'); }}
                          onMouseEnter={() => setHoveredAction((o.id || o._id) + '_ship')}
                          onMouseLeave={() => setHoveredAction(null)}
                          style={{
                            textAlign: 'left',
                            padding: '6px 8px',
                            border: 'none',
                            background: hoveredAction === (o.id || o._id) + '_ship' ? '#333' : 'transparent',
                            color: (!canUpdateStatus || String(o.status).toUpperCase() !== 'CONFIRMED') ? '#6b7280' : '#fff',
                            cursor: (!canUpdateStatus || String(o.status).toUpperCase() !== 'CONFIRMED') ? 'not-allowed' : 'pointer',
                            fontSize: hoveredAction === (o.id || o._id) + '_ship' ? '1.03rem' : '1rem'
                          }}
                        >
                          Bắt đầu giao
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); const navId = (o.id || o._id); if (navId) navigate(`/orders/${navId}`); }}
                          onMouseEnter={() => setHoveredAction((o.id || o._id) + '_view')}
                          onMouseLeave={() => setHoveredAction(null)}
                          style={{ textAlign: 'left', padding: '6px 8px', border: 'none', background: hoveredAction === (o.id || o._id) + '_view' ? '#333' : 'transparent', color: '#fff', cursor: 'pointer', fontSize: hoveredAction === (o.id || o._id) + '_view' ? '1.03rem' : '1rem' }}
                        >
                          Xem thông tin
                        </button>

                        <button
                          disabled={!canUpdateStatus || String(o.status).toUpperCase() !== 'SHIPPING'}
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(o, 'DELIVERED'); }}
                          onMouseEnter={() => setHoveredAction((o.id || o._id) + '_delivered')}
                          onMouseLeave={() => setHoveredAction(null)}
                          style={{
                            textAlign: 'left',
                            padding: '6px 8px',
                            border: 'none',
                            background: hoveredAction === (o.id || o._id) + '_delivered' ? '#333' : 'transparent',
                            color: (!canUpdateStatus || String(o.status).toUpperCase() !== 'SHIPPING') ? '#6b7280' : '#fff',
                            cursor: (!canUpdateStatus || String(o.status).toUpperCase() !== 'SHIPPING') ? 'not-allowed' : 'pointer',
                            fontSize: hoveredAction === (o.id || o._id) + '_delivered' ? '1.03rem' : '1rem'
                          }}
                        >
                          Hoàn tất
                        </button>

                        <button
                          disabled={
                            !canUpdateStatus ||
                            String(o.status).toUpperCase() === 'SHIPPING' ||
                            String(o.status).toUpperCase() === 'DELIVERED' ||
                            String(o.status).toUpperCase() === 'CANCELLED' ||
                            updatingId === (o.id || o._id)
                          }
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(o, 'CANCELLED'); }}
                          onMouseEnter={() => setHoveredAction((o.id || o._id) + '_cancel')}
                          onMouseLeave={() => setHoveredAction(null)}
                          style={{
                            textAlign: 'left',
                            padding: '6px 8px',
                            border: 'none',
                            background: hoveredAction === (o.id || o._id) + '_cancel' ? '#333' : 'transparent',
                            color: (
                              !canUpdateStatus ||
                              String(o.status).toUpperCase() === 'SHIPPING' ||
                              String(o.status).toUpperCase() === 'DELIVERED' ||
                              String(o.status).toUpperCase() === 'CANCELLED' ||
                              updatingId === (o.id || o._id)
                            ) ? '#6b7280' : '#fff',
                            cursor: (
                              !canUpdateStatus ||
                              String(o.status).toUpperCase() === 'SHIPPING' ||
                              String(o.status).toUpperCase() === 'DELIVERED' ||
                              String(o.status).toUpperCase() === 'CANCELLED' ||
                              updatingId === (o.id || o._id)
                            ) ? 'not-allowed' : 'pointer',
                            fontSize: hoveredAction === (o.id || o._id) + '_cancel' ? '1.03rem' : '1rem'
                          }}
                        >
                          Hủy đơn
                        </button>

                        {String(o.status).toUpperCase() === 'CANCELLED' && (
                          <button
                            disabled={!canUpdateStatus || updatingId === (o.id || o._id)}
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(o, 'PENDING'); }}
                            onMouseEnter={() => setHoveredAction((o.id || o._id) + '_restore')}
                            onMouseLeave={() => setHoveredAction(null)}
                            style={{
                              textAlign: 'left',
                              padding: '6px 8px',
                              border: 'none',
                              background: hoveredAction === (o.id || o._id) + '_restore' ? '#333' : 'transparent',
                              color: (!canUpdateStatus || updatingId === (o.id || o._id)) ? '#6b7280' : '#fff',
                              cursor: (!canUpdateStatus || updatingId === (o.id || o._id)) ? 'not-allowed' : 'pointer',
                              fontSize: hoveredAction === (o.id || o._id) + '_restore' ? '1.03rem' : '1rem'
                            }}
                          >
                            Khôi phục
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", color: "#94a3b8" }}>
          <div>
            {total === 0 ? (
              <span>Không có đơn hàng</span>
            ) : (
              <span>
                Showing {(total === 0 ? 0 : (page - 1) * limit + 1)}-{Math.min(page * limit, total)} of {total}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: "transparent", color: page === 1 ? "#374151" : "#94a3b8", border: "1px solid rgba(255,255,255,0.04)", padding: "0.4rem 0.6rem", borderRadius: "0.35rem", cursor: page === 1 ? "not-allowed" : "pointer" }}
            >
              Previous
            </button>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(total / limit));
                const current = page;
                const pages = [];
                const push = (p) => pages.push(p);
                push(1);
                if (current > 3) push("...");
                for (let p = current - 1; p <= current + 1; p++) {
                    if (p > 1 && p < totalPages) push(p);
                }
                if (current < totalPages - 2) push("...");
                if (totalPages > 1) push(totalPages);
                return pages.map((p, idx) =>
                    p === "..." ? (
                    <span
                        key={`dots-${idx}`}
                        style={{ padding: "0.4rem 0.6rem", color: "#6b7280" }}
                    >
                        …
                    </span>
                    ) : (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                        background: p === page ? "#0b1220" : "transparent",
                        color: p === page ? "#fff" : "#94a3b8",
                        border: "1px solid rgba(255,255,255,0.04)",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "0.35rem",
                        cursor: "pointer"
                        }}
                    >
                        {p}
                    </button>
                    )
                );
                })()}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
              disabled={page >= Math.ceil(total / limit)}
              style={{ background: "transparent", color: page >= Math.ceil(total / limit) ? "#374151" : "#94a3b8", border: "1px solid rgba(255,255,255,0.04)", padding: "0.4rem 0.6rem", borderRadius: "0.35rem", cursor: page >= Math.ceil(total / limit) ? "not-allowed" : "pointer" }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
          <div style={{ background: '#0b1115', padding: 20, borderRadius: 8, width: 360, color: '#fff' }}>
            <h3 style={{ margin: 0, marginBottom: 8 }}>Xác nhận xóa</h3>
            <p style={{ margin: 0, color: '#d1d5db' }}>Bạn có chắc muốn xóa {selectedIds.length} đơn hàng đã chọn? Hành động này không thể hoàn tác.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.04)', padding: '0.4rem 0.6rem', borderRadius: 4 }}>Huỷ</button>
              <button onClick={handleConfirmDelete} style={{ background: '#ef4444', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: 4 }}>Xóa</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
// (no functional changes required for the 403; backend authorization needed)
