import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAbbreviation(name: string) {
  return name
    .match(/(^\S\S?|\s\S)?/g)
    ?.map((v) => v.trim())
    .join("")
    .match(/(^\S|\S$)?/g)
    ?.join("")
    .toLocaleUpperCase();
}
