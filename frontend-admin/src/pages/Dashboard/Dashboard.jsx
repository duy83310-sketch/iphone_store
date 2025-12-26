import DashboardStats from "./DashboardStats";
import RevenueChart from "./RevenueChart";
import LowStockProducts from "./LowStockProducts";
import RecentOrders from "./RecentOrders";

export default function Dashboard() {
  return (
    <>
      <DashboardStats />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", marginTop: "1.25rem", alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%" }}>
          <RevenueChart />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%" }}>
          <LowStockProducts />
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <RecentOrders />
      </div>
    </>
  );
}
