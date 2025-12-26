import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "../common/confirm.css";

export default function AuthModal() {
  const {
    showAuthModal,
    closeModal,
    goLogin,
    goRegister
  } = useContext(AuthContext);

  if (!showAuthModal) return null;

  return (
    <div className="confirm-backdrop" onClick={closeModal}>
      <div
        className="confirm-box"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="confirm-title">Yêu cầu đăng nhập</h3>

        <p className="confirm-message">
          Bạn cần đăng nhập để tiếp tục sử dụng chức năng này.
        </p>

        <div className="confirm-actions">
          {/* Hủy */}
          <button
            className="btn-cancel"
            onClick={closeModal}
          >
            Hủy
          </button>

          {/* Đăng ký */}
          <button
            className="btn-register"
            onClick={goRegister}
          >
            Đăng ký
          </button>

          {/* Đăng nhập */}
          <button
            className="btn-confirm"
            onClick={goLogin}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}
