"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useOutsideClick } from "@/hooks/use-outside-click";

export default function ExpandableCardDemo() {
  const [active, setActive] = useState<(typeof cards)[number] | boolean | null>(
    null
  );
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActive(false);
      }
    }

    if (active && typeof active === "object") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  useOutsideClick(ref, () => setActive(null));

  return (
    <>
      {/* ── 1. Static Blur Backdrop Overlay with Explicit Exit Animation ── */}
      <AnimatePresence mode="wait">
        {active && typeof active === "object" && (
          <motion.div
            key={`backdrop-${id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md h-full w-full z-10 will-change-transform transform-gpu"
          />
        )}
      </AnimatePresence>

      {/* ── 2. Modal Card with Explicit Scale + Opacity + Y Exit Transitions (Zero Nested LayoutId Lag) ── */}
      <AnimatePresence mode="wait">
        {active && typeof active === "object" ? (
          <div className="fixed inset-0 grid place-items-center z-[100] pointer-events-none p-4">
            <motion.div
              key={`modal-card-${active.title}-${id}`}
              ref={ref}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto relative w-full max-w-[500px] h-full md:h-fit md:max-h-[90%] flex flex-col bg-zinc-950/90 border border-white/10 sm:rounded-3xl overflow-hidden will-change-transform transform-gpu shadow-2xl"
            >
              <button
                type="button"
                className="flex absolute top-3 right-3 items-center justify-center bg-white/10 hover:bg-white/20 transition-colors rounded-full h-7 w-7 z-20 text-white"
                onClick={() => setActive(null)}
                aria-label="Close modal"
              >
                <CloseIcon />
              </button>

              <div className="w-full h-80 sm:rounded-tr-lg sm:rounded-tl-lg overflow-hidden relative">
                <img
                  width={500}
                  height={320}
                  src={active.src}
                  alt={active.title}
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div>
                <div className="flex justify-between items-start p-4">
                  <div>
                    <h3 className="font-bold text-neutral-100 text-lg">
                      {active.title}
                    </h3>
                    <p className="text-neutral-400 text-sm">
                      {active.description}
                    </p>
                  </div>

                  <a
                    href={active.ctaLink}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 text-sm rounded-full font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    {active.ctaText}
                  </a>
                </div>
                <div className="pt-2 relative px-4 pb-6">
                  <div className="text-neutral-300 text-xs md:text-sm h-40 md:h-fit max-h-60 overflow-y-auto pr-1">
                    {typeof active.content === "function"
                      ? active.content()
                      : active.content}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <ul className="max-w-2xl mx-auto w-full gap-4">
        {cards.map((card) => (
          <li
            key={`card-item-${card.title}-${id}`}
            onClick={() => setActive(card)}
            className="p-4 flex flex-col md:flex-row justify-between items-center hover:bg-neutral-800/60 border border-transparent hover:border-white/10 rounded-xl cursor-pointer transition-all duration-300 ease-out transform-gpu will-change-transform"
          >
            <div className="flex gap-4 flex-col md:flex-row items-center">
              <img
                width={100}
                height={100}
                src={card.src}
                alt={card.title}
                className="h-40 w-40 md:h-14 md:w-14 rounded-lg object-cover object-top"
              />
              <div className="">
                <h3 className="font-medium text-neutral-200 text-center md:text-left text-base">
                  {card.title}
                </h3>
                <p className="text-neutral-400 text-center md:text-left text-sm">
                  {card.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-4 py-2 text-sm rounded-full font-bold bg-neutral-800 hover:bg-blue-600 text-white mt-4 md:mt-0 transition-colors"
            >
              {card.ctaText}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export const CloseIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
};

const cards = [
  {
    description: "Lana Del Rey",
    title: "Summertime Sadness",
    src: "https://assets.aceternity.com/demos/lana-del-rey.jpeg",
    ctaText: "Visit",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Lana Del Rey, an iconic American singer-songwriter, is celebrated for
          her melancholic and cinematic music style. Born Elizabeth Woolridge
          Grant in New York City, she has captivated audiences worldwide with
          her haunting voice and introspective lyrics.
        </p>
      );
    },
  },
  {
    description: "Babbu Maan",
    title: "Mitran Di Chhatri",
    src: "https://assets.aceternity.com/demos/babbu-maan.jpeg",
    ctaText: "Visit",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Babu Maan, a legendary Punjabi singer, is renowned for his soulful
          voice and profound lyrics that resonate deeply with his audience.
        </p>
      );
    },
  },
  {
    description: "Metallica",
    title: "For Whom The Bell Tolls",
    src: "https://assets.aceternity.com/demos/metallica.jpeg",
    ctaText: "Visit",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Metallica, an iconic American heavy metal band formed in 1981, is
          renowned for their powerful musicianship and fast-paced tempos.
        </p>
      );
    },
  },
  {
    description: "Lord Huron",
    title: "The Night We Met",
    src: "https://assets.aceternity.com/demos/the-night-we-met.jpeg",
    ctaText: "Visit",
    ctaLink: "https://ui.aceternity.com/templates",
    content: () => {
      return (
        <p>
          Lord Huron, an American indie rock band based in Los Angeles, is
          acclaimed for their evocative storytelling and nostalgic melodies.
        </p>
      );
    },
  },
];
