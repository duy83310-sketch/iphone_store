import { useEffect, useMemo, useState } from "react";
import customersService from "../../services/customers.service";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function Customers() {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // today|week|month|all
  const [sortBy, setSortBy] = useState("orders"); // orders|spent
  const [status, setStatus] = useState("all"); // all|active|disabled|vip
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // detail drawer state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const navigate = useNavigate();

  // normalize id (_id vs id) + always string
  const getId = (u) => {
    const v = u?._id || u?.id;
    return v == null ? "" : String(v);
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    customersService.fetchClients({ page: 1, limit: 20, q: query })
      .then((res) => { if (mounted) { setData(res.data || []); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [query]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay()+6)%7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return (Array.isArray(data) ? data : [])
      .filter(u => !query || String(u.email).toLowerCase().includes(query.toLowerCase()) || String(u.name).toLowerCase().includes(query.toLowerCase()))
      .filter(u => {
        // { changed code } map filters to actual fields
        if (status === "vip") return String(u.tier || "").toUpperCase() === "VIP";
        if (status !== "all") return String(u.status) === status; // active|disabled
        return true;
      })
      .filter(u => {
        const reg = new Date(u.createdAt || u.registeredAt);
        if (Number.isNaN(reg.getTime())) return true;
        if (dateFilter === "today") return reg >= startOfDay;
        if (dateFilter === "week") return reg >= startOfWeek;
        if (dateFilter === "month") return reg >= startOfMonth;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "orders") return (b.orders||0) - (a.orders||0);
        if (sortBy === "spent") return (Number(b.spent)||0) - (Number(a.spent)||0);
        return 0;
      });
  }, [data, query, dateFilter, sortBy, status]);

  const fmtVnd = v => (Number(v)||0).toLocaleString('vi-VN');
  // helpers for detail drawer
  const fmtDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString('vi-VN');
  };

  // --- admin-only helpers + delete ---
  const parseJwt = (token) => {
    try {
      const [, payload] = String(token || "").split(".");
      if (!payload) return null;
      const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return null;
    }
  };

  const isAdmin = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        return String(u?.role || "").toLowerCase() === "admin";
      }
    } catch {}
    const token = localStorage.getItem("token");
    const payload = parseJwt(token);
    return String(payload?.role || payload?.user?.role || "").toLowerCase() === "admin";
  }, []);

  const getApiBase = () => {
    const envBase = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    if (envBase) return envBase;
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  };

  const refreshList = async () => {
    const res = await customersService.fetchClients({ page: 1, limit: 20, q: query });
    setData(res.data || []);
  };

  const deleteCustomer = async (id) => {
    const cid = id == null ? "" : String(id);
    if (!cid) return;
    if (!isAdmin) {
      toast.error("Bạn không có quyền thực hiện thao tác này");
      return;
    }
    const ok = window.confirm("Xóa khách hàng này? Thao tác không thể hoàn tác.");
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      const base = getApiBase();
      const url = `${base}/admin/users/clients/${encodeURIComponent(cid)}`;

      const resp = await fetch(url, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        let msg = `HTTP ${resp.status}`;
        try {
          const j = JSON.parse(text);
          msg = j.msg || msg;
        } catch {
          if (text) msg = text.slice(0, 200);
        }
        throw new Error(msg);
      }

      toast.success("Đã xóa khách hàng");
      if (detailOpen && String(detail?._id || detail?.id) === cid) {
        setDetailOpen(false);
        setDetail(null);
      }
      await refreshList();
    } catch (e) {
      console.error("deleteCustomer error:", e);
      toast.error(e?.message || "Xóa thất bại");
    }
  };

  const openDetails = async (user) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      // Try to fetch full detail if service method exists; fallback to passed row data.
      if (customersService.getClient) {
        const id = getId(user);
        const res = await customersService.getClient(id);
        setDetail(res?.data || user);
      } else {
        setDetail(user);
      }
    } catch {
      setDetail(user);
    } finally {
      setDetailLoading(false);
    }
  };
  const closeDetails = () => { setDetailOpen(false); setDetail(null); };

  // edit customer action
  const detailId = detail?._id || detail?.id;
  const goEditCustomer = () => {
    if (!detailId || detailLoading) return;
    closeDetails();
    navigate(`/customers/${detailId}/edit`);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Quản lý Khách hàng</h2>
          <div style={{ margin: 0, opacity: 0.6 }}>Xem và quản lý thông tin khách hàng.</div>
        </div>
      </div>

      <div style={{ background: "#0e1620", border: "1px solid #27374a", borderRadius: 12, padding: 12 }}>
        {/* Search + filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="nguyen.an@gmail.com"
              style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box"}}/>
          </div>

          <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67" }}>
            <option value="today">Ngày đăng ký</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="all">Tất cả</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding: "0.5rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67" }}>
            <option value="orders">Số đơn hàng</option>
            <option value="spent">Tổng chi tiêu</option>
          </select>
          <select value={status} onChange={e=>setStatus(e.target.value)} style={{ padding: "0.5rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67" }}>
            <option value="all">Trạng thái</option>
            <option value="active">Hoạt động</option>
            {/* { changed code } match DB enum */}
            <option value="disabled">Ngưng hoạt động</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 160px', alignItems:'center', padding:'10px 12px', color:'#9fb0bf', fontSize:13 }}>
            <div>Tên Khách Hàng</div>
            <div>Email</div>
            <div>Số Điện Thoại</div>
            <div>Tổng Đơn Hàng</div>
            <div style={{ textAlign: 'center' }}>Hành động</div>
          </div>

          <div style={{ borderTop:'1px solid #27374a' }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 160px', alignItems:'center', padding:'10px 12px' }}>
                  <div style={{ height: 12, background:'#0c1a20' }} />
                  <div style={{ height: 12, background:'#0c1a20' }} />
                  <div style={{ height: 12, background:'#0c1a20' }} />
                  <div style={{ height: 12, background:'#0c1a20' }} />
                  <div style={{ height: 24, background:'#0c1a20', borderRadius:6 }} />
                </div>
              ))
            ) : (
              filtered.map(u => {
                const uid = getId(u);
                return (
                  <div key={uid} style={{ display:'grid', gridTemplateColumns:'1.5fr 1.5fr 1fr 1fr 160px', alignItems:'center', padding:'10px 12px', borderTop:'1px solid #0c1a20' }}>
                    <div>{u.name}</div>
                    <div style={{ opacity:0.8 }}>{u.email}</div>
                    <div>{u.phone}</div>
                    <div>{u.orders ?? 0}</div>
                    <div style={{ display:'flex', gap:10, justifyContent:'center', alignItems:'center' }}>
                      <a
                        href={`/customers/${uid}`}
                        style={{ color:'#3b82f6', textDecoration:'none' }}
                        onClick={(e)=>{ e.preventDefault(); openDetails(u); }}
                      >
                        Xem chi tiết
                      </a>

                      {isAdmin && (
                        <button
                          onClick={() => deleteCustomer(uid)}
                          style={{
                            background: "transparent",
                            color: "#ef4444",
                            border: "1px solid #ef4444",
                            padding: "0.25rem 0.5rem",
                            borderRadius: 8,
                            cursor: "pointer"
                          }}
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      {detailOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onClick={closeDetails}
        >
          <div
            style={{ width:'min(900px, 95vw)', maxHeight:'85vh', overflow:'auto', background:'#0e1620', border:'1px solid #27374a', borderRadius:12, padding:16, color:'#e5eef7' }}
            onClick={(e)=>e.stopPropagation()}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <h3 style={{ margin:0 }}>{detail?.name || 'Chi tiết khách hàng'}</h3>
                <div style={{ opacity:0.7, fontSize:13 }}>{detail?.email}</div>
              </div>

              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button
                  onClick={goEditCustomer}
                  disabled={!detailId || detailLoading}
                  style={{
                    background: (!detailId || detailLoading) ? "#64748b" : "#22c55e",
                    color:"#fff",
                    border:"none",
                    padding:"0.5rem 0.75rem",
                    borderRadius:8,
                    cursor: (!detailId || detailLoading) ? "not-allowed" : "pointer",
                    opacity: detailLoading ? 0.85 : 1
                  }}
                >
                  Chỉnh sửa
                </button>

                {isAdmin && (
                  <button
                    onClick={() => deleteCustomer(detailId)}
                    disabled={!detailId || detailLoading}
                    style={{
                      background: (!detailId || detailLoading) ? "#64748b" : "#ef4444",
                      color:"#fff",
                      border:"none",
                      padding:"0.5rem 0.75rem",
                      borderRadius:8,
                      cursor: (!detailId || detailLoading) ? "not-allowed" : "pointer",
                      opacity: detailLoading ? 0.85 : 1
                    }}
                  >
                    Xóa
                  </button>
                )}

                <button
                  onClick={closeDetails}
                  style={{ background:'#263645', color:'#fff', border:'none', padding:'0.5rem 0.75rem', borderRadius:8, cursor:'pointer' }}
                >
                  Đóng
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div style={{ opacity:0.8 }}>Đang tải chi tiết...</div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div style={{ background:'#111a22', border:'1px solid #27374a', borderRadius:10, padding:12 }}>
                    <h4 style={{ margin:'0 0 8px 0' }}>Thông tin cơ bản</h4>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:14 }}>
                      <div>_id</div><div style={{ opacity:0.85 }}>{detail?._id || detail?.id || '-'}</div>
                      <div>Tên</div><div style={{ opacity:0.85 }}>{detail?.name || '-'}</div>
                      <div>Email</div><div style={{ opacity:0.85 }}>{detail?.email || '-'}</div>
                      <div>Điện thoại</div><div style={{ opacity:0.85 }}>{detail?.phone || '-'}</div>
                      <div>Giới tính</div><div style={{ opacity:0.85 }}>{detail?.gender || '-'}</div>
                      <div>Ngày sinh</div><div style={{ opacity:0.85 }}>{fmtDate(detail?.dob)}</div>
                      <div>Vai trò</div><div style={{ opacity:0.85 }}>{detail?.role || 'client'}</div>
                      <div>Trạng thái</div><div style={{ opacity:0.85 }}>{detail?.status || 'active'}</div>
                      <div>Tạo lúc</div><div style={{ opacity:0.85 }}>{fmtDate(detail?.createdAt)}</div>
                      <div>Cập nhật lúc</div><div style={{ opacity:0.85 }}>{fmtDate(detail?.updatedAt)}</div>
                    </div>
                  </div>

                  <div style={{ background:'#111a22', border:'1px solid #27374a', borderRadius:10, padding:12 }}>
                    <h4 style={{ margin:'0 0 8px 0' }}>Tổng quan mua sắm</h4>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:14 }}>
                      <div>Tổng đơn hàng</div><div style={{ opacity:0.85 }}>{detail?.orders ?? 0}</div>
                      <div>Tổng chi tiêu</div><div style={{ opacity:0.85 }}>{fmtVnd(detail?.spent)}</div>
                      <div>Hạng</div><div style={{ opacity:0.85 }}>{detail?.tier || '-'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
                  <div style={{ background:'#111a22', border:'1px solid #27374a', borderRadius:10, padding:12 }}>
                    <h4 style={{ margin:'0 0 8px 0' }}>Giỏ hàng</h4>
                    <div style={{ fontSize:13, opacity:0.8, marginBottom:6 }}>
                      Số lượng: {Array.isArray(detail?.cart) ? detail.cart.length : 0}
                    </div>
                    <pre style={{ margin:0, padding:10, background:'#0c1620', border:'1px solid #27374a', borderRadius:8, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                      {JSON.stringify(detail?.cart || [], null, 2)}
                    </pre>
                  </div>

                  <div style={{ background:'#111a22', border:'1px solid #27374a', borderRadius:10, padding:12 }}>
                    <h4 style={{ margin:'0 0 8px 0' }}>Yêu thích</h4>
                    <div style={{ fontSize:13, opacity:0.8, marginBottom:6 }}>
                      Số lượng: {Array.isArray(detail?.wishlist) ? detail.wishlist.length : 0}
                    </div>
                    <pre style={{ margin:0, padding:10, background:'#0c1620', border:'1px solid #27374a', borderRadius:8, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                      {JSON.stringify(detail?.wishlist || [], null, 2)}
                    </pre>
                  </div>
                </div>

                <div style={{ background:'#111a22', border:'1px solid #27374a', borderRadius:10, padding:12, marginTop:12 }}>
                  <h4 style={{ margin:'0 0 8px 0' }}>Địa chỉ</h4>
                  <div style={{ fontSize:13, opacity:0.8, marginBottom:6 }}>
                    Số lượng: {Array.isArray(detail?.addresses) ? detail.addresses.length : 0}
                  </div>
                  <pre style={{ margin:0, padding:10, background:'#0c1620', border:'1px solid #27374a', borderRadius:8, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                    {JSON.stringify(detail?.addresses || [], null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
