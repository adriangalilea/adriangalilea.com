"use client";

import { type RefObject, useEffect, useState } from "react";

/** True from the first moment the element is within a screen of the viewport, and for
 *  good after. What lies at a page's foot (comments, the related grid) asks the server
 *  only for readers who get there. */
export function useNearViewport(ref: RefObject<Element | null>): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) throw new Error("useNearViewport: the ref holds no element");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        observer.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, near]);
  return near;
}
