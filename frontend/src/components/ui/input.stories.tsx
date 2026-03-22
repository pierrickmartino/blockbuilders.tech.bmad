import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPlaceholder: Story = {
  args: { placeholder: "Enter your email..." },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled input", disabled: true },
};

export const Password: Story = {
  args: { type: "password", placeholder: "Password" },
};

export const Number: Story = {
  args: { type: "number", placeholder: "0" },
};

export const WithValue: Story = {
  args: { defaultValue: "hello@blockbuilders.tech" },
};
