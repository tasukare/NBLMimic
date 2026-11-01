"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface GlassInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endAdornment?: React.ReactNode;
  inputClassName?: string;
  glowColor?: string;
}

/**
 * Aceternity / Opaline Liquid Glass Input
 * Inlines an SVG displacement filter for liquid refraction along the outer rim,
 * keeping text 100% sharp and readable on the interior.
 */
export const GlassInput = React.forwardRef<HTMLInputElement, GlassInputProps>(
  (
    {
      className,
      inputClassName,
      startIcon,
      endAdornment,
      type = "text",
      ...props
    },
    ref,
  ) => {
    const rawId = useId();
    const filterId = `liquid-glass-filter-${rawId.replace(/[^a-zA-Z0-9-_]/g, "")}`;

    return (
      <div
        className={cn(
          "group relative flex w-full items-center rounded-2xl border border-white/20 bg-white/15 dark:border-white/10 dark:bg-neutral-900/40 shadow-xl transition-all duration-200 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20",
          className,
        )}
        style={{
          backdropFilter: `url(#${filterId}) blur(16px) saturate(1.8)`,
          WebkitBackdropFilter: `url(#${filterId}) blur(16px) saturate(1.8)`,
        }}
      >
        {/* Inlined SVG Displacement Filter - zero external asset dependencies */}
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
                result="liquidNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="liquidNoise"
                scale="12"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feGaussianBlur in="displaced" stdDeviation="0.3" result="blurred" />
              <feBlend in="SourceGraphic" in2="blurred" mode="overlay" />
            </filter>
          </defs>
        </svg>

        {/* Specular Rim Sheen overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 via-transparent to-black/10 dark:from-white/15 dark:to-transparent"
        />

        {/* Start Icon (Isolated, Sharp) */}
        {startIcon && (
          <div className="relative z-10 flex shrink-0 items-center justify-center pl-3.5 pr-1 text-muted-foreground transition-colors group-focus-within:text-foreground">
            {startIcon}
          </div>
        )}

        {/* Crisp Text Input - isolated z-index ensures zero blur / distortion */}
        <input
          ref={ref}
          type={type}
          className={cn(
            "relative z-10 h-11 w-full bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none selection:bg-indigo-500/20",
            !startIcon && "pl-4",
            !endAdornment && "pr-4",
            inputClassName,
          )}
          {...props}
        />

        {/* End Adornment (e.g. keyboard badge, mic, submit button) */}
        {endAdornment && (
          <div className="relative z-10 flex shrink-0 items-center justify-center pr-3 pl-1">
            {endAdornment}
          </div>
        )}
      </div>
    );
  },
);

GlassInput.displayName = "GlassInput";

export default GlassInput;
