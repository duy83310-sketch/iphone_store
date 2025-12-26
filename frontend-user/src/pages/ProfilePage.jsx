import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import { toast } from "react-toastify";

export default function ProfilePage() {
  const { user, setUser } = useContext(AuthContext);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("female");
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2000);
  const [saving, setSaving] = useState(false);
  const prevYearRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setGender(user.gender || "female");

    if (user.dob) {
      const d = new Date(user.dob);
      if (!isNaN(d)) {
        setDay(d.getDate());
        setMonth(d.getMonth() + 1);
        setYear(d.getFullYear());
      }
    }
  }, [user]);

  // show playful toast when user selects an extreme year
  useEffect(() => {
    // skip on initial mount
    if (prevYearRef.current === null) {
      prevYearRef.current = year;
      return;
    }

    if (year < 1940) {
      toast.info("Bạn thực sự già đến vậy ư?");
    } else if (year > 2010) {
      toast.info("Ê tôi không tin đâu.. Là bạn quá trẻ hay do tôi quá già?");
    }

    prevYearRef.current = year;
  }, [year]);

  async function handleSave(e) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Bạn cần đăng nhập để lưu thông tin");
      return;
    }

    try {
      setSaving(true);

      const dob = new Date(year, month - 1, day).toISOString();

      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token
        },
        body: JSON.stringify({ name, phone, gender, dob })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.msg || data.error || "Cập nhật thất bại");
        return;
      }

      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(prev => ({ ...(prev || {}), name, phone, gender, dob }));
      }

      toast.success("Lưu thông tin thành công");
    } catch (err) {
      console.error("Save profile error:", err);
      toast.error("Có lỗi khi lưu thông tin");
    } finally {
      setSaving(false);
    }
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 120 }, (_, i) => 2025 - i);

  return (
    <>
      <h2 style={{ marginTop: 0, color: "#fff" }}>Thông tin tài khoản</h2>

      <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, color: "#ddd" }}>
        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Tên, Họ:</label>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>E-mail:</label>
          <input value={email} disabled style={{ ...inputStyle, background: "#1a1a1a", color: "#888" }} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Điện thoại:</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Giới tính:</label>

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#ddd", cursor: "pointer" }}>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === "male"}
                onChange={() => setGender("male")}
                hidden
              />
              <span className="cart-radio" />
              Nam
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#ddd", cursor: "pointer" }}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === "female"}
                onChange={() => setGender("female")}
                hidden
              />
              <span className="cart-radio" />
              Nữ
            </label>
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6 }}>Ngày sinh:</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={day} onChange={e => setDay(Number(e.target.value))} style={selectStyle}>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} style={selectStyle}>
              {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
          <div style={{ color: "#ddd" }}>Username: <span style={{ color: "#aaa" }}>{user?.id || user?._id || "--"}</span></div>
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? "Đang lưu..." : "Lưu lại"}
          </button>
        </div>
      </form>
    </>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#111",
  color: "#eee"
};

const selectStyle = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #333",
  background: "#111",
  color: "#eee",
  minWidth: 120
};
