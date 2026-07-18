import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateRandomToken = (length: number = 8) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    token += characters[randomIndex];
  }
  return token;
};

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export type DateFormatType =
  | "short"
  | "long"
  | "dateTime"
  | "dateTimeLong"
  | "timeOnly"
  | "relative"
  | "input"
  | "iso"
  | "numeric"
  | "custom";

export const formatDate = (
  value: Date | string | null,
  type: DateFormatType = "short",
  customPattern?: string,
): string | null => {
  if (!value) return null;

  const date = typeof value === "string" ? new Date(value) : value;

  switch (type) {
    case "short":
      return format(date, "MMM dd, yyyy");
    case "long":
      return format(date, "MMMM dd, yyyy");
    case "dateTime":
      return format(date, "MMM dd, yyyy HH:mm");
    case "dateTimeLong":
      return format(date, "MMMM dd, yyyy HH:mm");
    case "timeOnly":
      return format(date, "MMM d, HH:mm");
    case "relative":
      return formatDistanceToNow(date, { addSuffix: true });
    case "input":
      return format(date, "yyyy-MM-dd");
    case "iso":
      return date.toISOString();
    case "numeric":
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    case "custom":
      return customPattern ? format(date, customPattern) : format(date, "PPP");
    default:
      return format(date, "MMM dd, yyyy");
  }
};

export function formatTaskTimeLogDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}