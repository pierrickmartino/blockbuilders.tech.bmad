---
name: Blockbuilders
description: No-code crypto strategy lab for retail traders who build, backtest, and iterate without writing code.
colors:
  precision-blue: "#1975b3"
  cool-white: "#ffffff"
  cool-mist: "#f3f4f6"
  cool-pane: "#ebecf0"
  hairline-gray: "#eef0f2"
  near-black: "#0a0a0a"
  graphite: "#666666"
  error-red: "#dc2828"
  growth-green: "#16a249"
  signal-amber: "#f59f0a"
  sky-blue: "#1773cf"
  block-input: "#9234ea"
  block-indicator: "#3c83f6"
  block-logic: "#db7706"
  block-signal: "#21c45d"
  block-risk: "#dc2828"
  dark-bg: "#0c0c0e"
  dark-surface: "#161618"
  dark-precision-blue: "#59afe8"
typography:
  headline:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  card-pad: "24px"
  card-pad-tight: "12px"
components:
  button-primary:
    backgroundColor: "{colors.precision-blue}"
    textColor: "{colors.cool-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "#1668a1"
    textColor: "{colors.cool-white}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.cool-white}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.body}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.near-black}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    typography: "{typography.body}"
  button-ghost-hover:
    backgroundColor: "{colors.cool-pane}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-flat:
    backgroundColor: "{colors.cool-white}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-pad}"
  card-raised:
    backgroundColor: "{colors.cool-mist}"
    textColor: "{colors.near-black}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-pad}"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.near-black}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
---

# Design System: Blockbuilders

## 1. Overview

**Creative North Star: "The Analytical Lens"**

Blockbuilders is a tool that steps back so the strategy is what you see. Every design decision is filtered through a single question: does this element help the trader understand their strategy, or does it compete with it? The interface carries no decorative weight. Chrome recedes; data surfaces.

The system is cool, structured, and unambiguous. It uses a single blue accent against neutral grays, reserving color for one place that earns it: the canvas, where five semantic block categories speak in their own visual grammar. Outside the canvas, the interface is quiet. Inside the canvas, the structure of a strategy is immediately legible by color alone.

Both light and dark modes are first-class. Light for daytime focused sessions; dark for late-night review. The system follows the user's system preference by default. Neither mode defaults to drama — light mode is steel-white and cool, not clinical; dark mode is near-black slate, not void.

**Key Characteristics:**
- Single teal-blue accent; all other color is semantic or canvas-only
- IBM Plex Sans + IBM Plex Mono: engineered without coldness, precise without intimidation
- Gently curved surfaces (8px); never sharp, never pill-shaped
- Three-stop elevation scale; flat surfaces dominate, shadows are structural
- Dual-mode: light and dark, system-preference driven, both fully specified
- The canvas block taxonomy is the only place five distinct hues coexist

## 2. Colors: The Steel and Signal Palette

A restrained palette of cool neutrals and one deliberate accent. Depth is tonal, not chromatic. Color's expressive work happens exclusively in the canvas block system.

### Primary
- **Precision Blue** (`#1975b3`): All interactive surfaces — primary buttons, active sidebar items, focus rings, chart series lines, link text. The single saturated voice of the interface. Dark-mode variant: `#59afe8`.

### Neutral
- **Cool White** (`#ffffff`): Page background in light mode. Never pure paper-warm; it reads as clean, not sterile.
- **Cool Mist** (`#f3f4f6`): Elevated surfaces — sidebar background, raised cards, secondary panel backgrounds.
- **Cool Pane** (`#ebecf0`): Hover states for ghost buttons and navigation items; accent background.
- **Hairline Gray** (`#eef0f2`): All borders, input strokes, dividers. Low contrast by design; structure without weight.
- **Near Black** (`#0a0a0a`): Primary text in light mode. Warm-neutral, not pure black.
- **Graphite** (`#666666`): Secondary and muted text — descriptions, timestamps, helper text.
- **Midnight Slate** (`#0c0c0e`): Dark mode page background. Very slightly desaturated — not void.
- **Lifted Slate** (`#161618`): Dark mode elevated surfaces — sidebar, raised cards, popovers.

### State
- **Error Red** (`#dc2828`): Destructive actions, form errors, risk canvas blocks. Soft variant (`#fef2f2`) for error banners.
- **Growth Green** (`#16a249`): Positive results, success states, signal canvas blocks. Soft variant (`#f0fdf4`) for success banners.
- **Signal Amber** (`#f59f0a`): Warnings, caution states, logic canvas blocks. Soft variant (`#fffbeb`) for warning banners.
- **Sky Blue** (`#1773cf`): Informational banners. Intentionally distinct from Precision Blue so info banners and primary buttons are visually separable without relying on label text.

