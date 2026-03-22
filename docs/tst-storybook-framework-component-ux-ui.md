# Test Checklist -- Storybook Framework for UX/UI of Components

> Source PRD: `prd-storybook-framework-component-ux-ui.md`

## 1. Storybook Setup

- [ ] Storybook is installed inside the frontend workspace
- [ ] Storybook starts locally using the documented command
- [ ] Storybook build succeeds using the documented static build command (if included in implementation)
- [ ] Storybook setup keeps addon/configuration count minimal
- [ ] No duplicate theme/token layer was introduced just for Storybook

## 2. Design System Alignment

- [ ] Storybook uses the same global styles as the application
- [ ] Storybook uses the same Tailwind configuration as the application
- [ ] Storybook uses the same semantic color tokens defined by `docs/design-system.json`
- [ ] Storybook uses the same typography scale defined by `docs/design-system.json`
- [ ] Storybook uses the same spacing scale and breakpoints defined by `docs/design-system.json`
- [ ] Storybook behavior and documentation stay aligned with `docs/design_concept.json` principles (clarity, minimalism, progressive disclosure, consistency)
- [ ] No arbitrary replacement token values were introduced when existing app tokens already exist

## 3. Official Component Documentation

- [ ] Storybook clearly states that it is the official documentation surface for reusable components
- [ ] Storybook includes a simple introduction or docs page for contributors
- [ ] Storybook docs reference `docs/design-system.json` and `docs/design_concept.json` as source-of-truth design documents
- [ ] Storybook navigation makes reusable components easy to find
- [ ] Storybook naming and grouping are understandable for a new team member

## 4. Initial Story Coverage

- [ ] The first release includes stories for the main reusable component set chosen for baseline coverage
- [ ] Each documented component has a default story
- [ ] Each documented component includes important variants where relevant
- [ ] Disabled states are documented where relevant
- [ ] Error or feedback states are documented where relevant
- [ ] Dark-mode presentation is documented where relevant
- [ ] Responsive behavior is documented where relevant
- [ ] Stories use real component APIs rather than mock replacement markup

## 5. Markdown Onboarding Guide

- [ ] A markdown guide exists under `docs/`
- [ ] The guide explains where Storybook configuration lives
- [ ] The guide explains where stories live
- [ ] The guide explains how to run Storybook locally
- [ ] The guide explains how to add a new story
- [ ] The guide explains how to update an existing story
- [ ] The guide explains how to verify alignment with `docs/design-system.json` and `docs/design_concept.json`
- [ ] The guide explains how to review dark mode and responsive behavior in Storybook
- [ ] The guide explains how Storybook should be used during component review
- [ ] The guide includes basic troubleshooting for local setup issues

## 6. Simplicity / Scope Control

- [ ] The implementation does not add a second design system or duplicate token source
- [ ] The implementation does not attempt to document every page-level feature in the first release
- [ ] The implementation does not add unnecessary visual-regression or external publishing infrastructure in the first release
- [ ] The implementation keeps Storybook focused on reusable component UX/UI work

## 7. Edge Cases

- [ ] Storybook still renders correctly in dark mode
- [ ] Storybook still renders correctly on narrow/mobile viewport sizes
- [ ] Missing stories are visible as gaps to fill, not silently hidden behind vague docs
- [ ] Broken styling imports fail loudly enough for developers to diagnose the issue
- [ ] New contributors can follow the guide and open the correct Storybook entry point without tribal knowledge

## 8. Non-Goals Verification

- [ ] No separate public design-system website was introduced in this slice
- [ ] No backend/API work was added for this feature
- [ ] No parallel token/theme definitions were introduced outside the existing app design sources
- [ ] No unnecessary addon sprawl was introduced into the frontend toolchain
