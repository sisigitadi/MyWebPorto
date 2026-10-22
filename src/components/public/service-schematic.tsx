"use client";

import React from "react";
import { ServiceData } from "@/lib/dummy-data";

interface ServiceSchematicProps {
  service: ServiceData;
  index: number;
}

interface SchematicConfig {
  code: string;
  badge: string;
  metric: string;
  node1: { label: string; sub: string };
  node2: { label: string; sub: string };
  node3: { label: string; sub: string };
  accentColor: string;
}

function getSchematicConfig(service: ServiceData, index: number): SchematicConfig {
  const key = `${service.title} ${service.titleEn || ""}`.toLowerCase();

  if (key.includes("saas")) {
    return {
      code: "ARCH::SAAS_CORE",
      badge: "MULTI-TENANT",
      metric: "ACID // AUTO-SCALE",
      node1: { label: "AUTH_SVC", sub: "SESSION" },
      node2: { label: "API_GATEWAY", sub: "EVENT_BUS" },
      node3: { label: "DB_VAULT", sub: "TENANT_ISO" },
      accentColor: "#7c5cff",
    };
  }

  if (key.includes("ai") || key.includes("llm") || key.includes("workflow")) {
    return {
      code: "NEURAL::PIPELINE",
      badge: "AGENTIC_AI",
      metric: "VECTOR // RAG_TOPK",
      node1: { label: "PROMPT_IN", sub: "CONTEXT" },
      node2: { label: "RAG_ENGINE", sub: "EMBEDDING" },
      node3: { label: "AGENT_OUT", sub: "TOOL_EXEC" },
      accentColor: "#37ff9b",
    };
  }

  if (key.includes("cyber") || key.includes("security") || key.includes("threat") || key.includes("audit")) {
    return {
      code: "SECOPS::FORTRESS",
      badge: "ZERO-TRUST",
      metric: "TLS_1.3 // WAF_ACTIVE",
      node1: { label: "SURFACE_IN", sub: "TRAFFIC" },
      node2: { label: "WAF_SCANNER", sub: "VULN_CHK" },
      node3: { label: "HARDENED", sub: "ENCRYPTED" },
      accentColor: "#ffd400",
    };
  }

  if (key.includes("seo") || key.includes("kinerja") || key.includes("performance") || key.includes("optimasi")) {
    return {
      code: "PERF::EDGE_ACCEL",
      badge: "CORE_VITALS",
      metric: "SCORE: 100 // LCP < 1.0s",
      node1: { label: "LIGHTHOUSE", sub: "AUDIT" },
      node2: { label: "EDGE_CACHE", sub: "ISR_PURGE" },
      node3: { label: "TOP_RANK", sub: "SERP_IDX" },
      accentColor: "#38bdf8",
    };
  }

  if (key.includes("design") || key.includes("ui/ux") || key.includes("prototyping")) {
    return {
      code: "SPEC::DESIGN_SYS",
      badge: "DESIGN_OPS",
      metric: "ATOMIC // 8PT_GRID",
      node1: { label: "USER_FLOW", sub: "RESEARCH" },
      node2: { label: "FIGMA_TOKENS", sub: "COMPONENTS" },
      node3: { label: "DEV_HANDOFF", sub: "READY" },
      accentColor: "#f43f5e",
    };
  }

  // Default / Web Development
  return {
    code: `STACK::WEB_0${index + 1}`,
    badge: "FULL-STACK",
    metric: "RTT < 50ms // SSR",
    node1: { label: "CLIENT_UI", sub: "HYDRATE" },
    node2: { label: "NEXT_ENGINE", sub: "APP_ROUTE" },
    node3: { label: "EDGE_CDN", sub: "GLOBAL" },
    accentColor: "#3b2fd6",
  };
}

