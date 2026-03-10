# Brainstorming Report: Canvas Interaction & Block Organization

**Session:** SCAMPER Applied to the Visual Strategy Canvas
**Facilitator:** Carson (Brainstorming Coach)
**Date:** 2026-03-09
**Product:** Blockbuilders — No-Code Crypto Strategy Lab
**Core Question:** What are all the possible ways to organize, display, and interact with trading strategy blocks on a visual canvas so that building a strategy feels as natural as sketching an idea on a whiteboard?

---

## Method: SCAMPER

Each letter of SCAMPER is applied to the canvas itself — its layout paradigm, block representation, connection model, interaction patterns, and information architecture. Minimum 3 ideas per letter, no filtering during divergent phase.

---

## S — Substitute

*What can we replace? What component, material, process, or approach can be swapped for something different?*

### S1. Substitute Wires with Proximity Snapping
Replace explicit wire-drawing with a **magnetic proximity model**. Drag a Compare block near an RSI output and it auto-connects when ports are within a threshold distance. The wire appears automatically. Eliminates the precision problem entirely — especially on mobile where tap-tap is already an improvement but still requires targeting tiny ports.

### S2. Substitute the Flat Canvas with a Pipeline Railroad
Replace the infinite free-form canvas with a **fixed left-to-right rail system** — think subway map. Blocks snap onto a horizontal track in a predefined flow: Data → Indicator → Logic → Signal → Risk. Users place blocks into "stations" on the rail. Connections between adjacent stations are implicit. Removes the chaos of free-form placement while teaching signal flow by default.

### S3. Substitute Block Icons with Live Data Sparklines
Replace static block icons/labels with **real-time mini-charts** embedded in each block. An SMA(20) block doesn't just say "SMA 20" — it shows a tiny sparkline of the actual SMA line overlaid on recent price data for the selected asset. Compare blocks show the two input arrays overlapping with crossover points highlighted. The canvas becomes a living dashboard, not a static diagram.

### S4. Substitute JSON Definition with a Sentence Builder
Replace the block→wire→block paradigm with a **natural language sentence constructor**. Instead of placing blocks, users build sentences: "Enter when [RSI(14)] [crosses below] [30] AND [Price] [crosses above] [EMA(50)]." Each bracketed segment is a droppable slot that maps to a block type. The sentence IS the strategy. Canvas view becomes an optional visualization of the sentence, not the primary authoring surface.

### S5. Substitute the Inspector Panel with Inline Editing
Replace the side-panel Inspector with **direct manipulation on the block itself**. Tap an SMA block and a small inline popover appears right there — slider for period, dropdown for source — no context switch. The canvas never loses focus. Parameters edit where the block lives, not in a disconnected panel.

### S6. Substitute Manual Block Placement with Voice Commands
Replace drag-and-drop with **voice-driven block creation**: "Add an RSI with period 14" → block appears on canvas, auto-connected to the nearest price input. "Connect that to a compare block, less than 30" → done. Hands-free strategy building for accessibility and speed.

---

## C — Combine

*What can we merge? What ideas, steps, or components can be fused together?*

### C1. Combine Block + Connection into "Smart Chains"
Merge block creation and connection into a single action. When you drag an SMA from the library, it doesn't land as an orphan — it arrives **pre-attached** to the most logical upstream block (Price by default). Dragging a Compare block pre-attaches to the nearest indicator output. The user's job shifts from "place then wire" to "place and the wiring is suggested, adjust if wrong."

### C2. Combine Canvas + Backtest Results into a Split View
Merge the strategy editor and results viewer into a **side-by-side live workspace**. Left pane: canvas. Right pane: equity curve + trade markers. Changing a parameter on the left triggers an instant preview refresh on the right (debounced, cached). The gap between "building" and "testing" disappears — iteration becomes a conversation with the data.

