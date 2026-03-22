import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)", "../src/**/*.mdx"],
  addons: ["@storybook/addon-docs"],
  framework: "@storybook/nextjs",
  docs: { autodocs: "tag" },
  staticDirs: ["../public"],
};

export default config;
