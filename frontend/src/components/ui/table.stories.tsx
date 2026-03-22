import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const meta = {
  title: "UI/Table",
  component: Table,
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const trades = [
  { id: 1, pair: "BTC/USDT", side: "Long", entry: "42,150", exit: "43,800", pnl: "+3.91%" },
  { id: 2, pair: "ETH/USDT", side: "Short", entry: "2,280", exit: "2,190", pnl: "+3.95%" },
  { id: 3, pair: "BTC/USDT", side: "Long", entry: "43,900", exit: "43,200", pnl: "-1.59%" },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pair</TableHead>
          <TableHead>Side</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead>Exit</TableHead>
          <TableHead className="text-right">PnL</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => (
          <TableRow key={trade.id}>
            <TableCell className="font-medium">{trade.pair}</TableCell>
            <TableCell>
              <Badge variant={trade.side === "Long" ? "default" : "secondary"}>
                {trade.side}
              </Badge>
            </TableCell>
            <TableCell className="tabular-nums">{trade.entry}</TableCell>
            <TableCell className="tabular-nums">{trade.exit}</TableCell>
            <TableCell
              className={`text-right tabular-nums font-medium ${
                trade.pnl.startsWith("+")
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {trade.pnl}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
