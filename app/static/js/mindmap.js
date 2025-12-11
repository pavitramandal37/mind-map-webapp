let rootData = null;
let svg, g, tree, zoom;
let i = 0;
let duration = 500;
let root;
let undoStack = [];
let redoStack = [];
let currentNode = null; // For editing
let crossLinks = []; // Feature B: Cross-Links
let isLinkingMode = false; // Feature B: Cross-Links Interaction
let sourceNode = null; // For Link Creation

// Initialize D3
document.addEventListener('DOMContentLoaded', async () => {
    const mapData = await API.getMap(MAP_ID);
    if (!mapData) {
        openErrorModal('Failed to load map. Please try refreshing the page.');
        return;
    }

    try {
        const loadedData = JSON.parse(mapData.data);
        // Feature B: Data Migration
        if (loadedData.root && Array.isArray(loadedData.crossLinks)) {
            rootData = loadedData.root;
            crossLinks = loadedData.crossLinks;
        } else {
            // Backward compatibility: old format was just rootData
            rootData = loadedData;
            crossLinks = [];
        }

        // Ensure description field exists for all nodes
        ensureDescriptionField(rootData);
    } catch (e) {
        console.error("Error parsing map data:", e);
        rootData = { name: mapData.title, description: "", children: [] };
        crossLinks = [];
    }

    initMap();
});

function initMap() {
    const width = window.innerWidth;
    const height = window.innerHeight - 60;

    svg = d3.select("#whiteboard").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(d3.zoom().on("zoom", (event) => {
            g.attr("transform", event.transform);
        }))
        .on("dblclick.zoom", null) // Disable double click zoom
        .on("click", (event) => {
            // Cancel linking mode if clicking background
            if (isLinkingMode && event.target.tagName === 'svg') {
                exitLinkingMode();
            }
        });

    g = svg.append("g");

    // Define Arrowhead Marker
    const defs = svg.append("defs");
    defs.append("marker")
        .attr("id", "marker-crosslink-arrow")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 10) // Tip of the marker at the end of the line
        .attr("refY", 5)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z") // Triangle
        .style("fill", "#FF6347");

    // Cross-Link Layer (Must be before nodes to appear behind)
    g.append("g").attr("class", "cross-links-layer");

    tree = d3.tree().nodeSize([120, 200]); // Height, Width spacing

    root = d3.hierarchy(rootData, d => d.children);
    root.x0 = 0;
    root.y0 = 0;

    // Collapse after the second level by default
    // root.children.forEach(collapse);

    update(root);
    centerMap();
}

function ensureDescriptionField(node) {
    if (!node.description) {
        node.description = "";
    }
    // Ensure ID for persistence (Feature B)
    if (!node.id) {
        node.id = 'node_' + Math.random().toString(36).substr(2, 9);
    }

    if (node.children) {
        node.children.forEach(ensureDescriptionField);
    }
    // Also check hidden children
    if (node._children) {
        node._children.forEach(ensureDescriptionField);
    }
}

