import { useLayoutEffect, useRef, useState } from "react";

/**
 * Measures the grid container so the responsive time scale can track the
 * available viewport height.
 *
 * The weekly grid uses this measurement to convert the fixed timeline into
 * exact pixel values as the browser resizes.
 */
export function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const updateHeight = () => {
      setHeight(element.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, height };
}
