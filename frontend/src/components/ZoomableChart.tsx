"use client";

import { ReactNode, useCallback } from "react";
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from "react-zoom-pan-pinch";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ZoomableChartProps {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetTransform();
      }
    },
    [zoomIn, zoomOut, resetTransform],
  );

  return (
    <div
      className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-md border border-border bg-background/90 p-0.5 shadow-sm backdrop-blur-sm"
      role="toolbar"
      aria-label="Chart zoom controls"
      onKeyDown={handleKeyDown}
    >
      <button
        onClick={() => zoomIn()}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Zoom in"
        title="Zoom in (+)"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => zoomOut()}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Zoom out"
        title="Zoom out (-)"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        onClick={() => resetTransform()}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Reset zoom"
        title="Reset view (0)"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ZoomableChart({
  children,
  minScale = 0.5,
  maxScale = 3,
}: ZoomableChartProps) {
  return (
    <div
      className="relative h-full w-full"
      role="application"
      aria-label="Zoomable chart — use +/- keys to zoom, 0 to reset"
    >
      <TransformWrapper
        initialScale={1}
        minScale={minScale}
        maxScale={maxScale}
        limitToBounds
        panning={{ velocityDisabled: true }}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "reset" }}
        alignmentAnimation={{ disabled: true }}
      >
        <ZoomControls />
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
          }}
          contentStyle={{
            width: "100%",
            height: "100%",
          }}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
