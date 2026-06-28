"use client";

import type { ReactNode } from "react";

/**
 * On-brand confirmation modal — replaces the browser's native confirm() so destructive actions
 * match the NoirRail surface (same .overlay/.dialog chrome as the Shield/Withdraw dialogs).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="between" style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 15 }}>{title}</strong>
          {danger && <span className="badge red">irreversible</span>}
        </div>

        <div className="help" style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.65 }}>{body}</div>

        <div className="row" style={{ marginTop: 24, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "" : "primary"}`}
            style={
              danger
                ? { borderColor: "rgba(239,111,111,0.5)", color: "var(--red)", background: "rgba(239,111,111,0.08)" }
                : undefined
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
