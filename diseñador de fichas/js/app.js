/**
 * app.js
 * Core logic for Visual HTML Template Editor
 */

// --- CONSTANTS ---
const DPI = 96;
const MM_TO_PX = DPI / 25.4; // ~3.7795
const A4_W_MM = 210;
const A4_H_MM = 297;
const A4_W_PX = Math.round(A4_W_MM * MM_TO_PX);
const A4_H_PX = Math.round(A4_H_MM * MM_TO_PX);

// --- STATE ---
const state = {
    elements: [],
    selectedId: null,
    nextId: 1,
    zoom: 1,
    tool: 'select', // select, rect, text, line, img
    grid: { show: true, snap: false, sizeMm: 5 },
    clipboard: null,
    history: [], // For undo/redo (simple version)
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragMode: null // 'move', 'ne-resize', etc.
};

// --- DOM ELEMENTS ---
const canvas = document.getElementById('canvas');
const layersList = document.getElementById('layers-list');
const propPanel = {
    id: document.getElementById('prop-id'),
    x: document.getElementById('prop-x'),
    y: document.getElementById('prop-y'),
    w: document.getElementById('prop-w'),
    h: document.getElementById('prop-h'),
    bgColor: document.getElementById('prop-bg-color'),
    bgText: document.getElementById('prop-bg-text'),
    bgTrans: document.getElementById('prop-bg-transparent'),
    borderW: document.getElementById('prop-border-width'),
    borderColor: document.getElementById('prop-border-color'),
    zindex: document.getElementById('prop-zindex'),
    // Text specific
    textGroup: document.getElementById('prop-text'),
    content: document.getElementById('prop-content'),
    fontFamily: document.getElementById('prop-font-family'),
    fontSize: document.getElementById('prop-font-size'),
    fontWeight: document.getElementById('prop-font-weight')
};

// --- INITIALIZATION ---
function init() {
    // Set Canvas Size
    canvas.style.width = `${A4_W_PX}px`;
    canvas.style.height = `${A4_H_PX}px`;

    // Bind Tools
    document.getElementById('tool-select').onclick = () => setTool('select');
    document.getElementById('tool-rect').onclick = () => setTool('rect');
    document.getElementById('tool-text').onclick = () => setTool('text');
    document.getElementById('tool-line').onclick = () => setTool('line');
    document.getElementById('tool-img').onclick = () => setTool('img');


    // Import/Export

    // Import/Export
    document.getElementById('action-import').onclick = () => document.getElementById('file-import-input').click();
    document.getElementById('file-import-input').onchange = handleFileImport;
    document.getElementById('action-export').onclick = exportHTML;
    document.getElementById('btn-delete-el').onclick = deleteSelected;

    // Bind Config
    document.getElementById('config-zoom').oninput = (e) => setZoom(e.target.value / 100);
    document.getElementById('config-grid-show').onchange = (e) => toggleGrid(e.target.checked);
    document.getElementById('config-grid-snap').onchange = (e) => state.grid.snap = e.target.checked;

    // Bind Property Inputs
    bindPropertyInputs();

    // Bind Canvas Interaction
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Initial Grid State
    toggleGrid(true);
}

// --- TOOLS ---
function setTool(toolName) {
    state.tool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));

    const map = {
        'select': 'tool-select', 'rect': 'tool-rect',
        'text': 'tool-text', 'line': 'tool-line', 'img': 'tool-img'
    };
    if (map[toolName]) document.getElementById(map[toolName]).classList.add('active');

    canvas.style.cursor = toolName === 'select' ? 'default' : 'crosshair';
}

function setZoom(val) {
    state.zoom = parseFloat(val);
    document.getElementById('canvas-container').style.transform = `scale(${state.zoom})`;
    document.getElementById('zoom-display').textContent = `${Math.round(state.zoom * 100)}%`;
}

function toggleGrid(show) {
    state.grid.show = show;
    if (show) canvas.classList.add('grid-on');
    else canvas.classList.remove('grid-on');
}

