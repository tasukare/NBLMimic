"use client";

import React, { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOutsideClick } from "@/hooks/use-outside-click";

export interface FolderFile {
  name: string;
  meta?: string;
  category?: string;
  source?: string;
  excerpt?: string;
  driveFileId?: string;
}

export interface ActiveFolderData {
  id: string | number;
  label: string;
  meta?: string;
  kicker?: string;
  format?: string;
  tone?: "light" | "dark";
  files?: FolderFile[];
}

export interface ExpandableFolderModalProps {
  activeFolder: ActiveFolderData | null;
  onClose: () => void;
  onSelectFile?: (file: FolderFile, index: number) => void;
  onAddFile?: () => void;
}

/**
 * Expandable Folder Modal Component
 * 
 * Strict Performance & Animation Rules:
 * 1. Wrapped in <AnimatePresence mode="wait"> outside the conditional render.
 * 2. Explicit initial, animate, and exit states:
 *    - initial={{ opacity: 0, scale: 0.95, y: 10 }}
 *    - animate={{ opacity: 1, scale: 1, y: 0 }}
 *    - exit={{ opacity: 0, scale: 0.95, y: 10 }}
 *    - transition={{ duration: 0.2, ease: "easeOut" }}
 * 3. Zero nested layoutId properties to prevent morph snapping/stuttering on exit.
 * 4. High-opacity solid/translucent card (bg-zinc-950/90) with transform-gpu and will-change-transform.
 * 5. Static backdrop overlay strictly isolates backdrop-blur-md without stacking blurs.
 */
export function ExpandableFolderModal({
  activeFolder,
  onClose,
  onSelectFile,
  onAddFile,
}: ExpandableFolderModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (activeFolder) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeFolder, onClose]);

  useOutsideClick(modalRef, () => {
    if (activeFolder) onClose();
  });

  return (
    <>
      {/* ── 1. Static Backdrop Overlay (Composite layer blur) ── */}
      <AnimatePresence mode="wait">
        {activeFolder && (
          <motion.div
            key="folder-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md h-full w-full z-[900] will-change-transform transform-gpu"
          />
        )}
      </AnimatePresence>

      {/* ── 2. Modal Card with Guaranteed Fast Exit Animation ── */}
      <AnimatePresence mode="wait">
        {activeFolder && (
          <div className="fixed inset-0 z-[910] grid place-items-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              key={`folder-modal-card-${activeFolder.id}`}
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto relative w-full max-w-[760px] max-h-[85vh] flex flex-col bg-zinc-950/90 border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl will-change-transform transform-gpu text-white"
            >
              {/* Header Banner */}
              <div className="relative p-6 bg-gradient-to-b from-zinc-900/80 to-zinc-950/40 border-b border-white/10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {activeFolder.format || "Collection"}
                    </span>
                    {activeFolder.meta && (
                      <span className="text-xs text-neutral-400 font-mono">
                        {activeFolder.meta}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
                    {activeFolder.label}
                  </h2>
                  {activeFolder.kicker && (
                    <p className="text-sm text-neutral-400 mt-1">
                      {activeFolder.kicker}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Close folder"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Files / Papers List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
                {activeFolder.files && activeFolder.files.length > 0 ? (
                  activeFolder.files.map((file, idx) => (
                    <div
                      key={`file-${idx}-${file.name}`}
                      onClick={() => onSelectFile?.(file, idx)}
                      className="p-3.5 rounded-xl border border-white/5 hover:border-white/15 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-300 ease-out transform-gpu will-change-transform cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                            {file.category || "File"}
                          </span>
                          <span className="text-sm font-medium text-neutral-200 truncate">
                            {file.name}
                          </span>
                        </div>
                        {file.excerpt && (
                          <p className="text-xs text-neutral-400 line-clamp-2">
                            {file.excerpt}
                          </p>
                        )}
                      </div>
                      {file.meta && (
                        <span className="text-xs font-mono text-neutral-500 whitespace-nowrap">
                          {file.meta}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-neutral-500 text-sm">
                    No documents recorded in this folder yet.
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-zinc-950/80 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {activeFolder.files?.length || 0} document
                  {(activeFolder.files?.length || 0) === 1 ? "" : "s"}
                </span>
                <div className="flex items-center gap-2">
                  {onAddFile && (
                    <button
                      type="button"
                      onClick={onAddFile}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      + Add File
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
export default ExpandableFolderModal;
