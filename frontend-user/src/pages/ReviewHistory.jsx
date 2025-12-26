import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API } from "../utils/config";
import { toast } from "react-toastify";

export default function ReviewHistory() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      setReviews([]);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API}/reviews/user`, { headers: { "x-auth-token": token } });
        if (!res.ok) {
          setReviews([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setReviews(list);

        // If URL contains openReview, open that review's edit modal automatically
        try {
          const params = new URLSearchParams(window.location.search);
          const openReviewId = params.get('openReview');
          if (openReviewId) {
            const found = list.find(r => String(r._id) === String(openReviewId));
            if (found) {
              setSelectedReview(found);
              setEditRating(found.rating || 0);
              setEditComment(found.comment || '');
              setShowEditModal(true);
            }
          }
        } catch (err) {
          console.error('openReview handling failed', err);
        }

      } catch (err) {
        console.error("Load reviews error", err);
        toast.error("Không thể tải lịch sử đánh giá");
        setReviews([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  async function handleEdit() {
    if (!selectedReview || !editRating) {
      toast.error("Vui lòng nhập đánh giá");
      return;
    }

    setProcessing(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/reviews/${selectedReview._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ rating: editRating, comment: editComment })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.msg || "Không thể chỉnh sửa đánh giá");
      }

      const updated = await res.json();
      setReviews(reviews.map(r => r._id === updated._id ? { ...r, rating: updated.rating, comment: updated.comment } : r));
      setShowEditModal(false);
      setSelectedReview(null);
      toast.success("Đánh giá đã được cập nhật");
    } catch (err) {
      console.error("Edit review error", err);
      toast.error(err.message || "Lỗi khi chỉnh sửa đánh giá");
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete(reviewId) {
    if (!window.confirm("Bạn chắc chắn muốn xóa đánh giá này?")) return;

    setProcessing(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { "x-auth-token": token }
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.msg || "Không thể xóa đánh giá");
      }

      setReviews(reviews.filter(r => r._id !== reviewId));
      toast.success("Đánh giá đã bị xóa");
    } catch (err) {
      console.error("Delete review error", err);
      toast.error(err.message || "Lỗi khi xóa đánh giá");
    } finally {
      setProcessing(false);
    }
  }

  if (!user) return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#fff', marginTop: 0 }}>Lịch sử đánh giá</h2>
      <div style={{ background: '#222', padding: 16, borderRadius: 8, color: '#ddd' }}>
        Bạn cần đăng nhập để xem lịch sử đánh giá.
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ color: '#fff', marginTop: 0 }}>Lịch sử đánh giá của bạn</h2>

      <div style={{ marginTop: 12, display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: '#222', borderRadius: 8, padding: 12 }}>
            {loading ? (
              <div style={{ color: '#ddd' }}>Đang tải...</div>
            ) : reviews.length === 0 ? (
              <div style={{ color: '#ddd' }}>Bạn chưa đánh giá sản phẩm nào.</div>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 8 }}>
                {reviews.map(r => (
                  <div key={r._id} style={{ padding: 12, borderBottom: '1px solid #333', display: 'flex', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 8, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      {r.rating}★
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{r.productName || `Sản phẩm ${r.productId || ''}`}</div>
                          <div style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>{new Date(r.createdAt).toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => {
                              if (!r.productId) return navigate("/products");
                              const pid = String(r.productId);
                              navigate(`/products/${encodeURIComponent(pid)}?review=${r._id}`);
                            }}
                            className="btn-gold btn-sm"
                            style={{ cursor: r.productId ? "pointer" : "default", background: "#0a66d1", color: "#fff" }} 
                          >
                            Xem
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReview(r);
                              setEditRating(r.rating);
                              setEditComment(r.comment || "");
                              setShowEditModal(true);
                            }}
                            className="btn-gold btn-sm"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(r._id)}
                            disabled={processing}
                            className="btn-danger btn-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                      <div style={{ color: '#ddd', marginTop: 6, whiteSpace: 'pre-wrap' }}>{r.comment}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside style={{ width: 300 }}>
          <div style={{ background: '#222', borderRadius: 8, padding: 12, color: '#ddd' }}>
            <h4 style={{ marginTop: 0, color: '#fff' }}>Lưu ý khi viết đánh giá</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Viết đánh giá ngắn, hữu ích cho người mua khác.</li>
              <li>Tránh đưa thông tin cá nhân.</li>
              <li>Chỉnh sửa hoặc xóa đánh giá sau khi đăng theo nhu cầu.</li>
            </ul>
          </div>
        </aside>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#222", borderRadius: 8, padding: 20, maxWidth: 500, width: "90%" }}>
            <h3 style={{ marginTop: 0, color: "#fff" }}>Chỉnh sửa đánh giá</h3>

            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#ddd", display: "block", marginBottom: 6 }}>Xếp hạng:</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setEditRating(star)}
                    style={{
                      padding: "8px 12px",
                      background: editRating === star ? "#0a66d1" : "#333",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer"
                    }}
                  >
                    {star}★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ color: "#ddd", display: "block", marginBottom: 6 }}>Bình luận:</label>
              <textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder="Nhập bình luận của bạn..."
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #555", background: "#111", color: "#fff", boxSizing: "border-box", minHeight: 100 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleEdit}
                disabled={processing}
                style={{ flex: 1, padding: "8px 12px", background: "#0a66d1", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                {processing ? "Đang xử lý..." : "Lưu"}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ flex: 1, padding: "8px 12px", background: "#333", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
