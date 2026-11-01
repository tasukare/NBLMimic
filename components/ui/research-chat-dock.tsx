"use client";

import React, { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface ResearchChatDockProps {
  onSend?: (prompt: string) => void;
  onAudioOverview?: () => void;
  onSummarize?: () => void;
  onClear?: () => void;
  onLiveVoice?: () => void;
  onMicDictate?: () => void;
  onModelChange?: (model: string) => void;
  activeModel?: string;
  isRecording?: boolean;
  className?: string;
}

/**
 * Refactored Research Chat Input Dock
 * Incorporates Aceternity / Opaline Liquid Glass aesthetics while strictly
 * isolating text, buttons, and dropdowns from blur & displacement distortion.
 */
export function ResearchChatDock({
  onSend,
  onAudioOverview,
  onSummarize,
  onClear,
  onLiveVoice,
  onMicDictate,
  onModelChange,
  activeModel = "gemini-3.5-flash-lite",
  isRecording = false,
  className,
}: ResearchChatDockProps) {
  const rawId = useId();
  const filterId = `liquid-dock-filter-${rawId.replace(/[^a-zA-Z0-9-_]/g, "")}`;
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(activeModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSend?.(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={cn(
        "relative z-20 flex w-full flex-col gap-2 p-3 bg-transparent",
        className,
      )}
    >
      {/* ── Inlined SVG Displacement Filter (Zero External File Dependencies) ── */}
      <svg
        className="pointer-events-none absolute -inset-0 h-0 w-0 opacity-0"
        aria-hidden="true"
      >
        <defs>
          <filter
            id={filterId}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04 0.04"
              numOctaves="2"
              result="dockNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="dockNoise"
              scale="14"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
            <feBlend in="SourceGraphic" in2="blurred" mode="overlay" />
          </filter>
        </defs>
      </svg>

      {/* ── 1. Floating Action Bar (Audio Overview, Summarize, Clear) ── */}
      <div className="flex items-center gap-1.5 px-0.5">
        <button
          type="button"
          id="btn-chip-audio-overview"
          onClick={onAudioOverview}
          className="group relative inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-foreground/90 backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/30 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <svg
            className="size-3 text-emerald-500 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <span>Audio Overview</span>
        </button>

        <button
          type="button"
          id="btn-chip-summarize"
          onClick={onSummarize}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-foreground/90 backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/30 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <svg
            className="size-3 text-sky-500 dark:text-sky-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
          <span>Summarize All</span>
        </button>

        <button
          type="button"
          id="btn-chip-clear"
          onClick={onClear}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:bg-white/15 hover:text-foreground active:scale-95 dark:border-white/5 dark:bg-white/5"
        >
          Clear
        </button>
      </div>

      {/* ── 2. Liquid Glass Prompt Capsule ── */}
      <form
        id="chat-composer-form"
        onSubmit={handleSubmit}
        className="group relative flex w-full flex-col rounded-[24px] border border-white/20 bg-white/15 p-2 shadow-2xl transition-all duration-200 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-white/10 dark:bg-neutral-900/50"
        style={{
          backdropFilter: `url(#${filterId}) blur(20px) saturate(1.85)`,
          WebkitBackdropFilter: `url(#${filterId}) blur(20px) saturate(1.85)`,
        }}
      >
        {/* Specular Rim Sheen overlay strictly on outer border */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[24px] bg-gradient-to-b from-white/20 via-transparent to-black/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] dark:from-white/10 dark:to-transparent"
        />

        {/* Main Prompt Row - 100% Vector-Sharp Interior (Isolated Z-Index) */}
        <div className="relative z-10 flex w-full items-center gap-2.5 px-2 pt-1">
          {/* Sparkles Icon */}
          <div
            className="flex size-5 shrink-0 items-center justify-center text-amber-500 dark:text-amber-300"
            title="Gemini Multi-turn Reasoning"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
            </svg>
          </div>

          {/* Crisp Textarea - zero text blur or distortion */}
          <textarea
            id="chat-textarea"
            rows={1}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your sources..."
            className="relative z-10 min-h-[32px] max-h-[120px] w-full resize-none bg-transparent py-1 text-[13.5px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none selection:bg-indigo-500/25"
          />

          {/* Floating Actions */}
          <div className="relative z-10 flex shrink-0 items-center gap-1.5">
            {/* Live Voice Trigger */}
            <button
              type="button"
              id="btn-composer-live-trigger"
              onClick={onLiveVoice}
              title="Launch Gemini Live Real-time Spoken Session"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-foreground transition-all hover:bg-white/20 hover:scale-105 active:scale-95 dark:border-white/15 dark:bg-white/10"
            >
              <svg
                className="size-3.5 text-rose-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>Live</span>
            </button>

            {/* Dictation Mic */}
            <button
              type="button"
              id="btn-composer-mic"
              onClick={onMicDictate}
              title="Dictate prompt with voice"
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-white/15 hover:text-foreground active:scale-95",
                isRecording && "bg-rose-500/20 text-rose-500",
              )}
            >
              <svg
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>

            {/* Send Button */}
            <button
              type="submit"
              id="btn-composer-send"
              title="Send (Enter)"
              className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <svg
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sub-bar: Model Selector & Grounding Indicator */}
        <div className="relative z-10 flex w-full items-center justify-between border-t border-white/10 px-2 pt-1.5 mt-1 text-[10.5px]">
          <select
            id="select-composer-model"
            aria-label="Gemini model selection"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              onModelChange?.(e.target.value);
            }}
            className="h-5 rounded border border-white/15 bg-white/10 px-1.5 text-[11px] font-medium text-foreground/80 outline-none hover:border-white/30 dark:bg-white/5"
          >
            <option value="gemini-3.5-flash-lite">3.5 Flash-Lite (&lt;1s)</option>
            <option value="gemini-3.5-flash">3.5 Flash (1M)</option>
            <option value="gemini-3.8-flash">3.8 Flash (Reasoning)</option>
          </select>

          <span className="text-[10px] tracking-wide text-muted-foreground/75">
            Grounded Citations Active
          </span>
        </div>
      </form>
    </div>
  );
}

export default ResearchChatDock;
