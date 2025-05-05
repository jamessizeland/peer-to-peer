// Check if the app is being run from a specified environment, or just return the running environment (dev, prod, test)
import clsx, { ClassValue } from "clsx";
import { default as dayjs } from "dayjs";
import { twMerge } from "tailwind-merge";

type Env = typeof process.env.NODE_ENV;

/**Check if the app is being run from a specified environment, or just return the running environment (dev, prod, test) */
export function checkEnv(): string;
export function checkEnv(type: Env): boolean;
export function checkEnv(type?: Env | undefined) {
  const environment = process.env.NODE_ENV;
  if (type === undefined) return environment as string;
  return process.env.NODE_ENV === type;
}

/**Format a Unix timestamp to a human-readable date string */
export const formatDate = (date: number) =>
  dayjs.unix(date).format("MMM D, YYYY, H:mm:s");

/**Format a Unix timestamp to a human-readable time string */
export const formatTime = (time_s: number) => {
  const seconds = Math.floor(time_s % 60);
  let remainder = Math.floor(time_s / 60);
  const mins = Math.floor(remainder % 60);
  remainder = Math.floor(remainder / 60);
  const hours = Math.floor(remainder % 24);
  const days = Math.floor(remainder / 24);
  return days
    ? `${days}days ${hours}hrs ${mins}mins ${seconds}secs`
    : `${hours}hrs ${mins}mins ${seconds}secs`;
};

/**Combine tailwind-merge and clsx.
 *
 * Makes composition of tailwind classes, on the fly, more predictable.
 */
export function cn(...classes: ClassValue[]) {
  return twMerge(clsx(classes));
}

/**Check if a string is a valid URL */
export const isValidURL = (
  url: string,
  allowedSchemes: string[] = ["http", "https"]
) => {
  try {
    const { protocol } = new URL(url);
    return allowedSchemes.some((scheme) => `${scheme}:` === protocol);
  } catch {
    return false;
  }
};
