"use client";

import { useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Hover/focus tooltip on a real button, so it is reachable by keyboard and
 * dismissible with Escape. The bubble is centred by default; pass
 * `align="end"` near the right edge of a container to keep it on screen.
 */
export function InfoTip({
  content,
  label = "More information",
  align = "center",
  side = "top",
  className,
}: {
  content: React.ReactNode;
  label?: string;
  align?: "center" | "start" | "end";
  side?: "top" | "bottom";
  className?: string;
}) {
  // Hover/focus "peek" is tracked separately from a click "pin". Collapsing the
  // two into one flag made a click on a hovered button close the bubble the
  // pointer had just opened, which is every click made with a mouse.
  const [peeking, setPeeking] = useState(false);
  const [pinned, setPinned] = useState(false);
  const id = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  const open = peeking || pinned;

  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPeeking(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setPeeking(false), 80);
  };
  const close = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPeeking(false);
    setPinned(false);
  };

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={close}
        onClick={(event) => {
          event.preventDefault();
          // A click pins the bubble open so it survives the pointer leaving.
          setPinned((prev) => !prev);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-fg-subtle transition hover:text-fg-muted"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          onMouseEnter={show}
          onMouseLeave={hide}
          className={cn(
            "pointer-events-auto absolute z-50 w-[min(16rem,calc(100vw-2rem))] animate-scale-in rounded-md border border-line bg-surface p-3 text-left text-xs font-normal leading-relaxed text-fg-muted shadow-xl",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "start" && "left-0",
            align === "end" && "right-0"
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
