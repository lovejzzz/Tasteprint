import { useState, useEffect, useRef } from "react";

export function useViewport() {
  const [width, setWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
  const raf = useRef(null);
  useEffect(() => {
    const h = () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("resize", h);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);
  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mql) return;
    const h = (e) => setReducedMotion(e.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, []);
  return { width, mobile: width < 768, reducedMotion };
}
