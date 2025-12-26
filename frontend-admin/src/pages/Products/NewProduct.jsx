import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axiosClient from "../../services/axiosClient";
import { isStaff } from "../../utils/auth";

export default function NewProduct() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const variantParam = searchParams.get('variant');
  const isEdit = !!params.id;
  const isVariantLocked = isEdit && variantParam !== 'new';
  const isStaffUser = isStaff();
  // { changed code } version is locked for any edit (including adding new variant)
  const variantDisabled = isEdit || isStaffUser;

  const [name, setName] = useState("");
  const [variant, setVariant] = useState("pro");
  // { changed code } track product's locked version
  const [lockedVersion, setLockedVersion] = useState("");

  const [color, setColor] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [variantPrice, setVariantPrice] = useState(0);
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountStart, setDiscountStart] = useState('');
  const [discountEnd, setDiscountEnd] = useState('');
  const [stock, setStock] = useState(0);
  const [loading, setLoading] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [hot, setHot] = useState(false);

  const [imageData, setImageData] = useState(''); // base64 data URL to send
  const [imagePreview, setImagePreview] = useState(''); // data URL or absolute URL for preview
  const [imageRemoved, setImageRemoved] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!allowed.includes(file.type)) return alert('Chỉ chấp nhận PNG/JPG/GIF');

    const fr = new FileReader();
    fr.onload = () => {
      const dataUrl = fr.result;
      const img = new Image();
      img.onload = () => {
        setImageData(dataUrl);
        setImagePreview(dataUrl);
        setImageRemoved(false);
      };
      img.onerror = () => alert('Không thể đọc ảnh');
      img.src = dataUrl;
    };
    fr.readAsDataURL(file);
  };

  const removeImage = () => { setImageData(''); setImagePreview(''); setImageRemoved(true); };

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    axiosClient.get(`/products/${params.id}`)
      .then(res => {
        const p = res.data || {};
        setName(p.name || '');
        setDescription(p.description || '');
        setDiscountType(p.discount?.type || 'percent');
        setDiscountValue(p.discount?.value || 0);
        setDiscountStart(p.discount?.startAt ? new Date(p.discount.startAt).toISOString().slice(0,16) : '');
        setDiscountEnd(p.discount?.endAt ? new Date(p.discount.endAt).toISOString().slice(0,16) : '');

        // { changed code } derive locked version from product (prefer first variant)
        const lv = (Array.isArray(p.variants) && p.variants[0]?.version) || p.version || "";
        setLockedVersion(lv);

        // Determine which variant to prefill: prefer variantParam
        let selectedVariant = null;
        if (variantParam) {
          selectedVariant = (p.variants || []).find(v => String(v._id) === variantParam) || null;
          if (!selectedVariant) {
            const idx = Number(variantParam);
            if (!Number.isNaN(idx) && Array.isArray(p.variants) && p.variants[idx]) selectedVariant = p.variants[idx];
          }
        }
        const first = (p.variants && p.variants[0]) || {};
        const chosen = selectedVariant || first;

        // { changed code } when adding a new variant, prefill version with locked version
        if (variantParam === 'new') {
          setVariant(lv || ""); 
          setColor('');
          setCapacity('');
          setStock(0);
          setVariantPrice(0);
        } else {
          setVariant(chosen.version || lv || "");
          setColor(chosen.color || '');
          setCapacity(chosen.storage || '');
          setStock(chosen.stock ?? p.stock ?? 0);
          setVariantPrice(Number(chosen.price) || 0);
        }

        // product image (show preview)
        setImagePreview(p.image || p.featuredImg || '');
        setImageData(''); // clear any transient base64 state
        setImageRemoved(false);
        setFeatured(!!p.featured);
        setIsNew(!!p.new);
        setHot(!!p.hot);

      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isEdit, params.id, variantParam]);

  const onSave = async (e) => {
    e.preventDefault();
    const basePayload = {
      name,
      description,
      discount: (Number(discountValue) > 0) ? {
        type: discountType,
        value: Number(discountValue),
        startAt: discountStart ? new Date(discountStart).toISOString() : undefined,
        endAt: discountEnd ? new Date(discountEnd).toISOString() : undefined
      } : undefined,
      image: imageRemoved ? '' : (imageData || imagePreview || undefined),
      featured: !!featured,
      new: !!isNew,
      hot: !!hot
    };

    // { changed code } force variant.version to lockedVersion when editing existing product
    const versionForSave = isEdit ? (lockedVersion || variant) : variant;
    const variantObj = { version: versionForSave, color, storage: capacity, stock: Number(stock) || 0, price: Number(variantPrice) || 0 };

    setLoading(true);
    if (isEdit) {
      try {
        if (variantParam === 'new') {
          // append a new variant to this product
          const res = await axiosClient.get(`/products/${params.id}`);
          const p = res.data || {};
          const existing = Array.isArray(p.variants) ? [...p.variants] : [];
          existing.push(variantObj); // { changed code } uses locked version
          await axiosClient.put(`/products/${params.id}`, { variants: existing });

          navigate('/products');
        } else if (variantParam) {
          const res = await axiosClient.get(`/products/${params.id}`);
          const p = res.data || {};
          const existing = Array.isArray(p.variants) ? [...p.variants] : [];

          let idxToUpdate = -1;

          // Ưu tiên tìm theo _id
          idxToUpdate = existing.findIndex(
            v => v._id && String(v._id) === String(variantParam)
          );

          // Fallback: nếu variantParam là index
          if (idxToUpdate === -1) {
            const idx = Number(variantParam);
            if (!Number.isNaN(idx) && idx >= 0 && idx < existing.length) {
              idxToUpdate = idx;
            }
          }

          // Không cho push lung tung
          if (idxToUpdate === -1) {
            alert("Không tìm thấy phiên bản cần sửa");
            setLoading(false);
            return;
          }

          // Update đúng variant
          existing[idxToUpdate] = {
            ...existing[idxToUpdate],
            ...variantObj, // { changed code } ensure locked version is applied
          };

          await axiosClient.put(`/products/${params.id}`, {
            variants: existing
          });

          navigate('/products');
        } else {
          // full product update — update only product-level fields; do NOT overwrite variants or send price/color/storage
          const payload = { ...basePayload };
          await axiosClient.put(`/products/${params.id}`, payload);
          navigate('/products');
        }
      } catch (err) {
        console.error('save edit error', err?.response?.data || err?.message);
        alert('Lưu thay đổi thất bại');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const payload = { ...basePayload, variants: [variantObj] };
        await axiosClient.post('/products', payload);
        navigate('/products');
      } catch (err) {
        console.error('create product error', err?.response?.data || err?.message);
        alert('Lưu sản phẩm thất bại');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>{isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm iPhone mới"}</h2>
          <p style={{ margin: 0, opacity: 0.6 }}>{isEdit ? "Chỉnh sửa thông tin sản phẩm" : "Điền các thông tin chi tiết dưới đây để thêm sản phẩm."}</p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => navigate(-1)} style={{ background: "#263645", color: "#fff", border: "none", padding: "0.5rem 0.75rem", borderRadius: 8, cursor: "pointer" }} disabled={loading}>Hủy</button>
          {isEdit && (
            <button onClick={async () => {
              const ok = window.confirm('Xác nhận xóa sản phẩm này?');
              if (!ok) return;
              setLoading(true);
              try {
                await axiosClient.delete(`/products/${params.id}`);
                navigate('/products');
              } catch (err) {
                alert('Xóa thất bại');
              } finally { setLoading(false); }
            }} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "0.6rem 0.9rem", borderRadius: 8, cursor: "pointer" }} disabled={loading}>Xóa</button>
          )}
          <button onClick={onSave} style={{ background: "#0b5ed7", color: "#fff", border: "none", padding: "0.6rem 0.9rem", borderRadius: 8, cursor: "pointer" }} disabled={loading}>{isEdit ? 'Lưu thay đổi' : 'Lưu sản phẩm'}</button>
        </div>
      </div>

      <form className="product-form" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "stretch" }}>
        <div className="product-left" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
          <div style={{ background: "#111a22", padding: "1rem", borderRadius: "0.75rem", border: "none", marginBottom: "0", flex: "4 1 0", boxSizing: "border-box" }}>
            <h4 style={{ marginTop: 0 }}>Thông tin chung</h4>

            <div style={{ marginBottom: "0.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: 14, opacity: 0.85 }}>Tên sản phẩm</label>
              <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ví dụ: iPhone 15 Pro Max 256GB - Xanh Titan" style={{ width: "100%", padding: "0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box", ...((variantParam || isStaffUser) ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={!!variantParam || isStaffUser} onMouseEnter={(e)=>{ if(variantParam || isStaffUser){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }} onMouseLeave={(e)=>{ if(variantParam || isStaffUser){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }} title={isStaffUser ? 'Bạn không có quyền chỉnh sửa' : (variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined)} />
              {isStaffUser && (
                <div style={{ fontSize: 12, color: "#9fb0bf", marginTop: 6 }}>
                  Bạn đang đăng nhập với quyền <strong>staff</strong> — không thể chỉnh tên sản phẩm
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginTop: "0.5rem" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: 14,
                    opacity: 0.85
                  }}
                >
                  Phiên bản
                </label>

                <select
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  disabled={variantDisabled}
                  title={variantDisabled ? (isStaffUser ? 'Staff không thể thay đổi phiên bản' : 'Phiên bản cố định theo sản phẩm') : undefined}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: 8,
                    background: "#192633",
                    color: "#fff",
                    border: "1px solid #324d67",

                    /* thống nhất cho cả 2 trạng thái */
                    opacity: variantDisabled ? 0.6 : 1,
                    cursor: variantDisabled ? "not-allowed" : "pointer",
                  }}
                  // ...existing code...
                >
                  <option value="pro">Pro</option>
                  <option value="pro-max">Pro Max</option>
                  <option value="base">Base</option>
                  <option value="xr">XR</option>
                  <option value="mini">Mini</option>
                  <option value="se">SE</option>
                  <option value="plus">Plus</option>
                </select>

                {isEdit && (
                  <div style={{ fontSize: 12, color: "#9fb0bf", marginTop: 6 }}>
                    {/* {changed code} display locked version info */}
                    Phiên bản cố định của sản phẩm: <strong>{lockedVersion || 'Chưa xác định'}</strong>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: 14, opacity: 0.85 }}>Màu sắc</label>
                <select
                  value={color}
                  onChange={(e)=>setColor(e.target.value)}
                  disabled={!variantParam || isStaffUser}
                  title={isStaffUser ? 'Bạn không có quyền chỉnh sửa màu/dung lượng' : (!variantParam ? 'Khóa khi chỉnh sửa sản phẩm chính' : undefined)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", ...(!variantParam || isStaffUser ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  onMouseEnter={(e)=>{ if(!variantParam || isStaffUser){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }}
                  onMouseLeave={(e)=>{ if(!variantParam || isStaffUser){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }}
                >
                  <option value="">Chọn màu sắc</option>
                  <option value="blue">Xanh dương</option>
                  <option value="pink">Hồng</option>
                  <option value="black">Đen</option>
                  <option value="white">Trắng</option>
                  <option value="titan">Titan</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: 14, opacity: 0.85 }}>Dung lượng</label>
                <select
                  value={capacity}
                  onChange={(e)=>setCapacity(e.target.value)}
                  disabled={!variantParam || isStaffUser}
                  title={isStaffUser ? 'Bạn không có quyền chỉnh sửa màu/dung lượng' : (!variantParam ? 'Khóa khi chỉnh sửa sản phẩm chính' : undefined)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", ...(!variantParam || isStaffUser ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  onMouseEnter={(e)=>{ if(!variantParam || isStaffUser){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }}
                  onMouseLeave={(e)=>{ if(!variantParam || isStaffUser){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }}
                >
                  <option value="">Chọn dung lượng</option>
                  <option value="64GB">64GB</option>
                  <option value="128GB">128GB</option>
                  <option value="256GB">256GB</option>
                  <option value="512GB">512GB</option>
                  <option value="1TB">1TB</option>
                </select>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "0.75rem",
                marginTop: "0.5rem",
                alignItems: 'start'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: 14, opacity: 0.85 }}>
                  Giá bán (VND)
                </label>
                <input
                  value={variantPrice}
                  onChange={(e) => setVariantPrice(e.target.value)}
                  type="number"
                  placeholder="0"
                  disabled={!variantParam}
                  title={!variantParam ? 'Khóa khi chỉnh sửa sản phẩm chính' : undefined}
                  style={{
                    width: "100%",
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    padding: "0.75rem",
                    borderRadius: 8,
                    background: "#192633",
                    color: "#fff",
                    border: "1px solid #324d67",
                    overflow: 'hidden',
                    ...(!variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                  }}
                />
                {variantParam && (
                  <div style={{ fontSize: 12, color: "#9fb0bf", marginTop: 6 }}>
                    {variantParam === 'new' ? 'Đang thêm phiên bản mới - các thiết lập sản phẩm chung bị khóa' : 'Bạn đang chỉnh sửa phiên bản - các thiết lập sản phẩm chung bị khóa'}
                  </div>
                )}
              </div>

              {/* Tồn kho – 1 phần */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: 14, opacity: 0.85 }}>
                  Tồn kho
                </label>
                <input
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  type="number"
                  placeholder="0"
                  disabled={!variantParam}
                  style={{
                    width: "100%",
                    boxSizing: 'border-box',
                    maxWidth: '100%',
                    padding: "0.75rem",
                    borderRadius: 8,
                    background: "#192633",
                    color: "#fff",
                    border: "1px solid #324d67",
                    ...(variantParam ? {} : { opacity: 0.6, cursor: "not-allowed" })
                  }}
                  title="Tồn kho"
                />
                {!variantParam && (
                  <div style={{ fontSize: 12, color: "#9fb0bf", marginTop: 6 }}>
                    Tồn kho được quản lý ở các phiên bản - chỉnh sửa trong từng phiên bản.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: "#111a22", padding: "1rem", borderRadius: "0.75rem", border: "none", flex: "6 1 0", display: "flex", flexDirection: "column" }}>
            <h4 style={{ marginTop: 0 }}>Mô tả chi tiết</h4>
            <textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Viết mô tả chi tiết cho sản phẩm" style={{ width: "100%", minHeight: "14rem", padding: "1rem", borderRadius: 8, background: "#192633", border: "1px solid #324d67", color: "#fff", flex: 1, boxSizing: "border-box", overflow: "auto", resize: "vertical", ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={!!variantParam} onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }} onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }} title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined} />
          </div>
          <div style={{ background: "#111a22", borderRadius: "0.75rem", border: "none", minHeight: "1px", opacity: 0.4 }}/>
        </div>

        <div className="product-right" style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
          <div
            onClick={() => { if (variantParam) return; fileInputRef.current && fileInputRef.current.click(); }}
            onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e)=>{ if (variantParam) return; e.preventDefault(); e.stopPropagation(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            style={{ cursor: variantParam ? 'not-allowed' : 'pointer', opacity: variantParam ? 0.6 : 1, background: "#111a22", padding: "1rem", borderRadius: "0.75rem", border: "1px dashed #324d67", minHeight: "14rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#9fb0bf", flex: "1 1 0", boxSizing: "border-box" }}>
            {imagePreview ? (
              <div style={{ textAlign: "center", position: 'relative' }}>
                <img src={imagePreview} alt="preview" style={{ maxWidth: 320, maxHeight: 160, objectFit: 'contain', borderRadius: 6 }} />
                <div style={{ marginTop: 8 }}>
                  <button type="button" onClick={(e)=>{ e.stopPropagation(); if (variantParam) return; removeImage(); }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.6rem', borderRadius: 6, cursor: variantParam ? 'not-allowed' : 'pointer', opacity: variantParam ? 0.6 : 1 }} disabled={!!variantParam} onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; } }} onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; } }} title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}>Xóa ảnh</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28 }}>☁</div>
                <div style={{ color: "#3b82f6" }}>{variantParam ? 'Chỉnh sửa phiên bản — ảnh sản phẩm bị khóa' : 'Nhấp để tải lên hoặc kéo và thả'}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>PNG, JPG, GIF (không giới hạn kích thước)</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif" onChange={(e)=>{ if (variantParam) return; const f = e.target.files?.[0]; if (f) handleFile(f); }} style={{ display: 'none' }} />
          </div>

          <div style={{ background: "#111a22", padding: "1rem", borderRadius: "0.75rem", border: "none", flex: "1 1 0", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={{ display: "block", fontSize: 14, opacity: 0.85 }}>Giảm giá</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={discountType}
                    onChange={(e)=>setDiscountType(e.target.value)}
                    disabled={!!variantParam}
                    title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}
                    style={{ padding: "0.6rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                    onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }}
                    onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }}
                  >
                    <option value="percent">Phần trăm</option>
                    <option value="fixed">Tiền cố định</option>
                  </select>
                  <input
                    value={discountValue}
                    onChange={(e)=>setDiscountValue(e.target.value)}
                    type="number"
                    placeholder="0"
                    disabled={!!variantParam}
                    title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}
                    style={{ padding: "0.75rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", flex: 1, ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                    onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }}
                    onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }}
                  />
                </div>

                <label style={{ display: "block", fontSize: 14, opacity: 0.85, marginTop: 8 }}>Bắt đầu (tùy chọn)</label>
                <input
                  value={discountStart}
                  onChange={(e)=>setDiscountStart(e.target.value)}
                  type="datetime-local"
                  disabled={!!variantParam}
                  title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}
                  style={{ padding: "0.6rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }}
                  onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }}
                />

                <label style={{ display: "block", fontSize: 14, opacity: 0.85, marginTop: 8 }}>Kết thúc (tùy chọn)</label>
                <input
                  value={discountEnd}
                  onChange={(e)=>setDiscountEnd(e.target.value)}
                  type="datetime-local"
                  disabled={!!variantParam}
                  title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}
                  style={{ padding: "0.6rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
                  onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }}
                  onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }}
                />
              {!variantParam && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 14, opacity: 0.85 }}>Sản phẩm nổi bật</label>
                      <select value={featured ? 'true' : 'false'} onChange={(e)=>setFeatured(e.target.value === 'true')} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: '#192633', color: '#fff', border: '1px solid #324d67', ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={!!variantParam} onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }} onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }} title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}>
                        <option value={'false'}>Không</option>
                        <option value={'true'}>Có</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 14, opacity: 0.85 }}>Sản phẩm mới</label>
                      <select value={isNew ? 'true' : 'false'} onChange={(e)=>setIsNew(e.target.value === 'true')} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: '#192633', color: '#fff', border: '1px solid #324d67', ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={!!variantParam} onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }} onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }} title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}>
                        <option value={'false'}>Không</option>
                        <option value={'true'}>Có</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 14, opacity: 0.85 }}>Sản phẩm Hot</label>
                      <select value={hot ? 'true' : 'false'} onChange={(e)=>setHot(e.target.value === 'true')} style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: '#192633', color: '#fff', border: '1px solid #324d67', ...(variantParam ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }} disabled={!!variantParam} onMouseEnter={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='0 0 0 3px rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor='#3b82f6'; } }} onMouseLeave={(e)=>{ if(variantParam){ e.currentTarget.style.boxShadow='none'; e.currentTarget.style.borderColor=''; } }} title={variantParam ? 'Khóa khi chỉnh sửa phiên bản' : undefined}>
                        <option value={'false'}>Không</option>
                        <option value={'true'}>Có</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
