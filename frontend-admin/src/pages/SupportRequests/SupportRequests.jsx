import React, { useMemo, useState } from "react";

export default function SupportRequests() {
  // --- mock data (thay bằng API sau) ---
  const seed = useMemo(
    () => [
      {
        id: 89451,
        customer: "Lê Minh Anh",
        content: "Tư vấn về chính sách bảo hành",
        receivedAt: "30/05/2024",
        status: "pending",
      },
      {
        id: 89450,
        customer: "Trần Văn Nam",
        content: "Hỗ trợ kỹ thuật camera iPhone 15 Pro",
        receivedAt: "29/05/2024",
        status: "pending",
      },
      {
        id: 89448,
        customer: "Phạm Thị Bích",
        content: "Khiếu nại về thời gian giao hàng",
        receivedAt: "28/05/2024",
        status: "pending",
      },
      {
        id: 89445,
        customer: "Nguyễn Tiến Dũng",
        content: "Hỏi về chương trình thu cũ đổi mới",
        receivedAt: "27/05/2024",
        status: "pending",
      },
      {
        id: 89440,
        customer: "Đỗ Thanh Hà",
        content: "Cần hóa đơn VAT cho đơn hàng",
        receivedAt: "25/05/2024",
        status: "in_progress",
      },
      {
        id: 89432,
        customer: "Vũ Quang Huy",
        content: "Hướng dẫn chuyển dữ liệu sang máy mới",
        receivedAt: "22/05/2024",
        status: "resolved",
      },
      {
        id: 89410,
        customer: "Hoàng Thị Lan",
        content: "Yêu cầu lưu trữ ticket để đối soát",
        receivedAt: "18/05/2024",
        status: "archived",
      },
    ],
    []
  );

  const TABS = [
    { key: "pending", label: "Đang chờ" },
    { key: "in_progress", label: "Đang xử lí" },
    { key: "resolved", label: "Đã giải quyết" },
    { key: "archived", label: "Đã lưu trữ" },
  ];

  const [activeTab, setActiveTab] = useState("pending");
  const [q, setQ] = useState("Trần Văn Nam");
  const [receivedDate, setReceivedDate] = useState(""); // yyyy-mm-dd
  const [selected, setSelected] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const pageSize = 4;

  const styles = useMemo(
    () => ({
      page: { padding: 20, color: "#D7E2EE" },
      title: { margin: 0, fontSize: 26, fontWeight: 800, color: "#EEF6FF" },
      subtitle: { marginTop: 6, opacity: 0.75, fontSize: 13 },
      panel: {
        marginTop: 14,
        borderRadius: 12,
        border: "1px solid #223244",
        background:
          "linear-gradient(180deg, rgba(16,25,34,.95) 0%, rgba(13,20,28,.95) 100%)",
        boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      },
      topPad: { padding: 14 },
      tabs: {
        display: "flex",
        gap: 18,
        borderBottom: "1px solid rgba(255,255,255,.06)",
        padding: "12px 14px 0 14px",
      },
      tab: (active) => ({
        position: "relative",
        padding: "10px 6px 12px 6px",
        fontSize: 13,
        opacity: active ? 1 : 0.7,
        fontWeight: active ? 700 : 600,
        color: active ? "#EAF3FF" : "#B7C7D8",
        cursor: "pointer",
      }),
      tabUnderline: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        background: "#4EA1FF",
        borderRadius: 2,
      },
      toolbar: {
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "12px 14px",
      },
      search: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 38,
        padding: "0 12px",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.03)",
      },
      input: {
        width: "100%",
        outline: "none",
        border: 0,
        background: "transparent",
        color: "#EAF3FF",
        fontSize: 13,
      },
      btn: (variant = "default") => {
        const common = {
          height: 38,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.10)",
          background: "rgba(255,255,255,.04)",
          color: "#EAF3FF",
          padding: "0 12px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        };
        if (variant === "primary")
          return {
            ...common,
            background: "rgba(78,161,255,.14)",
            border: "1px solid rgba(78,161,255,.45)",
            color: "#CFE7FF",
          };
        return common;
      },
      dateWrap: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 38,
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,.10)",
        background: "rgba(255,255,255,.04)",
        padding: "0 12px",
      },
      dateInput: {
        border: 0,
        outline: "none",
        background: "transparent",
        color: "#EAF3FF",
        fontSize: 13,
      },
      bulkBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px 0 14px",
      },
      bulkLeft: { fontSize: 12, opacity: 0.8 },
      bulkRight: { display: "flex", gap: 10 },
      tableWrap: { padding: "10px 14px 14px 14px" },
      table: {
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: 0,
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,.06)",
      },
      th: {
        textAlign: "left",
        fontSize: 12,
        letterSpacing: 0.2,
        color: "#AFC2D6",
        padding: "12px 12px",
        background: "rgba(255,255,255,.02)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        fontWeight: 800,
        whiteSpace: "nowrap",
      },
      td: {
        padding: "12px 12px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        fontSize: 13,
        color: "#D9E6F3",
        verticalAlign: "middle",
      },
      trHover: { transition: "background .15s ease" },
      badge: (status) => {
        const map = {
          pending: {
            bg: "rgba(255, 177, 66, .16)",
            bd: "rgba(255, 177, 66, .45)",
            fg: "#FFD39A",
            text: "Đang chờ",
          },
          in_progress: {
            bg: "rgba(78,161,255,.14)",
            bd: "rgba(78,161,255,.45)",
            fg: "#CFE7FF",
            text: "Đang xử lí",
          },
          resolved: {
            bg: "rgba(57, 204, 138,.14)",
            bd: "rgba(57, 204, 138,.45)",
            fg: "#BFF5DD",
            text: "Đã giải quyết",
          },
          archived: {
            bg: "rgba(180, 190, 205,.12)",
            bd: "rgba(180, 190, 205,.30)",
            fg: "#D4DCE7",
            text: "Đã lưu trữ",
          },
        };
        const v = map[status] || map.pending;
        return {
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 10px",
          borderRadius: 999,
          border: `1px solid ${v.bd}`,
          background: v.bg,
          color: v.fg,
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "nowrap",
        };
      },
      iconBtn: (tone) => ({
        border: 0,
        background: "transparent",
        cursor: "pointer",
        padding: 6,
        borderRadius: 8,
        color: tone === "danger" ? "#FF6B6B" : "#4EA1FF",
      }),
      footer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px 14px 14px",
        opacity: 0.9,
      },
      pagination: { display: "flex", gap: 6, alignItems: "center" },
      pageBtn: (active) => ({
        height: 30,
        minWidth: 30,
        padding: "0 10px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,.10)",
        background: active ? "rgba(78,161,255,.14)" : "rgba(255,255,255,.03)",
        color: active ? "#CFE7FF" : "#D7E2EE",
        fontWeight: 800,
        cursor: "pointer",
      }),
      checkbox: { width: 16, height: 16, cursor: "pointer", accentColor: "#4EA1FF" },
      muted: { opacity: 0.75, fontSize: 12 },
    }),
    []
  );

  const filtered = useMemo(() => {
    const norm = (s) => (s || "").toLowerCase().trim();

    const byTab = seed.filter((t) => t.status === activeTab);
    const byQuery = !norm(q)
      ? byTab
      : byTab.filter((t) => {
          const hay = `${t.id} ${t.customer} ${t.content}`.toLowerCase();
          return hay.includes(norm(q));
        });

    const byDate = !receivedDate
      ? byQuery
      : byQuery.filter((t) => {
          // receivedAt: dd/mm/yyyy => yyyy-mm-dd
          const [dd, mm, yyyy] = (t.receivedAt || "").split("/");
          const iso = yyyy && mm && dd ? `${yyyy}-${mm}-${dd}` : "";
          return iso === receivedDate;
        });

    return byDate;
  }, [seed, activeTab, q, receivedDate]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((t) => selected.has(t.id));
  const someOnPageSelected = pageItems.some((t) => selected.has(t.id));

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageItems.forEach((t) => next.delete(t.id));
      } else {
        pageItems.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkResolve = () => {
    // UI-only: thay bằng API + refetch
    alert(`Giải quyết: ${selected.size} yêu cầu`);
    clearSelection();
  };

  const bulkArchive = () => {
    alert(`Lưu trữ: ${selected.size} yêu cầu`);
    clearSelection();
  };

  const onEdit = (id) => alert(`Sửa yêu cầu #${id}`);
  const onDelete = (id) => alert(`Xóa yêu cầu #${id}`);

  const resetHeaderFilters = () => {
    setActiveTab("pending");
    setQ("");
    setReceivedDate("");
    setPage(1);
    clearSelection();
  };

  const Icon = {
    Search: (props) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
        <path
          d="M10.5 19a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17Z"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    Calendar: (props) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
        <path
          d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
    Sliders: (props) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M4 6h16M7 6v12M4 12h16M17 12v6M4 18h16M12 18V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    Pencil: (props) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
        <path
          d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
    Trash: (props) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...props}>
        <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <div style={styles.page}>
      {/* Header (synced with Promotions) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 26, fontWeight: 800 }}>Yêu cầu hỗ trợ</h2>
          <p style={{ margin: 0, color: "#94a3b8", marginTop: 6 }}>
            Quản lý và phản hồi các yêu cầu từ khách hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={resetHeaderFilters}
          style={{
            background: "#137fec",
            color: "#fff",
            border: "none",
            padding: "0.55rem 0.9rem",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 800,
            height: 40,
            whiteSpace: "nowrap",
          }}
        >
          Tải lại
        </button>
      </div>

      <div style={styles.panel}>
        {/* Tabs */}
        <div style={styles.tabs}>
          {TABS.map((t) => {
            const active = t.key === activeTab;
            return (
              <div
                key={t.key}
                style={styles.tab(active)}
                onClick={() => {
                  setActiveTab(t.key);
                  setPage(1);
                  clearSelection();
                }}
                role="button"
                tabIndex={0}
              >
                {t.label}
                {active && <div style={styles.tabUnderline} />}
              </div>
            );
          })}
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.search}>
            <Icon.Search style={{ color: "#9FB4C8" }} />
            <input
              style={styles.input}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã, khách hàng, nội dung..."
            />
          </div>

          <div style={styles.dateWrap} title="Ngày tiếp nhận">
            <Icon.Calendar style={{ color: "#9FB4C8" }} />
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => {
                setReceivedDate(e.target.value);
                setPage(1);
              }}
              style={styles.dateInput}
            />
          </div>

          <button
            type="button"
            style={styles.btn("default")}
            onClick={() => alert("Mở bộ lọc nâng cao (UI placeholder)")}
          >
            <Icon.Sliders style={{ color: "#9FB4C8" }} />
            Lọc nâng cao
          </button>
        </div>

        {/* Bulk actions */}
        <div style={styles.bulkBar}>
          <div style={styles.bulkLeft}>
            Đã chọn: <b>{selected.size}</b>
          </div>
          <div style={styles.bulkRight}>
            <button type="button" style={styles.btn("primary")} onClick={bulkResolve} disabled={selected.size === 0}>
              Giải quyết
            </button>
            <button type="button" style={styles.btn("default")} onClick={bulkArchive} disabled={selected.size === 0}>
              Lưu trữ
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 44 }}>
                  <input
                    type="checkbox"
                    style={styles.checkbox}
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOnPageSelected && someOnPageSelected;
                    }}
                    onChange={toggleAllOnPage}
                  />
                </th>
                <th style={{ ...styles.th, width: 110 }}>Mã Yêu Cầu</th>
                <th style={styles.th}>Khách hàng</th>
                <th style={styles.th}>Nội dung</th>
                <th style={{ ...styles.th, width: 140 }}>Ngày tiếp nhận</th>
                <th style={{ ...styles.th, width: 130 }}>Trạng thái</th>
                <th style={{ ...styles.th, width: 110 }}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {pageItems.map((t, idx) => (
                <tr
                  key={t.id}
                  style={{
                    ...styles.trHover,
                    background: idx % 2 === 0 ? "rgba(255,255,255,.01)" : "transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(78,161,255,.06)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = idx % 2 === 0 ? "rgba(255,255,255,.01)" : "transparent")
                  }
                >
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={selected.has(t.id)}
                      onChange={() => toggleRow(t.id)}
                    />
                  </td>
                  <td style={styles.td}>#{t.id}</td>
                  <td style={styles.td}>{t.customer}</td>
                  <td style={{ ...styles.td, opacity: 0.95 }}>{t.content}</td>
                  <td style={styles.td}>{t.receivedAt}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(t.status)}>{styles.badge(t.status).text}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="button" style={styles.iconBtn("info")} onClick={() => onEdit(t.id)} title="Sửa">
                        <Icon.Pencil />
                      </button>
                      <button type="button" style={styles.iconBtn("danger")} onClick={() => onDelete(t.id)} title="Xóa">
                        <Icon.Trash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pageItems.length === 0 && (
                <tr>
                  <td style={{ ...styles.td, textAlign: "center", padding: "18px 12px" }} colSpan={7}>
                    <div style={{ fontWeight: 800, color: "#EAF3FF" }}>Không có yêu cầu phù hợp</div>
                    <div style={styles.muted}>Thử đổi tab / từ khóa / ngày tiếp nhận.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer + pagination */}
          <div style={styles.footer}>
            <div style={styles.muted}>
              Showing {total === 0 ? 0 : (safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, total)} of {total}
            </div>

            <div style={styles.pagination}>
              <button
                type="button"
                style={styles.pageBtn(false)}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    style={styles.pageBtn(p === safePage)}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                style={styles.pageBtn(false)}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