### Canvas Block Taxonomy
Five hues used exclusively within the strategy canvas. They form a visual grammar for block categories and never appear in UI chrome.

- **Block Input** (`#9234ea`): Price, Volume input nodes — violet signals "raw data entering the system."
- **Block Indicator** (`#3c83f6`): SMA, EMA, RSI, MACD, Bollinger, ATR — blue signals "mathematical transformation."
- **Block Logic** (`#db7706`): Compare, Crossover, AND, OR, NOT — amber signals "decision logic."
- **Block Signal** (`#21c45d`): Entry Signal, Exit Signal — green signals "action generated."
- **Block Risk** (`#dc2828`): Position Size, Take Profit, Stop Loss — red signals "risk controlled."

### Named Rules
**The Silent Surface Rule.** Background and surface-elevated share the same cool neutral family. Depth is earned by shadow and border, never by a competing hue.

**The Canvas Grammar Rule.** The five block category colors (violet, blue, amber, green, red) are used exclusively on canvas nodes. They never appear as accent colors, link colors, badges, or any UI chrome outside the canvas.

## 3. Typography

**Body Font:** IBM Plex Sans (400, 500, 600, 700), with `ui-sans-serif, system-ui, sans-serif` fallback.
**Data Font:** IBM Plex Mono (400, 500), with `ui-monospace, monospace` fallback.

**Character:** IBM Plex Sans is engineered-humanist — the clarity of a structured sans with just enough warmth to stay approachable. Plex Mono brings that same discipline to numbers, where tabular alignment and legibility are non-negotiable. The pairing is self-consistent: both fonts share IBM's grid-based DNA, so they coexist without fighting.

### Hierarchy
- **Headline** (700, 1.5rem/24px, tracking-tight −0.025em): Page titles and major section headers. Used sparingly — one per view.
- **Title** (600, 1rem/16px, normal tracking): Card titles, dialog headers, sidebar section labels.
- **Body** (400, 0.875rem/14px, normal tracking, 1.5 line-height): All prose, descriptions, form labels, list content. Max line length 65ch.
- **Label** (500, 0.75rem/12px, normal tracking): Badges, chip labels, metadata pairs, table headers. Uppercase only in column headers with generous letter-spacing.
- **Data** (IBM Plex Mono 400, 0.875rem/14px, −0.025em tracking, `tnum` feature): All numeric values — percentages, equity figures, timestamps, backtest metrics. Tabular alignment is required.

### Named Rules
**The Mono Data Rule.** Every numeric value, percentage, P&L figure, date, and timestamp is rendered in IBM Plex Mono with `font-variant-numeric: tabular-nums`. Displaying financial data in proportional type is prohibited.

## 4. Elevation

This system uses a three-stop structural shadow scale. Surfaces are flat at rest; elevation is earned by semantic role, not decoration. The card component codifies this with three explicit variants: `flat`, `raised`, and `overlay`.

Flat cards (default) are distinguished from the page only by their hairline border. They carry no shadow. Raised cards — dashboard tiles, summary panels — lift off the surface with shadow-sm. Overlay surfaces — command palettes, modal dialogs, popovers — use shadow-overlay to communicate their position above the content layer.

In dark mode, shadows are near-invisible (dark-on-dark); tonal separation through surface color (`#161618` vs `#0c0c0e`) does the work instead.

### Shadow Vocabulary
- **Ambient** (`shadow-sm` — `0 1px 2px 0 rgba(10,10,10,0.05)`): Raised cards, subtly lifted tiles.
- **Structural** (`shadow-md` — `0 4px 6px -1px rgba(10,10,10,0.08), 0 2px 4px -2px rgba(10,10,10,0.05)`): Dropdowns, popovers, select menus.
- **Modal** (`shadow-overlay` — `0 20px 25px -5px rgba(10,10,10,0.12), 0 8px 10px -6px rgba(10,10,10,0.08)`): Dialog overlays, command palette.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow is a semantic claim — "this element is above the page." Make that claim only when it's true. If decorating an element with a shadow to make it feel important, reconsider the layout instead.

## 5. Components

### Buttons
Controlled, medium-weight. Never pill-shaped; never sharp-cornered.

