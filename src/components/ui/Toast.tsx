"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CircleAlert,
  CircleCheckBig,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/format";

export type ToastTone = "error" | "warning" | "success" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds on screen. The clock pauses while the stack is hovered. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
  tone: ToastTone;
  duration: number;
}

const DEFAULT_DURATION = 5200;
/** Older toasts drop off the top rather than growing an unbounded column. */
const MAX_VISIBLE = 3;

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Toast host. Renders a portalled, polite-by-default live region above every
 * other layer, including the sheets. Errors are announced assertively.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [paused, setPaused] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const nextId = useRef(1);

  useEffect(() => setPortalReady(true), []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    setToasts((prev) => {
      const record: ToastRecord = {
        ...options,
        id: nextId.current++,
        tone: options.tone ?? "info",
        duration: options.duration ?? DEFAULT_DURATION,
      };
      // Submitting an invalid form twice should restart the same toast rather
      // than stack a duplicate on top of it.
      const withoutDuplicate = prev.filter(
        (item) =>
          item.title !== record.title || item.description !== record.description
      );
      return [...withoutDuplicate, record].slice(-MAX_VISIBLE);
    });
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portalReady &&
        createPortal(
          <div
            role="region"
            aria-label="Notifications"
            className="pointer-events-none fixed inset-x-3 bottom-3 z-[95] flex flex-col items-center gap-2.5 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end"
          >
            <AnimatePresence initial={false}>
              {toasts.map((item) => (
                <ToastItem
                  key={item.id}
                  toast={item}
                  paused={paused}
                  onPause={setPaused}
                  onDismiss={dismiss}
                />
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

const toneStyles: Record<
  ToastTone,
  { icon: LucideIcon; chip: string; bar: string }
> = {
  error: {
    icon: CircleAlert,
    chip: "bg-negative/12 text-negative",
    bar: "bg-negative",
  },
  warning: {
    icon: TriangleAlert,
    chip: "bg-warning/12 text-warning",
    bar: "bg-warning",
  },
  success: {
    icon: CircleCheckBig,
    chip: "bg-positive/12 text-positive",
    bar: "bg-positive",
  },
  info: { icon: Info, chip: "bg-brand/12 text-brand", bar: "bg-brand" },
};

function ToastItem({
  toast,
  paused,
  onPause,
  onDismiss,
}: {
  toast: ToastRecord;
  paused: boolean;
  onPause: (paused: boolean) => void;
  onDismiss: (id: number) => void;
}) {
  const { icon: Icon, chip, bar } = toneStyles[toast.tone];
  const remainingRef = useRef(toast.duration);
  const startedAtRef = useRef(0);

  // Deadline-based countdown: each pause banks the time already elapsed, so
  // hovering holds the toast open for as long as the pointer stays on it.
  useEffect(() => {
    if (paused) return;
    startedAtRef.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAtRef.current;
    };
  }, [paused, onDismiss, toast.id]);

  return (
    <motion.div
      layout
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.16 } }}
      transition={{ type: "spring", damping: 26, stiffness: 320 }}
      // Hovering or focusing any toast holds the whole stack open, so a slow
      // reader never loses the one underneath the cursor.
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocusCapture={() => onPause(true)}
      onBlurCapture={() => onPause(false)}
      className="glass-strong card-sheen pointer-events-auto relative w-full overflow-hidden rounded-lg border border-line shadow-xl sm:w-[22rem]"
    >
      <div className="flex items-start gap-3 p-3.5">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm",
            chip
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-snug text-fg">
            {toast.title}
          </p>
          {toast.description && (
            <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
              {toast.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-subtle transition hover:bg-surface-2 hover:text-fg active:scale-95"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <div
        aria-hidden
        className={cn("h-0.5 w-full origin-left opacity-70", bar)}
        style={{
          animation: `toast-progress ${toast.duration}ms linear forwards`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </motion.div>
  );
}
