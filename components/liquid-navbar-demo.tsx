"use client"

import * as React from "react"
import { LiquidNavbar, NimbusIcons, type LiquidNavItem } from "@/components/ui/liquid-navbar"

export function LiquidNavbarDemo() {
  const [activeTab, setActiveTab] = React.useState(0)
  const [tone, setTone] = React.useState<"light" | "dark">("dark")
  const [compact, setCompact] = React.useState(false)
  const [sound, setSound] = React.useState(true)

  const items: LiquidNavItem[] = [
    { label: "Folders", icon: NimbusIcons.folder, fx: "pop", mode: "folders" },
    { label: "Reader View", icon: NimbusIcons.reader, fx: "glow", mode: "reader" },
    { label: "Split View", icon: NimbusIcons.split, fx: "spin", mode: "split" },
    { label: "Native Drive", icon: NimbusIcons.drive, fx: "wave", mode: "preview" },
    { label: "World News · 72h", icon: NimbusIcons.globe, fx: "spin", mode: "news" },
  ]

  return (
    <div className={`relative flex min-h-[500px] w-full flex-col items-center justify-center p-8 transition-colors duration-300 ${tone === "dark" ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-900"}`}>
      {/* Ambient Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: tone === "dark"
            ? "radial-gradient(circle at 50% 40%, rgba(56,189,248,0.15), transparent 70%)"
            : "radial-gradient(circle at 50% 40%, rgba(56,189,248,0.25), transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="z-10 flex flex-col items-center gap-8 max-w-2xl text-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border border-sky-500/20 bg-sky-500/10 text-sky-400 mb-3">
            Nimbus UI · Liquid Waterline
          </span>
          <h2 className="text-2xl font-semibold tracking-tight">Interactive Liquid Waterline Navigation</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Water drop stretches, breaks into satellites on jumps, lifts a meniscus under pointer, and ripples across the pill.
          </p>
        </div>

        {/* Live Liquid Waterline Component */}
        <div className="py-4">
          <LiquidNavbar
            items={items}
            active={activeTab}
            onChange={(idx) => setActiveTab(idx)}
            tone={tone}
            compact={compact}
            sound={sound}
          />
        </div>

        {/* Status Callout */}
        <div className="text-xs font-mono text-zinc-400">
          Active Canvas Mode: <span className="text-sky-400 font-semibold">{items[activeTab]?.label} ({items[activeTab]?.mode})</span>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-zinc-800/50">
          <button
            type="button"
            onClick={() => setTone((t) => (t === "dark" ? "light" : "dark"))}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800 transition"
          >
            Tone: {tone === "dark" ? "Dark Mode" : "Light Mode"}
          </button>
          <button
            type="button"
            onClick={() => setCompact((c) => !c)}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800 transition"
          >
            Layout: {compact ? "Compact (Icon Only)" : "Full (Icon + Text)"}
          </button>
          <button
            type="button"
            onClick={() => setSound((s) => !s)}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium border border-zinc-700/60 bg-zinc-800/40 hover:bg-zinc-800 transition"
          >
            Audio: {sound ? "Soft Water Plip On" : "Muted"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LiquidNavbarDemo
