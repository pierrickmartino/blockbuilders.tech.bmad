"use client";

import { ReactNode } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface ZoomableChartProps {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
}

export function ZoomableChart({
  children,
  minScale = 0.5,
  maxScale = 3,
}: ZoomableChartProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <TransformWrapper
        initialScale={1}
        minScale={minScale}
        maxScale={maxScale}
        limitToBounds={false}
        panning={{ velocityDisabled: true }}
        wheel={{ step: 0.1 }}
        pinch={{ step: 5 }}
        doubleClick={{ disabled: true }}
        alignmentAnimation={{ disabled: true }}
      >
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
