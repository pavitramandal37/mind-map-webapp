let rootData = null;
let svg, g, tree, zoom;
let i = 0;
let duration = 500;
let root;
let undoStack = [];
let redoStack = [];
let currentNode = null; // For editing


// Initialize D3
document.addEventListener('DOMContentLoaded', async () => {
    const mapData = await API.getMap(MAP_ID);
    if (!mapData) {
        openErrorModal('Failed to load map. Please try refreshing the page.');
        return;
    }

    try {
        const loadedData = JSON.parse(mapData.data);
        rootData = loadedData;

        // Ensure description field exists for all nodes
        ensureDescriptionField(rootData);
    } catch (e) {
        console.error("Error parsing map data:", e);
        rootData = { name: mapData.title, description: "", children: [] };
    }

    initMap();
});

function initMap() {
    const width = window.innerWidth;
    const height = window.innerHeight - 60;
    const centerX = width / 2;
    const centerY = (height - 60) / 2;

    // Create zoom behavior first
    const zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 3])  // Min/max zoom levels
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg = d3.select("#whiteboard").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(zoomBehavior)  // Apply zoom behavior
        .on("dblclick.zoom", null)
        .on("click", null);

    g = svg.append("g");

    tree = d3.tree().nodeSize([120, 200]);

    root = d3.hierarchy(rootData, d => d.children);
    root.x0 = 0;
    root.y0 = 0;

    update(root);

    // FIX: Set initial zoom transform (tells D3 about the centering)
    svg.call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(centerX, centerY).scale(1)
    );
}

function ensureDescriptionField(node) {
    if (!node.description) {
        node.description = "";
    }

    // Fix: isCollapsed backward compatibility
    if (typeof node.isCollapsed === 'undefined' || node.isCollapsed === null) {
        node.isCollapsed = false;
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
    try {
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
            .attr('href', d => d.data.isCollapsed === true ? '/static/icons/expand.png' : '/static/icons/compress.png')
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
                if (d.data.isCollapsed === true) return "#7F9CF5"; // Primary Blue for collapsed
                return "#ccc";
            })
            .style("stroke-width", d => {
                if (d.data.name === rootData.name) return "3px";
                if (d.data.isCollapsed === true) return "2.5px"; // Thicker for collapsed nodes
                return "2px";
            })
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

        // Update Stacked Rects (only shown for collapsed parent nodes with hidden children)
        const stackOffset = 7; // Increased offset for better visibility
        nodeUpdate.select('rect.stack-rect-1')
            .style("display", d => d.data.isCollapsed === true ? "block" : "none")
            .attr('width', d => d.width)
            .attr('height', d => d.height)
            .attr('x', d => -d.width / 2 + stackOffset)
            .attr('y', d => -d.height / 2 + stackOffset);

        nodeUpdate.select('rect.stack-rect-2')
            .style("display", d => d.data.isCollapsed === true ? "block" : "none")
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
                .attr('href', d => d.data.isCollapsed === true ? '/static/icons/expand.png' : '/static/icons/compress.png');
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
    } catch (e) {
        console.error("Error in update:", e);
    }
}

function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

function toggleChildren(d) {
    if (d.data && d.data.children && d.data.children.length > 0) {
        if (typeof d.data.isCollapsed !== 'boolean') {
            d.data.isCollapsed = false;
        }
        d.data.isCollapsed = !d.data.isCollapsed;
        saveMap();
    }
}

// Ensure hierarchy structure matches data.isCollapsed state
function syncCollapseState(node, depth = 0) {
    if (depth > 50) {
        console.warn("Max depth exceeded in syncCollapseState");
        return;
    }
    try {
        if (typeof node.data.isCollapsed === 'boolean' && node.data.isCollapsed === true) {
            // Should be collapsed
            if (node.children) {
                node._children = node.children;
                node.children = null;
            }
        } else {
            // Should be expanded (default)
            if (node._children) {
                node.children = node._children;
                node._children = null;
            }
        }

        // Recurse safely
        if (node.children) {
            node.children.forEach(child => syncCollapseState(child, depth + 1));
        }
        if (node._children) {
            node._children.forEach(child => syncCollapseState(child, depth + 1));
        }
    } catch (e) {
        console.error("Error in syncCollapseState:", e);
    }
}

function click(event, d) {
    // Normal behavior (optional center or select)
    // Kept empty as per original
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
        data: JSON.stringify(rootData)
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
    const PADDING = 30;
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

function adjustNodeSpacing(node, depth = 0) {
    try {
        if (depth > 20) {
            console.warn("Max depth exceeded in adjustNodeSpacing");
            return;
        }
        if (!node.children || node.children.length === 0) return;

        // Process children first (post-order traversal)
        node.children.forEach(child => adjustNodeSpacing(child, depth + 1));

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
    } catch (e) {
        console.error("Error in adjustNodeSpacing:", e);
    }
}

function shiftSubtree(node, dy) {
    node.x += dy;
    if (node.children) {
        node.children.forEach(child => shiftSubtree(child, dy));
    }
}




function wrapText(text, maxChars) {
    if (text === null || typeof text === 'undefined') return [""];
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

