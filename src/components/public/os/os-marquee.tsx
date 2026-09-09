"use client";

import React from "react";

export function OSMarquee() {
  const stackItems = [
    "NEXT.JS 15",
    "REACT 19",
    "TYPESCRIPT",
    "DRIZZLE ORM",
    "POSTGRESQL",
    "TAILWIND CSS",
    "GSAP ANIMATION",
    "CLERK AUTH",
    "TURBOPACK",
    "EDGE READY",
  ];

  const statusItems = [
    "★ AVAILABLE FOR NEW CLIENT PROJECTS",
    "● ULTRA-FAST CORE WEB VITALS",
    "✦ PIXEL-PERFECT RETRO SYSTEM UI",
    "▲ 100% SATISFACTION GUARANTEED",
    "■ ENTERPRISE SECURITY & SPEED",
  ];

  return (
    <div className="w-full bg-[#08090c] border-t-2 border-b-2 border-[var(--vt-edge-lo)] py-2 select-none overflow-hidden space-y-1.5 shadow-inner">
      {/* Top Track: Phosphor Green running left */}
      <div className="flex overflow-hidden">
        <div className="vt-marquee-track flex items-center gap-8 text-[11px] font-pixel text-[var(--vt-crt)]">
          {Array(4)
            .fill(stackItems)
            .flat()
            .map((item, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <span className="text-[#ffd400]">❖</span>
                <span>{item}</span>
              </span>
            ))}
        </div>
      </div>

      {/* Bottom Track: Cyber Pink running reverse (right) */}
      <div className="flex overflow-hidden">
        <div className="vt-marquee-track vt-marquee-rev flex items-center gap-8 text-[11px] font-pixel text-[var(--vt-pink)]">
          {Array(4)
            .fill(statusItems)
            .flat()
            .map((item, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <span className="text-[var(--vt-teal)]">►</span>
                <span>{item}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
