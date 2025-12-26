import { useEffect, useState } from "react";
import { API } from "../utils/config";
import { toast } from "react-toastify";
import "../styles/pages/cart.css";

function isValidAddressDetails(address) {
  if (!address || !address.trim()) return false;

  const str = address.trim();

  // 1. Ký tự hợp lệ
  const allowedChars = /^[\p{L}0-9\s,./-]+$/u;
  if (!allowedChars.test(str)) return false;

  // 2. Phải có ít nhất 2 phần tách bằng dấu phẩy
  const parts = str.split(",").map(p => p.trim()).filter(p => p);
  if (parts.length < 2) return false;

  // 3. Mỗi phần phải chứa ít nhất 1 từ có chữ
  for (const part of parts) {
    if (!/[\p{L}]+/u.test(part)) return false;
  }

  // 4. Kiểm tra cấu trúc hợp lệ:
  const hasLeadingNumber = /^\d/.test(parts[0]);

  // Keyword cho địa chỉ nông thôn
  const ruralKeywords = ["xóm", "thôn", "ấp", "bản", "đội", "tổ", "buôn", "làng"];

  const isRural =
    ruralKeywords.some(k => parts[0].toLowerCase().startsWith(k));

  // Nếu không có số đầu và cũng không phải địa chỉ nông thôn → fail
  if (!hasLeadingNumber && !isRural) return false;

  // 5. Phát hiện từ rác
  const words = str.split(/\s+/);
  for (const w of words) {
    if (w.length > 25) return false;
    if (/^([a-zA-Z])\1{4,}$/u.test(w)) return false; // aaaaaaa
  }

  // 6. Địa chỉ tối thiểu 10 ký tự
  if (str.length < 10) return false;

  return true;
}



function isValidPhone(phone) {
  if (!phone || !phone.trim()) return false;
  // Vietnamese phone numbers: 10 digits, starting with 0
  return /^0[0-9]{9}$/.test(phone.replace(/\s/g, ""));
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const initialForm = { label: "", country: "Việt Nam", province: "", details: "", phone: "", isDefault: false };
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/auth/addresses`, { headers: { "x-auth-token": token } });
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load addresses error", err);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(initialForm);
    setShowForm(true);
  }

  function startEdit(a, idx) {
    setEditing(a._id ?? idx);
    setForm({ label: a.label || "", country: a.country || "Việt Nam", province: a.province || "", details: a.details || "", phone: a.phone || "", isDefault: !!a.isDefault });
    setShowForm(true);
  }

  async function save(e) {
    e.preventDefault();
    // client-side validation
    const errors = [];
    if (!form.label || !form.label.trim()) errors.push("Label không được để trống");
    if (!form.province || (form.province !== "Hà Nội" && form.province !== "Hồ Chí Minh")) errors.push("Phải chọn Thành phố: Hà Nội hoặc Hồ Chí Minh");
    
    if (!isValidAddressDetails(form.details)) {
      errors.push("Địa chỉ cụ thể không hợp lệ (chỉ chứa chữ, số, dấu cách và dấu phẩy; địa chỉ nhập vào phải có ý nghĩa và đúng địa chỉ thực tế)");
    }

    if (!isValidPhone(form.phone)) {
      errors.push("Số điện thoại không hợp lệ (phải là số điện thoại Việt Nam: 0xxxxxxxxx)");
    }

    if (errors.length) {
      errors.forEach(err => toast.error(err));
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Bạn cần đăng nhập để quản lý địa chỉ");
      return;
    }
    try {
      if (editing == null) {
        const res = await fetch(`${API}/auth/addresses`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-auth-token": token },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        setAddresses(Array.isArray(data) ? data : []);
      } else {
        const res = await fetch(`${API}/auth/addresses/${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-auth-token": token },
          body: JSON.stringify(form)
        });
        const data = await res.json();
        setAddresses(Array.isArray(data) ? data : []);
      }
      // close the form and reset after successful save
      setShowForm(false);
      setEditing(null);
      setForm(initialForm);
    } catch (err) {
      console.error("Save address error", err);
    }
  }

  async function remove(id) {
    const token = localStorage.getItem("token");
    if (!confirm("Xóa địa chỉ này?")) return;
    try {
      const res = await fetch(`${API}/auth/addresses/${id}`, { method: "DELETE", headers: { "x-auth-token": token } });
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Delete address error", err);
    }
  }

  return (
    <div style={{ padding: 0, color: "#ddd" }}>
      <h2 style={{ marginTop: 0, color: "#fff" }}>Địa chỉ nhận hàng</h2>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: showForm ? '0 0 35%' : 1, minHeight: 480 }}>
          <button onClick={openNew} className="btn-gold">
            + Thêm địa chỉ mới
          </button>

          {loading && <p>Đang tải...</p>}

          {!loading && addresses.length === 0 && <p>Chưa có địa chỉ.</p>}

          {addresses.map((a, i) => (
            <div key={a._id ?? i} style={{ padding: 12, border: "1px solid #444", margin: "10px 0", borderRadius: 6, background: "#0f0f0f" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ color: "#fff" }}>{a.label || `Địa chỉ ${i + 1}`}</strong>
                  <div style={{ color: "#ddd" }}>{a.details}</div>
                  <div style={{ color: "#bbb" }}>{a.province}, {a.country}</div>
                  <div style={{ color: "#bbb" }}>SDT: {a.phone}</div>
                  {a.isDefault && <div style={{ color: "#0a66d1" }}>Mặc định</div>}
                </div>
                <div 
                  style={{ 
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: "70px",
                  }}
                >
                  <button 
                    onClick={() => startEdit(a, i)}
                    className="btn-gold btn-sm"
                  >
                    Sửa
                  </button>

                  <button
                    onClick={() => remove(a._id ?? i)}
                    className="btn-danger btn-sm"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ flex: '0 0 65%', alignSelf: "flex-start" }}>
            <div style={{ padding: 16, border: "1px solid #333", borderRadius: 6, background: "#0b0b0b" }}>
            <h3 style={{ marginTop: 0, color: "#fff" }}>{editing == null ? "Thêm địa chỉ mới" : "Chỉnh sửa địa chỉ"}</h3>
            <form onSubmit={save}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ color: "#ddd", display: "block", marginBottom: 6 }}>Label (tên):</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div>
                  <label style={{ display: "block", color: "#ddd", marginBottom: 6 }}>Quốc gia</label>
                  <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} style={selectStyle}>
                    <option value="Việt Nam">Việt Nam</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", color: "#ddd", marginBottom: 6 }}>Thành phố</label>
                  <select value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} style={selectStyle}>
                    <option value="">-- Chọn thành phố --</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ color: "#ddd", display: "block", marginBottom: 6 }}>Địa chỉ cụ thể</label>
                <input placeholder="Địa chỉ cụ thể" value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ color: "#ddd", display: "block", marginBottom: 6 }}>Số điện thoại</label>
                <input placeholder="Số điện thoại" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginTop: 8 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    color: "#ddd"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                    hidden
                  />
                  <span className="cart-checkbox"></span>
                  Đặt làm địa chỉ mặc định
                </label>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                  <button type="submit" className="btn-gold">
                    {editing == null ? "Lưu địa chỉ" : "Cập nhật địa chỉ"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                      setForm(initialForm);
                    }}
                    className="btn-gold-outline"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </form>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #333",
  background: "#111",
  color: "#eee"
};

const selectStyle = {
  padding: "10px",
  borderRadius: 6,
  border: "1px solid #333",
  background: "#111",
  color: "#eee",
  minWidth: 160
};
