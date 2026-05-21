import { createBlockNode } from "../createBlockNode";

export default createBlockNode("exit_signal", {
  body: () => <div className="text-xs text-gray-600">Sell when signal is true</div>,
});
