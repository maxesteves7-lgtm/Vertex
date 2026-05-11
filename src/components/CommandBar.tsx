"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Action = {
  id: string;
  /** What the user types to trigger this. */
  trigger: string;
  label: string;
  hint?: string;
  run: (router: ReturnType<typeof useRouter>, arg?: string) => void;
  /** If true, action takes a free-text argument after the trigger word */
  takesArg?: boolean;
};

const ACTIONS: Action[] = [
  {
    id: "screener",
    trigger: "s",
    label: "Go to Screener",
    hint: ":s",
    run: (r) => r.push("/"),
  },
  {
    id: "flow",
    trigger: "f",
    label: "Go to Order Flow",
    hint: ":f",
    run: (r) => r.push("/flow"),
  },
  {
    id: "news",
    trigger: "n",
    label: "Go to News",
    hint: ":n",
    run: (r) => r.push("/news"),
  },
  {
    id: "calendar",
    trigger: "c",
    label: "Go to Calendar",
    hint: ":c",
    run: (r) => r.push("/calendar"),
  },
  {
    id: "filter",
    trigger: "filter",
    label: "Filter screener by category",
    hint: ":filter <politics|macro|crypto|ai|sports|weather|culture|health>",
    takesArg: true,
    run: (r, arg) => {
      const map: Record<string, string> = {
        all: "All",
        politics: "Politics",
        macro: "Macro",
        crypto: "Crypto",
        ai: "AI/Tech",
        tech: "AI/Tech",
        sports: "Sports",
        weather: "Weather",
        culture: "Culture",
        health: "Health",
        other: "Other",
      };
      const key = arg?.toLowerCase().trim() ?? "";
      const cat = map[key] ?? "All";
      try {
        localStorage.setItem("predix.category.v1", cat);
      } catch {}
      r.push("/");
      // Force a refresh so the screener re-reads localStorage on mount
      setTimeout(() => location.reload(), 50);
    },
  },
  {
    id: "sort",
    trigger: "sort",
    label: "Sort screener",
    hint: ":sort <volume|spread|liquidity|closes>",
    takesArg: true,
    run: (r, arg) => {
      const allowed = new Set(["volume", "spread", "liquidity", "closes"]);
      const key = arg?.toLowerCase().trim() ?? "volume";
      const final = allowed.has(key) ? key : "volume";
      try {
        localStorage.setItem("predix.sort.v1", final);
      } catch {}
      r.push("/");
      setTimeout(() => location.reload(), 50);
    },
  },
  {
    id: "goto",
    trigger: "g",
    label: "Goto / search market",
    hint: ":g <search text>",
    takesArg: true,
    run: (r, arg) => {
      // Bounce to screener with query — Screener doesn't yet read URL state,
      // so we fall back to writing the search to localStorage and reloading.
      try {
        sessionStorage.setItem("predix.pendingSearch", arg ?? "");
      } catch {}
      r.push("/");
    },
  },
];

/**
 * Bloomberg-style command bar. Press `:` anywhere → overlay opens at top
 * of the page. Type a command, hit Enter to execute, Esc to close.
 */
export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [hoverIdx, setHoverIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  // Global key handler: open on `:` from anywhere outside an input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (open) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === ":" || (e.shiftKey && e.key === ";")) {
        e.preventDefault();
        setOpen(true);
        setInput("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const matches = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return ACTIONS;
    const head = trimmed.split(/\s+/)[0].toLowerCase();
    return ACTIONS.filter(
      (a) =>
        a.trigger.startsWith(head) ||
        a.label.toLowerCase().includes(head),
    );
  }, [input]);

  function close() {
    setOpen(false);
    setInput("");
    setHoverIdx(0);
  }

  function execute(action: Action, arg?: string) {
    close();
    action.run(router, arg);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx((i) => Math.min(matches.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      const parts = trimmed.split(/\s+/);
      const head = parts[0].toLowerCase();
      const rest = parts.slice(1).join(" ");
      // Direct trigger match takes priority over the highlighted suggestion
      const direct = ACTIONS.find((a) => a.trigger === head);
      if (direct) return execute(direct, rest || undefined);
      const pick = matches[hoverIdx];
      if (pick) execute(pick, pick.takesArg ? rest : undefined);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="mx-auto mt-24 w-[640px] max-w-[92vw] bg-[var(--bg-elev)] border border-[var(--accent-primary)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
          <span className="text-[var(--accent-primary)] font-bold">:</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setHoverIdx(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Type a command — try s, f, n, c, filter sports, sort spread, g bitcoin"
            className="flex-1 bg-transparent text-[var(--fg)] placeholder:text-[var(--fg-mute)] focus:outline-none text-sm font-mono"
          />
          <span className="text-[10px] uppercase tracking-wider text-[var(--fg-mute)]">
            ESC to close
          </span>
        </div>

        <ul className="max-h-[320px] overflow-auto">
          {matches.map((a, i) => {
            const active = i === hoverIdx;
            return (
              <li
                key={a.id}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => {
                  const parts = input.trim().split(/\s+/);
                  const rest = parts.slice(1).join(" ");
                  execute(a, a.takesArg ? rest : undefined);
                }}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm border-b border-[var(--border-soft)] ${
                  active
                    ? "bg-[var(--bg-row)] text-[var(--accent-primary)]"
                    : "text-[var(--fg)]"
                }`}
              >
                <span>{a.label}</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--fg-dim)] font-mono">
                  {a.hint}
                </span>
              </li>
            );
          })}
          {matches.length === 0 && (
            <li className="px-3 py-4 text-center text-[var(--fg-dim)] text-xs">
              NO MATCHING COMMAND
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
