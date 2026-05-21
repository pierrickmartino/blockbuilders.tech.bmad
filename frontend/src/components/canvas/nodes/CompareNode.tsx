import { createBlockNode } from "../createBlockNode";

export default createBlockNode("compare", {
  body: (params) => (
    <div className="text-center text-sm font-mono font-bold text-gray-700">
      {(params.operator as string) || ">"}
    </div>
  ),
});