function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function update(source) {
    // Verify Data Consistency before Layout
    syncCollapseState(root);

    // Calculate node dimensions and positions before rendering
    calculateNodeLayout(root);

    const treeData = tree(root);

    // Adjust specific spacing to prevent overlaps (Fix #2 & #3)
    adjustNodeSpacing(root);

    // Compute the new tree layout.
    const nodes = treeData.descendants();
    const links = treeData.links();

    // Normalize for fixed-depth (using calculated y positions)
    nodes.forEach(d => {
        d.y = d.targetY; // Use the y position calculated in calculateNodeLayout
    });

    // ****************** Cross-Links section (Feature B) ***************************
    // Render before nodes so they are behind
    const crossLinkGroup = g.select('.cross-links-layer');
    if (crossLinkGroup.empty()) {
        // Fallback if not created in init (should not happen if initMap is run)
        g.insert("g", ".node").attr("class", "cross-links-layer");
    }

    const crossLinkData = crossLinkGroup.selectAll('path.cross-link')
        .data(crossLinks, d => d.id || (d.id = d.sourceId + "-" + d.targetId));

    const crossLinkEnter = crossLinkData.enter().append('path')
        .attr('class', 'cross-link')
        .style("fill", "none")
        .style("stroke", "#FF6347") // Tomato Red
        .style("stroke-width", "1.5px")
        .style("stroke-dasharray", "5, 5")
        .attr("marker-end", "url(#marker-crosslink-arrow)")
        .style("cursor", "pointer")
        .on("dblclick", (event, d) => {
            event.stopPropagation();
            confirmDeleteCrossLink(d);
        });

    // Merge and Update Cross-Links
    // We need to find the actual node objects for source and target to calculate positions
    const nodeMap = new Map(nodes.map(n => [n.data.id || n.id, n])); // Map by ID

    crossLinkData.merge(crossLinkEnter)
        .transition().duration(duration)
        .attr('d', d => {
            // Find current positions of source and target nodes
            // Note: d.sourceId and d.targetId are IDs from dataset
            // We need to map them to the layout nodes.
            // Issue: d3 nodes use auto-generated IDs 'id' if not provided. 
            // We should ensure our nodes have stable IDs from data if possible, or use the object finding.
            // Assumption: node objects have a unique ID that we store in crossLink.
            // Since we don't have stable IDs in the provided code (d.id = ++i), we need to fix that or rely on object identity if we stored that.
            // BUT, we stored strings {sourceId, targetId}.
            // Fix: We need to use 'data.id' from the node data if available, or generate one.
            // Current code: .data(nodes, d => d.id || (d.id = ++i));

            // Let's assume we match by node object content or we ensure ID stability.
            // Better approach for now: We will attach the live node selection to the crosslink creation.
            // But valid persistence requires IDs. 
            // LIMITATION: The current code generates IDs (d.id = ++i). This breaks persistence.
            // We MUST assume 'rootData' has IDs or we generate IDs for `data` objects recursively.
            // See helper `ensureIds(rootData)`.

            const srcNode = nodes.find(n => n.data.id === d.sourceId);
            const tgtNode = nodes.find(n => n.data.id === d.targetId);

            if (!srcNode || !tgtNode) return null; // Node layout might have hidden them?

            return calculateElbowPath(srcNode, tgtNode);
        });

    crossLinkData.exit().remove();


    // ****************** Nodes section ***************************

    const node = g.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on('click', click);

    // Stacked effect rects (bottom layers) - shown when collapsed parent nodes
    nodeEnter.append('rect')
        .attr('class', 'stack-rect-2')
        .attr('rx', 8)
        .attr('ry', 8)
        .style("fill", "#ffffff")
        .style("stroke", "#7F9CF5")
        .style("stroke-width", "2px")
        .style("display", "none")
        .style("filter", "drop-shadow(0 2px 3px rgba(0,0,0,0.08))");

    nodeEnter.append('rect')
        .attr('class', 'stack-rect-1')
        .attr('rx', 8)
        .attr('ry', 8)
        .style("fill", "#ffffff")
        .style("stroke", "#7F9CF5")
        .style("stroke-width", "2px")
        .style("display", "none")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Main Node Rect
    nodeEnter.append('rect')
        .attr('class', 'main-rect')
        .attr('rx', 8)
        .attr('ry', 8)
        .style("fill", d => d._children ? "#e6e6fa" : "#fff")
        .style("stroke", d => d.data.name === rootData.name ? "#6C63FF" : "#ccc")
        .style("stroke-width", d => d.data.name === rootData.name ? "3px" : "2px")
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Title Text
    nodeEnter.append('text')
        .attr('class', 'node-title')
        .attr("dy", ".35em")
        .style("font-weight", "bold")
        .text(d => d.data.name);

    // Description Text (preview)
    nodeEnter.append('text')
        .attr('class', 'node-desc')
        .attr('text-anchor', 'middle')
        .style("font-size", "11px")
        .style("fill", "#718096")
        .style("font-style", "italic")
        .text("");

    // Add expand/collapse button (image icon) if children exist
    const expandBtnGroup = nodeEnter.filter(d => d.children || d._children)
        .append('g')
        .attr('class', 'expand-btn')
        .on('click', (event, d) => {
            event.stopPropagation();
            toggleChildren(d);
            update(d);
        });

    expandBtnGroup.append('circle')
        .attr('r', 12)
        .attr('fill', '#ffffff')
        .attr('stroke', '#7F9CF5')
        .attr('stroke-width', 2);

    expandBtnGroup.append('image')
        .attr('href', d => !d.data.isCollapsed ? '/static/icons/compress.png' : '/static/icons/expand.png')
        .attr('x', -8)
        .attr('y', -8)
        .attr('width', 16)
        .attr('height', 16);

    // Add "+" button to add child (image icon)
    const addBtnGroup = nodeEnter.append('g')
        .attr('class', 'add-btn-node')
        .on('click', (event, d) => {
            event.stopPropagation();
            addChild(d);
        });

    addBtnGroup.append('title').text('Add Child');
    addBtnGroup.append('circle')
        .attr('r', 12)
        .attr('fill', '#ffffff')
        .attr('stroke', '#2ECC71')
        .attr('stroke-width', 2);

    addBtnGroup.append('image')
        .attr('href', '/static/icons/add.png')
        .attr('x', -8)
        .attr('y', -8)
        .attr('width', 16)
        .attr('height', 16);

    // Edit on double click
    nodeEnter.on('dblclick', (event, d) => {
        event.stopPropagation();
        openEditModal(d);
    });

    // UPDATE
    const nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    // Update Main Rect
    nodeUpdate.select('rect.main-rect')
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('x', d => -d.width / 2)
        .attr('y', d => -d.height / 2)
        .style("fill", "#fff")
        .style("stroke", d => {
            if (d.data.name === rootData.name) return "#6C63FF";
            if (d._children) return "#7F9CF5"; // Primary Blue for collapsed
            return "#ccc";
        })
        .style("stroke-width", d => {
            if (d.data.name === rootData.name) return "3px";
            if (d.data.isCollapsed) return "2.5px"; // Thicker for collapsed nodes
            return "2px";
        })
        .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Update Stacked Rects (only shown for collapsed parent nodes with hidden children)
    const stackOffset = 7; // Increased offset for better visibility
    nodeUpdate.select('rect.stack-rect-1')
        .style("display", d => d._children ? "block" : "none")
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('x', d => -d.width / 2 + stackOffset)
        .attr('y', d => -d.height / 2 + stackOffset);

    nodeUpdate.select('rect.stack-rect-2')
        .style("display", d => d._children ? "block" : "none")
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .attr('x', d => -d.width / 2 + stackOffset * 2)
        .attr('y', d => -d.height / 2 + stackOffset * 2);

    // Update Title
    nodeUpdate.select('text.node-title')
        .text(null) // Clear existing text
        .each(function (d) {
            const el = d3.select(this);
            const lines = d.titleLines || [d.data.name];
            const lineHeight = 1.2;
            // Center vertically if no description, else align top part
            const startY = d.hasDescription ? (-d.height / 2 + 20) : (-((lines.length - 1) * lineHeight * 10) / 2);

            lines.forEach((line, i) => {
                el.append('tspan')
                    .attr('x', 0)
                    .attr('dy', i === 0 ? 0 : lineHeight + "em")
                    .attr('y', i === 0 ? startY : null) // Only set y for first line, others follow dy
                    .text(line);
            });
        });

    // Update Description (one-line preview)
    nodeUpdate.select('text.node-desc')
        .style("display", d => d.hasDescription ? "block" : "none")
        .text(d => {
            if (!d.hasDescription) return "";
            const desc = d.data.description.trim();
            // Truncate to one line with ellipsis
            const maxChars = Math.floor((d.width - 20) / 6.5); // Approx char width for 11px font
            if (desc.length > maxChars) {
                return desc.substring(0, maxChars - 1).trim() + "…";
            }
            return desc;
        })
        .attr('x', 0)
        .attr('y', d => {
            // Position near bottom of node
            return d.height / 2 - 12;
        });

    // Update expand/collapse icon position
    nodeUpdate.select('.expand-btn')
        .attr('transform', d => `translate(${d.width / 2}, 0)`);

    nodeUpdate.filter(d => d.children || d._children).each(function (d) {
        d3.select(this).selectAll('.expand-btn image')
            .attr('href', d => !d.data.isCollapsed ? '/static/icons/compress.png' : '/static/icons/expand.png');
    });

    // Update Add Button position
    nodeUpdate.select('.add-btn-node')
        .attr('transform', d => `translate(${d.width / 2 + 30}, 0)`);

    // Remove any exiting nodes
    const nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .remove();

    nodeExit.select('rect')
        .attr('width', 1e-6)
        .attr('height', 1e-6);

    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // ****************** Links section ***************************

    const link = g.selectAll('path.link')
        .data(links, d => d.target.id);

    const linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', d => {
            const o = { x: source.x0, y: source.y0 };
            return diagonal(o, o);
        });

    const linkUpdate = linkEnter.merge(link);

    linkUpdate.transition()
        .duration(duration)
        .attr('d', d => diagonal(d.source, d.target));

    const linkExit = link.exit().transition()
        .duration(duration)
        .attr('d', d => {
            const o = { x: source.x, y: source.y };
            return diagonal(o, o);
        })
        .remove();

    // Store the old positions for transition.
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