### C3. Combine Multiple Entry Signals into a "Signal Mixer" Super-Block
Merge multiple entry conditions into a single **composite block** that visually shows its internal logic. Instead of Entry Signal ← AND ← [Compare, Crossover], show a single "Entry Mixer" block with a mini truth table inside: "RSI < 30 ✓ AND EMA crossover ✓ = ENTER." Reduces node count, makes the entry logic scannable at a glance.

### C4. Combine the Block Palette + Canvas into a Contextual Radial Menu
Merge the bottom-sheet library into the canvas itself. Right-click (or long-press on mobile) anywhere on the canvas → a **radial menu** blooms outward showing block categories as pie segments. Select "Indicator" → inner ring shows available indicators. Select one → it's placed exactly where you clicked, already in context. Zero round-trips to the library.

### C5. Combine Strategy Notes with Block Annotations
Merge floating sticky notes and block-level documentation. Every block gets an optional **annotation badge** — a small speech bubble icon. Tap it to expand inline text explaining *why* that block is there ("RSI below 30 catches oversold bounces in ranging markets"). Annotations travel with the block, not floating loose on the canvas.

### C6. Combine Validation + Guided Prompts into a "Strategy Health Bar"
Merge reactive validation errors with a **proactive completion meter**. A persistent health bar at the top of the canvas shows: "Entry ✓ | Exit ✗ | Risk ⚠️ — Your strategy needs an exit condition." Clicking a section scrolls to the relevant area and opens a contextual prompt: "Most strategies use a Stop Loss or Exit Signal. Want to add one?" Validation becomes a coach, not a cop.

---

## A — Adapt

*What can we borrow from elsewhere? What existing solution from another domain can we adapt?*

### A1. Adapt from Music Production: The "Mixer Channel" Layout
Borrow from DAWs (Ableton, Logic Pro). Instead of a free-form graph, present the strategy as **vertical channels on a mixer board**. Channel 1: Price data. Channel 2: SMA indicator. Channel 3: RSI indicator. Channel 4: Logic (Compare). Channel 5: Entry Signal. Each channel has knobs (parameters) and a "send" routing section (connections). Musicians understand signal flow intuitively — traders could too.

### A2. Adapt from Spreadsheets: The "Formula Bar" Paradigm
Borrow from Excel/Sheets. Each signal block has a **formula bar** at the top: `=AND(CROSSOVER(EMA(12), EMA(26)), RSI(14) < 30)`. Users can type or click to build. The canvas is a visual representation of the formula, auto-generated and kept in sync. Power users type formulas directly; beginners use the visual canvas — same underlying model.

### A3. Adapt from Scratch/Blockly: Snap-Together Jigsaw Pieces
Borrow from MIT Scratch. Instead of circles/rectangles with wire ports, blocks have **jigsaw edges** — shaped connectors that only fit compatible types. A boolean output has a hexagonal tab; a numeric output has a round tab. Incompatible connections literally don't fit. Prevents invalid wiring at the interaction level, not the validation level.

### A4. Adapt from Figma: "Auto-Layout" with Named Layers
Borrow Figma's auto-layout frames. Blocks automatically arrange into **named sections** (layers): "Data Sources," "Indicators," "Entry Logic," "Exit Logic," "Risk Management." Drag a block between sections to reclassify it. The canvas self-organizes while still allowing manual override. The section names teach the strategy anatomy.

### A5. Adapt from Board Games: "Slot-Based" Strategy Board
Borrow from board games with designated spaces. Present a **strategy board** with labeled slots: "Asset [___]" → "Indicator 1 [___]" → "Indicator 2 [___]" → "When to Enter [___]" → "When to Exit [___]" → "Risk [___]". Users drag blocks into slots. Limited slots = limited complexity = less overwhelm. Advanced mode unlocks more slots.

### A6. Adapt from Comic Strips: "Storyboard" Flow
Borrow from storyboarding. Each "panel" is a step in the strategy story: Panel 1 shows the market data. Panel 2 shows the indicator transforming data. Panel 3 shows the logic evaluating conditions. Panel 4 shows the entry trigger. Panel 5 shows the exit/risk rules. The strategy reads left-to-right like a narrative, with visual connectors between panels.

