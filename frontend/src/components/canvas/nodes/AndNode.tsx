import { createBlockNode } from "../createBlockNode";

export default createBlockNode("and", {
  body: () => (
    <div className="text-center text-sm font-mono font-bold text-gray-700">AND</div>
  ),
});
