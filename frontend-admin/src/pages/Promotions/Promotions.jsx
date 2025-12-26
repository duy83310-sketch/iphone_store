import { useMemo, useState } from "react";

const STATUS = {
  UPCOMING: "Sắp diễn ra",
  ACTIVE: "Đang áp dụng",
  ENDED: "Đã kết thúc",
};

const statusPillStyle = (status) => {
  if (status === STATUS.ACTIVE) return { bg: "rgba(19,127,236,0.18)", fg: "#6bb6ff", bd: "rgba(19,127,236,0.35)" };
  if (status === STATUS.UPCOMING) return { bg: "rgba(230,162,60,0.18)", fg: "#f2c36b", bd: "rgba(230,162,60,0.35)" };
  return { bg: "rgba(160,170,180,0.16)", fg: "#b9c2cc", bd: "rgba(160,170,180,0.28)" };
};

const IconButton = ({ title, onClick, children, danger }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    style={{
      width: 34,
      height: 34,
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.08)",
      background: danger ? "rgba(255, 74, 74, 0.10)" : "rgba(255,255,255,0.05)",
      color: danger ? "#ff6b6b" : "#9fd0ff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

const SearchIcon = ({ color = "#94a3b8" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path
      d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
      stroke={color}
      strokeWidth="2"
    />
    <path
      d="M16.5 16.5 21 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PencilIcon = ({ color = "#38bdf8" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 20h9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path
      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = ({ color = "#ef4444" }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M8 6V4h8v2" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M19 6l-1 16H6L5 6" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <path d="M10 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M14 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const Modal = ({ title, open, onClose, children, footer }) => {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ width: "min(760px, 95vw)", background: "#0b1115", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 16, color: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", padding: "0.35rem 0.6rem", borderRadius: 8, cursor: "pointer" }}
          >
            Đóng
          </button>
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>

        {footer && <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
};

export default function Promotions() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [typeFilter, setTypeFilter] = useState("Tất cả");

  // modal state (basic placeholders)
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const rows = useMemo(
    () => [
      { id: "p1", name: "Chào hè rực rỡ", code: "SUMMER24", range: "01/06/24 - 31/07/24", condition: "Tất cả sản phẩm", status: STATUS.ENDED, type: "Mã giảm giá" },
      { id: "p2", name: "Flash Sale cuối tuần", code: "WEEKEND10", range: "15/09/24 - 16/09/24", condition: "iPhone 15 Pro Max", status: STATUS.UPCOMING, type: "Mã giảm giá" },
      { id: "p3", name: "Mua 1 tặng 1", code: "BOGO24", range: "10/07/24 - 20/07/24", condition: "Phụ kiện", status: STATUS.ENDED, type: "Combo/Quà tặng" },
      { id: "p4", name: "Khuyến mãi tháng 9", code: "SEPTSALE", range: "01/09/24 - 30/09/24", condition: "Tất cả sản phẩm", status: STATUS.UPCOMING, type: "Mã giảm giá" },
    ],
    []
  );

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return rows.filter((r) => {
      const okQ =
        !keyword ||
        r.name.toLowerCase().includes(keyword) ||
        r.code.toLowerCase().includes(keyword) ||
        r.condition.toLowerCase().includes(keyword);
      const okStatus = statusFilter === "Tất cả" || r.status === statusFilter;
      const okType = typeFilter === "Tất cả" || r.type === typeFilter;
      return okQ && okStatus && okType;
    });
  }, [q, rows, statusFilter, typeFilter]);

  const tableWrapStyle = {
    background: "#0b1115",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
    overflow: "hidden",
  };

  const thStyle = { padding: "0.9rem 0.85rem", color: "#94a3b8", fontSize: "0.85rem", fontWeight: 700 };
  const tdStyle = { padding: "0.9rem 0.85rem", color: "#e5eef7", fontSize: "0.9rem" };

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0 }}>Quản lý khuyến mãi</h2>
          <p style={{ margin: 0, opacity: 0.6, marginTop: 6 }}>Tạo, chỉnh sửa, và theo dõi các chương trình khuyến mãi cho sản phẩm.</p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
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
          Tạo khuyến mãi mới
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0f1724", padding: "0.55rem 0.8rem", borderRadius: 10, border: "1px solid #324d67" }}>
            <SearchIcon />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Chào hè rực rỡ"
              style={{ background: "transparent", border: "none", outline: "none", color: "#fff", width: "100%" }}
            />
          </div>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ background: "#0f1724", color: "#fff", padding: "0.55rem 0.75rem", borderRadius: 10, border: "1px solid #324d67", height: 40 }}
        >
          <option value="Tất cả">Trạng thái</option>
          <option value={STATUS.ACTIVE}>{STATUS.ACTIVE}</option>
          <option value={STATUS.UPCOMING}>{STATUS.UPCOMING}</option>
          <option value={STATUS.ENDED}>{STATUS.ENDED}</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ background: "#0f1724", color: "#fff", padding: "0.55rem 0.75rem", borderRadius: 10, border: "1px solid #324d67", height: 40 }}
        >
          <option value="Tất cả">Loại khuyến mãi</option>
          <option value="Mã giảm giá">Mã giảm giá</option>
          <option value="Combo/Quà tặng">Combo/Quà tặng</option>
        </select>
      </div>

      {/* Table */}
      <div style={tableWrapStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "rgba(255,255,255,0.02)" }}>
              <th style={thStyle}>Tên khuyến mãi</th>
              <th style={thStyle}>Mã giảm giá</th>
              <th style={thStyle}>Thời gian áp dụng</th>
              <th style={thStyle}>Điều kiện</th>
              <th style={thStyle}>Trạng thái</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "1.2rem 0.85rem", color: "#94a3b8" }}>
                  Không có khuyến mãi phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const pill = statusPillStyle(r.status);
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{r.name}</td>
                    <td style={{ ...tdStyle, color: "#8ab7de", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
                      {r.code}
                    </td>
                    <td style={{ ...tdStyle, color: "#cbd5e1" }}>{r.range}</td>
                    <td style={{ ...tdStyle, color: "#cbd5e1" }}>{r.condition}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "0.25rem 0.55rem",
                          borderRadius: 999,
                          border: `1px solid ${pill.bd}`,
                          background: pill.bg,
                          color: pill.fg,
                          fontSize: 12,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 10 }}>
                        <IconButton title="Chỉnh sửa" onClick={() => setEditing(r)}>
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          title="Xóa"
                          danger
                          onClick={() => {
                            // placeholder: wire API later
                            // eslint-disable-next-line no-alert
                            window.confirm(`Xóa khuyến mãi "${r.name}"? (demo)`);
                          }}
                        >
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal (basic placeholder) */}
      <Modal
        title="Tạo khuyến mãi mới"
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", padding: "0.5rem 0.75rem", borderRadius: 10 }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              style={{ background: "#137fec", color: "#fff", border: "none", padding: "0.5rem 0.75rem", borderRadius: 10, fontWeight: 800 }}
            >
              Lưu (demo)
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Tên khuyến mãi</div>
            <input style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }} placeholder="VD: Flash Sale cuối tuần" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Mã giảm giá</div>
            <input style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }} placeholder="VD: WEEKEND10" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Thời gian áp dụng</div>
            <input style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }} placeholder="VD: 15/09/24 - 16/09/24" />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Điều kiện</div>
            <input style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }} placeholder="VD: iPhone 15 Pro Max" />
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
          Ghi chú: Đây là UI demo; bạn nối API create/update/delete sau.
        </div>
      </Modal>

      {/* Edit Modal (basic placeholder) */}
      <Modal
        title="Chỉnh sửa khuyến mãi"
        open={!!editing}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              style={{ background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", padding: "0.5rem 0.75rem", borderRadius: 10 }}
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              style={{ background: "#137fec", color: "#fff", border: "none", padding: "0.5rem 0.75rem", borderRadius: 10, fontWeight: 800 }}
            >
              Lưu (demo)
            </button>
          </>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Tên khuyến mãi</div>
            <input
              defaultValue={editing?.name || ""}
              style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Mã giảm giá</div>
            <input
              defaultValue={editing?.code || ""}
              style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Thời gian áp dụng</div>
            <input
              defaultValue={editing?.range || ""}
              style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Điều kiện</div>
            <input
              defaultValue={editing?.condition || ""}
              style={{ width: "100%", background: "#0f1724", border: "1px solid #324d67", borderRadius: 10, padding: "10px 12px", color: "#fff", outline: "none" }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
