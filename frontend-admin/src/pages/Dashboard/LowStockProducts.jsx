import { useEffect, useState } from 'react';
import dashboardService from '../../services/dashboard.service';

export default function LowStockProducts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dashboardService.getLowStock(5)
      .then((data) => {
        if (mounted) {
          setItems(data || []);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    return () => { mounted = false; };
  }, []);

  const fallback = [
    { id: 1, name: "iPhone 15 Pro 256GB", variant: "Titan Xanh", left: 5 },
    { id: 2, name: "iPhone 15 128GB", variant: "Hồng", left: 8 },
    { id: 3, name: "iPhone 15 Pro Max 512GB", variant: "Titan Trắng", left: 12 },
  ];

  const list = items.length ? items : fallback;

  return (
    <div style={{
      background: "#111a22",
      padding: "1.25rem",
      borderRadius: "0.75rem",
      color: "#fff",
      border: "1px solid #324d67",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minHeight: "16rem"
    }}>
      <div>
        <h4 style={{ margin: 0, marginBottom: "0.75rem" }}>Sản phẩm sắp hết hàng</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {loading ? (
            // simple loading placeholders
            [1,2,3].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: 48, height: 48, borderRadius: 6, background: "#0c1a20", flex: "0 0 48px" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: "40%", height: 12, background: "#072022" }} />
                  <div style={{ width: "30%", height: 10, background: "#041018", marginTop: 6 }} />
                </div>
                <div style={{ width: 28, height: 16, background: "#041018", borderRadius: 4 }} />
              </div>
            ))
          ) : (
            list.map((it) => (
              <div key={String(it.id)} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {it.image ? (
                  <img src={it.image} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flex: '0 0 48px' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 6, background: "linear-gradient(135deg,#203040,#162229)", flex: "0 0 48px" }} />
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>{it.name}</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>{it.variant}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ color: (it.left <= 0 ? '#ef4444' : (it.left <= 5 ? '#f97316' : '#fdba74')), fontWeight: 700 }}>{it.left}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>còn lại</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ textAlign: "right", marginTop: "1rem" }}>
        <a href="/products" style={{ color: "#3b82f6", textDecoration: "none" }}>Xem tất cả</a>
      </div>
    </div>
  );
}
