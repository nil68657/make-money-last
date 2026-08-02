"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";
import { searchCities } from "@/lib/cities";
import { cityLabel, cityRegion } from "@/lib/cost-model";
import { cn, flagEmoji } from "@/lib/format";
import { highlightSegments } from "@/lib/text";
import type { CityRecord } from "@/lib/types";
import { InfoTip } from "./ui/InfoTip";

const MAX_RESULTS = 8;

/**
 * Searchable city picker following the ARIA 1.2 combobox pattern:
 * the input owns `role="combobox"` with `aria-expanded` / `aria-controls` /
 * `aria-activedescendant`, and the popup is a `listbox` of `option`s. Selection
 * is driven from the keyboard as well as the pointer.
 */
export function CityCombobox({
  id,
  label,
  hint,
  value,
  onChange,
  tone = "a",
  placeholder = "City, state or country",
}: {
  /** Overrides the generated input id so a parent can focus the field. */
  id?: string;
  label: string;
  hint?: React.ReactNode;
  value: CityRecord | null;
  onChange: (city: CityRecord) => void;
  tone?: "a" | "b";
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => searchCities(query, MAX_RESULTS), [query]);

  // Keep the highlighted row in range as the result set shrinks.
  useEffect(() => {
    setActiveIndex((prev) => (prev >= results.length ? 0 : prev));
  }, [results.length]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setEditing(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  /**
   * Enters search mode with an empty query. Called from both focus and click,
   * because clicking an already-focused field fires no focus event — without
   * this, a second click would leave the field displaying the selected label
   * while `query` stayed empty, and the next keystroke would append to the
   * label instead of starting a new search.
   */
  const beginEditing = () => {
    setOpen(true);
    if (!editing) {
      setEditing(true);
      setQuery("");
    }
  };

  const commit = (city: CityRecord | undefined) => {
    if (!city) return;
    onChange(city);
    setQuery("");
    setOpen(false);
    setEditing(false);
    inputRef.current?.blur();
  };

  /**
   * Closes the popup and puts the selected city back on screen. The label is
   * left selected so that typing replaces it wholesale rather than editing
   * around it — the field keeps focus, so no focus event will do that for us.
   */
  const dismiss = () => {
    setOpen(false);
    setEditing(false);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((prev) => (prev + 1) % Math.max(1, results.length));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(Math.max(0, results.length - 1));
        } else {
          setActiveIndex(
            (prev) => (prev - 1 + results.length) % Math.max(1, results.length)
          );
        }
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(Math.max(0, results.length - 1));
        }
        break;
      case "Enter":
        if (open && results.length > 0) {
          event.preventDefault();
          commit(results[activeIndex]);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          dismiss();
        }
        break;
      case "Tab":
        dismiss();
        break;
      default:
        break;
    }
  };

  const accent = tone === "a" ? "text-city-a" : "text-city-b";
  const ring = tone === "a" ? "focus-within:ring-city-a/15" : "focus-within:ring-city-b/15";
  const borderFocus =
    tone === "a" ? "focus-within:border-city-a" : "focus-within:border-city-b";

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2 flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-fg-muted">
          {label}
        </label>
        {hint && <InfoTip content={hint} align="start" />}
      </div>

      <div
        className={cn(
          "relative flex items-center rounded-md border border-line bg-surface transition duration-200 hover:border-line-strong focus-within:ring-4",
          borderFocus,
          ring
        )}
      >
        <span className={cn("pointer-events-none absolute left-3.5", accent)}>
          {value ? (
            <span className="text-base leading-none" aria-hidden>
              {flagEmoji(value.countryCode)}
            </span>
          ) : (
            <Search className="h-4 w-4" aria-hidden />
          )}
        </span>

        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          type="text"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results.length > 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          // While idle the input holds the selected city, so assistive tech reads
          // a real value rather than a placeholder hint. Focusing clears it so
          // typing replaces the selection instead of editing around it.
          value={editing ? query : value ? cityLabel(value) : ""}
          placeholder={placeholder}
          onChange={(event) => {
            const raw = event.target.value;
            // Typing while the field still displays the selected label means the
            // label was not fully replaced (a stray caret position, say). Keep
            // only what was actually typed so the query never carries the label.
            const label = value ? cityLabel(value) : "";
            const next =
              !editing && label && raw.includes(label)
                ? raw.replace(label, "")
                : raw;
            setQuery(next);
            setEditing(true);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={beginEditing}
          onClick={beginEditing}
          onKeyDown={handleKeyDown}
          className="h-13 w-full min-w-0 flex-1 rounded-md border-0 bg-transparent pl-10 pr-10 text-[15px] font-semibold text-fg outline-none placeholder:font-normal placeholder:text-fg-subtle"
        />

        {editing && query.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 animate-scale-in origin-top overflow-hidden rounded-lg border border-line bg-surface shadow-xl">
          {query.trim().length === 0 && (
            <p className="border-b border-line px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
              Popular destinations
            </p>
          )}

          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="scrollbar-slim max-h-[19rem] overflow-y-auto py-1"
          >
            {results.map((city, index) => {
              const selected = value?.id === city.id;
              const active = index === activeIndex;
              const region = cityRegion(city);
              return (
                <li
                  key={city.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    // Commit before the input's blur can close the popup.
                    event.preventDefault();
                    commit(city);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors duration-100",
                    active ? "bg-surface-2" : "bg-transparent"
                  )}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {flagEmoji(city.countryCode)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      <Highlight text={city.city} query={query} />
                      {region && (
                        <span className="font-medium text-fg-muted">
                          {", "}
                          <Highlight text={region} query={query} />
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                      <Highlight text={city.country} query={query} />
                      <span className="mx-1.5 opacity-40">•</span>
                      {city.currency}
                    </span>
                  </span>

                  <span className="tabular shrink-0 text-right">
                    <span
                      className={cn(
                        "block text-xs font-bold",
                        city.colIndex >= 100 ? "text-negative" : "text-positive"
                      )}
                    >
                      {Math.round(city.colIndex)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">
                      index
                    </span>
                  </span>

                  {selected && (
                    <Check className={cn("h-4 w-4 shrink-0", accent)} aria-hidden />
                  )}
                </li>
              );
            })}

            {results.length === 0 && (
              <li className="px-3.5 py-8 text-center">
                <MapPin
                  className="mx-auto mb-2 h-5 w-5 text-fg-subtle"
                  aria-hidden
                />
                <p className="text-sm font-semibold text-fg">No cities found</p>
                <p className="mt-1 text-xs text-fg-muted">
                  Try a nearby metro, a state or a country name.
                </p>
              </li>
            )}
          </ul>

          <p className="border-t border-line bg-surface-2/60 px-3.5 py-2 text-[11px] text-fg-subtle">
            Index is cost of living, 100 = US average
          </p>
        </div>
      )}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark
            key={index}
            className="rounded-[3px] bg-brand/18 px-0.5 text-brand"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </>
  );
}