---

## M — Modify / Magnify / Minimize

*What can we enlarge, shrink, exaggerate, or change in scale or emphasis?*

### M1. Magnify the "Story" — Full Narrative Mode
Amplify the strategy explanation generator into a **primary view mode**. Instead of blocks-first, show the plain-English narrative front and center: "This strategy watches BTC/USDT on the daily chart. When the 14-period RSI drops below 30 AND price crosses above the 50-day EMA, it enters a long position with 80% of equity. It exits when..." Each sentence is clickable — tap to highlight the corresponding blocks on the canvas. The story IS the strategy; the canvas is the diagram supporting it.

### M2. Minimize Block Count — "Recipe Cards" for Common Patterns
Shrink multi-block patterns into **single recipe cards**. "RSI Oversold Bounce" = Price → RSI(14) → Compare(< 30) → Entry Signal, packaged as one draggable unit. The user sees one card, not four blocks. Expanding the card reveals the constituent blocks for customization. The library becomes a recipe book, not a parts catalog.

### M3. Magnify Visual Feedback — "Traffic Light" Blocks
Exaggerate the live state of each block. During a backtest preview, blocks glow: 🟢 green when their condition is true on the latest candle, 🔴 red when false, ⚪ gray when not yet evaluated. The canvas becomes a **real-time scoreboard** — users can see exactly which conditions are firing and which aren't, at a glance.

### M4. Minimize Cognitive Load — "Progressive Disclosure Canvas"
Start the canvas in **ultra-simple mode**: just three mega-zones visible — "When to Buy" | "When to Sell" | "Risk Rules." Each zone is a single droppable area. Drop an indicator pattern in "When to Buy," and it expands to show the individual blocks only when you tap into it. Zoomed out = three boxes. Zoomed in = full block detail. The canvas has "levels of magnification" for complexity.

### M5. Magnify Connections — Animated Data Flow
Exaggerate the wires into **animated data streams**. Tiny dots flow along connections showing the direction of data movement — like packet animations in network diagrams. When a signal fires, a bright pulse travels the full path from data source to entry signal. Users can literally watch their strategy "think."

### M6. Minimize the Canvas — "Card Stack" Mobile View
On mobile, shrink the canvas into a **vertical card stack**. Each block is a card. Swipe through cards in flow order. Connections are implicit (card order = signal flow). Tap a card to edit parameters inline. The canvas disappears entirely on small screens — replaced by a scrollable, linear list that preserves the logic.

### M7. Modify Block Shape to Encode Category
Change block shapes by category instead of using uniform rectangles. **Inputs** = circles (data sources). **Indicators** = rounded rectangles (transforms). **Logic** = diamonds (decisions). **Signals** = arrows (triggers). **Risk** = shields (protection). The shape language communicates function before you read the label.

---

## P — Put to Other Uses

*What else can the canvas be used for? Can the same structure serve a different purpose?*

### P1. Put the Canvas to Use as a Teaching Tool
The same canvas that builds strategies can **teach trading concepts**. "Tutorial Mode" walks users through building a specific strategy step by step, with ghost blocks showing where to place the next piece. Each step includes a lesson: "This is an RSI indicator. It measures momentum on a scale of 0-100. Values below 30 suggest the asset is oversold..." The canvas becomes an interactive textbook.

### P2. Put the Canvas to Use as a Debugging / Replay Tool
After a backtest, the canvas becomes a **step-through debugger**. A timeline scrubber at the bottom lets you advance candle by candle. At each candle, every block shows its computed value: RSI = 28.4, Compare(< 30) = TRUE, Entry Signal = ACTIVE. Users replay their strategy's decisions in slow motion. This directly bridges the "gap between blocks and what the backtest does."

### P3. Put the Canvas to Use as a Comparison Tool
Place **two strategies side-by-side** on the same canvas (split view or stacked). Shared blocks are highlighted. Differences are color-coded. "Strategy A uses RSI(14), Strategy B uses RSI(21) — everything else is identical." Canvas becomes a diff viewer for strategy versions or competitor strategies.

