# Test Checklist – Visual Strategy Validation Feedback

> Source PRD: `prd-visual-strategy-validation-feedback.md`

---

## 1. Validation Trigger

- [ ] Visual feedback is triggered by the existing manual validate action (no new validation triggers added)
- [ ] Visual feedback is triggered by pre-run validation (before backtest execution)
- [ ] No new API calls or polling are introduced for validation
- [ ] Validation results are mapped to canvas blocks using `block_id` from the existing validation response

---

## 2. Canvas Block Highlights

### 2.1 Error Highlights

- [ ] Blocks with validation errors display a red colored border
- [ ] Blocks with validation errors display a small error status icon in the block header
- [ ] The red border is clearly visible and distinguishable from the block's normal border

### 2.2 Warning Highlights

- [ ] Blocks with validation warnings display an amber colored border
- [ ] Blocks with validation warnings display a small warning status icon in the block header
- [ ] The amber border is clearly visible and distinguishable from both normal and error borders

### 2.3 Clearing Highlights

- [ ] When a validation error is resolved and validation is re-run, the red border and icon are removed from the block
- [ ] When a validation warning is resolved and validation is re-run, the amber border and icon are removed
- [ ] Blocks without validation issues do not display any error/warning border or icon

---

## 3. Inline Messages

### 3.1 Single Error

- [ ] Each invalid block shows one inline message anchored near the block (top-right or below)
- [ ] The inline message text is short and directly actionable (e.g., "Missing input connection")
- [ ] The inline message is readable and does not overlap other blocks in typical layouts

### 3.2 Multiple Errors on One Block

- [ ] When a block has multiple validation errors, only the first error is shown as an inline message
- [ ] The remaining errors for that block are still visible in the side panel validation list
- [ ] The inline message does not attempt to show all errors simultaneously

### 3.3 Message Content

- [ ] Inline messages use plain, actionable language (not technical codes or IDs)
- [ ] Messages correctly correspond to the actual validation issue on the block

---

## 4. Global (Non-Block) Errors

- [ ] Validation errors without a `block_id` display in a compact banner at the top of the canvas
- [ ] The banner text is readable and actionable (e.g., "No entry signal defined")
- [ ] The banner does not obscure the canvas content in a way that blocks interaction
- [ ] When multiple global errors exist, they are all shown in the banner
- [ ] The banner is removed when global errors are resolved and validation is re-run

---

## 5. Side Panel Validation List

- [ ] The existing validation list in the side panel remains available and functional
- [ ] All validation errors (block-specific and global) appear in the side panel list
- [ ] Selecting an item in the side panel list still focuses/pans to the corresponding block on the canvas
- [ ] The side panel list is not removed or hidden by the new inline feedback
- [ ] Block-specific errors appear in both the inline message and the side panel list (no data loss)

---

## 6. Data Contract & Mapping

- [ ] Validation response items with a `block_id` are correctly mapped to the corresponding canvas block
- [ ] Validation response items without a `block_id` are treated as global errors and shown in the banner
- [ ] If a `block_id` in the validation response does not match any block on the canvas, it is handled gracefully (no crash, appears in side panel)

---

## 7. UX & Styling

- [ ] Existing Tailwind styles and icon set are used (no new icon libraries or CSS frameworks)
- [ ] No heavy tooltips or hover-only content is introduced for validation messages
- [ ] Inline messages use absolute positioning near the block (no new layout containers)
- [ ] Visual feedback does not introduce noticeable layout shifts or canvas jitter

---

## 8. Implementation Constraints

- [ ] No new API endpoints are added
- [ ] No new validation rules or logic changes are made in the backend
- [ ] No new frontend dependencies are introduced
- [ ] No complex overlays, popovers, or animations are added
