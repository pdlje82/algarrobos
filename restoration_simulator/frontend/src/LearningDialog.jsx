import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./PlantingExplorer.css";

export function LearningDialog({ labelledBy, describedBy, onDismiss, returnFocusRef, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const opener = returnFocusRef.current;
    dialog.current.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener !== null && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);
  function containFocus(event) {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll("button, a[href], summary, [tabindex]")]
      .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
  return createPortal(
    <dialog ref={dialog} className="planting-explorer" aria-labelledby={labelledBy} aria-describedby={describedBy}
      onKeyDown={containFocus}
      onCancel={event => { event.preventDefault(); onDismiss(); }}
      onClick={event => { if (event.target === event.currentTarget) onDismiss(); }}>
      {children}
    </dialog>, document.body,
  );
}
