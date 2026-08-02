"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/format";

/**
 * Both icons are always in the DOM and swapped with `dark:` classes, so the
 * button renders identically on the server and the client — no hydration
 * mismatch and no flash while the theme resolves.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn(
        "group relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-fg-muted transition duration-300 ease-spring hover:border-line-strong hover:text-fg",
        className
      )}
    >
      <Sun
        className="h-4.5 w-4.5 transition duration-300 ease-spring group-hover:rotate-45 dark:hidden"
        aria-hidden
      />
      <Moon
        className="hidden h-4.5 w-4.5 transition duration-300 ease-spring group-hover:-rotate-12 dark:block"
        aria-hidden
      />
    </button>
  );
}
