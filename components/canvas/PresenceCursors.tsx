"use client";

import React from "react";
import { usePresenceStore } from "@/store/presenceStore";

export function PresenceCursors({
  myUserId,
  viewport,
}: {
  myUserId?: string;
  viewport: { x: number; y: number; zoom: number };
}) {
  const collaborators = usePresenceStore((s) => s.collaborators);

  const others = Object.values(collaborators).filter(
    (c) => c.userId && c.userId !== myUserId,
  );

  if (others.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <div
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          inset: 0,
        }}
      >
        {others.map((c) => {
          const hidden = c.x < -1000 || c.y < -1000;
          return (
            <div
              key={c.userId}
              style={{
                position: "absolute",
                left: c.x,
                top: c.y,
                opacity: hidden ? 0 : 1,
                transition: "opacity 80ms linear",
              }}
            >
              <div style={{ transform: "translate(6px, 6px)" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    borderRadius: 10,
                    background: "rgba(13,15,20,0.8)",
                    border: `1px solid ${c.color}55`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: c.color,
                      boxShadow: `0 0 0 3px ${c.color}22`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: "white",
                      fontSize: 11,
                      fontWeight: 600,
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.username}
                  </span>
                </div>
              </div>

              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                style={{ display: "block" }}
              >
                <path
                  d="M3 2 L14 9 L9 10.5 L7 16 Z"
                  fill={c.color}
                  fillOpacity={0.92}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}
