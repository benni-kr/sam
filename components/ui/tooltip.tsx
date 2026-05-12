"use client";

import {
  createElement,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
};

type TooltipPosition = {
  top: number;
  left: number;
};

const TOOLTIP_OFFSET = 10;
const TOOLTIP_MARGIN = 8;

/**
 * Lightweight hover/focus tooltip.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  function updatePosition() {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;

    if (!anchor || !tooltip) {
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const idealLeft = anchorRect.left + anchorRect.width / 2;
    const clampedLeft = Math.min(
      Math.max(idealLeft, TOOLTIP_MARGIN + tooltipRect.width / 2),
      viewportWidth - TOOLTIP_MARGIN - tooltipRect.width / 2,
    );

    const aboveTop = anchorRect.top - tooltipRect.height - TOOLTIP_OFFSET;
    const belowTop = anchorRect.bottom + TOOLTIP_OFFSET;
    const top =
      aboveTop >= TOOLTIP_MARGIN ||
      belowTop + tooltipRect.height <= viewportHeight - TOOLTIP_MARGIN
        ? Math.max(TOOLTIP_MARGIN, aboveTop)
        : Math.max(
            TOOLTIP_MARGIN,
            viewportHeight - TOOLTIP_MARGIN - tooltipRect.height,
          );

    setPosition({
      top,
      left: clampedLeft,
    });
  }

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();

    const handleUpdate = () => updatePosition();

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [isOpen]);

  const child = useMemo(() => {
    if (isValidElement(children)) {
      return children as ReactElement<{
        onMouseEnter?: () => void;
        onMouseLeave?: () => void;
        onFocus?: () => void;
        onBlur?: () => void;
      }>;
    }

    return createElement("span", null, children);
  }, [children]);

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {child}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              className="pointer-events-none fixed z-50 w-max max-w-[18rem] rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] leading-5 text-rose-900 shadow-lg"
              style={
                {
                  top: position?.top ?? 0,
                  left: position?.left ?? 0,
                  transform: "translateX(-50%)",
                  visibility: position ? "visible" : "hidden",
                } as CSSProperties
              }
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
