export default function StatCard({ title, value, percent, color }) {
  return (
    <div style={{
      background: "#111a22",
      padding: "1.25rem",
      borderRadius: "0.75rem",
      color: "#fff",
      border: "1px solid #324d67",
      minHeight: "6rem",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }}>
      <p style={{ opacity: 0.7 }}>{title}</p>
      <h2 style={{ margin: 0 }}>{value}</h2>
      <span style={{ color }}>{percent}</span>
    </div>
  );
}
