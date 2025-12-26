import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format as formatDate } from 'date-fns';
import { fetchOrder } from '../../services/orders.service';
import StatusBadge from '../../components/StatusBadge';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrder(id).then((res) => {
      if (!mounted) return;
      setOrder(res);
    }).catch((err) => {
      console.error('fetch order', err);
    }).finally(() => mounted && setLoading(false));
    return () => { mounted = false };
  }, [id]);

  const formatOrderCode = (id) => (id ? `#${String(id).slice(-8)}` : '');

  if (loading) return <div style={{ padding: 20 }}>Đang tải...</div>;
  if (!order) return <div style={{ padding: 20 }}>Không tìm thấy đơn hàng.</div>;

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Chi tiết Đơn hàng</h2>
          <div style={{ color: '#9fb0bf' }}>Mã: <strong>{order.orderCode || formatOrderCode(order.id)}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{ background: '#263645', color: '#fff', border: 'none', padding: '0.4rem 0.6rem', borderRadius: 6, cursor: 'pointer' }}>Quay lại</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        <div style={{ background: '#0b1115', padding: 12, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{order.customer}</div>
              <div style={{ color: '#9fb0bf' }}>{order.phone} - {order.email}</div>
              <div style={{ color: '#9fb0bf', marginTop: 6 }}>Ngày đặt: {formatDate(new Date(order.date), 'dd/MM/yyyy HH:mm')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <StatusBadge status={order.status} />
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {Number(order.totalPrice ?? order.total ?? order.grandTotal ?? 0).toLocaleString('vi-VN')}đ
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '6px 0' }}>Sản phẩm</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.isArray(order.items) && order.items.map((it) => {
                const v = it.variantSnapshot || {};
                const vVersion = v.version;
                const vColor = v.color;
                const vStorage = v.storage;
                return (
                  <div key={it.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, background: '#071018', borderRadius: 6 }}>
                    <div style={{ flex: 1 }}>
                      {it.name}
                      {(vVersion || vColor || vStorage) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', color: '#9fb0bf', fontSize: 12 }}>
                          {vVersion && <span style={{ textTransform: 'uppercase' }}>{vVersion}</span>}
                          {vColor && <span>{vColor}</span>}
                          {vStorage && <span>{vStorage}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ marginLeft: 12 }}>{it.quantity} × {Number(it.unitPrice || 0).toLocaleString('vi-VN')}đ</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '6px 0' }}>Địa chỉ giao hàng</h4>
            <div style={{ background: '#071018', padding: 10, borderRadius: 6 }}>
              <div><strong>{order.address?.label}</strong> — {order.address?.details}</div>
              <div style={{ color: '#9fb0bf' }}>{order.address?.province}, {order.address?.country}</div>
              <div style={{ color: '#9fb0bf' }}>SĐT: {order.address?.phone}</div>
            </div>
          </div>

          {order.cancelReason && (
            <div style={{ marginTop: 12, color: '#ffb3b3' }}><strong>Lý do hủy:</strong> {order.cancelReason}</div>
          )}
        </div>

        <div style={{ background: '#0b1115', padding: 12, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><strong>Phương thức thanh toán:</strong> {order.paymentMethod}</div>
          <div><strong>Vận chuyển:</strong> {order.shippingMethod}</div>
          {order.deliveryEstimate && <div><strong>Dự kiến:</strong> {order.deliveryEstimate}</div>}
          <div><strong>Ngày giao:</strong> {order.shippedAt ? formatDate(new Date(order.shippedAt), 'dd/MM/yyyy HH:mm') : '-'}</div>
          <div><strong>Ngày hoàn tất:</strong> {order.deliveredAt ? formatDate(new Date(order.deliveredAt), 'dd/MM/yyyy HH:mm') : '-'}</div>
        </div>
      </div>
    </div>
  );
}
