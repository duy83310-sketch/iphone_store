import { useEffect, useState } from "react";
import axiosClient from "../../services/axiosClient";
import StatusBadge from "../../components/StatusBadge";

export default function RecentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axiosClient.get('/orders/admin', { params: { limit: 3 } })
      .then(res => {
        if (!mounted) return;
        setOrders(res.data?.data || []);
      })
      .catch(err => {
        console.error('fetch recent orders', err?.response?.data || err.message);
        if (!mounted) return;
        setError('Không thể tải đơn hàng');
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false };
  }, []);

  const formatPrice = (v) => (Number(v) || 0).toLocaleString('vi-VN') + 'đ';

  // Use shared StatusBadge component for consistent labels & colors across the admin UI 

  return (
    <div style={{
      background: "#111a22",
      padding: "1.25rem",
      borderRadius: "0.75rem",
      color: "#fff",
      border: "1px solid #324d67",
      minHeight: "12rem"
    }}>
      <h4>Đơn hàng gần đây</h4>

      {loading ? (
        <div style={{ marginTop: 12, color: '#9fb0bf' }}>Đang tải...</div>
      ) : error ? (
        <div style={{ marginTop: 12, color: '#ef4444' }}>{error}</div>
      ) : orders.length === 0 ? (
        <div style={{ marginTop: 12, color: '#9fb0bf' }}>Không có đơn hàng</div>
      ) : (
        <table width="100%" style={{ marginTop: "0.75rem", opacity: 0.95, textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>Mã</th>
              <th style={{ textAlign: 'center' }}>Khách hàng</th>
              <th style={{ textAlign: 'center' }}>Tổng tiền</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ textAlign: 'center', padding: '0.6rem 0' }}>#{String(o.id).slice(-6)}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0' }}>{o.customer || '-'}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0' }}>{formatPrice(o.total)}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0' }}><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