export function ServiceSchematic({ service, index }: ServiceSchematicProps) {
  const config = getSchematicConfig(service, index);

  return (
    <div className="relative w-full overflow-hidden rounded-xs bg-[#060a14] border border-[var(--vt-edge-lo)] shadow-inner text-slate-200 select-none group/schematic">
      {/* CRT Scanline and Vignette Effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] z-10"
        aria-hidden="true"
      />

      {/* Top Header Bar of Schematic CRT */}
      <div className="relative z-20 flex items-center justify-between px-2.5 py-1.5 bg-[#091122] border-b border-slate-800/80 font-mono text-[10px]">
        <div className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: config.accentColor }}
          />
          <span className="font-bold tracking-wider text-slate-300 font-pixel text-[9px]">
            {config.code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 bg-slate-800/80 text-[9px] font-semibold text-slate-400 rounded-xs border border-slate-700/50">
            {config.badge}
          </span>
          <span className="text-[9px] font-mono text-emerald-400 font-medium hidden sm:inline">
            [SYS::OK]
          </span>
        </div>
      </div>

      {/* SVG Diagram Canvas */}
      <div className="relative z-20 px-2 py-3 flex items-center justify-center">
        <svg
          viewBox="0 0 320 62"
          className="w-full h-auto max-h-[80px] drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pulsing Signal Animation */}
            <linearGradient id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor={config.accentColor} />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>

            {/* Arrow Marker */}
            <marker
              id={`arrow-${index}`}
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill={config.accentColor} />
            </marker>
          </defs>

          {/* Background Grid Accent */}
          <line x1="10" y1="31" x2="310" y2="31" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />

          {/* Connection Line 1 -> 2 */}
          <path
            d="M 86 31 L 126 31"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="group-hover/schematic:stroke-emerald-400/80 transition-colors"
            markerEnd={`url(#arrow-${index})`}
          />

          {/* Connection Line 2 -> 3 */}
          <path
            d="M 206 31 L 246 31"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="group-hover/schematic:stroke-emerald-400/80 transition-colors"
            markerEnd={`url(#arrow-${index})`}
          />

          {/* Signal Packet Flow (Animated Dot on hover) */}
          <circle r="2" fill={config.accentColor} className="animate-ping opacity-75">
            <animateMotion
              path="M 86 31 L 126 31"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="2" fill={config.accentColor} className="animate-ping opacity-75">
            <animateMotion
              path="M 206 31 L 246 31"
              dur="2s"
              begin="1s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Node 1: Input */}
          <g transform="translate(10, 11)">
            <rect
              width="76"
              height="40"
              rx="2"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="1"
              className="group-hover/schematic:stroke-slate-500 transition-colors"
            />
            <text x="38" y="18" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
              [IN]
            </text>
            <text x="38" y="27" textAnchor="middle" fill="#f8fafc" fontSize="8" fontFamily="monospace" fontWeight="bold">
              {config.node1.label}
            </text>
            <text x="38" y="35" textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace">
              {config.node1.sub}
            </text>
          </g>

          {/* Node 2: Core Engine / Processing */}
          <g transform="translate(130, 8)">
            <rect
              width="76"
              height="46"
              rx="2"
              fill="#0b1329"
              stroke={config.accentColor}
              strokeWidth="1.2"
              strokeOpacity="0.8"
              className="drop-shadow-[0_0_6px_rgba(59,47,214,0.3)]"
            />
            <rect x="0" y="0" width="76" height="3" fill={config.accentColor} rx="1" />
            <text x="38" y="16" textAnchor="middle" fill={config.accentColor} fontSize="8" fontFamily="monospace" fontWeight="bold">
              [PROCESS]
            </text>
            <text x="38" y="27" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
              {config.node2.label}
            </text>
            <text x="38" y="38" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">
              {config.node2.sub}
            </text>
          </g>

          {/* Node 3: Output */}
          <g transform="translate(250, 11)">
            <rect
              width="76"
              height="40"
              rx="2"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="1"
              className="group-hover/schematic:stroke-slate-500 transition-colors"
            />
            <text x="38" y="18" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
              [OUT]
            </text>
            <text x="38" y="27" textAnchor="middle" fill="#f8fafc" fontSize="8" fontFamily="monospace" fontWeight="bold">
              {config.node3.label}
            </text>
            <text x="38" y="35" textAnchor="middle" fill="#64748b" fontSize="6.5" fontFamily="monospace">
              {config.node3.sub}
            </text>
          </g>
        </svg>
      </div>

      {/* Footer Status Bar of Schematic */}
      <div className="relative z-20 px-2.5 py-1 bg-[#091122]/90 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 bg-slate-600 rounded-full" />
          <span>SPEC // READY</span>
        </span>
        <span className="font-semibold text-slate-300">
          {config.metric}
        </span>
      </div>
    </div>
  );
}
