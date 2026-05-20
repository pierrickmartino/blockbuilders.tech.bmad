export const POSITION_JITTER_PX = 20;

type ScreenPoint = { x: number; y: number };
type FlowPoint = { x: number; y: number };

export function computePaletteInsertPosition(
  screenToFlowPosition: (screenPt: ScreenPoint) => FlowPoint,
  screenCenter: ScreenPoint
): FlowPoint {
  const center = screenToFlowPosition(screenCenter);
  const jitter = () => (Math.random() * 2 - 1) * POSITION_JITTER_PX;
  return { x: center.x + jitter(), y: center.y + jitter() };
}
