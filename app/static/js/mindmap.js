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
        alert('Failed to load map');
        return;
    }

    try {
        rootData = JSON.parse(mapData.data);
        // Ensure description field exists for all nodes
        ensureDescriptionField(rootData);
    } catch (e) {
        rootData = { name: mapData.title, description: "", children: [] };
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
        .on("dblclick.zoom", null); // Disable double click zoom

    g = svg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    tree = d3.tree().nodeSize([50, 200]); // Height, Width spacing

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
    if (node.children) {
        node.children.forEach(ensureDescriptionField);
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
    const treeData = tree(root);

    // Compute the new tree layout.
    const nodes = treeData.descendants();
    const links = treeData.links();

    // Normalize for fixed-depth.
    nodes.forEach(d => { d.y = d.depth * 180; });

    // ****************** Nodes section ***************************

    const node = g.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i));

    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on('click', click);

    // Add Circle for the nodes
    nodeEnter.append('rect')
        .attr('width', 120)
        .attr('height', 40)
        .attr('x', -60)
        .attr('y', -20)
        .style("fill", d => d._children ? "#e6e6fa" : "#fff");

    // Add labels for the nodes
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 15) + '...' : d.data.name);

    // Add expand/collapse button (image icon) if children exist
    const expandBtnGroup = nodeEnter.filter(d => d.children || d._children)
        .append('g')
        .attr('class', 'expand-btn')
        .attr('transform', 'translate(60, 0)')
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
        .attr('href', d => d.children ? '/static/icons/compress.png' : '/static/icons/expand.png')
        .attr('x', -8)
        .attr('y', -8)
        .attr('width', 16)
        .attr('height', 16);

    // Add "+" button to add child (image icon)
    const addBtnGroup = nodeEnter.append('g')
        .attr('class', 'add-btn-node')
        .attr('transform', 'translate(90, 0)')
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

    nodeUpdate.select('rect')
        .style("fill", d => d._children ? "#f0f0f0" : "#fff")
        .style("stroke", d => d.data.name === rootData.name ? "#6C63FF" : "#ccc")
        .style("stroke-width", d => d.data.name === rootData.name ? "3px" : "2px");

    nodeUpdate.select('text')
        .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 15) + '...' : d.data.name);

    // Update expand/collapse icon
    nodeUpdate.filter(d => d.children || d._children).each(function(d) {
        d3.select(this).selectAll('.expand-btn image')
            .attr('href', d.children ? '/static/icons/compress.png' : '/static/icons/expand.png');
    });

    // Remove any exiting nodes
    const nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .remove();

    nodeExit.select('rect')
        .attr('r', 1e-6);

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
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
}

function click(event, d) {
    // Optional: Center on click or just select
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
        alert('Title cannot be empty');
        return;
    }
    
    currentNode.data.name = newName;
    currentNode.data.description = newDescription;

    closeModal();
    refreshMap();
    saveMap();
}

function deleteCurrentNode() {
    if (!currentNode) return;
    if (currentNode.depth === 0) {
        alert("Cannot delete root node");
        return;
    }

    if (!confirm("Are you sure you want to delete this node and its children?")) return;

    pushToUndo();

    const parent = currentNode.parent;
    const index = parent.data.children.indexOf(currentNode.data);
    if (index > -1) {
        parent.data.children.splice(index, 1);
    }

    closeModal();
    refreshMap();
    saveMap();
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
    svg.transition().duration(750).call(
        d3.zoom().transform,
        d3.zoomIdentity.translate(window.innerWidth / 2 - 100, window.innerHeight / 2).scale(1)
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
