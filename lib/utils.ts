import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind classes safely with clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  try {
    return twMerge(clsx(inputs))
  } catch {
    return inputs.flat().filter(Boolean).join(" ")
  }
}