### P4. Put the Canvas to Use as a Collaboration Surface
Two users looking at the same canvas in real time — **multiplayer strategy building**. Cursor presence indicators, shared annotations, live block placement. One user handles entry logic, the other handles risk management. The canvas becomes a shared whiteboard for strategy co-design.

### P5. Put Block Connections to Use as a Decision Journal
The connection wires aren't just plumbing — they're **a record of reasoning**. Each connection can carry an annotation: "I'm feeding RSI into the entry signal because oversold bounces have worked well on BTC historically." The wiring diagram doubles as a decision journal that explains the strategy's rationale.

---

## E — Eliminate

*What can we remove entirely? What's unnecessary or adds complexity without proportional value?*

### E1. Eliminate Explicit Connections Entirely
Remove wires. Use **implicit flow based on block order and type**. Place an RSI block after a Price block — connection is automatic (RSI needs price data, Price provides it). Place a Compare after RSI — auto-connected. The system infers the topology from block sequence and type compatibility. Users arrange blocks; the system does the plumbing.

### E2. Eliminate the Block Palette / Library
Remove the separate block library UI entirely. Instead, use an **empty slot system** — the canvas starts with labeled empty slots: "[Data Source] → [Indicator] → [Condition] → [Entry Signal]". Tapping an empty slot shows only the blocks that are valid for that slot. No browsing a library; the canvas itself tells you what's needed next.

### E3. Eliminate the Canvas for Beginners
For new users, remove the canvas entirely. Replace it with a **questionnaire flow** (an evolution of the current wizard, but as the primary experience, not just onboarding). "What market condition triggers your entry? → Oversold / Trend following / Breakout / Custom." Each answer generates blocks behind the scenes. The canvas exists as an "advanced view" you can open if you want. The strategy is the answers, not the diagram.

### E4. Eliminate Multi-Block Logic Chains
Remove the need for separate AND/OR/NOT logic blocks. Instead, **build logic into the signal blocks themselves**. The Entry Signal block has a built-in condition list: "Enter when ALL of these are true: [Condition 1 ▼] [Condition 2 ▼] [Condition 3 ▼]." Toggle between ALL (AND) and ANY (OR). The logic is embedded, not wired. Cuts block count by removing the most confusing category.

### E5. Eliminate Parameter Ranges — Use Semantic Presets Only
Remove numeric parameter inputs for beginners. Replace with **named presets only**: RSI offers "Short-term momentum (7)" / "Standard (14)" / "Long-term trend (21)." SMA offers "Fast (10)" / "Medium (50)" / "Slow (200)." Advanced mode re-enables numeric sliders. Eliminates "what number should I pick?" paralysis for beginners.

### E6. Eliminate Free-Form Placement
Remove the ability to place blocks anywhere. Every block auto-places into a **structured grid** based on its category and connection order. Users only choose WHICH blocks to add — the WHERE is handled automatically. Drag-to-rearrange within a section is allowed, but no block ever floats in empty space. Chaotic layouts become impossible.

---

## R — Reverse / Rearrange

*What if we flip the order, reverse the process, or rearrange the sequence?*

### R1. Reverse: Start from the Exit, Not the Entry
Flip the canvas flow. Instead of "What triggers entry?", start with: **"How do you protect your money?"** — Stop Loss, Take Profit, Position Size first. Then "When do you exit?" Then finally "When do you enter?" Building risk-first teaches proper trading habits and ensures no strategy is ever built without exit conditions. The canvas flows right-to-left or bottom-to-top.

### R2. Reverse: Build from a Backtest Result Backward
Start with an **ideal equity curve** and reverse-engineer. "I want a strategy that would have produced 40% return on BTC in 2024 with max 15% drawdown." The system suggests indicator + logic combinations that approximate those results. User selects from suggestions, landing on a canvas pre-populated with blocks. Strategy building starts from desired outcomes, not from indicator selection.

