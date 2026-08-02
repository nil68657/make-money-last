"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/format";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Layered overlay used for the assumptions drawer and the detail breakdown.
 * Handles Escape, backdrop click, scroll lock, focus capture and a simple Tab
 * trap. Renders into a portal so it always sits above the sticky header.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  side = "right",
  children,
  footer,
  widthClass = "sm:max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  side?: "right" | "center";
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => setPortalReady(true), []);

  /**
   * Held in a ref so the setup effect below can depend on `open` alone. Callers
   * pass `onClose` as an inline arrow, so depending on its identity re-ran the
   * effect on every parent render — which stole focus out of whichever field
   * the user was typing into, one keystroke in.
   */
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const nodes = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown, true);

    const focusTimer = setTimeout(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (target ?? panelRef.current)?.focus();
    }, 60);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!portalReady) return null;

  const isDrawer = side === "right";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-inverse/45 backdrop-blur-[3px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            tabIndex={-1}
            initial={
              isDrawer ? { x: "100%" } : { opacity: 0, scale: 0.97, y: 12 }
            }
            animate={isDrawer ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isDrawer ? { x: "100%" } : { opacity: 0, scale: 0.97, y: 12 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={cn(
              "relative z-10 flex max-h-full flex-col border-line bg-surface shadow-xl outline-none",
              isDrawer
                ? cn("ml-auto h-full w-full border-l", widthClass)
                : cn(
                    "m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] rounded-xl border sm:w-full",
                    widthClass
                  )
            )}
          >
            <div className="mesh-panel flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-fg">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-sm text-fg-muted">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
              >
                <X className="h-4.5 w-4.5" aria-hidden />
              </button>
            </div>

            <div className="scrollbar-slim flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {children}
            </div>

            {footer && (
              <div className="border-t border-line bg-surface-2/60 px-5 py-4 sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
