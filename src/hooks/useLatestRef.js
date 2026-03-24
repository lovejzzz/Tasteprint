import { useRef } from "react";

/**
 * Returns a ref that always holds the latest value.
 *
 * Replaces the common pattern:
 *   const xRef = useRef(x);
 *   xRef.current = x;
 *
 * With:
 *   const xRef = useLatestRef(x);
 *
 * Useful for accessing current state inside callbacks without adding
 * the value to dependency arrays (avoids stale closures).
 */
export function useLatestRef(value) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
