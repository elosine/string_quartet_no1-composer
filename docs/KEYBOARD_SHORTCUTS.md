# Keyboard Shortcuts & Mouse Commands

Quick reference for all keyboard shortcuts and mouse commands in the Score Composer.

---

## Zoom & Pan (ScoreZoom)

| Command | Action |
|---------|--------|
| **Ctrl + Alt + Scroll Wheel** | Zoom in/out on score |
| **0** | Reset zoom to 100% (when not in input field) |
| **Double-click zoom slider** | Reset zoom to 100% |
| **Alt + Left Click Drag** | Pan score |
| **Middle Mouse Drag** | Pan score |
| **Alt + Double-click** | Reset pan to origin |

---

## Selection & Grouping (MultiSelect)

| Command | Action |
|---------|--------|
| **Click** | Select single object — shows mini toolbar |
| **Shift + Click** | Toggle object in/out of multi-selection |
| **Ctrl + Win + Click** | Open ObjectSelector menu (overlapping objects) |
| **Shift + Ctrl + Win + Click** | Open ObjectSelector in multi-select mode (toggle objects into group) |
| **Escape** | Clear selection / close ObjectSelector menu |

---

## Object Actions (MultiSelect Toolbar)

These work for **both single and multi-selected objects**:

| Command | Action |
|---------|--------|
| **Ctrl + Alt + D** | Duplicate selected object(s) |
| **Delete** | Delete selected object(s) |
| **Track dropdown** (toolbar only) | Change track for selected object(s) |
| **Δt input + Move** (toolbar only) | Shift selected object(s) in time |

---

## Line-Wedge (LineWedgeMaker)

| Command | Action |
|---------|--------|
| **Click on hit path** | Select line-wedge |
| **Double-click on hit path** | Add node at click position |
| **Ctrl + Alt + D** | Duplicate selected line-wedge (when not in multi-select) |

---

## Bundle Systems (PTG, Vibrato, Col Legno/D'arco, Bow Pressure, Notation Fragment)

| Command | Action |
|---------|--------|
| **Delete** | Delete selected bundle (when bundle row is visible and object is part of a bundle) |

> **Note:** MultiSelect's Delete handler takes priority via `stopImmediatePropagation` when the mini toolbar is active. Bundle Delete handlers fire only when no MultiSelect selection exists.

---

## Navigation

| Command | Action |
|---------|--------|
| **Enter** (in Goto Second input) | Jump to time position |
| **Enter** (in page input) | Jump to page |

---

## SVG Elements (SVGElementManager)

| Command | Action |
|---------|--------|
| **Click on element** | Select and enable drag |
| **Drag resize handle** | Scale element proportionally |
| **Click + Drag body** | Reposition element (time + Y offset) |

---

## Curves (CurveMaker)

| Command | Action |
|---------|--------|
| **Click on curve/control point** | Select curve |
| **Click + Drag control point** | Reshape curve |

---

*Last updated: Mar 2, 2026*
