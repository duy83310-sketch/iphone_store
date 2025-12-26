import { useEffect, useState } from "react";
import axiosClient from "../../services/axiosClient";

export default function RevenueChart() {
  const [days, setDays] = useState([]);
  const [total, setTotal] = useState(0);
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axiosClient.get(`/orders/admin/revenue-range`, { params: { days: 7 } })
      .then(res => {
        if (!mounted) return;
        setDays(res.data.days || []);
        setTotal(res.data.total || 0);
        setPercent(res.data.percent || 0);
      })
      .catch(err => console.error('fetch revenue-range', err))
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false };
  }, []);

  const max = Math.max(...(days.map(d => d.total)), 1);

  const shortLabels = days.map(d => {
    const dt = new Date(d.date + 'T00:00:00');
    const day = dt.getDay(); // 0 Sun .. 6 Sat
    const map = ['CN','T2','T3','T4','T5','T6','T7'];
    return map[day] || d.date.slice(5);
  });

  const formatVnd = (v) => (Number(v) || 0).toLocaleString('vi-VN') + 'đ';

  return (
    <div style={{
      background: "#111a22",
      padding: "1.25rem",
      borderRadius: "0.75rem",
      color: "#fff",
      border: "1px solid #324d67",
      minHeight: "22rem", // increased height for better chart visibility
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      <div>
        <h4>Doanh thu theo thời gian</h4>
        <p style={{ fontSize: 22, margin: "0.625rem 0" }}>{loading ? '...' : formatVnd(total)}</p>
        <p style={{ color: percent >= 0 ? '#22c55e' : '#ef4444' }}>{loading ? '...' : `7 ngày qua ${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`}</p>
      </div>

      <div
  style={{
    display: "flex",
    gap: 12,
    marginTop: 24,
    alignItems: "flex-end",
    height: "9rem" // increased chart area
  }}
>
  {days.map((d, i) => {
    const h = Math.round((Number(d.total) / max) * 100);
    const isToday = i === days.length - 1;

    return (
      <div
        key={d.date}
        style={{
          flex: 1,
          height: "100%",              // ✅ BẮT BUỘC
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end"
        }}
      >
        <div
          title={`${d.date}: ${formatVnd(d.total)}`}
          style={{
            width: "70%",
            margin: '0 auto',
            height: `${Math.max(12, h)}%`,
            background: isToday
              ? "linear-gradient(180deg, #3b82f6, #1e40af)"
              : "linear-gradient(180deg, #475569, #1f2937)",
            borderRadius: 8,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
            transition: "height 0.25s ease"
          }}
        />
        <div style={{ fontSize: 13, marginTop: 8, color: "#98a6b3" }}>
          {shortLabels[i]}
        </div>
      </div>
    );
  })}
</div>

    </div>
  );
}
