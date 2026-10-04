import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names, letting Tailwind utilities resolve conflicts. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
