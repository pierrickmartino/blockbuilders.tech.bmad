# Storybook Guide

This guide explains how to use and contribute to the Blockbuilders Storybook — the official documentation surface for reusable frontend components.

## Quick start

```bash
cd frontend
npm run storybook
```

Opens at [http://localhost:6006](http://localhost:6006).

## What is documented

Storybook organises components into two categories:

- **UI/** — shadcn/ui primitives (Button, Card, Badge, Input, Tabs, Dialog, Select, DropdownMenu, Table, Tooltip, Skeleton, Sheet)
- **Components/** — Custom shared components (InfoIcon, LowTradeCountWarning, WhatYouLearnedCard, NarrativeCard)

Canvas nodes (`components/canvas/`) are **not** in Storybook. They use custom Tailwind styling and are out of scope for the first release.

## Where things live

| Item | Path |
|---|---|
| Storybook config | `frontend/.storybook/main.ts` |
| Global preview (styles, decorators) | `frontend/.storybook/preview.tsx` |
| Introduction page | `frontend/src/stories/Introduction.mdx` |
| UI component stories | `frontend/src/components/ui/*.stories.tsx` |
| Custom component stories | `frontend/src/components/*.stories.tsx` |

## Writing a new story

### 1. Create the file

Place `ComponentName.stories.tsx` **next to** the component file:

```
src/components/ui/button.tsx
src/components/ui/button.stories.tsx   ← story file
```

### 2. Use CSF3 format

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./my-component";

const meta = {
  title: "UI/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SomeVariant: Story = {
  args: { variant: "secondary" },
};
```

### 3. Add `tags: ["autodocs"]`

This generates an automatic docs page with a prop table and rendered examples.

### 4. Cover key states

For each component, cover where relevant:

- Default state
- All variants (e.g., button variants: default, destructive, outline, etc.)
- Disabled state
- Error / feedback states
- Dark mode (handled automatically by the global decorator)

## Dark mode testing

Use the **Theme** toggle in the Storybook toolbar (moon/sun icon) to switch between light and dark mode. The decorator wraps every story in a `.dark` class container, matching the app's `darkMode: ["class"]` strategy.

## Responsive testing

Use the **Viewport** addon in the Storybook toolbar to preview components at different screen sizes. The standard breakpoints are:

- **sm**: 640px
- **md**: 768px
- **lg**: 1024px

## Design references

All components must align with these authoritative design documents:

- **`docs/design-system.json`** — Tokens (colors, typography, spacing, border-radius, shadows), component specs, layout patterns
- **`docs/design_concept.json`** — Brand identity, design philosophy (clarity over complexity, functional minimalism, progressive disclosure)

Key rules:

- Use semantic CSS variables (`--primary`, `--secondary`, `--muted`, `--destructive`, etc.)
- Never create color values outside the token system
- Follow the typography hierarchy (2xl/bold for page titles, lg/semibold for sections, sm/normal for body)
- Use the 4px spacing scale

## Building for static hosting

```bash
cd frontend
npm run build-storybook
```

Output is generated in `frontend/storybook-static/`. This directory is git-ignored.

## Conventions

- **Keep stories minimal** — cover variants and key states, not every prop combination
- **Use args** for configurable props instead of creating separate stories for every value
- **Follow existing patterns** — look at existing stories before introducing new decorators or patterns
- **Colocate stories** — story files live next to their component, not in a separate directory
- **Use clear titles** — `UI/Button`, `Components/InfoIcon` — easy to find, no over-nesting

## Troubleshooting

### Styles not rendering

Make sure `frontend/.storybook/preview.tsx` imports `../src/app/globals.css`. This brings in all CSS variables and Tailwind directives.

### Module resolution errors

`@storybook/nextjs` reads `tsconfig.json` path aliases automatically. If `@/` imports fail, verify `tsconfig.json` has the correct `paths` configuration.

### Dark mode not toggling

Check that the theme toolbar item is visible. The decorator in `preview.tsx` wraps stories in a `<div className="dark">` container. If the toggle is missing, check `globalTypes` in `preview.tsx`.

### Storybook build fails

Run `npm run build-storybook` to see detailed error output. Common causes:
- Missing dependencies (run `npm install`)
- TypeScript errors in story files
- Invalid MDX syntax in `.mdx` files
