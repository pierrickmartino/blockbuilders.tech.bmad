import type { Preview } from "@storybook/react";
import { useEffect, type ReactNode } from "react";
import "../src/app/globals.css";

function ThemeRoot({
  theme,
  children,
}: {
  theme: "light" | "dark";
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return <div className="bg-background text-foreground p-4">{children}</div>;
}

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  globalTypes: {
    theme: {
      description: "Theme mode",
      toolbar: {
        title: "Theme",
        icon: "moon",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === "dark" ? "dark" : "light";
      return (
        <ThemeRoot theme={theme}>
          <Story />
        </ThemeRoot>
      );
    },
  ],
};

export default preview;
