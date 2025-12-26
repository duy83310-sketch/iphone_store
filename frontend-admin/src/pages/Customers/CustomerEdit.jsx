import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import customersService from "../../services/customers.service";

const getApiBase = () => {
  const envBase = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (envBase) return envBase;
  return `${window.location.protocol}//${window.location.hostname}:5000`;
};

export default function CustomerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [raw, setRaw] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    status: "active",
    tier: ""
  });

  // { changed code } password reset fields (never prefilled)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSave = useMemo(() => {
    if (!id) return false;
    if (saving || loading) return false;
    if (!String(form.name || "").trim()) return false;
    return true;
  }, [id, saving, loading, form.name]);

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      try {
        let detail = null;

        if (customersService.getClient) {
          const res = await customersService.getClient(id);
          detail = res?.data || null;
        } else {
          const token = localStorage.getItem("token");
          const base = getApiBase();

          // { changed code } use listClients with ?id= to avoid 404 route /clients/:id
          const resp = await fetch(`${base}/admin/users/clients?id=${encodeURIComponent(id)}`, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });

          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

          const j = await resp.json();
          const row = Array.isArray(j?.data) ? j.data[0] : null;
          if (!row) throw new Error("User not found");

          detail = row;
        }

        if (!mounted) return;

        setRaw(detail);
        setForm({
          name: detail?.name || "",
          email: detail?.email || "",
          phone: detail?.phone || "",
          gender: detail?.gender || "",
          dob: detail?.dob ? String(detail.dob).slice(0, 10) : "",
          status: detail?.status || "active",
          tier: detail?.tier || ""
        });

        // { changed code } always keep password inputs empty on load
        setNewPassword("");
        setConfirmPassword("");
      } catch (e) {
        console.error(e);
        toast.error("Không tải được thông tin khách hàng");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => { mounted = false; };
  }, [id]);

  const onSave = async () => {
    if (!canSave) return;

    // { changed code } validate password reset fields (optional)
    const np = String(newPassword || "");
    const cp = String(confirmPassword || "");
    if (np || cp) {
      if (np.length < 6) {
        toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
        return;
      }
      if (np !== cp) {
        toast.error("Mật khẩu mới và xác nhận không khớp");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: String(form.name || "").trim(),
        phone: String(form.phone || "").trim(),
        gender: form.gender || "",
        dob: form.dob || null,
        status: form.status || "active",
        tier: form.tier || ""
      };

      // { changed code } send newPassword only when admin enters it
      if (np) payload.newPassword = np;

      // Email thường nên readonly; vẫn giữ trong form để hiển thị.
      // payload.email = form.email; // bật nếu backend cho phép

      if (customersService.updateClient) {
        await customersService.updateClient(id, payload);
      } else {
        const token = localStorage.getItem("token");
        const base = getApiBase();
        const resp = await fetch(`${base}/admin/users/clients/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          let msg = `HTTP ${resp.status}`;
          try {
            const j = JSON.parse(text);
            msg = j.msg || j.message || msg;
          } catch {
            if (text) msg = text.slice(0, 200);
          }
          throw new Error(msg);
        }
      }

      toast.success("Cập nhật khách hàng thành công");
      navigate("/customers");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Chỉnh sửa khách hàng</h2>
          <div style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>
            ID: {id} {raw?.email ? `- ${raw.email}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate("/customers")}
            style={{ background: "#263645", color: "#fff", border: "none", padding: "0.5rem 0.75rem", borderRadius: 8, cursor: "pointer" }}
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            disabled={!canSave}
            style={{
              background: !canSave ? "#64748b" : "#22c55e",
              color: "#fff",
              border: "none",
              padding: "0.5rem 0.75rem",
              borderRadius: 8,
              cursor: !canSave ? "not-allowed" : "pointer",
              opacity: saving ? 0.85 : 1
            }}
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div style={{ background: "#0e1620", border: "1px solid #27374a", borderRadius: 12, padding: 12, color: "#e5eef7" }}>
        {loading ? (
          <div style={{ opacity: 0.8 }}>Đang tải...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Tên</div>
              <input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Email (readonly)</div>
              <input
                value={form.email}
                readOnly
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#111a22", color: "#9fb0bf", border: "1px solid #27374a", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Số điện thoại</div>
              <input
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Giới tính</div>
              <select
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67" }}
              >
                <option value="">-</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Ngày sinh</div>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setField("dob", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Trạng thái</div>
              <select
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67" }}
              >
                <option value="active">Hoạt động</option>
                <option value="disabled">Ngưng hoạt động</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Hạng (tier)</div>
              <input
                value={form.tier}
                onChange={(e) => setField("tier", e.target.value)}
                placeholder="VIP / ..."
                style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box" }}
              />
            </div>

            {/* { changed code } password reset UI */}
            <div style={{ gridColumn: "1 / -1", marginTop: 6, paddingTop: 12, borderTop: "1px solid #27374a" }}>
              <h4 style={{ margin: "0 0 8px 0" }}>Đổi mật khẩu (không hiển thị mật khẩu hiện tại)</h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Mật khẩu mới</div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    autoComplete="new-password"
                    style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <div style={{ marginBottom: 6, opacity: 0.8, fontSize: 13 }}>Nhập lại mật khẩu mới</div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại để xác nhận"
                    autoComplete="new-password"
                    style={{ width: "100%", padding: "0.6rem 0.9rem", borderRadius: 8, background: "#192633", color: "#fff", border: "1px solid #324d67", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
                Nếu để trống 2 ô này, mật khẩu khách hàng sẽ không thay đổi.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
