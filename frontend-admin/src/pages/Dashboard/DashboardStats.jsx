import { useEffect, useState } from "react";
import StatCard from "../../components/StatCard";
import axiosClient from "../../services/axiosClient";

export default function DashboardStats() {
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [prevRevenue, setPrevRevenue] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [soldCount, setSoldCount] = useState(0);
  const [stockCount, setStockCount] = useState(0);
  const [soldToday, setSoldToday] = useState(0);
  const [soldYesterday, setSoldYesterday] = useState(0);

  useEffect(() => {
    let mounted = true; 
    setLoading(true);

    const formatDateParam = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tDate = formatDateParam(today);
    const pDate = formatDateParam(yesterday);

    Promise.all([
      axiosClient.get(`/orders/admin/revenue`, { params: { date: tDate } }),
      axiosClient.get(`/orders/admin/revenue`, { params: { date: pDate } }),
      axiosClient.get(`/orders/admin/stats`)
    ]).then(([tRes, pRes, statsRes]) => {
      if (!mounted) return;
      setTodayRevenue(tRes.data?.total || 0);
      // todayCount should be created orders count (phát sinh hnay)
      setTodayCount(tRes.data?.createdCount ?? (tRes.data?.count || 0));
      setPrevRevenue(pRes.data?.total || 0);
      setPrevCount(pRes.data?.createdCount ?? (pRes.data?.count || 0));

      setSoldCount(statsRes.data?.totalSold || 0);
      setStockCount(statsRes.data?.totalStock || 0);
      setSoldToday(statsRes.data?.soldToday || 0);
      setSoldYesterday(statsRes.data?.soldYesterday || 0);
    }).catch((err) => {
      console.error('fetch revenue/stats', err);
      // leave zeros on error
    }).finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false };
  }, []);

  const formatVnd = (val) => (Number(val) || 0).toLocaleString('vi-VN') + 'đ';

  const percent = (() => {
    const a = Number(prevRevenue) || 0;
    const b = Number(todayRevenue) || 0;
    if (a === 0) return b === 0 ? '+0%' : '+100%';
    const p = ((b - a) / a) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  })();

  const color = (() => {
    const a = Number(prevRevenue) || 0;
    const b = Number(todayRevenue) || 0;
    return b >= a ? '#22c55e' : '#ef4444';
  })();

  const percentCount = (() => {
    const a = Number(prevCount) || 0;
    const b = Number(todayCount) || 0;
    if (a === 0) return b === 0 ? '+0%' : '+100%';
    const p = ((b - a) / a) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  })();

  const colorCount = (() => {
    const a = Number(prevCount) || 0;
    const b = Number(todayCount) || 0;
    return b >= a ? '#22c55e' : '#ef4444';
  })();

  // Sold percent (compare soldToday vs soldYesterday)
  const percentSold = (() => {
    const a = Number(soldYesterday) || 0;
    const b = Number(soldToday) || 0;
    if (a === 0) return b === 0 ? '+0%' : '+100%';
    const p = ((b - a) / a) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  })();

  const colorSold = (() => {
    const a = Number(soldYesterday) || 0;
    const b = Number(soldToday) || 0;
    return b >= a ? '#22c55e' : '#ef4444';
  })();

  // Stock percent: compare current stock vs estimated previous stock
  const percentStock = (() => {
    const b = Number(stockCount) || 0;
    // estimate previous stock = current + soldToday - soldYesterday
    const a = b + (Number(soldToday) || 0) - (Number(soldYesterday) || 0);
    if (a === 0) return b === 0 ? '+0%' : '+100%';
    const p = ((b - a) / a) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  })();

  const colorStock = (() => {
    const b = Number(stockCount) || 0;
    const a = b + (Number(soldToday) || 0) - (Number(soldYesterday) || 0);
    return b >= a ? '#22c55e' : '#ef4444';
  })();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
      <StatCard title={`Doanh thu hôm nay${loading ? ' (đang tải...)' : ''}`} value={loading ? '...' : formatVnd(todayRevenue)} percent={loading ? '...' : percent} color={color} />
      <StatCard title={`Tổng đơn hàng hôm nay${loading ? ' (đang tải...)' : ''}`} value={loading ? '...' : String(todayCount)} percent={loading ? '...' : percentCount} color={colorCount} />
      <StatCard title="Sản phẩm đã bán" value={loading ? '...' : String(soldCount)} percent={loading ? '...' : percentSold} color={colorSold} />
      <StatCard title="Lượng tồn kho" value={loading ? '...' : (Number(stockCount) || 0).toLocaleString('vi-VN')} percent={loading ? '...' : percentStock} color={colorStock} />
    </div>
  );
}
