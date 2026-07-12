"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Depende só de `open` — não de `onClose`, que costuma ser uma arrow
  // function nova a cada render do chamador. Se entrasse nas deps, esse
  // efeito re-rodava a cada tecla digitada em qualquer campo do modal,
  // e o cleanup abaixo devolvia o foco pro botão que abriu o modal.
  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const focusable = containerRef.current?.querySelector<HTMLElement>(
        "input, select, textarea, button"
      );
      focusable?.focus();
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      cancelAnimationFrame(frame);
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="animate-overlay-in fixed inset-0 cursor-default bg-berinjela/40 backdrop-blur-[2px]"
        tabIndex={-1}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`animate-modal-in relative w-full ${maxWidth} rounded-xl bg-white shadow-modal`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-berinjela">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-neutro-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1.5 -mt-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutro-500 transition-colors duration-150 hover:bg-berinjela-50 hover:text-berinjela"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
