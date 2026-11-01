"use client"

import * as React from "react"
import GlassFolder, { type ArtRecipe, type FolderFile } from "@/components/ui/glass-folder-cards"

// Your own palettes: any colours, in the order they flow through the field.
const LAGOON: ArtRecipe = {
  style: "marble",
  colors: ["#04121a", "#0b3a4a", "#1f8a8a", "#0a1c22", "#7fd6c2", "#e8fff6"],
  scale: 0.66,
  warp: 3.4,
  angle: 1.2,
  gloss: 0.6,
  veins: 0.4,
}
const SORBET: ArtRecipe = {
  style: "streak",
  colors: ["#fff4ec", "#ffc9b0", "#ff7a59", "#f2b8d8", "#8f7bd6", "#f7f1ff"],
  scale: 0.8,
  warp: 1.8,
  angle: -0.9,
  gloss: 0.22,
}

const NAMES = ["Sketch", "Palette", "Reference", "Draft", "Notes", "Render"]
const KINDS: FolderFile["art"][] = [undefined, "glacier", undefined, LAGOON, undefined, SORBET]

/**
 * Customisation: custom art recipes, every built-in preset, both tones, three
 * sizes, a controlled open state, and an `onAdd` that decides what drops in.
 */
export default function GlassFolderCustomDemo() {
  const [open, setOpen] = React.useState(false)
  const [log, setLog] = React.useState("Pick a file in the open folder")

  return (
    <div
      className="relative flex w-full flex-col items-center justify-center gap-36 overflow-hidden bg-background px-6 py-16"
      style={{ minHeight: "100svh" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-foreground opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1px, transparent 1.3px)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative flex flex-wrap items-end justify-center gap-x-6 gap-y-8">
        <GlassFolder label="Lagoon" art={LAGOON} seed={4} width={264} action="add" />
        <GlassFolder label="Sorbet" art={SORBET} seed={9} width={264} />
        <GlassFolder label="Verdant" meta="Mon 02 Sep" tone="dark" art="verdant" seed={2} width={264} action="more" labelPlacement="top-right" />
        <GlassFolder label="Dusk" tone="dark" art="dusk" seed={5} width={264} />
        <GlassFolder label="Glacier" art="glacier" seed={8} width={264} action="none" />
      </div>

      <div className="relative flex flex-col items-center gap-5">
        <GlassFolder
          label="Studio"
          art="ember"
          seed={21}
          width={420}
          open={open}
          onOpenChange={setOpen}
          files={[{ name: "Sketch 1", art: "dusk" }, { name: "Notes" }]}
          onAdd={(files) => {
            const i = files.length % NAMES.length
            return { name: NAMES[i] + " " + (files.length + 1), meta: KINDS[i] ? "Image" : "Doc", art: KINDS[i] }
          }}
          onFileSelect={(file) => setLog("Opened " + file.name)}
          menu={[]}
        />
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-full border border-border px-3 py-1.5 text-foreground transition-colors hover:bg-foreground/5"
          >
            {open ? "Close" : "Open"} from outside
          </button>
          <span aria-live="polite">{log}</span>
        </div>
      </div>
    </div>
  )
}