// --- ELEMENT MANAGEMENT ---

class ElementModel {
    constructor(type, x, y, w, h) {
        this.id = `el-${state.nextId++}`;
        this.type = type; // rect, text, line, img
        this.x = Math.round(x);
        this.y = Math.round(y);
        this.w = Math.round(w);
        this.h = Math.round(h);
        this.zIndex = 10;

        // Styles
        this.bgColor = (type === 'rect') ? '#ffffff' : 'transparent';
        this.isBgTransparent = (type !== 'rect');
        this.borderWidth = (type === 'line') ? 0 : 1;
        this.borderColor = '#000000';

        // Text Props
        this.content = (type === 'text') ? 'Texto...' : '';
        this.fontFamily = 'Arial, sans-serif';
        this.fontSize = 14;
        this.fontWeight = '400';
        this.textAlign = 'left';
    }
}

function createElement(type, x, y) {
    let w = 100, h = 50;
    if (type === 'text') { w = 150; h = 30; }
    if (type === 'line') { w = 200; h = 2; }

    const el = new ElementModel(type, x, y, w, h);
    state.elements.push(el);
    state.selectedId = el.id;

    renderCanvas();
    renderLayers();
    updatePropPanel();

    // Switch back to select tool after creation
    setTool('select');
}

function deleteSelected() {
    if (!state.selectedId) return;
    state.elements = state.elements.filter(el => el.id !== state.selectedId);
    state.selectedId = null;
    renderCanvas();
    renderLayers();
    updatePropPanel(); // clear
}

// --- RENDERING ---
function renderCanvas() {
    // Clear canvas (keep handles but rebuild nodes)
    canvas.innerHTML = '';

    // Sort by z-index
    const sorted = [...state.elements].sort((a, b) => a.zIndex - b.zIndex);

    sorted.forEach(el => {
        const div = document.createElement('div');
        div.className = `el-node ${state.selectedId === el.id ? 'selected' : ''}`;
        div.dataset.id = el.id;
        div.style.left = `${el.x}px`;
        div.style.top = `${el.y}px`;
        div.style.width = `${el.w}px`;
        div.style.height = `${el.h}px`;
        div.style.zIndex = el.zIndex;

        // Border
        if (el.type === 'line') {
            div.style.backgroundColor = el.borderColor;
            // Logic for line: usually just height or border-top
        } else {
            div.style.border = `${el.borderWidth}px solid ${el.borderColor}`;
            div.style.backgroundColor = el.isBgTransparent ? 'transparent' : el.bgColor;
        }

        // Content
        if (el.type === 'text') {
            const span = document.createElement('div');
            span.className = 'el-text-content';
            span.style.fontFamily = el.fontFamily;
            span.style.fontSize = `${el.fontSize}px`;
            span.style.fontWeight = el.fontWeight;
            span.style.textAlign = el.textAlign;
            span.textContent = el.content;
            div.appendChild(span);
        } else if (el.type === 'custom-html') {
            const container = document.createElement('div');
            container.className = 'el-html-content';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.overflow = 'hidden';
            container.innerHTML = el.content;
            div.appendChild(container);
        }

        // Handles (if selected)
        if (state.selectedId === el.id) {
            ['nw', 'ne', 'sw', 'se'].forEach(pos => {
                const h = document.createElement('div');
                h.className = `el-handle handle-${pos}`;
                h.dataset.handle = pos;
                div.appendChild(h);
            });
        }

        canvas.appendChild(div);
    });
}

function renderLayers() {
    layersList.innerHTML = '';
    // Reverse for UI list (top on top)
    const sorted = [...state.elements].sort((a, b) => b.zIndex - a.zIndex);

    sorted.forEach(el => {
        const item = document.createElement('div');
        item.className = `layer-item ${state.selectedId === el.id ? 'selected' : ''}`;
        item.onclick = () => selectElement(el.id);

        const icon = document.createElement('div');
        icon.className = 'layer-icon';
        icon.innerHTML = getIconForType(el.type);

        const name = document.createElement('div');
        name.className = 'layer-name';
        name.textContent = `${el.id} (${el.type})`;

        item.appendChild(icon);
        item.appendChild(name);
        layersList.appendChild(item);
    });
}