### R3. Rearrange: Vertical Flow Instead of Horizontal
Flip the default layout from left→right to **top→bottom**. Data sources at the top (like water flowing downhill). Indicators transform the data as it flows down. Logic filters it. Signals collect at the bottom. Risk rules sit on the sides like guardrails. The "waterfall" metaphor is more intuitive than a horizontal pipeline for many users — data "flows down" through transformations.

### R4. Reverse: Let the Canvas Build Itself from Plain Text
Flip the authoring direction. User types: "Buy BTC when RSI drops below 30 and price is above the 200-day moving average. Sell when RSI goes above 70. Use a 5% stop loss." The system **generates the entire canvas** — blocks, connections, parameters, layout — from the text description. User reviews and tweaks the visual result. Text-first, canvas-second.

### R5. Rearrange: Non-Linear "Mind Map" Layout
Replace the linear pipeline with a **mind map**. The Entry Signal block is at the center. Conditions radiate outward like branches. Data sources are at the leaf nodes. The strategy reads from outside-in: "What data? → How transformed? → What conditions? → ENTER." Exit logic is a separate mind map cluster. The radial layout emphasizes the signal as the center of gravity, not the data.

### R6. Reverse: Start with Someone Else's Strategy, Then Modify
Flip from blank-canvas creation to **clone-and-customize**. The primary creation path isn't building from scratch — it's browsing the template marketplace, cloning a strategy, and opening it on the canvas with a guided "remix" experience: "This template uses RSI(14). Want to try a different period? What about adding a moving average filter?" Original creation becomes the advanced path.

### R7. Rearrange: Time-Based Canvas Layers
Instead of one flat canvas, use **temporal layers**. Layer 1: "Setup" conditions (long-term indicators like SMA 200). Layer 2: "Trigger" conditions (short-term signals like RSI crossover). Layer 3: "Execution" rules (position size, stop loss). Users switch between layers like Photoshop layers. Each layer has fewer blocks, reducing visual complexity while maintaining full strategy depth.

---

## Idea Summary — Raw Count

| Letter | Ideas |
|--------|-------|
| **S** — Substitute | 6 |
| **C** — Combine | 6 |
| **A** — Adapt | 6 |
| **M** — Modify/Magnify/Minimize | 7 |
| **P** — Put to Other Uses | 5 |
| **E** — Eliminate | 6 |
| **R** — Reverse/Rearrange | 7 |
| **Total** | **43 ideas** |

---

## Thematic Clusters

After generating, ideas naturally cluster into recurring themes:

### Theme 1: "Kill the Wires" (Connection Simplification)
S1 (Proximity Snapping), C1 (Smart Chains), A3 (Jigsaw Pieces), E1 (Implicit Flow), E4 (Logic in Signal Blocks)
**Insight:** The wire-drawing paradigm is the single biggest friction point. Nearly every SCAMPER letter generated at least one idea to reduce or eliminate explicit wiring.

### Theme 2: "Structure Over Freedom" (Guided Layout)
S2 (Pipeline Railroad), A4 (Auto-Layout Layers), A5 (Slot-Based Board), E2 (Empty Slot System), E6 (Structured Grid), R3 (Vertical Flow), R7 (Time-Based Layers)
**Insight:** Free-form placement is the power-user dream and the beginner's nightmare. There's strong signal that a constrained, structured layout — with the option to "unlock" free-form — would dramatically reduce overwhelm.

### Theme 3: "Narrative First" (Story-Driven Strategy Building)
S4 (Sentence Builder), A6 (Storyboard Flow), M1 (Full Narrative Mode), R4 (Text-to-Canvas), E3 (Questionnaire Instead of Canvas)
**Insight:** The strongest ideas treat the strategy as a story to be told, not a graph to be assembled. The canvas should be a visualization of intent, not the primary authoring surface.

