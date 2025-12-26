import { useMemo, useState } from "react";

export default function Reports() {
  const [range, setRange] = useState("today"); // today | 7d | month | year | custom

  const styles = {
    page: {
      padding: 20,
      color: "#EAF2FF",
      background: "transparent",
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 14,
    },
    title: { margin: 0, color: "#fff", fontSize: 26, fontWeight: 800 },
    subtitle: { margin: 0, color: "#94a3b8", marginTop: 6 },
    rightActions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    exportBtn: {
      background: "#137fec",
      color: "#fff",
      border: "none",
      padding: "0.55rem 0.9rem",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 800,
      height: 40,
      whiteSpace: "nowrap",
    },
    pills: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      padding: 6,
      borderRadius: 12,
      border: "1px solid #22384A",
      background: "rgba(16, 25, 34, .6)",
    },
    pill: (active) => ({
      border: "1px solid " + (active ? "#2A77FF" : "#22384A"),
      background: active ? "rgba(42, 119, 255, .18)" : "rgba(16, 25, 34, .2)",
      color: active ? "#EAF2FF" : "rgba(234, 242, 255, .75)",
      padding: "8px 10px",
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
      userSelect: "none",
    }),
    gridKpi: {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 12,
      marginTop: 12,
    },
    card: {
      padding: 16,
      borderRadius: 14,
      border: "1px solid #22384A",
      background: "linear-gradient(180deg, rgba(16,25,34,.85) 0%, rgba(10,16,24,.85) 100%)",
      boxShadow: "0 16px 60px rgba(0,0,0,.22)",
      minHeight: 92,
    },
    kpiTitle: { opacity: 0.72, fontSize: 12, marginBottom: 6 },
    kpiValue: { fontSize: 22, fontWeight: 900, letterSpacing: 0.2 },
    kpiDelta: (positive) => ({
      marginTop: 8,
      fontSize: 12,
      fontWeight: 800,
      color: positive ? "#2FEA8A" : "#FF637A",
      opacity: 0.95,
    }),
    gridCharts: {
      display: "grid",
      gridTemplateColumns: "2fr 1.2fr",
      gap: 12,
      marginTop: 12,
      alignItems: "stretch",
    },
    chartHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 10,
      marginBottom: 12,
      flexWrap: "wrap",
    },
    chartTitle: { fontWeight: 800, opacity: 0.95 },
    chartMeta: { fontSize: 12, opacity: 0.7, marginTop: 2 },
    bigNumber: { fontSize: 26, fontWeight: 950, letterSpacing: 0.2 },
    // Simple responsive without new files
    responsive: `
      @media (max-width: 1100px) {
        .reports-kpi { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .reports-charts { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 520px) {
        .reports-kpi { grid-template-columns: 1fr !important; }
      }
    `,
  };

  const fmtVnd = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

  // Demo data (thay bằng API sau)
  const kpis = useMemo(
    () => [
      { title: "Tổng doanh thu", value: fmtVnd(1200000000), delta: 15.2 },
      { title: "Tổng số đơn hàng", value: "450", delta: 8.5 },
      { title: "Sản phẩm đã bán", value: "512", delta: 12.1 },
      { title: "Lợi nhuận", value: fmtVnd(240000000), delta: 18.3 },
    ],
    []
  );

  const series = useMemo(() => {
    // 4 tuần demo
    const base = range === "today" ? [8, 14, 11, 18, 12, 10, 16, 13] : [12, 24, 18, 22, 16, 14, 28, 19, 17, 26, 15, 25];
    return base;
  }, [range]);

  const topProducts = useMemo(
    () => [
      { name: "iPhone 15 Pro Max", value: 78 },
      { name: "iPhone 15 Pro", value: 92 },
      { name: "iPhone 14 Pro Max", value: 86 },
      { name: "iPhone 15", value: 54 },
      { name: "iPhone 13", value: 46 },
    ],
    []
  );

  const pills = [
    { key: "today", label: "Hôm nay" },
    { key: "7d", label: "7 ngày qua" },
    { key: "month", label: "Tháng này" },
    { key: "year", label: "Năm nay" },
    { key: "custom", label: "Tùy chỉnh" },
  ];

  const LineChart = ({ values }) => {
    const w = 920;
    const h = 260;
    const pad = 18;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);

    const points = values
      .map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
        const y = pad + (1 - (v - min) / span) * (h - pad * 2);
        return [x, y];
      })
      .map((p) => p.join(","))
      .join(" ");

    return (
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="260" role="img" aria-label="Biểu đồ doanh số theo thời gian">
        <defs>
          <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A77FF" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#2A77FF" stopOpacity="0" />
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* grid */}
        {[0, 1, 2, 3].map((g) => (
          <line
            key={g}
            x1={pad}
            x2={w - pad}
            y1={pad + (g * (h - pad * 2)) / 3}
            y2={pad + (g * (h - pad * 2)) / 3}
            stroke="rgba(147, 188, 255, .10)"
            strokeWidth="1"
          />
        ))}

        {/* area */}
        <path
          d={`M ${points} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`}
          fill="url(#lineGlow)"
          stroke="none"
        />

        {/* line */}
        <polyline points={points} fill="none" stroke="#2A77FF" strokeWidth="3.5" filter="url(#soft)" />

        {/* dots */}
        {values.map((v, i) => {
          const x = pad + (i * (w - pad * 2)) / Math.max(1, values.length - 1);
          const y = pad + (1 - (v - min) / span) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="3.2" fill="#9BC4FF" opacity="0.9" />;
        })}
      </svg>
    );
  };

  const BarChart = ({ items }) => {
    const max = Math.max(...items.map((x) => x.value), 1);
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 10, alignItems: "end", height: 160 }}>
          {items.map((it) => {
            const h = Math.round((it.value / max) * 140) + 14;
            return (
              <div key={it.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  title={`${it.name}: ${it.value}`}
                  style={{
                    width: "100%",
                    maxWidth: 64,
                    height: h,
                    borderRadius: 10,
                    border: "1px solid #22384A",
                    background: "linear-gradient(180deg, rgba(42,119,255,.35) 0%, rgba(42,119,255,.12) 100%)",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 10 }}>
          {items.map((it) => (
            <div key={it.name} style={{ fontSize: 11, opacity: 0.75, textAlign: "center", lineHeight: 1.15 }}>
              {it.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const rangeLabel = useMemo(() => {
    if (range === "today") return "Hôm nay";
    if (range === "7d") return "7 ngày qua";
    if (range === "month") return "Tháng này";
    if (range === "year") return "Năm nay";
    return "Tùy chỉnh";
  }, [range]);

  const onExport = () => {
    // Hook chỗ này sang export CSV/PDF/API sau
    // eslint-disable-next-line no-alert
    alert(`Xuất báo cáo: ${rangeLabel}`);
  };

  return (
    <div style={styles.page}>
      <style>{styles.responsive}</style>

      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Báo cáo &amp; Phân tích</h2>
          <p style={styles.subtitle}>Tổng quan hiệu suất kinh doanh của cửa hàng.</p>

          <div style={{ marginTop: 10, ...styles.pills }}>
            {pills.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setRange(p.key)}
                aria-pressed={range === p.key}
                style={styles.pill(range === p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.rightActions}>
          <button type="button" onClick={onExport} style={styles.exportBtn}>
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="reports-kpi" style={styles.gridKpi}>
        {kpis.map((k) => (
          <div key={k.title} style={styles.card}>
            <div style={styles.kpiTitle}>{k.title}</div>
            <div style={styles.kpiValue}>{k.value}</div>
            <div style={styles.kpiDelta(k.delta >= 0)}>{k.delta >= 0 ? "+" : ""}{k.delta}%</div>
          </div>
        ))}
      </div>

      <div className="reports-charts" style={styles.gridCharts}>
        <div style={{ ...styles.card, padding: 18 }}>
          <div style={styles.chartHeaderRow}>
            <div>
              <div style={styles.chartTitle}>Doanh số theo thời gian</div>
              <div style={styles.chartMeta}>01 Th10 - 31 Th10</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.bigNumber}>{fmtVnd(850000000)}</div>
              <div style={styles.kpiDelta(true)}>+12.5%</div>
            </div>
          </div>

          <LineChart values={series} />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, opacity: 0.6 }}>
            <span>Tuần 1</span>
            <span>Tuần 2</span>
            <span>Tuần 3</span>
            <span>Tuần 4</span>
          </div>
        </div>

        <div style={{ ...styles.card, padding: 18 }}>
          <div style={styles.chartHeaderRow}>
            <div>
              <div style={styles.chartTitle}>Top 5 sản phẩm bán chạy</div>
              <div style={styles.chartMeta}>Tháng 10</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.bigNumber}>410 sản phẩm</div>
              <div style={styles.kpiDelta(true)}>+9.8%</div>
            </div>
          </div>

          <BarChart items={topProducts} />
        </div>
      </div>
    </div>
  );
}
