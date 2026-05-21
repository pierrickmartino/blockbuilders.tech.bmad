import { createBlockNode } from "../createBlockNode";

export default createBlockNode("or", {
  body: () => (
    <div className="text-center text-sm font-mono font-bold text-gray-700">OR</div>
  ),
});
