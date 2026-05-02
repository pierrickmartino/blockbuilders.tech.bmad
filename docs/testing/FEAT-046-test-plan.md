# Test Checklist – Inspector Panel for Block Parameters

> Source PRD: `prd-inspector-panel-block-parameters.md`

---

## 1. Panel Open/Close Behavior

### 1.1 Opening

- [ ] Tapping/clicking a block on the canvas opens the Inspector panel
- [ ] The Inspector panel displays only the parameters for the currently selected block
- [ ] Selecting a different block while the panel is open updates the panel to show the newly selected block's parameters
- [ ] Opening the Inspector panel does not deselect the block on the canvas

### 1.2 Closing

- [ ] Closing the Inspector panel leaves the block selected on the canvas
- [ ] Closing the panel returns focus to the canvas
- [ ] Tapping the canvas background (deselecting all blocks) closes the Inspector panel (if this behavior is chosen)

### 1.3 No-Parameter Blocks

- [ ] If a block has no configurable parameters, the Inspector panel shows a simple "No parameters" state
- [ ] The "No parameters" state does not show empty input fields or broken layouts

---

## 2. Period Parameter Inputs & Presets

### 2.1 Preset Buttons

- [ ] Period parameters display preset buttons for values: 14, 20, 50, 200
- [ ] Tapping a preset button updates the period value immediately
- [ ] The currently active preset value is visually highlighted
- [ ] If the current period value does not match any preset, no preset button is highlighted

### 2.2 Manual Input

- [ ] Period parameters also allow direct numeric input via a text field
- [ ] Typing a custom value in the field updates the block parameter
- [ ] Switching from a preset to a custom value via typing works without conflict

### 2.3 Touch-Friendly

- [ ] Numeric input fields are large enough for comfortable touch interaction on mobile/tablet
- [ ] Preset buttons are large enough for comfortable tapping (adequate tap target size)
- [ ] Fields have clear, readable labels

---

## 3. Source Parameter Quick-Swap

- [ ] Source parameters display quick-swap buttons for `close` and `prev_close`
- [ ] Tapping `close` sets the source parameter to `close`
- [ ] Tapping `prev_close` sets the source parameter to `prev_close`
- [ ] The currently selected source option is visually highlighted
- [ ] Switching between source values updates the block parameter immediately

---

## 4. Threshold & Other Inputs

- [ ] Threshold inputs (e.g., RSI levels, percentages) are displayed as direct editable numeric inputs
- [ ] Threshold fields accept valid numeric values
- [ ] Threshold fields have clear labels describing what the value controls

---

## 5. Inline Validation

### 5.1 Empty Values

- [ ] Leaving a required field empty triggers an inline validation message below the field
- [ ] The validation message is in plain language (e.g., "Period is required")

### 5.2 Out-of-Range Values

- [ ] Entering a value outside the allowed range triggers an inline validation message
- [ ] The message clearly indicates the valid range (e.g., "Period must be between 1 and 500")

### 5.3 Invalid Input

- [ ] Entering non-numeric text in a numeric field triggers an inline validation message
- [ ] Validation messages appear immediately (on change or blur, not only on save)

### 5.4 Validation Message Behavior

- [ ] Validation messages match existing validation rules (no new rules introduced)
- [ ] Validation messages are concise and do not stack multiple alerts
- [ ] Correcting an invalid value removes the validation message

---

## 6. Node UI Cleanliness

- [ ] Nodes on the canvas display parameters in a minimal, read-only style (or omit previously inline controls)
- [ ] No cramped inline editing controls remain on the node cards
- [ ] Node cards remain visually clean and easy to read at a glance

---

## 7. Responsive Layout

### 7.1 Desktop

- [ ] The Inspector panel appears as a sidebar on desktop screens
- [ ] The panel uses existing sidebar placement (no new layout containers)
- [ ] The panel does not overlap or hide critical canvas content

### 7.2 Mobile / Tablet

- [ ] The Inspector panel appears as a bottom drawer or equivalent mobile-friendly placement
- [ ] The panel is scrollable if content exceeds the visible area
- [ ] Input fields and buttons remain usable on small screens
- [ ] The panel does not block the entire canvas on mobile

### 7.3 General

- [ ] Layout transitions between desktop and mobile breakpoints are smooth
- [ ] No horizontal scrolling is introduced by the Inspector panel

---

## 8. Implementation Constraints

- [ ] No new backend endpoints or API calls are introduced
- [ ] Strategy JSON format remains unchanged
- [ ] No new block types or parameters are added
- [ ] No new modal flows are introduced (panel-only interaction)
- [ ] Existing input components and styles are reused
- [ ] No changes to validation rules or parameter ranges beyond UI presentation
