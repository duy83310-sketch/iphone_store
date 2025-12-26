import { useNavigate } from "react-router-dom";
import { isAdmin } from "../utils/auth";

export default function Header() {
  const navigate = useNavigate();
  const admin = isAdmin();


  return (
    <div style={{
      height: 64,
      background: "#101922",
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      color: "#fff",
      borderBottom: "1px solid #233648",
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Bảng điều khiển</h4>

        <input
          placeholder="Tìm kiếm..."
          style={{
            marginLeft: 20,
            padding: "10px 16px",
            borderRadius: 6,
            border: "none",
            outline: "none",
            background: "#233648",
            color: "#fff"
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {admin && <div style={{ background: '#0ea5e9', color: '#071018', padding: '6px 10px', borderRadius: 6, fontWeight: 700 }}>ADMIN</div>}
      </div>
    </div>
  );
}
