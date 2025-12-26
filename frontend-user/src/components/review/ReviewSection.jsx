import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API } from "../../utils/config";
import ConfirmDialog from "../common/ConfirmDialog";
import "../../styles/components/review.css";

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState([]);
  const [filter, setFilter] = useState(null); // null = tất cả
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // form đánh giá
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // =========================
  // Helpers: fetch
  // =========================
  async function fetchReviews(pid, filterStar) {
    let url = `${API}/reviews?productId=${pid}`;
    if (filterStar) url += `&rating=${filterStar}`;
    const res = await fetch(url);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  async function fetchStats(pid) {
    const res = await fetch(`${API}/reviews/stats/${pid}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  // =========================
  // Derived data
  // =========================
  const countsByStar = useMemo(() => {
    const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats.forEach(s => {
      const star = Number(s._id);
      if (result[star] != null) result[star] = s.count;
    });
    return result;
  }, [stats]);

  const totalReviews = useMemo(
    () => Object.values(countsByStar).reduce((a, b) => a + b, 0),
    [countsByStar]
  );

  const averageRating = useMemo(() => {
    if (!totalReviews) return 0;
    const sum = Object.entries(countsByStar).reduce(
      (acc, [star, count]) => acc + Number(star) * count,
      0
    );
    return (sum / totalReviews).toFixed(1);
  }, [countsByStar, totalReviews]);

  function renderStars(starCount) {
    return (
      <>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>{i < starCount ? "★" : "☆"}</span>
        ))}
      </>
    );
  }

  // =========================
  // Fetch reviews + stats
  // =========================
  useEffect(() => {
    if (!productId) return;
    const pid = String(productId);

    setLoading(true);
    Promise.all([
      fetchReviews(pid, filter),
      fetchStats(pid)
    ])
      .then(([reviewsData, statsData]) => {
        setReviews(reviewsData);
        setStats(statsData);
      })
      .catch(err => {
        console.error("Fetch reviews error:", err);
        setReviews([]);
        setStats([]);
      })
      .finally(() => setLoading(false));
  }, [productId, filter]);

  // =========================
  // Highlight review via ?review=id
  // =========================
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get("review");
    if (!highlight) return;

    const t = setTimeout(() => {
      const el = document.getElementById(`review-${highlight}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("highlight");
        setTimeout(() => el.classList.remove("highlight"), 3000);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [reviews, location.search]);

  // =========================
  // Check purchase eligibility + Submit review
  // =========================
  const [canReview, setCanReview] = useState(null); // null = unknown, true/false = known
  const [reviewReason, setReviewReason] = useState(null);
  const [existingReviewId, setExistingReviewId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!productId) return;
    const pid = String(productId);
    const token = localStorage.getItem('token');
    if (!token) {
      setCanReview(false);
      setReviewReason('NOT_LOGGED_IN');
      return;
    }

    let cancelled = false;
    fetch(`${API}/reviews/can-review/${pid}`, {
      headers: { 'x-auth-token': token }
    })
      .then(res => res.json())
      .then(async data => {
        if (cancelled) return;
        setCanReview(Boolean(data.canReview));
        setReviewReason(data.reason ?? null);

        // If user already reviewed, find their review id via /reviews/user
        if (data.reason === 'ALREADY_REVIEWED') {
          try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/reviews/user`, { headers: { 'x-auth-token': token } });
            const userReviews = await res.json();
            if (Array.isArray(userReviews)) {
              const matched = userReviews.find(r => String(r.productId) === String(pid));
              if (matched) setExistingReviewId(String(matched._id));
            }
          } catch (err) {
            console.error('failed to fetch user reviews for existing review id', err);
          }
        }
      })
      .catch(err => {
        console.error('can-review check failed', err);
        if (!cancelled) setCanReview(false);
      });

    return () => { cancelled = true; };
  }, [productId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Bạn cần đăng nhập để đánh giá sản phẩm");
      return;
    }

    if (canReview === false) {
      if (reviewReason === 'ALREADY_REVIEWED') {
        alert('Bạn đã mua và đánh giá sản phẩm này rồi.');
      } else if (reviewReason === 'NOT_PURCHASED') {
        alert('Bạn không có quyền đánh giá sản phẩm này. Chỉ khách hàng đã mua và có đơn đã giao mới được đánh giá.');
      } else {
        alert('Bạn không có quyền đánh giá sản phẩm này.');
      }
      return;
    }

    if (!comment.trim()) {
      alert("Vui lòng nhập nội dung đánh giá");
      return;
    }

    try {
      setSubmitting(true);
      const pid = String(productId);

      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token
        },
        body: JSON.stringify({
          productId: pid,
          rating,
          comment
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.msg || "Gửi đánh giá thất bại");
        return;
      }

      // reset form
      setComment("");
      setRating(5);

      // optimistic update
      if (!filter || filter === rating) {
        setReviews(prev => [data, ...prev]);
      }

      // refresh stats
      const newStats = await fetchStats(pid);
      setStats(newStats);

      setCanReview(false);
      setReviewReason('ALREADY_REVIEWED');

      if (data && data._id) {
        setExistingReviewId(String(data._id));
      }

    } catch (err) {
      console.error("Submit review error:", err);
      alert("Có lỗi xảy ra khi gửi đánh giá");
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // Render
  // =========================
  return (
    <section className="review-section">
      <h2>Đánh giá sản phẩm</h2>

      {/* Tổng quan */}
      <div className="review-summary">
        <div className="review-score">
          <div className="review-score-main">
            <span className="score-number">{averageRating}</span>
            <span className="score-max">/5</span>
          </div>
          <div className="score-stars">
            {renderStars(Math.round(averageRating))}
          </div>
          <div className="score-count">{totalReviews} lượt đánh giá</div>
        </div>

        <div className="review-bars">
          {[5, 4, 3, 2, 1].map(star => {
            const count = countsByStar[star];
            const percent = totalReviews
              ? Math.round((count / totalReviews) * 100)
              : 0;

            return (
              <div className="review-bar-row" key={star}>
                <span className="star-label">{star} sao</span>
                <div className="bar-wrapper">
                  <div className="bar-fill" style={{ width: `${percent}%` }} />
                </div>
                <span className="bar-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter */}
      <div className="review-filters">
        <button
          className={!filter ? "active" : ""}
          onClick={() => setFilter(null)}
        >
          Tất cả
        </button>
        {[5, 4, 3, 2, 1].map(star => (
          <button
            key={star}
            className={filter === star ? "active" : ""}
            onClick={() => setFilter(star)}
          >
            {star} sao
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="review-form">
        <h3>Viết đánh giá</h3>
        {canReview === null && (
          <p style={{ color: '#888' }}>Kiểm tra quyền đánh giá...</p>
        )}

        {canReview === false && reviewReason === 'ALREADY_REVIEWED' && (
          <div style={{ color: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p><strong>✅ Bạn đã mua và đánh giá sản phẩm này rồi.</strong></p>
              <p>Cảm ơn bạn đã chia sẻ trải nghiệm về sản phẩm 🙏</p>
            </div>
            <div>
              <button
                onClick={() => setShowConfirm(true)}
                className="btn-gold"
              >
                Chỉnh sửa đánh giá
              </button>
            </div>
          </div>
        )}

        {canReview === false && reviewReason === 'NOT_PURCHASED' && (
          <div style={{ color: '#ddd' }}>
            <p>
              <strong>Chú ý:</strong> Chỉ khách hàng đã mua và có đơn ở trạng thái <em>ĐÃ GIAO</em> mới được đánh giá sản phẩm.
            </p>
            <p>
              Nếu bạn đã mua hàng nhưng chưa thấy tuỳ chọn đánh giá, vui lòng kiểm tra trạng thái đơn hàng hoặc liên hệ hỗ trợ.
            </p>
          </div>
        )}

        {canReview === false && reviewReason === 'NOT_LOGGED_IN' && (
          <div style={{ color: '#ddd' }}>
            <p>Vui lòng <a href="/login">đăng nhập</a> để kiểm tra quyền đánh giá.</p>
          </div>
        )}

        {canReview === false && !reviewReason && (
          <div style={{ color: '#ddd' }}>
            <p>Không thể kiểm tra quyền đánh giá vào lúc này.</p>
          </div>
        )}

        {canReview === true && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Chọn số sao:</label>
              <select
                value={rating}
                onChange={e => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map(star => (
                  <option key={star} value={star}>
                    {star} sao
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Nội dung đánh giá:</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Sản phẩm dùng ổn không, pin, camera, hiệu năng..."
              />
            </div>

            <button type="submit" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </form>
        )}
      </div>

      {/* List */}
      <div className="review-list">
        {loading && <p>Đang tải đánh giá...</p>}
        {!loading && reviews.length === 0 && <p>Chưa có đánh giá nào.</p>}

        {reviews.map(r => (
          <div key={r._id} id={`review-${r._id}`} className="review-item">
            <div className="review-header">
              <strong>{r.userId?.name || "Người dùng ẩn danh"}</strong>
              <span className="review-stars">
                {renderStars(r.rating)}
              </span>
            </div>
            <p className="review-comment">{r.comment}</p>
            {r.createdAt && (
              <small className="review-date">
                {new Date(r.createdAt).toLocaleDateString("vi-VN")}
              </small>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={showConfirm}
        title="Xác nhận"
        message="Hành động này sẽ chuyển tới trang chỉnh sửa đánh giá. Bạn có muốn tiếp tục không?"
        confirmText="Có"
        cancelText="Không"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);

          if (!existingReviewId) {
            navigate('/profile/reviews');
            return;
          }

          const url = `/profile/reviews?openReview=${encodeURIComponent(existingReviewId)}&fromProduct=${encodeURIComponent(String(productId))}`;
          navigate(url);
          }}
        />
    </section>
  );
}