### Theme 4: "Show, Don't Diagram" (Live Visual Feedback)
S3 (Live Sparklines), C2 (Split Canvas + Results), M3 (Traffic Light Blocks), M5 (Animated Data Flow), P2 (Debugger Replay)
**Insight:** The canvas is currently static until you run a backtest. Adding live or near-live data visualization directly onto blocks could collapse the build → test → understand cycle into a single continuous experience.

### Theme 5: "Reduce to Essentials" (Progressive Complexity)
M2 (Recipe Cards), M4 (Progressive Disclosure Canvas), M6 (Card Stack Mobile), E5 (Semantic Presets Only), R6 (Clone-and-Customize Default)
**Insight:** Beginners don't need 20 block types, explicit logic gates, and numeric parameter inputs. A layered approach — simple defaults with progressive reveals — addresses power users and beginners with the same underlying system.

### Theme 6: "Canvas as Teacher" (Educational Integration)
P1 (Tutorial Mode), P2 (Debugger Replay), P5 (Decision Journal), R1 (Risk-First Flow), R2 (Outcome-First Building)
**Insight:** The canvas can teach trading, not just enable it. Reversing the typical entry-first flow to risk-first, or starting from desired outcomes, would build good habits while also making the platform stickier and more differentiated.

---

## Top Picks for Further Exploration

These ideas scored highest on a quick gut-check across **feasibility** (could we build it without rewriting the backend?), **impact** (does it solve a known pain point?), and **differentiation** (would this make Blockbuilders unlike anything else?):

| Rank | Idea | Why It's Hot |
|------|------|-------------|
| 1 | **M3 — Traffic Light Blocks** | Solves the "what will this do?" gap without touching the backend. Pure frontend enhancement. Huge aha-moment potential. |
| 2 | **C6 — Strategy Health Bar** | Turns validation from reactive to proactive. Coaches users through completion. Builds on existing validation rules. |
| 3 | **S5 — Inline Editing** | Eliminates the inspector context switch. Every parameter edits where the block lives. Tangible UX improvement. |
| 4 | **M2 — Recipe Cards** | Collapses multi-block patterns into single units. Directly reduces overwhelm. Templates infrastructure is already built. |
| 5 | **E4 — Logic in Signal Blocks** | Removes the most confusing block category (logic gates) for beginners. Huge simplification with a clear advanced escape hatch. |
| 6 | **P2 — Debugger Replay** | "Step through your strategy candle by candle" is a killer differentiator and directly bridges the build-test gap. |
| 7 | **S1 — Proximity Snapping** | Mobile connection UX is still painful. Magnetic snapping is a well-understood pattern from design tools. |
| 8 | **A5 — Slot-Based Board** | Beginner mode as a board game with labeled slots. Impossible to make an invalid strategy. Huge onboarding win. |
| 9 | **R1 — Risk-First Flow** | Reverses the building order to teach good habits. Ensures exit conditions are never forgotten. Culturally differentiating. |
| 10 | **M1 — Full Narrative Mode** | The strategy explanation generator, promoted to primary view. "Read your strategy like a paragraph." Accessibility win. |

---

## Suggested Next Steps

1. **Converge and prioritize:** Pick 3–5 ideas from the top picks for deeper feasibility analysis against the existing `{blocks, connections}` backend contract.
2. **Prototype the "Traffic Light Blocks" (M3):** Highest ratio of impact to effort. Can be built as a canvas overlay using existing backtest data. No backend changes.
3. **Sketch the "Strategy Health Bar" (C6):** Wireframe the persistent validation coach. Map existing validation rules to guided prompts.
4. **Explore "Recipe Cards" (M2):** Extend the templates system to allow composite blocks that expand on the canvas. Define the card ↔ block-group data model.
5. **User test the "Risk-First Flow" (R1):** Reverse the wizard order and A/B test against the current entry-first flow. Measure completion rates and exit-condition usage.

---

*Session complete. 43 ideas generated. 6 thematic clusters identified. 10 top picks ranked. Zero ideas killed — everything lives for now.*

*"The best way to have a good idea is to have a lot of ideas." — Linus Pauling*
