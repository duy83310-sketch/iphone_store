// src/components/common/ConfirmDialog.jsx
import React from "react";
import "./confirm.css";

export default function ConfirmDialog({
  open,
  title = "Xác nhận",
  message,
  confirmText = "Có",
  cancelText = "Không",
  onConfirm,
  onCancel,
  danger = false,
  options = [],
  onOptionSelect
}) {
  if (!open) return null;

  return (
    <div className="confirm-backdrop">
      <div className="confirm-box">
        <h3 className="confirm-title">{title}</h3>

        <p className="confirm-message">{message}</p>

        {Array.isArray(options) && options.length > 0 && (
          <div className="confirm-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
            {options.map((opt, idx) => (
              <button
                key={idx}
                className="btn-confirm"
                onClick={() => onOptionSelect?.(opt)}
                disabled={!!opt.disabled}
                title={opt.title ?? opt.label}
              >
                {opt.label}
              </button>
            ))}
            <button className="btn-cancel" onClick={onCancel}>{cancelText}</button>
          </div>
        )}

        {(!options || options.length === 0) && (
          <div className="confirm-actions">
            <button className="btn-cancel" onClick={onCancel}>{cancelText}</button>
            <button
              className={danger ? "btn-confirm danger" : "btn-confirm"}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
