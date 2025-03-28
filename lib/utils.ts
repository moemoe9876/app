// /Users/moe/app/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { // <-- Make SURE 'export' is here
  return twMerge(clsx(inputs));
}