function getIconForType(t) {
    if (t === 'rect') return '<i class="fa-regular fa-square"></i>';
    if (t === 'text') return '<i class="fa-solid fa-font"></i>';
    if (t === 'line') return '<i class="fa-solid fa-minus"></i>';

    if (t === 'custom-html') return '<i class="fa-solid fa-code"></i>';
    return '<i class="fa-solid fa-layer-group"></i>';
}

function selectElement(id) {
    state.selectedId = id;
    renderCanvas();
    renderLayers();
    updatePropPanel();
}

// --- PROPERTIES LOGIC ---
function updatePropPanel() {
    const el = state.elements.find(e => e.id === state.selectedId);
    if (!el) {
        // Clear/Disable inputs
        Object.values(propPanel).forEach(i => { if (i.value !== undefined) i.value = ''; });
        return;
    }

    // Populate General
    propPanel.id.value = el.id;
    propPanel.x.value = el.x;
    propPanel.y.value = el.y;
    propPanel.w.value = el.w;
    propPanel.h.value = el.h;

    // Style
    propPanel.bgTrans.checked = el.isBgTransparent;
    propPanel.bgColor.value = el.bgColor;
    propPanel.bgText.value = el.bgColor;
    propPanel.borderW.value = el.borderWidth;
    propPanel.borderColor.value = el.borderColor;
    propPanel.zindex.value = el.zIndex;

    // Text Special
    if (el.type === 'text') {
        propPanel.textGroup.classList.remove('hidden');
        propPanel.content.value = el.content;
        propPanel.fontFamily.value = el.fontFamily;
        propPanel.fontSize.value = el.fontSize;
        propPanel.fontWeight.value = el.fontWeight;
    } else if (el.type === 'custom-html') {
        propPanel.textGroup.classList.remove('hidden');
        // Hide font specific controls for generic HTML, or keep them if we want to apply to container
        // For now, let's just allow editing the content
        propPanel.content.value = el.content;

        // Disable font inputs visually or just let them stay (they might apply to parent div)
        // keeping them active for flexibility
        propPanel.fontFamily.value = el.fontFamily;
        propPanel.fontSize.value = el.fontSize;
        propPanel.fontWeight.value = el.fontWeight;
    } else {
        propPanel.textGroup.classList.add('hidden');
    }
}

function bindPropertyInputs() {
    const updateEl = (key, val, isInt = false) => {
        const el = state.elements.find(e => e.id === state.selectedId);
        if (!el) return;
        el[key] = isInt ? parseInt(val) : val;
        renderCanvas();
    };

    propPanel.x.oninput = (e) => updateEl('x', e.target.value, true);
    propPanel.y.oninput = (e) => updateEl('y', e.target.value, true);
    propPanel.w.oninput = (e) => updateEl('w', e.target.value, true);
    propPanel.h.oninput = (e) => updateEl('h', e.target.value, true);

    propPanel.bgTrans.onchange = (e) => updateEl('isBgTransparent', e.target.checked);
    propPanel.bgColor.oninput = (e) => {
        propPanel.bgText.value = e.target.value;
        updateEl('bgColor', e.target.value);
    };
    propPanel.borderW.oninput = (e) => updateEl('borderWidth', e.target.value, true);
    propPanel.borderColor.oninput = (e) => updateEl('borderColor', e.target.value);
    propPanel.zindex.oninput = (e) => {
        updateEl('zIndex', e.target.value, true);
        renderLayers();
    };

    // Text
    propPanel.content.oninput = (e) => updateEl('content', e.target.value);
    propPanel.fontFamily.oninput = (e) => updateEl('fontFamily', e.target.value);
    propPanel.fontSize.oninput = (e) => updateEl('fontSize', e.target.value, true);
    propPanel.fontWeight.oninput = (e) => updateEl('fontWeight', e.target.value);
}

