import { createBlockNode } from "../createBlockNode";

export default createBlockNode("crossover", {
  body: (params) => {
    const direction =
      params.direction === "crosses_below" || params.direction === "below"
        ? "Below"
        : "Above";
    return <div className="text-xs text-gray-600">{direction}</div>;
  },
});
