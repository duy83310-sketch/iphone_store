import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import { toast } from "react-toastify";

export default function AvatarPage() {
  const { user, setUser } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.avatar || null);
  const [uploading, setUploading] = useState(false);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!preview) {
      toast.error("Vui lòng chọn hình ảnh");
      return;
    }

    setUploading(true);
    const token = localStorage.getItem("token");
    try {
      // Send base64 string as avatar to server (stored in user.avatar)
      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ avatar: preview })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.msg || "Không thể cập nhật ảnh đại diện");
      }

      const data = await res.json();
      // Update context user
      if (data && data.user) {
        setUser(data.user);
      } else {
        // fetch fresh profile
        const refresh = await fetch(`${API}/auth/me`, { headers: { "x-auth-token": token } }).then(r => r.json());
        if (refresh && refresh.email) setUser(refresh);
      }

      toast.success("Cập nhật ảnh đại diện thành công");
    } catch (err) {
      console.error("Avatar save error", err);
      toast.error(err.message || "Lỗi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: "#fff", marginTop: 0 }}>Ảnh đại diện</h2>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div>
          <div style={{ width: 120, height: 120, borderRadius: 999, overflow: "hidden", background: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {preview ? (
              <img src={preview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#fff" }}>{(user?.name || "U").slice(0,1).toUpperCase()}</div>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <input type="file" accept="image/*" onChange={handleFile} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={handleSave} disabled={uploading} className="btn-gold">
              {uploading ? "Đang tải..." : "Lưu ảnh"}
            </button>
          </div>
          <div style={{ marginTop: 8, color: "#ccc", fontSize: 13 }}>Note: dùng ảnh vuông, kích thước dưới 3MB.</div>
        </div>
      </div>
    </div>
  );
}
