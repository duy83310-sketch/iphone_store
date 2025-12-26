import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import axiosClient from "../../services/axiosClient";

export default function Products() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [capacityFilter, setCapacityFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const formatPrice = (price) =>
  Number(price || 0).toLocaleString("vi-VN") + "đ";

  /* Helpers: discount logic (same rules as frontend) */
  const isDiscountActive = (discount) => {
    if (!discount || typeof discount !== 'object') return false;
    const now = new Date();
    if (discount.startAt && new Date(discount.startAt) > now) return false;
    if (discount.endAt && new Date(discount.endAt) < now) return false;
    return true;
  };

  const computeFinalPriceFromBase = (base = 0, discount) => {
    const b = Number(base) || 0;
    if (!discount || !isDiscountActive(discount)) return b;
    const type = (discount.type || '').toLowerCase();
    const value = Number(discount.value) || 0;
    if (type === 'percent') {
      return Math.max(0, Math.round((b - (b * value / 100))));
    }
    if (type === 'fixed') {
      return Math.max(0, b - value);
    }
    return b;
  };

  const getDiscountLabel = (discount) => {
    if (!isDiscountActive(discount)) return null;
    if ((discount.type || '').toLowerCase() === 'percent') return `${Number(discount.value) || 0}%`;
    if ((discount.type || '').toLowerCase() === 'fixed') return `${(Number(discount.value) || 0).toLocaleString()}₫`;
    return null;
  };

  // Sort products alphabetically by name (case-insensitive)
  const sortByName = (arr) =>
    (arr || [])
      .slice()
      .sort((a, b) =>
        String(b.name || '').localeCompare(String(a.name || ''), undefined, { sensitivity: 'base' })
      );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axiosClient
      .get('/products', { params: { search: query } })
      .then(res => {
        if (!mounted) return;
        setProducts(sortByName(res.data || []));
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false };
  }, [query]);

  const handleDelete = async (id) => {
    // client-side role check (best-effort)
    const role = String(localStorage.getItem('userRole') || '').toLowerCase();
    if (role === 'staff') {
      toast.error('Bạn không có quyền này');
      return;
    }

    const ok = window.confirm('Xác nhận xóa sản phẩm này?');
    if (!ok) return;
    try {
      await axiosClient.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => (p._id || p.id) !== id && String(p._id || p.id) !== String(id)));
      toast.success('Xóa sản phẩm thành công');
    } catch (err) {
      const status = err?.response?.status;
      // map 403 to a clear permission toast
      if (status === 403) {
        toast.error('Bạn không có quyền này');
        return;
      }
      toast.error('Xóa không thành công');
    }
  }

  // Delete a single variant from a product (admin only)
  async function handleDeleteVariant(productId, variantIndex) {
    const role = String(localStorage.getItem('userRole') || '').toLowerCase();
    if (role !== 'admin') {
      toast.error('Bạn không có quyền này');
      return;
    }

    const ok = window.confirm('Xác nhận xóa phiên bản sản phẩm này?');
    if (!ok) return;

    try {
      // fetch current product to get latest variants
      const res = await axiosClient.get(`/products/${productId}`);
      const product = res.data;
      if (!product) throw new Error('Không tìm thấy sản phẩm');

      const existing = Array.isArray(product.variants) ? [...product.variants] : [];
      if (variantIndex < 0 || variantIndex >= existing.length) throw new Error('Phiên bản không tồn tại');

      existing.splice(variantIndex, 1);

      // update product with new variants array
      const upd = await axiosClient.put(`/products/${productId}`, { variants: existing });
      const updatedProduct = upd.data;

      // update local state and keep alphabetical order
      setProducts(prev => sortByName(prev.map(p => {
        const pid = p._id || p.id;
        if (String(pid) === String(productId)) return updatedProduct;
        return p;
      })) );

      toast.success('Đã xóa phiên bản');
    } catch (err) {
      console.error('delete variant error', err?.response?.data || err?.message);
      toast.error(err?.response?.data?.message || err.message || 'Không thể xóa phiên bản');
    }
  }

  // Client-side filters
  const filterProduct = (p) => {
    if (capacityFilter) {
      const variants = p.variants || [];
      if (!variants.some(v => (v.storage || '') === capacityFilter)) return false;
    }
    if (colorFilter) {
      const variants = p.variants || [];
      const cf = String(colorFilter || '').toLowerCase();
      if (!variants.some(v => String(v.color || '').toLowerCase() === cf)) return false;
    }
    if (stockFilter && stockFilter !== 'all') {
      const variants = p.variants || [];

      if (Array.isArray(variants) && variants.length > 0) {
        // Apply filter based on individual variant stock
        if (stockFilter === 'in-stock') {
          // product passes if AT LEAST ONE variant has stock >= 20
          if (!variants.some(v => (Number(v.stock) || 0) >= 20)) return false;
        }
        if (stockFilter === 'low') {
          // product passes if AT LEAST ONE variant has 0 < stock < 20
          if (!variants.some(v => {
            const s = Number(v.stock) || 0;
            return s > 0 && s < 20;
          })) return false;
        }
        if (stockFilter === 'out') {
          // product passes if AT LEAST ONE variant has stock === 0
          if (!variants.some(v => (Number(v.stock) || 0) === 0)) return false;
        }
      } else {
        // fallback to product-level stock when no variants
        const s = Number(p.stock) || 0;
        if (stockFilter === 'in-stock' && s < 20) return false;
        if (stockFilter === 'low' && !(s > 0 && s < 20)) return false;
        if (stockFilter === 'out' && s !== 0) return false;
      }
    }
    return true;
  };

  const displayed = products.filter(filterProduct);

  // derive available color options from current products (preserve original labels but use lowercase values)
  const colorOptions = React.useMemo(() => {
    const map = {};
    (products || []).forEach(p => {
      (p.variants || []).forEach(v => {
        const c = v && v.color;
        if (!c) return;
        const key = String(c).trim();
        const lc = key.toLowerCase();
        if (!map[lc]) map[lc] = key;
      });
    });
    return Object.values(map).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [products]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Quản lý sản phẩm iPhone</h2>
          <p style={{ margin: 0, opacity: 0.6 }}>Danh sách sản phẩm và quản lý kho</p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            style={{ background: "#0b5ed7", color: "#fff", border: "none", padding: "0.6rem 0.9rem", borderRadius: 8, cursor: "pointer" }}
            onClick={async () => {
              // check quick local role first
              const rawRole = localStorage.getItem('userRole');
              const role = String(rawRole || '').toLowerCase();
              if (role === 'admin') {
                navigate('/products/new');
                return;
              }
              if (role === 'staff') {
                toast.error('Bạn không có quyền này');
                return;
              }

              // fallback: verify token with server
              const token = localStorage.getItem('token');
              if (!token) {
                toast.error('Vui lòng đăng nhập lại');
                return;
              }

              try {
                const res = await axiosClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                const meRole = res.data?.role || res.data?.user?.role;
                if (meRole && String(meRole).toLowerCase() === 'admin') {
                  localStorage.setItem('userRole', 'admin');
                  navigate('/products/new');
                } else if (meRole && String(meRole).toLowerCase() === 'staff') {
                  localStorage.setItem('userRole', 'staff');
                  toast.error('Bạn không có quyền này');
                } else {
                  if (meRole) localStorage.setItem('userRole', String(meRole).toLowerCase());
                  else localStorage.removeItem('userRole');
                  toast.error('Bạn không có quyền này');
                }
              } catch (err) {
                console.error('verify role', err?.response?.data || err?.message);
                toast.error('Vui lòng đăng nhập lại');
              }
            }}
          >+ Thêm sản phẩm</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", alignItems: "center" }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm kiếm theo tên sản phẩm..." style={{ flex: 1, padding: "0.6rem 0.8rem", borderRadius: 8, background: "#0f1a2b", color: "#fff", border: "1px solid #263645" }} />

        <select value={capacityFilter} onChange={e => setCapacityFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: 8, background: "#0f1a2b", color: "#fff", border: "1px solid #263645" }}>
          <option value="">Dung lượng</option>
          <option value="64GB">64GB</option>
          <option value="128GB">128GB</option>
          <option value="256GB">256GB</option>
          <option value="512GB">512GB</option>
          <option value="1TB">1TB</option>
        </select>

        <select value={colorFilter} onChange={e => setColorFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: 8, background: "#0f1a2b", color: "#fff", border: "1px solid #263645" }}>
          <option value="">Màu sắc</option>
          {colorOptions.map((c) => (
            <option key={c} value={String(c).toLowerCase()}>{c}</option>
          ))}
        </select>

        <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} style={{ padding: "0.5rem", borderRadius: 8, background: "#0f1a2b", color: "#fff", border: "1px solid #263645" }}>
          <option value="all">Tồn kho</option>
          <option value="in-stock">Còn nhiều</option>
          <option value="low">Sắp hết</option>
          <option value="out">Hết hàng</option>
        </select>

        <button onClick={() => { setCapacityFilter(''); setColorFilter(''); setStockFilter('all'); }} style={{ padding: "0.45rem 0.6rem", borderRadius: 8, background: "transparent", border: "1px solid #263645", color: "#fff" }} title="Xóa bộ lọc">Xóa lọc</button>
      </div>

      <div className="products-table-outer" style={{ background: "#111a22", border: "1px solid #324d67", borderRadius: "0.75rem", padding: "0.75rem" }}>
        <div className="products-table-wrap" style={products.length >= 7 ? { maxHeight: '420px', overflowY: 'auto' } : undefined}>
          <table width="100%" style={{ borderCollapse: "collapse", color: "#fff", tableLayout: "fixed"  }}>
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr style={{ textAlign: "left", color: "#9fb0bf" }}>
                <th style={{ padding: "0.75rem 0.5rem" }}>TÊN SẢN PHẨM</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>GIÁ</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>DUNG LƯỢNG</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>MÀU SẮC</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>SỐ LƯỢNG TỒN KHO</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ padding: "1rem", textAlign: "center", color: "#9fb0bf" }}>Đang tải...</td>
                </tr>
              )}

              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "1rem", textAlign: "center", color: "#9fb0bf" }}>Không có sản phẩm</td>
                </tr>
              )}

              {!loading && displayed.map(p => {
                const variants = p.variants || [];
                const id = p._id || p.id;
                const stock = variants.reduce((s, v) => s + (v.stock || 0), 0) || p.stock || 0;

                // determine color for stock summary: red if any variant is 0, yellow if any variant <20, green otherwise
                let stockColor = '#9ee99e';
                if (Array.isArray(variants) && variants.length > 0) {
                  if (variants.some(v => (Number(v.stock) || 0) === 0)) stockColor = '#ef4444';
                  else if (variants.some(v => (Number(v.stock) || 0) < 20)) stockColor = '#f59e0b';
                  else stockColor = '#9ee99e';
                } else {
                  const s = Number(p.stock) || 0;
                  if (s === 0) stockColor = '#ef4444';
                  else if (s < 20) stockColor = '#f59e0b';
                  else stockColor = '#9ee99e';
                }

                return (
                  <React.Fragment key={id}>
                    <tr
                      style={{ borderTop: "1px solid #263645" }}
                      onMouseEnter={() => setHoveredId(id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <td style={{ padding: "0.75rem 0.5rem" }}>{p.name}</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        -
                      </td>
                      {/* hide capacity & color summary; show '-' as requested */}
                      <td style={{ padding: "0.75rem 0.5rem" }}>-</td>
                      <td style={{ padding: "0.75rem 0.5rem" }}>-</td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center", color: stockColor }}>{stock}</td>
                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                        <button
                          onClick={async () => {
                            // quick client role check
                            const rawRole = localStorage.getItem('userRole');
                            const role = String(rawRole || '').toLowerCase();
                            if (role === 'staff') { toast.error('Bạn không có quyền này'); return; }
                            if (role === 'admin') { navigate(`/products/${id}/edit?variant=new`); return; }

                            // fallback verify with server
                            const token = localStorage.getItem('token');
                            if (!token) { toast.error('Vui lòng đăng nhập lại'); return; }
                            try {
                              const res = await axiosClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
                              const meRole = res.data?.role || res.data?.user?.role;
                              if (meRole && String(meRole).toLowerCase() === 'admin') {
                                localStorage.setItem('userRole', 'admin');
                                navigate(`/products/${id}/edit?variant=new`);
                              } else if (meRole && String(meRole).toLowerCase() === 'staff') {
                                localStorage.setItem('userRole', 'staff');
                                toast.error('Bạn không có quyền này');
                              } else {
                                if (meRole) localStorage.setItem('userRole', String(meRole).toLowerCase());
                                else localStorage.removeItem('userRole');
                                toast.error('Bạn không có quyền này');
                              }
                            } catch (err) {
                              console.error('verify role', err?.response?.data || err?.message);
                              toast.error('Vui lòng đăng nhập lại');
                            }
                          }}
                          title="Thêm phiên bản"
                          style={{ background: "transparent", border: "none", cursor: "pointer", marginRight: 8 }}
                          aria-label="add-variant"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12h14" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>

                        <button
                          onClick={() => navigate(`/products/${id}/edit`)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", marginRight: 8 }}
                          aria-label="edit-product"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.06 6.94l3.75 3.75" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>

                        <button
                          onClick={() => handleDelete(id)}
                          disabled={String(localStorage.getItem('userRole') || '').toLowerCase() !== 'admin'}
                          style={{ background: "transparent", border: "none", cursor: String(localStorage.getItem('userRole') || '').toLowerCase() !== 'admin' ? 'not-allowed' : 'pointer', opacity: String(localStorage.getItem('userRole') || '').toLowerCase() !== 'admin' ? 0.6 : 1 }}
                          aria-label="delete-product"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11v6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </td>
                    </tr>

                    {/* Variants row: visible when hovered */}
                    {hoveredId === id && variants.length > 0 &&
                      variants.map((v, idx) => (
                        <tr
                          key={`${id}-variant-${idx}`}
                          onMouseEnter={() => setHoveredId(id)}
                          onMouseLeave={() => setHoveredId(null)}
                          style={{ background: "#0b1620" }}
                        >
                          {/* TÊN SẢN PHẨM */}
                          <td style={{ padding: "0.6rem 0.5rem", color: "#9fb0bf" }}>
                            <span style={{ marginRight: 6 }}>└</span>
                            {p.name} {v.version ? `— ${v.version}` : ''}
                          </td>
                          {/* GIÁ */}
                          <td style={{ padding: "0.6rem 0.5rem", color: "#e5d6b9" }}>
                            {(() => {
                              const basePrice = Number(v.price) || 0;
                              const finalPrice = computeFinalPriceFromBase(basePrice, p.discount);
                              const discountLabel = getDiscountLabel(p.discount);
                              if (discountLabel && finalPrice !== basePrice) {
                                return (
                                  <div>
                                    <div style={{ textDecoration: 'line-through', color: '#999', fontSize: 12 }}>{basePrice.toLocaleString()}₫</div>
                                    <div style={{ color: '#e5d6b9' }}>{finalPrice.toLocaleString()}₫ <span style={{ marginLeft: 8, fontSize: 12, color: '#fff', background: '#ef4444', padding: '2px 6px', borderRadius: 6 }}>{discountLabel}</span></div>
                                  </div>
                                );
                              }
                              return <div style={{ color: '#e5d6b9' }}>{basePrice.toLocaleString()}₫</div>;
                            })()}
                          </td>
                          {/* DUNG LƯỢNG */}
                          <td style={{ padding: "0.6rem 0.5rem" }}>
                            {v.storage ?? "-"}
                          </td>
                          {/* MÀU SẮC */}
                          <td style={{ padding: "0.6rem 0.5rem" }}>
                            {v.color ?? "-"}
                          </td>
                          {/* TỒN KHO */}
                          <td
                            style={{
                              padding: "0.6rem 0.5rem",
                              textAlign: "center",
                              color: (Number(v.stock) || 0) === 0 ? '#ef4444' : ((Number(v.stock) || 0) < 20 ? '#f59e0b' : '#9ee99e')
                            }}
                          >
                            {v.stock ?? 0}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => navigate(`/products/${id}/edit?variant=${v._id ?? idx}`)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", marginRight: 8 }}
                              aria-label="edit-variant"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.06 6.94l3.75 3.75" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>

                            <button
                              onClick={() => handleDeleteVariant(id, idx)}
                              disabled={String(localStorage.getItem('userRole') || '').toLowerCase() !== 'admin'}
                              style={{ background: "transparent", border: "none", cursor: String(localStorage.getItem('userRole') || '').toLowerCase() !== 'admin' ? 'not-allowed' : 'pointer', opacity: String(localStorage.getItem('userRole') || '').toLowerCase() !== 'admin' ? 0.6 : 1 }}
                              aria-label="delete-variant"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11v6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
