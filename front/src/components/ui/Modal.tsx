"use client";

import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";


type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClassName?: string; // ex: "max-w-xl"
  hideCloseButton?: boolean;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-2xl",
  hideCloseButton = false,
}: ModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // ✅ id estável e "pure"
  const rid = useId();
  const titleId = `modal-title-${rid}`;

  // ✅ pode calcular aqui sem quebrar hooks
  const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";

  // trava scroll do body enquanto aberto
  useEffect(() => {
    if (!open || !canUseDOM) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, canUseDOM]);

  // fecha no ESC
  useEffect(() => {
    if (!open || !canUseDOM) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, canUseDOM, onClose]);

  // foca no botão fechar ao abrir
  useEffect(() => {
    if (!open || !canUseDOM || hideCloseButton) return;

    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, canUseDOM, hideCloseButton]);

  // ✅ retorno condicional SÓ DEPOIS dos hooks
  if (!open || !canUseDOM) return null;

  const showHeader = Boolean(title) || !hideCloseButton;

  return createPortal(
    <div className="fixed inset-0 z-9999">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      {/* Container */}
      <div className="absolute inset-0 flex items-start justify-center p-4 pt-10">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-label={!title ? "Modal" : undefined}
          className={`
            w-full ${maxWidthClassName}
            rounded-2xl bg-background text-foreground
            shadow-xl border border-border
            overflow-hidden
          `}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {showHeader && (
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              {title ? (
                <div id={titleId} className="font-semibold">
                  {title}
                </div>
              ) : (
                <div />
              )}

              {!hideCloseButton && (
                <button
                  ref={closeBtnRef}
                  type="button"
                  className="rounded-lg px-2 py-1 hover:bg-muted"
                  onClick={onClose}
                  aria-label="Fechar modal"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* ✅ Scroll do conteúdo */}
          <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain p-4">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
