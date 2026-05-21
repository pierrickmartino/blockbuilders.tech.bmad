import { createBlockNode } from "../createBlockNode";

export default createBlockNode("entry_signal", {
  body: () => <div className="text-xs text-gray-600">Buy when signal is true</div>,
});
