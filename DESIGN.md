# Mind Map Design Documentation

This document describes the visual design and behavior of the mind map nodes in detail.

---

## Node Visual States

### 1. Collapsed Parent Nodes (Compressed State)
When a parent node has children but they are collapsed (hidden), the node displays with a **stacked visual effect** to indicate there are hidden children beneath.

**Visual Characteristics:**
- **Three Layers:** The node appears as three stacked rectangles
  - Bottom layer (stack-rect-2): Smallest, most visible at bottom-right
  - Middle layer (stack-rect-1): Medium size
  - Top layer (main-rect): Full size, contains the content
- **Stack Offset:** 7px between each layer for clear visibility
- **Colors:** Progressive shading from bottom to top (#e9ecef → #f1f3f5 → content color)
- **Border:** Purple stroke (#9333ea) with 2.5px width to distinguish from expanded nodes
- **Shadow Effects:** Each layer has its own drop-shadow for depth

### 2. Expanded Parent Nodes
When a parent node's children are visible (expanded), the node displays as a **single rectangle** without stacked layers.

**Visual Characteristics:**
- **Single Layer:** Just the main rectangle, no stacking
- **Fill Color:** White background (#fff)
- **Border:** Gray stroke (#ccc) with 2px width
- **Shadow:** Standard drop-shadow for consistency

### 3. Child Nodes (Leaf Nodes)
Nodes without any children always display as **single rectangles**.

**Visual Characteristics:**
- Same as expanded parent nodes
- White background with gray border
- No expand/collapse button (only add button)

### 4. Root Node
The root node has special styling to stand out as the main topic.

**Visual Characteristics:**
- **Border:** Purple stroke (#6C63FF) with 3px width
- **Enhanced Prominence:** Thicker border makes it easily identifiable

---

## Node Content Layout

### Title Display
- **Font:** Bold, standard size
- **Wrapping:** Automatically wraps to multiple lines if text exceeds node width
- **Max Width:** 280px (configurable via MAX_WIDTH)
- **Min Width:** 140px (configurable via MIN_WIDTH)
- **Character Limit per Line:** ~33 characters (depends on font size)
- **Line Height:** 20px with 1.2em spacing between lines
- **Alignment:** Centered horizontally

### Description Display
- **Visibility:** Only shown if description exists and is not empty
- **Lines:** Maximum 1 line (truncated with ellipsis if longer)
- **Font Size:** 11px, italic
- **Color:** Gray (#718096) for subtle contrast
- **Position:** Near the bottom of the node (12px from bottom edge)
- **Truncation:** Approximately 6.5 characters per pixel of width
- **Ellipsis:** Added with "…" character when text is truncated

### Dynamic Sizing Rules

#### Width Calculation
1. **Per-Node Calculation:** Width calculated based on title length
2. **Column Consistency:** All nodes in the same depth/column share the maximum width
3. **Adaptive:** If one node needs more width, all nodes in that column expand
4. **Bounds:** Clamped between MIN_WIDTH (140px) and MAX_WIDTH (280px)

#### Height Calculation
1. **Base Height:** 50px minimum
2. **Title Lines:** Each line adds 20px
3. **Description:** Adds 28px if present (20px line height + 8px gap)
4. **Padding:** 24px total (12px top + 12px bottom)
5. **Formula:** `height = max(50px, (titleLines * 20px) + descriptionSpace + 24px)`

---

## Layout Spacing

### Vertical Spacing (Between Siblings)
- **Node Size:** 120px vertical spacing (configurable via tree.nodeSize)
- Automatically adjusted by D3.js tree layout based on sibling count

### Horizontal Spacing (Between Depths/Columns)
- **Base Spacing:** 80px between columns
- **Dynamic Addition:** Width of each column's nodes is added
- **Formula for Y position:** `yPos = sum(columnWidth[0...depth-1]) + (80px * depth)`

---

## Interactive Elements

### Expand/Collapse Button
- **Location:** Right edge of node, vertically centered
- **Appearance:** Circle with icon (expand.png or compress.png)
- **Size:** 24px diameter (12px radius)
- **Colors:** White fill (#ffffff), purple border (#7F9CF5)
- **Visibility:** Only shown if node has children (d.children or d._children)
- **Icon Switch:** Changes based on state (compress when expanded, expand when collapsed)

### Add Child Button
- **Location:** 30px to the right of the expand/collapse button
- **Appearance:** Circle with plus icon (add.png)
- **Size:** 24px diameter (12px radius)
- **Colors:** White fill (#ffffff), green border (#2ECC71)
- **Visibility:** Always shown on all nodes
- **Behavior:** Adds a new child and auto-expands parent if collapsed

---

## Color Palette

### Node Colors
| State | Fill | Stroke | Stroke Width |
|-------|------|--------|--------------|
| Root | #fff | #6C63FF | 3px |
| Collapsed Parent | #e6e6fa | #9333ea | 2.5px |
| Expanded Parent | #fff | #ccc | 2px |
| Child/Leaf | #fff | #ccc | 2px |

### Stack Layer Colors
| Layer | Fill | Stroke |
|-------|------|--------|
| Bottom (stack-rect-2) | #e9ecef | #868e96 |
| Middle (stack-rect-1) | #f1f3f5 | #9ca3af |

### Text Colors
| Element | Color |
|---------|-------|
| Title | Default (black) |
| Description | #718096 (gray) |

---

## Responsive Behavior

### Text Wrapping
- **Algorithm:** Word-based wrapping (preserves whole words)
- **Fallback:** If single word exceeds max width, it will still be displayed
- **Update Trigger:** Recalculated on every data update

### Column Width Synchronization
- **First Pass:** Calculate individual node widths
- **Second Pass:** Find max width per depth level
- **Third Pass:** Apply max width to all nodes in same column
- **Result:** Visually aligned columns with consistent node widths

---

## Implementation Notes

### Key Functions
- `calculateNodeLayout(rootNode)`: Main layout calculation function
  - Calculates widths per depth
  - Determines text wrapping
  - Sets height based on content
  - Computes horizontal positions

- `wrapText(text, maxChars)`: Text wrapping utility
  - Splits text into lines
  - Preserves word boundaries
  - Returns array of lines

- `update(source)`: Main rendering function
  - Calls calculateNodeLayout before rendering
  - Updates all visual elements
  - Handles transitions and animations

### Performance Considerations
- **Layout Caching:** Node dimensions (width, height, titleLines) are cached on node object
- **Selective Updates:** Only changed nodes are re-rendered via D3's data join
- **Smooth Transitions:** 500ms animation duration for all layout changes

---

## Design Principles

1. **Visual Hierarchy:** Root → Parent → Child progression is clear
2. **Information Density:** Shows maximum useful info without clutter
3. **State Indication:** Collapsed nodes are visually distinct (stacked effect)
4. **Consistency:** Nodes in same column have identical widths
5. **Readability:** Text wraps naturally, descriptions are subtle but present
6. **Interactivity:** Clear affordances for expand/collapse and add actions

---

## Future Enhancements

Potential improvements to consider:
- Custom color themes for nodes
- Icon/emoji support in titles
- Rich text formatting in descriptions
- Drag-and-drop reordering
- Hover tooltips for full description text
- Keyboard shortcuts for node operations
- Export with preserved visual styling