// --- INTERACTION (DRAG & DROP) ---
function handleCanvasMouseDown(e) {
    if (state.tool !== 'select') {
        // Create new element
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / state.zoom;
        const y = (e.clientY - rect.top) / state.zoom;
        createElement(state.tool, x, y);
        return;
    }

    // Select existing
    const target = e.target;
    // Check if handle
    if (target.classList.contains('el-handle')) {
        state.isDragging = true;
        state.dragMode = target.dataset.handle; // nw, ne, sw, se
        state.dragStart = { x: e.clientX, y: e.clientY };
        return;
    }

    // Check if node
    const node = target.closest('.el-node');
    if (node) {
        const id = node.dataset.id;
        selectElement(id);

        state.isDragging = true;
        state.dragMode = 'move';
        state.dragStart = { x: e.clientX, y: e.clientY };
    } else {
        // Deselect
        state.selectedId = null;
        renderCanvas();
        renderLayers();
        updatePropPanel();
    }
}

function handleGlobalMouseMove(e) {
    if (!state.isDragging || !state.selectedId) return;

    const el = state.elements.find(e => e.id === state.selectedId);
    if (!el) return;

    const dx = (e.clientX - state.dragStart.x) / state.zoom;
    const dy = (e.clientY - state.dragStart.y) / state.zoom;

    if (state.dragMode === 'move') {
        el.x += dx;
        el.y += dy;

        // Snap logic (Simple 10px snap)
        if (state.grid.snap) {
            el.x = Math.round(el.x / 10) * 10;
            el.y = Math.round(el.y / 10) * 10;
        }
    } else {
        // Resize logic
        if (state.dragMode.includes('e')) el.w += dx;
        if (state.dragMode.includes('s')) el.h += dy;
        // logic for north/west requires moving x/y + adjustment
        // keeping simple for now
    }

    state.dragStart = { x: e.clientX, y: e.clientY };
    renderCanvas();
    updatePropPanel(); // fast update inputs

    // Update coords display
    document.getElementById('coords-display').textContent = `X: ${Math.round(el.x)}px Y: ${Math.round(el.y)}px`;
}

function handleGlobalMouseUp() {
    state.isDragging = false;
    state.dragMode = null;
    if (state.selectedId) renderLayers(); // Re-render in case of z-index visually? No logic changed
}