function toggleChildren(d) {
    if (d.data.children && d.data.children.length > 0) {
        d.data.isCollapsed = !d.data.isCollapsed;
        saveMap();
    }
}

// Ensure hierarchy structure matches data.isCollapsed state
function syncCollapseState(node) {
    node.descendants().forEach(d => {
        if (d.data.isCollapsed) {
            // Should be collapsed
            if (d.children) {
                d._children = d.children;
                d.children = null;
            }
        } else {
            // Should be expanded
            if (d._children) {
                d.children = d._children;
                d._children = null;
            }
        }
    });
}

function click(event, d) {
    if (isLinkingMode) {
        event.stopPropagation();

        if (!sourceNode) {
            // Select Source
            sourceNode = d;

            // Highlight Source (Green Dashed)
            d3.select(event.currentTarget).select('.main-rect')
                .style("stroke", "#00FF00")
                .style("stroke-dasharray", "5, 5");

        } else {
            // Select Target or Cancel
            if (sourceNode === d) {
                // Clicked same node -> Cancel
                exitLinkingMode();
                return;
            }

            // Validate: No duplicates
            const linkExists = crossLinks.some(l =>
                (l.sourceId === sourceNode.data.id && l.targetId === d.data.id)
            );

            if (linkExists) {
                openErrorModal("Link already exists!");
                exitLinkingMode();
                return;
            }

            // Validate: No self-loops (handled by equality check above actually)

            // Create Link
            crossLinks.push({
                sourceId: sourceNode.data.id,
                targetId: d.data.id
            });

            exitLinkingMode(); // Clears highlights and mode

            // Update view
            update(root);
            saveMap();
        }
    } else {
        // Normal behavior (optional center or select)
        // Kept empty as per original
    }
}