- **Shape:** Gently curved (6px radius, `--radius - 2px`)
- **Primary:** Precision Blue background (`#1975b3`), white text, ambient shadow. Hover at 90% opacity (no separate hover color). Height 36px default; 44px on touch targets.
- **Outline:** White background, hairline border (`#eef0f2`), near-black text. Hover lifts to cool-pane (`#ebecf0`) background.
- **Ghost:** Transparent background, near-black text. Hover fills to cool-pane. Used for sidebar navigation items and secondary icon actions.
- **Focus:** 1px solid focus ring in Precision Blue, `outline: none`. Visible on keyboard navigation only (`focus-visible`).
- **Disabled:** 50% opacity, pointer-events disabled. No distinct disabled color.

### Cards / Containers
Cards use a consistent 8px corner radius. Internal padding is 24px (6px tighter for compact contexts). Variants:

- **Flat (default):** White background, hairline border. No shadow. Use for inline content panels.
- **Raised:** Cool Mist background (`#f3f4f6`), hairline border, ambient shadow. Use for dashboard tiles and summary panels that should read "above" the page.
- **Overlay:** White/lifted-slate background, structural shadow. Use for modal-like content embedded in flow.

Nested cards are never correct.

### Inputs / Fields
Stroke-style: transparent background, 1px hairline border, 6px radius, 36px height. Placeholder in Graphite (`#666666`).

- **Focus:** 1px Precision Blue ring; border remains hairline.
- **Error:** Border shifts to Error Red; focus ring shifts to Error Red. No background change — the border shift is the signal.
- **Disabled:** 50% opacity, `not-allowed` cursor.

### Badges
Compact semantic labels (no radius override — uses the default border-radius). Six variants aligned to the state system: `default` (blue), `secondary` (cool-mist), `destructive`, `success`, `warning`, `info`. The `outline` variant is used for neutral tags.

### Navigation (Sidebar)
Left-rail sidebar on `cool-mist` / `lifted-slate` background. Navigation items use the ghost button pattern at full width. Active item: Precision Blue text + subtle cool-pane background tint. Section labels in Label weight (500, 12px).

### Canvas Nodes (Signature Component)
The most visually distinctive component in the system. Each node:
- **Body:** Rounded-md (6px), white/dark-surface background, hairline border in the node's category color at 30% opacity.
- **Category stripe:** A compact header band in the block's category color. Icon + label in white text over the saturated hue.
- **Handles:** 8px circles on left/right edges for connection ports, styled in the category color.
- **Selected state:** Full border at 100% category color opacity, subtle outer glow.
- **Error state:** Border and category stripe shift to Error Red; a small warning icon appears in the header.
- **Compact mode:** Header-only display; block details collapse to a single summary line.

The node's category color is its identity. Do not neutralize it. Do not apply the category color anywhere outside the canvas.

## 6. Do's and Don'ts

### Do:
- **Do** render all numeric values, percentages, and financial figures in IBM Plex Mono with `font-variant-numeric: tabular-nums`.
- **Do** use the five canvas block colors (violet, blue, amber, green, red) exclusively on canvas nodes. Their rarity outside the canvas is what makes them meaningful inside it.
- **Do** apply shadows only on raised cards (`shadow-sm`), floating UI (dropdowns, popovers: `shadow-md`), and modal overlays (`shadow-overlay`).
- **Do** use tinted soft backgrounds (`error-soft`, `success-soft`, `warning-soft`, `info-soft`) for inline alert banners rather than full-saturation state colors.
- **Do** follow the system theme preference (light/dark) rather than forcing either mode. Both are fully specified and first-class.
- **Do** ensure focus states are visible on all interactive elements for keyboard navigation (1px Precision Blue `focus-visible` ring).

### Don't:
- **Don't** use neon, high-chroma, or vibrant accent colors anywhere in the UI chrome. This is not a crypto trading terminal. No glowing borders, no animated color pulses, no gradient overlays. The anti-reference is explicit: Bloomberg terminal chaos and crypto/Web3 neon are both prohibited aesthetics.
- **Don't** use information density as a design value. Bloomberg-style triple-pane layouts and unpadded full-width data tables signal expertise; they produce confusion. Progressive disclosure and generous white space are the tool.
- **Don't** use decorative shadows. A shadow that exists to make something look "more designed" is noise. Shadows communicate layer position only.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored category or state stripe on cards, list items, or alerts. Use background tints or full borders instead.
- **Don't** use gradient text (`background-clip: text` with a gradient). This pattern was explicitly removed from the codebase (Phase 6.2). Use weight or size for emphasis.
- **Don't** render any chart value, metric figure, or timestamp in IBM Plex Sans. Proportional type for financial data is prohibited.
- **Don't** apply block category colors (violet, blue, amber, green, red) to badges, buttons, navigation items, or any surface outside the strategy canvas. Their meaning is spatial, not semantic across the UI.