// --- EXPORT ---
function exportHTML() {
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ficha Exportada</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #eee; }
        .page {
            position: relative;
            width: ${A4_W_MM}mm;
            height: ${A4_H_MM}mm;
            background: white;
            margin: 20px auto;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        @media print {
            body { background: white; margin: 0; }
            .page { margin: 0; box-shadow: none; }
        }
        /* Elements */
`;

    // Generate CSS classes
    state.elements.forEach(el => {
        html += `
        #${el.id} {
            position: absolute;
            left: ${el.x}px;
            top: ${el.y}px;
            width: ${el.w}px;
            height: ${el.h}px;
            z-index: ${el.zIndex};
            ${el.isBgTransparent ? '' : `background-color: ${el.bgColor};`}
            border: ${el.borderWidth}px solid ${el.borderColor};
            ${el.type === 'text' ? `
            font-family: ${el.fontFamily};
            font-size: ${el.fontSize}px;
            font-weight: ${el.fontWeight};
            text-align: ${el.textAlign};
            overflow: hidden;
            display: flex; align-items: center; justify-content: ${el.textAlign === 'center' ? 'center' : 'flex-start'};
            ` : ''}
        }`;
    });

    html += `
    </style>
</head>
<body>
    <div class="page">
`;

    // Generate Markup
    state.elements.forEach(el => {
        // Check for placeholders in content
        const content = el.content ? el.content.replace(/\n/g, '<br>') : '';
        html += `        <div id="${el.id}" class="el-${el.type}">${content}</div>\n`;
    });

    html += `    </div>
</body>
</html>`;

    // Create a Blob and Download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ficha_template.html';
    a.click();
    URL.revokeObjectURL(url);
}

// --- IMPORT LOGIC ---
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        const content = evt.target.result;
        parseAndImportHTML(content);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
}

function parseAndImportHTML(htmlStr) {
    // 1. Parse HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlStr, 'text/html');

    // 2. Identify Elements
    // Strategy: Look for absolute positioned elements in the body or a main container.
    // If we find a 'page' container, use that.

    // Attempt to find a container that looks like a page (A4 dimensions roughly)
    // or just assume body children.

    // We will extract elements that have potential content.
    // To do this effectively, we need to normalize the coordinates.
    // We can't easily rely on computed styles unless we render it.

    // Let's render it into a hidden iframe/div to measure.
    const hiddenFrame = document.createElement('div');
    hiddenFrame.style.position = 'absolute';
    hiddenFrame.style.top = '-9999px';
    hiddenFrame.style.left = '-9999px';
    hiddenFrame.style.width = `${A4_W_PX}px`; // SImulate our canvas
    hiddenFrame.style.visibility = 'hidden';

    // Inject styles from the doc
    const styles = doc.querySelectorAll('style');
    styles.forEach(s => hiddenFrame.appendChild(s.cloneNode(true)));

    // Inject body children
    const children = Array.from(doc.body.children);
    // If there is a single child that is a "page" wrapper, we might want to drill down.
    // Simple heuristic: if 1 child and it's a div, take its children.
    let targetChildren = children;
    if (children.length === 1 && children[0].tagName === 'DIV') {
        // Move common wrapper styles if needed? 
        // For now, assume the user wants the contents of the page.
        targetChildren = Array.from(children[0].children);
    }

    targetChildren.forEach(child => {
        hiddenFrame.appendChild(child.cloneNode(true));
    });

    document.body.appendChild(hiddenFrame);

    // Now measure
    const frameRect = hiddenFrame.getBoundingClientRect();

    // We need to iterate over the *rendered* children in hiddenFrame now
    // logic: hiddenFrame contains <style>...</style> and then elements.
    // We skip styles.

    const renderedElements = Array.from(hiddenFrame.children).filter(el => el.tagName !== 'STYLE' && el.tagName !== 'SCRIPT');

    renderedElements.forEach(el => {
        const rect = el.getBoundingClientRect();

        // Skip elements that are 0x0 or invisible
        if (rect.width < 1 || rect.height < 1) return;

        // Calculate relative pos
        const x = rect.left - frameRect.left;
        const y = rect.top - frameRect.top;

        // Detect Type
        let type = 'custom-html';
        let content = el.innerHTML;

        if (el.tagName === 'IMG') {
            type = 'img';
            // Start simple for images, we might not have 'src' handling fully in this basic version 
            // but let's assume 'custom-html' with an img tag inside is safer for now 
            // unless we update ElementModel to have a 'src' prop.
            // Reverting to custom-html for img to keep it flexible.
            type = 'custom-html';
            content = el.outerHTML;
        } else if (el.tagName === 'TABLE') {
            type = 'custom-html';
            content = el.outerHTML;
        }

        // Clean content?
        // We might want to strip 'position: absolute' from the inline style of the content 
        // because the wrapper handles it.
        // Simple regex replace for common patterns
        content = content.replace(/position:\s*absolute;?/gi, '');
        content = content.replace(/left:\s*[^;]+;?/gi, '');
        content = content.replace(/top:\s*[^;]+;?/gi, '');

        // Create Element
        const newEl = new ElementModel(type, x, y, rect.width, rect.height);
        newEl.content = content; // 'content' property holds the HTML
        newEl.bgColor = 'transparent'; // Defaults
        newEl.isBgTransparent = true;
        newEl.borderWidth = 0; // No border by default for imported content

        state.elements.push(newEl);
    });

    // Cleanup
    document.body.removeChild(hiddenFrame);

    // Rerender
    renderCanvas();
    renderLayers();
    alert(`Importado ${state.elements.length} elementos.`);
}

// Start
init();
