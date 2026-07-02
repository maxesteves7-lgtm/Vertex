"use client";

import { type ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

/**
 * Desktop cockpit shell — three resizable panels.
 *
 *   ┌────────────────────────────┬──────────────────┐
 *   │                            │                  │
 *   │           MAIN             │      DETAIL      │
 *   │     (Scanner or Cards)     │  (selected mkt)  │
 *   │                            │                  │
 *   ├────────────────────────────┤                  │
 *   │                            │                  │
 *   │   BOTTOM STRIP (tabs)      │                  │
 *   │  Movers / Closing / News   │                  │
 *   └────────────────────────────┴──────────────────┘
 *
 * Sizes auto-persist via `autoSaveId` keys (PanelGroup writes to
 * localStorage under `react-resizable-panels:…`).
 */
export function DesktopCockpit({
  main,
  detail,
  bottom,
}: {
  main: ReactNode;
  detail: ReactNode;
  bottom: ReactNode;
}) {
  return (
    <div className="flex-1 min-w-0 min-h-[calc(100vh-48px)]">
      <PanelGroup
        direction="horizontal"
        autoSaveId="futurist.cockpit.h"
      >
        {/* Left/Center column: main on top, bottom strip below */}
        <Panel defaultSize={68} minSize={40}>
          <PanelGroup
            direction="vertical"
            autoSaveId="futurist.cockpit.v"
          >
            <Panel defaultSize={66} minSize={30}>
              <div className="h-full overflow-auto bg-[var(--bg)]">
                {main}
              </div>
            </Panel>
            <ResizeHandle direction="horizontal" />
            <Panel defaultSize={34} minSize={15}>
              <div className="h-full overflow-hidden bg-[var(--bg)] border-t border-[var(--border)]">
                {bottom}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* Right column: inline detail pane */}
        <Panel defaultSize={32} minSize={20}>
          <div className="h-full overflow-auto bg-[var(--bg-elev)] border-l border-[var(--border)]">
            {detail}
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

/**
 * Visible, draggable divider. Subtle by default; lights up Bloomberg
 * orange on hover/drag so the user can feel where the resize edge is.
 */
function ResizeHandle({ direction }: { direction: "horizontal" | "vertical" }) {
  const isVertical = direction === "vertical";
  return (
    <PanelResizeHandle
      className={`group relative bg-[var(--border)] data-[panel-resize-handle-active]:bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] transition-colors ${
        isVertical ? "w-[3px] cursor-col-resize" : "h-[3px] cursor-row-resize"
      }`}
    >
      <span
        className={`absolute opacity-0 group-hover:opacity-100 transition-opacity ${
          isVertical
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-sm bg-[var(--accent-primary)]"
            : "left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 h-1 w-8 rounded-sm bg-[var(--accent-primary)]"
        }`}
      />
    </PanelResizeHandle>
  );
}
