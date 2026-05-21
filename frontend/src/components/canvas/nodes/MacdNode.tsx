import { createBlockNode } from "../createBlockNode";
export default createBlockNode("macd", {
  paramLabels: { fast_period: "Fast", slow_period: "Slow", signal_period: "Signal" },
});
