# Musical Material System

A data catalog for grouping, naming, and tracking revisions of compositional units in the score.

---

## Quick Start

1. **Select** the objects that make up one musical material (curves, GCs, SVGs) using Shift+Click
2. **Name** it in the sidebar (Musical Materials → Name field), e.g. `MM001`
3. **Capture** — click the purple **Capture** button (sidebar) or the purple **MM** button in the MultiSelect floating toolbar
4. Done — the material is saved with a full snapshot of all component data

---

## What Is a Musical Material?

A Musical Material (MM) is a named group of **bundles** that together form one compositional idea. For example:

- A crescendo (CD bundle) + a notation fragment (NF bundle) at the end = **one Musical Material**
- A single Bartók pizzicato (BP bundle) = **one Musical Material**
- A vibrato curve (VIB bundle) + a pizz tremolo glissando (PTG bundle) layered together = **one Musical Material**

Each MM captures:
- **Name** (e.g. MM001, "Viola opening crescendo")
- **Description** (optional, for your notes)
- **Track** (auto-detected from bundles)
- **Time range** (auto-detected from bundles)
- **Bundle references** — which bundles compose this material
- **Versioned snapshots** — full data capture at each revision point

---

## Capturing a Musical Material

### Method 1: MultiSelect → MM Button
1. Shift+Click objects in the score to multi-select them
2. Click the purple **MM** button in the floating toolbar
3. (Optional) Type a name in the sidebar first — otherwise auto-named MM001, MM002, etc.

### Method 2: Sidebar Capture
1. Type a name in the **Name** field
2. (Optional) Type a description in the **Desc** field
3. Click **Capture**
4. The system collects bundles from your current MultiSelect selection, or from individually selected bundles in each system

---

## Viewing Musical Materials

- Use the **List** dropdown in the sidebar to browse all captured MMs
- Format: `MM001 [T3] (2b, 1v)` = name, track, bundle count, version count
- Selecting an MM shows the **detail panel** with:
  - Name and description
  - Track and time range
  - Each bundle with its type-specific parameters (pitch, dynamics, timing, etc.)
  - Component enrichment: curve info (slope, tension), GC info (impact, stiffness), SVG info (position, scale)
  - Current version date and label

---

## Revising a Musical Material

When you change something in the score (swap an SVG, adjust a curve, change dynamics):

1. Select the MM from the **List** dropdown
2. (Optional) Type a revision note in the **Desc** field (e.g. "changed SVG to forte version")
3. Click **Update**
4. A new version snapshot is created — the previous version is preserved

### Browsing Versions
- When an MM has more than one version, a **Ver** dropdown appears
- Select any version to view its snapshot data
- Versions are labeled with their date and your revision note

---

## Deleting a Musical Material

1. Select the MM from the **List** dropdown
2. Click **Delete**
3. The MM record is removed (this does NOT delete the actual bundles/objects from the score)

---

## Supported Bundle Types

| Code | System | Key Data Captured |
|------|--------|-------------------|
| **CD** | Crescendo/Decrescendo | pitch, dynamics, clef, volume mode, secco, curve info |
| **NF** | Notation Fragment | impact time, arrow, GC info |
| **BP** | Bartók Pizzicato | impact time, GC info, SVG info |
| **PT** | Pizzicato Tremolo | start time, GC info, SVG info |
| **PTG** | Pizz Tremolo Glissando | time range, curve info, SVG info |
| **VIB** | Vibrato | time range, curve info, SVG info |

---

## Persistence

Musical Materials are saved and loaded automatically with the score via ScoreManager. They are stored in the score JSON under the `musicalMaterials` key.