// --- Actions ---

function pushToUndo() {
    // Deep copy current state
    undoStack.push(JSON.parse(JSON.stringify(rootData)));
    if (undoStack.length > 20) undoStack.shift(); // Limit stack size
    redoStack = []; // Clear redo
}

function undo() {
    if (undoStack.length === 0) return;

    redoStack.push(JSON.parse(JSON.stringify(rootData)));
    rootData = undoStack.pop();

    refreshMap();
    saveMap();
}

function redo() {
    if (redoStack.length === 0) return;

    undoStack.push(JSON.parse(JSON.stringify(rootData)));
    rootData = redoStack.pop();

    refreshMap();
    saveMap();
}

function addChild(d) {
    pushToUndo();

    if (!d.data.children) d.data.children = [];

    // If children were hidden, show them
    if (d._children) {
        d.children = d._children;
        d._children = null;
    }

    const newChild = { name: "New Topic", description: "", children: [] };
    d.data.children.push(newChild);

    refreshMap();
    saveMap();

    // Auto expand to show new child
    if (d.children) {
        update(d);
    }
}

function openEditModal(d) {
    currentNode = d;

    // Initialize description if it doesn't exist
    if (!d.data.description) {
        d.data.description = "";
    }

    // Show view mode
    document.getElementById('viewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';

    // Populate view mode
    document.getElementById('nodeTitleDisplay').textContent = d.data.name || '';
    document.getElementById('nodeDescriptionDisplay').textContent = d.data.description || '(No description)';

    document.getElementById('editModal').style.display = 'flex';
}

function enterEditMode() {
    if (!currentNode) return;

    // Switch to edit mode
    document.getElementById('viewMode').style.display = 'none';
    document.getElementById('editMode').style.display = 'block';

    // Populate edit fields
    document.getElementById('nodeTitleInput').value = currentNode.data.name || '';
    document.getElementById('nodeDescriptionInput').value = currentNode.data.description || '';

    // Focus on title input
    document.getElementById('nodeTitleInput').focus();
    document.getElementById('nodeTitleInput').select();
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentNode = null;

    // Reset to view mode
    document.getElementById('viewMode').style.display = 'block';
    document.getElementById('editMode').style.display = 'none';
}

function saveNodeEdit() {
    if (!currentNode) return;

    pushToUndo();
    const newName = document.getElementById('nodeTitleInput').value.trim();
    const newDescription = document.getElementById('nodeDescriptionInput').value.trim();

    if (!newName) {
        openErrorModal('Title cannot be empty');
        return;
    }

    currentNode.data.name = newName;
    currentNode.data.description = newDescription;

    closeModal();
    refreshMap();
    saveMap();
}

function openDeleteConfirmModal() {
    if (!currentNode) return;
    if (currentNode.depth === 0) {
        openErrorModal("Cannot delete root node");
        return;
    }
    document.getElementById('deleteNodeConfirmModal').style.display = 'flex';
}

function closeDeleteNodeConfirmModal() {
    document.getElementById('deleteNodeConfirmModal').style.display = 'none';
}

function confirmDeleteNode() {
    if (!currentNode) return;

    pushToUndo();

    const parent = currentNode.parent;
    const index = parent.data.children.indexOf(currentNode.data);
    if (index > -1) {
        parent.data.children.splice(index, 1);
    }

    closeDeleteNodeConfirmModal();
    closeModal();
    refreshMap();
    saveMap();
}

function openErrorModal(msg) {
    if (msg) document.getElementById('errorMessage').textContent = msg;
    document.getElementById('errorModal').style.display = 'flex';
}

function closeErrorModal() {
    document.getElementById('errorModal').style.display = 'none';
}

function deleteCurrentNode() {
    // Kept for backward compatibility, but now calls modal
    openDeleteConfirmModal();
}

function refreshMap() {
    // Re-bind data to hierarchy
    const oldRoot = root;
    root = d3.hierarchy(rootData, d => d.children);

    // Preserve layout state (expanded/collapsed) if possible?
    // For simplicity, we might reset or try to match IDs if we had them.
    // Here we just re-render.
    root.x0 = oldRoot.x0;
    root.y0 = oldRoot.y0;

    update(root);
}

async function saveMap() {
    const status = document.getElementById('saveStatus');
    status.textContent = "Saving...";

    const success = await API.updateMap(MAP_ID, {
        data: JSON.stringify({
            root: rootData,
            crossLinks: crossLinks
        })
    });

    if (success) {
        status.textContent = "Saved";
        setTimeout(() => status.textContent = "", 2000);
    } else {
        status.textContent = "Error saving";
        status.style.color = "red";
    }
}

function centerMap() {
    const centerX = window.innerWidth / 2;
    const centerY = (window.innerHeight - 60) / 2;
    svg.transition().duration(750).call(
        d3.zoom().transform,
        d3.zoomIdentity.translate(centerX, centerY).scale(1)
    );
}

// --- Feature B: Cross-Links ---

function toggleLinkingMode() {
    isLinkingMode = !isLinkingMode;
    const btn = document.getElementById('btn-crosslink');

    if (isLinkingMode) {
        btn.style.backgroundColor = '#e6fffa';
        btn.style.borderColor = '#2ECC71';
        document.getElementById('whiteboard').style.cursor = 'crosshair';
        sourceNode = null; // Reset selection
    } else {
        exitLinkingMode();
    }
}

function exitLinkingMode() {
    isLinkingMode = false;
    const btn = document.getElementById('btn-crosslink');
    if (btn) {
        btn.style.backgroundColor = '';
        btn.style.borderColor = '#ddd';
    }
    document.getElementById('whiteboard').style.cursor = 'grab';

    // Clear highlights
    d3.selectAll('.main-rect')
        .style("stroke-dasharray", null)
        .style("stroke", null);

    sourceNode = null;

    // Re-apply standard styling (will accept update() call later usually, but good to force reset visual)
    update(root);
}

// Add keyboard event handlers for modal
document.addEventListener('DOMContentLoaded', () => {
    // Handle Enter key to save in edit mode
    document.addEventListener('keydown', (e) => {
        const editMode = document.getElementById('editMode');
        if (editMode && editMode.style.display !== 'none') {
            if (e.key === 'Enter' && (e.target.id === 'nodeTitleInput' || e.target.id === 'nodeDescriptionInput')) {
                e.preventDefault();
                saveNodeEdit();
            }
            // Tab key navigation is handled by browser default
        }
    });
});

// --- Layout Helpers ---

function calculateNodeLayout(rootNode) {
    const MIN_WIDTH = 140;
    const MAX_WIDTH = 240;
    const BASE_HEIGHT = 50;
    const PADDING = 20;
    const CHAR_WIDTH = 6; // Approx for 14px font
    const LINE_HEIGHT = 20;

    const depthWidths = {}; // Store max width per depth

    // 1. First Pass: Calculate required width for each node
    rootNode.descendants().forEach(d => {
        const title = d.data.name || "Untitled";
        const titleWidth = title.length * CHAR_WIDTH + PADDING * 2;

        // Clamp width
        let width = Math.max(MIN_WIDTH, Math.min(titleWidth, MAX_WIDTH));

        // Store max width for this depth
        if (!depthWidths[d.depth] || width > depthWidths[d.depth]) {
            depthWidths[d.depth] = width;
        }
    });

    // 2. Second Pass: Assign final width and calculate height/wrapping
    rootNode.descendants().forEach(d => {
        // Assign consistent width for the column
        d.width = depthWidths[d.depth];

        // Calculate Text Wrapping
        const title = d.data.name || "Untitled";
        const maxTextWidth = d.width - PADDING * 2;
        const approxCharsPerLine = Math.floor(maxTextWidth / CHAR_WIDTH);

        d.titleLines = wrapText(title, approxCharsPerLine);

        // Check description
        d.hasDescription = d.data.description && d.data.description.trim().length > 0;

        // Calculate Height
        let contentHeight = d.titleLines.length * LINE_HEIGHT;
        if (d.hasDescription) {
            contentHeight += LINE_HEIGHT + 8; // Add space for description + gap
        }

        d.height = Math.max(BASE_HEIGHT, contentHeight + PADDING);
    });

    // 3. Calculate Y positions (horizontal spacing)
    const DEPTH_SPACING = 130; // Gap between columns

    // Re-iterate to set targetY
    rootNode.descendants().forEach(d => {
        let yPos = 0;
        for (let i = 0; i < d.depth; i++) {
            yPos += (depthWidths[i] || MIN_WIDTH) + DEPTH_SPACING;
        }
        d.targetY = yPos;
    });
}

function calculateSubtreeBounds(node) {
    let top = node.x;
    let bottom = node.x;

    if (node.children) {
        node.children.forEach(child => {
            const childBounds = calculateSubtreeBounds(child);
            if (childBounds.top < top) top = childBounds.top;
            if (childBounds.bottom > bottom) bottom = childBounds.bottom;
        });
    }

    return { top, bottom };
}

function adjustNodeSpacing(node) {
    if (!node.children || node.children.length === 0) return;

    // Process children first (post-order traversal)
    node.children.forEach(adjustNodeSpacing);

    // Sort children by vertical position (x)
    node.children.sort((a, b) => a.x - b.x);

    const MIN_NODE_GAP = 40;

    for (let i = 0; i < node.children.length - 1; i++) {
        const child1 = node.children[i];
        const child2 = node.children[i + 1];

        // Bounds of the subtrees (visual extent)
        // We really care about the bottom of child1's tree vs top of child2's tree
        const bounds1 = calculateSubtreeBounds(child1);
        const bounds2 = calculateSubtreeBounds(child2);

        // However, standard d3.tree layout does a good job of separating subtrees.
        // The issue is mostly with the adjacent nodes themselves when heights are variable.
        // Or if d3.tree fixed spacing is too tight for the custom content height.

        // Let's ensure the gap between the actual nodes is respected.
        // AND the gap between the subtrees.

        // Gap required based on node heights:
        const requiredDist = (child1.height / 2) + MIN_NODE_GAP + (child2.height / 2);
        const currentDist = child2.x - child1.x;

        let shift = 0;
        if (currentDist < requiredDist) {
            shift = requiredDist - currentDist;
        }

        // Apply shift to child2 and all following siblings
        if (shift > 0) {
            for (let j = i + 1; j < node.children.length; j++) {
                const sibling = node.children[j];
                shiftSubtree(sibling, shift);
            }
        }
    }
}

function shiftSubtree(node, dy) {
    node.x += dy;
    if (node.children) {
        node.children.forEach(child => shiftSubtree(child, dy));
    }
}


// --- Feature B: Cross-Links Helpers ---

function calculateElbowPath(src, tgt) {
    // Calculate intersection points on perimeter
    const srcPoint = getRectIntersection(src, tgt); // From Src center to Tgt center
    const tgtPoint = getRectIntersection(tgt, src); // From Tgt center to Src center

    const x1 = srcPoint.x;
    const y1 = srcPoint.y;
    const x2 = tgtPoint.x;
    const y2 = tgtPoint.y;

    // Simple Elbow Logic (Horizontal - Vertical - Horizontal)
    const midX = (x1 + x2) / 2;

    return `M ${y1} ${x1} 
            L ${y1} ${midX} 
            L ${y2} ${midX} 
            L ${y2} ${x2}`;

    // Wait, the coordinate system in the tree layout:
    // d.x is vertical (row), d.y is horizontal (depth/column)
    // The previous transform was translate(d.y, d.x)
    // So X coord in SVG space is d.y (depth)
    // Y coord in SVG space is d.x (vertical)

    // Correct mapping for calculation:
    // Node center in SVG: (d.y, d.x)
    // Rect width: d.width, height: d.height

    // Let's redefine getRectIntersection to work in SVG coordinates (x=depth, y=vertical)
}

function getRectIntersection(node, otherNode) {
    // Node center (SVG coordinates)
    const cx = node.y;
    const cy = node.x;
    const w = node.width;
    const h = node.height;

    const otherCx = otherNode.y;
    const otherCy = otherNode.x;

    const dx = otherCx - cx;
    const dy = otherCy - cy;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    // Angle to other node
    // We want the point on the rectangle border (cx-w/2, cy-h/2, w, h)
    // that intersects the line to (otherCx, otherCy)

    // Simple approach: Check intersection with 4 sides
    const left = cx - w / 2;
    const right = cx + w / 2;
    const top = cy - h / 2;
    const bottom = cy + h / 2;

    // Ray equations: P = C + t * D
    // t_x_left = (left - cx) / dx
    // t_x_right = (right - cx) / dx
    // t_y_top = (top - cy) / dy
    // t_y_bottom = (bottom - cy) / dy

    let t = Infinity;

    if (dx !== 0) {
        const t1 = (left - cx) / dx;
        if (t1 > 0) t = Math.min(t, t1);
        const t2 = (right - cx) / dx;
        if (t2 > 0) t = Math.min(t, t2);
    }

    if (dy !== 0) {
        const t3 = (top - cy) / dy;
        if (t3 > 0) t = Math.min(t, t3);
        const t4 = (bottom - cy) / dy;
        if (t4 > 0) t = Math.min(t, t4);
    }

    // Point
    return {
        x: cx + t * dx, // SVG X
        y: cy + t * dy  // SVG Y
    };
}

// Redefine calculateElbowPath with correct SVG coords
// SVG Path "M x y" uses actual x,y
function calculateElbowPath(src, tgt) {
    const p1 = getRectIntersection(src, tgt);
    const p2 = getRectIntersection(tgt, src);

    // p1.x, p1.y are SVG coordinates

    // Elbow logic:
    // Move horizontal, then vertical, then horizontal?
    // Or just horizontal then vertical?
    // "Elbow (Right-Angle)" - usually means one bend or two.
    // Given the tree flows left-to-right (mostly), horizontal mid-point makes sense.

    const midX = (p1.x + p2.x) / 2;

    return `M ${p1.x} ${p1.y} 
            L ${midX} ${p1.y} 
            L ${midX} ${p2.y} 
            L ${p2.x} ${p2.y}`;
}

let deleteLinkData = null;

function confirmDeleteCrossLink(d) {
    deleteLinkData = d;
    document.getElementById('deleteLinkConfirmModal').style.display = 'flex';
}

function closeDeleteLinkConfirmModal() {
    document.getElementById('deleteLinkConfirmModal').style.display = 'none';
    deleteLinkData = null;
}

function deleteCrossLink() {
    if (!deleteLinkData) return;

    const index = crossLinks.indexOf(deleteLinkData);
    if (index > -1) {
        crossLinks.splice(index, 1);
        saveMap();
        update(root);
    }
    closeDeleteLinkConfirmModal();
}

function wrapText(text, maxChars) {
    if (!text) return [""];
    const words = text.split(/\s+/);
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if (currentLine.length + 1 + word.length <= maxChars) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

