(() => {
"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const paper = $("#paper");
const viewport = $("#paperContainer");
const layer = $("#equationLayer");
const canvas = $("#inkCanvas");
const ctx = canvas.getContext("2d");
const toastEl = $("#toast");
const STORAGE_KEY = "mathsmate-boards-v3";
const DRAFT_KEY = "mathsmate-draft-v3";
const PAPER_WIDTH = 2400;
const PAPER_HEIGHT = 1600;

let objects = [];
let selectedId = null;
let activeProjectId = null;
let undoStack = [];
let redoStack = [];
let zoom = 1;
let dragState = null;
let drawing = false;
let activeStroke = null;
let saveTimer = null;
let currentCategory = "all";
let currentMode = "select";

const groups = [
 {id:"basic",title:"Basic mathematics",items:[["＋","+","Addition"],["−","-","Subtraction"],["×","\\times","Multiplication"],["÷","\\div","Division"],["=","=","Equal"],["≠","\\ne","Not equal"],["±","\\pm","Plus or minus"],["≈","\\approx","Approximately"],["<","<","Less than"],[">",">","Greater than"],["≤","\\le","Less or equal"],["≥","\\ge","Greater or equal"]]},
 {id:"algebra",title:"Algebra and powers",items:[["x²","x^2","Square"],["x³","x^3","Cube"],["xⁿ","x^{n}","Power"],["x₁","x_1","Subscript"],["( )","\\left(\\right)","Brackets"],["|x|","\\left|x\\right|","Absolute value"],["∞","\\infty","Infinity"],["∴","\\therefore","Therefore"],["Σ","\\sum_{i=1}^{n}","Summation"],["√","\\sqrt{x}","Square root"]]},
 {id:"fractions",title:"Fractions and roots",items:[["a⁄b","\\frac{a}{b}","Fraction"],["√x","\\sqrt{x}","Square root"],["∛x","\\sqrt[3]{x}","Cube root"],["ⁿ√x","\\sqrt[n]{x}","Nth root"],["½","\\frac{1}{2}","One half"],["¾","\\frac{3}{4}","Three quarters"],["%","\\%","Percentage"]]},
 {id:"geometry",title:"Geometry and angles",items:[["π","\\pi","Pi"],["θ","\\theta","Theta"],["∠","\\angle","Angle"],["°","^{\\circ}","Degrees"],["△","\\triangle","Triangle"],["⊥","\\perp","Perpendicular"],["∥","\\parallel","Parallel"],["≅","\\cong","Congruent"],["∼","\\sim","Similar"],["AB","\\overline{AB}","Line segment"]]},
 {id:"functions",title:"Functions and trigonometry",items:[["sin","\\sin\\left(x\\right)","Sine"],["cos","\\cos\\left(x\\right)","Cosine"],["tan","\\tan\\left(x\\right)","Tangent"],["log","\\log\\left(x\\right)","Logarithm"],["ln","\\ln\\left(x\\right)","Natural logarithm"],["f(x)","f\\left(x\\right)","Function"],["f′(x)","f'\\left(x\\right)","Derivative"],["lim","\\lim_{x\\to a}","Limit"],["√","\\sqrt{a^2+b^2}","Pythagoras"]]},
 {id:"mensuration",title:"Area, perimeter and volume",items:[["πr²","\\pi r^2","Circle area"],["2πr","2\\pi r","Circumference"],["½bh","\\frac{1}{2}bh","Triangle area"],["l×w","l\\times w","Rectangle area"],["lwh","lwh","Cuboid volume"],["πr²h","\\pi r^2h","Cylinder volume"],["⅓πr²h","\\frac{1}{3}\\pi r^2h","Cone volume"],["⁴⁄₃πr³","\\frac{4}{3}\\pi r^3","Sphere volume"]]}
];

const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const clone = (value) => JSON.parse(JSON.stringify(value));
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}
function getSnapshot() {
  return JSON.stringify({
    objects: clone(objects),
    title: $("#boardTitle").value,
    paper: $("#paperStyle").value
  });
}
function checkpoint() {
  undoStack.push(getSnapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  updateHistoryButtons();
}
function updateHistoryButtons() {
  $("#undoBtn").disabled = undoStack.length === 0;
  $("#redoBtn").disabled = redoStack.length === 0;
}
function scheduleSave() {
  clearTimeout(saveTimer);
  $("#saveStatus").textContent = "Saving…";
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, getSnapshot());
      $("#saveStatus").textContent = "Draft saved";
    } catch (error) {
      $("#saveStatus").textContent = "Storage unavailable";
    }
  }, 400);
}
function updatePlaceholder() {
  $("#placeholder").classList.toggle("hidden", objects.length > 0);
}
function paperPoint(clientX, clientY) {
  const rect = paper.getBoundingClientRect();
  return {
    x: clamp((clientX - rect.left) * (PAPER_WIDTH / rect.width), 0, PAPER_WIDTH - 30),
    y: clamp((clientY - rect.top) * (PAPER_HEIGHT / rect.height), 0, PAPER_HEIGHT - 30)
  };
}
function defaultPosition(offset = 0) {
  return {
    x: clamp((viewport.scrollLeft + 100) / zoom + offset, 20, PAPER_WIDTH - 700),
    y: clamp((viewport.scrollTop + 90) / zoom + offset, 20, PAPER_HEIGHT - 180)
  };
}

function renderPalette(category = "all", query = "") {
  const host = $("#symbolGroups");
  host.replaceChildren();
  const q = query.trim().toLocaleLowerCase();
  groups.filter(group => category === "all" || group.id === category).forEach(group => {
    const items = group.items.filter(item => `${item[0]} ${item[2]}`.toLocaleLowerCase().includes(q));
    if (!items.length) return;
    const section = document.createElement("section");
    section.className = "symbol-group";
    const heading = document.createElement("h3");
    heading.className = "group-title";
    heading.textContent = group.title;
    const grid = document.createElement("div");
    grid.className = "symbol-grid";
    items.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "symbol-btn";
      button.title = item[2];
      const symbol = document.createElement("span");
      symbol.className = "symbol";
      symbol.textContent = item[0];
      const label = document.createElement("small");
      label.textContent = item[2];
      button.append(symbol, label);
      button.addEventListener("click", () => insertTemplate(item[1]));
      grid.append(button);
    });
    section.append(heading, grid);
    host.append(section);
  });
  if (!host.children.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "No matching symbols.";
    host.append(empty);
  }
}

$("#categoryTabs").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  currentCategory = button.dataset.category;
  $$(".cat-tab").forEach(tab => tab.classList.toggle("active", tab === button));
  renderPalette(currentCategory, $("#symbolSearch").value);
});
$("#symbolSearch").addEventListener("input", () => renderPalette(currentCategory, $("#symbolSearch").value));

function addObject(object, focus = false) {
  objects.push(object);
  selectedId = object.id;
  renderObjects(object.id, focus);
  scheduleSave();
  return object;
}
function createEquation(x, y, latex = "", focus = true) {
  return addObject({
    id: uid(), kind: "eq", latex, x, y,
    w: 620, h: 82, fontSize: 34,
    fontFamily: "Inter, sans-serif"
  }, focus);
}
function addEquation() {
  checkpoint();
  const pos = defaultPosition();
  createEquation(pos.x, pos.y, "", true);
}
function createNote() {
  checkpoint();
  const pos = defaultPosition(25);
  addObject({
    id: uid(), kind: "note", text: "",
    x: pos.x, y: pos.y, w: 520, h: 150,
    fontSize: 19, fontFamily: "Inter, sans-serif"
  }, true);
}
function insertTemplate(latex) {
  const object = objects.find(item => item.id === selectedId);
  const editor = selectedId && layer.querySelector(`[data-id="${CSS.escape(selectedId)}"] math-field`);
  if (object && object.kind === "eq" && editor) {
    try {
      editor.focus();
      if (typeof editor.insert === "function") editor.insert(latex);
      else editor.value = (editor.value || "") + latex;
      object.latex = editor.value;
      scheduleSave();
      return;
    } catch (_) {}
  }
  checkpoint();
  const pos = defaultPosition();
  createEquation(pos.x, pos.y, latex, true);
}
function selectObject(id) {
  selectedId = id;
  $$(".board-object").forEach(element => element.classList.toggle("selected", element.dataset.id === id));
  syncFontControls();
}
function syncFontControls() {
  const object = objects.find(item => item.id === selectedId);
  if (!object) return;
  $("#objectFontSize").value = object.fontSize || (object.kind === "eq" ? 34 : 19);
  $("#objectSizeValue").textContent = `${$("#objectFontSize").value}px`;
  $("#fontFamily").value = object.fontFamily || "Inter, sans-serif";
}

function autoGrow(textarea, object) {
  if (object.manualHeight) return;
  textarea.style.height = "auto";
  const needed = Math.max(90, textarea.scrollHeight + 4);
  textarea.style.height = `${needed}px`;
  object.h = Math.max(125, needed + 42);
  const element = textarea.closest(".board-object");
  if (element) element.style.height = `${object.h}px`;
}

function renderObjects(focusId = null, focusEditor = false) {
  layer.replaceChildren();
  objects.forEach(object => {
    if (object.kind === "ink") return;
    const element = document.createElement("div");
    element.className = `board-object ${object.kind}-object${object.id === selectedId ? " selected" : ""}`;
    element.dataset.id = object.id;
    element.style.left = `${object.x}px`;
    element.style.top = `${object.y}px`;
    element.style.width = `${object.w || 520}px`;
    element.style.height = `${object.h || 100}px`;

    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "object-drag-handle";
    handle.title = "Drag to move";
    handle.textContent = "⠿";
    handle.addEventListener("pointerdown", event => {
      event.preventDefault();
      event.stopPropagation();
      checkpoint();
      selectObject(object.id);
      const rect = element.getBoundingClientRect();
      dragState = {
        id: object.id,
        offsetX: (event.clientX - rect.left) * (PAPER_WIDTH / paper.getBoundingClientRect().width) - object.x,
        offsetY: (event.clientY - rect.top) * (PAPER_HEIGHT / paper.getBoundingClientRect().height) - object.y
      };
      try { handle.setPointerCapture(event.pointerId); } catch (_) {}
    });
    element.append(handle);

    if (object.kind === "eq") {
      const field = document.createElement("math-field");
      field.className = "equation-field";
      field.value = object.latex || "";
      field.style.fontSize = `${object.fontSize || 34}px`;
      field.setAttribute("virtual-keyboard-mode", "manual");
      field.setAttribute("smart-mode", "true");
      field.setAttribute("aria-label", "Mathematical equation");
      field.addEventListener("input", () => {
        object.latex = field.value;
        scheduleSave();
      });
      field.addEventListener("focus", () => selectObject(object.id));
      field.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          checkpoint();
          const nextY = object.y + Math.max(element.offsetHeight, object.h) + 18;
          createEquation(object.x, Math.min(nextY, PAPER_HEIGHT - 100), "", true);
        }
      });
      element.append(field);
    } else if (object.kind === "note") {
      const textarea = document.createElement("textarea");
      textarea.className = "note-edit";
      textarea.value = object.text || "";
      textarea.placeholder = "Write your explanation, working steps or answer…";
      textarea.style.fontSize = `${object.fontSize || 19}px`;
      textarea.style.fontFamily = object.fontFamily || "Inter, sans-serif";
      textarea.spellcheck = true;
      textarea.addEventListener("input", () => {
        object.text = textarea.value;
        autoGrow(textarea, object);
        scheduleSave();
      });
      textarea.addEventListener("focus", () => selectObject(object.id));
      textarea.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.shiftKey) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = textarea.value.slice(0, start);
        const currentLine = before.split("\n").pop();
        const match = currentLine.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
        if (match) {
          event.preventDefault();
          // Pressing Enter on an empty list item exits the list.
          if (!match[3].trim()) {
            const lineStart = before.lastIndexOf("\n") + 1;
            textarea.setRangeText("\n", lineStart, end, "end");
          } else {
            const marker = /^\d/.test(match[2])
              ? `${Number.parseInt(match[2], 10) + 1}. `
              : `${match[2]} `;
            textarea.setRangeText(`\n${match[1]}${marker}`, start, end, "end");
          }
          object.text = textarea.value;
          autoGrow(textarea, object);
          scheduleSave();
        }
      });
      element.append(textarea);
      requestAnimationFrame(() => autoGrow(textarea, object));
    } else if (object.kind === "shape") {
      const holder = document.createElement("div");
      holder.className = "shape-holder";
      holder.innerHTML = object.svg;
      element.append(holder);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-object";
    remove.textContent = "×";
    remove.title = "Delete object";
    remove.addEventListener("pointerdown", event => event.stopPropagation());
    remove.addEventListener("click", event => {
      event.stopPropagation();
      checkpoint();
      objects = objects.filter(item => item.id !== object.id);
      selectedId = null;
      renderObjects();
      redrawInk();
      scheduleSave();
    });
    element.append(remove);

    element.addEventListener("pointerdown", event => {
      if (event.target.closest("math-field,textarea,button")) return;
      selectObject(object.id);
    });
    element.addEventListener("click", event => {
      if (!event.target.closest("button")) selectObject(object.id);
    });
    layer.append(element);
    if (typeof ResizeObserver !== "undefined") {
      let resizeFrame = 0;
      const observer = new ResizeObserver(() => {
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          const width = Math.round(element.getBoundingClientRect().width / zoom);
          const height = Math.round(element.getBoundingClientRect().height / zoom);
          if (width > 0 && height > 0 && (Math.abs((object.w || 520) - width) > 2 || Math.abs((object.h || 100) - height) > 2)) {
            object.w = width;
            object.h = height;
            if (element.dataset.userResizing === "true") object.manualHeight = true;
            scheduleSave();
          }
        });
      });
      observer.observe(element);
      element._resizeObserver = observer;
    }
    element.addEventListener("pointerdown", event => {
      const rect = element.getBoundingClientRect();
      if (event.clientX >= rect.right - 22 && event.clientY >= rect.bottom - 22) {
        element.dataset.userResizing = "true";
      }
    });
    element.addEventListener("pointerup", () => { element.dataset.userResizing = "false"; });
    if (focusId === object.id && focusEditor) {
      requestAnimationFrame(() => element.querySelector("math-field,textarea")?.focus());
    }
  });
  updatePlaceholder();
  syncFontControls();
}

function restore(data) {
  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  objects = Array.isArray(parsed.objects) ? parsed.objects : [];
  $("#boardTitle").value = parsed.title || "Untitled board";
  $("#paperStyle").value = ["grid","dots","lines","plain"].includes(parsed.paper) ? parsed.paper : "grid";
  paper.className = `paper ${$("#paperStyle").value}`;
  selectedId = null;
  renderObjects();
  redrawInk();
  updatePlaceholder();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(getSnapshot());
  restore(undoStack.pop());
  updateHistoryButtons();
  scheduleSave();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(getSnapshot());
  restore(redoStack.pop());
  updateHistoryButtons();
  scheduleSave();
}

$("#addEquation").addEventListener("click", addEquation);
$("#addNote").addEventListener("click", createNote);
paper.addEventListener("pointerdown", event => {
  if (currentMode !== "select") return;
  if (event.target.closest(".board-object") || event.target.closest(".paper-placeholder")) return;
  if (event.target === canvas) return;
  if (event.button !== 0) return;
  const point = paperPoint(event.clientX, event.clientY);
  checkpoint();
  createEquation(point.x, point.y, "", true);
});
window.addEventListener("pointermove", event => {
  if (!dragState) return;
  const object = objects.find(item => item.id === dragState.id);
  if (!object) return;
  const rect = paper.getBoundingClientRect();
  object.x = clamp((event.clientX - rect.left) * (PAPER_WIDTH / rect.width) - dragState.offsetX, 0, PAPER_WIDTH - 80);
  object.y = clamp((event.clientY - rect.top) * (PAPER_HEIGHT / rect.height) - dragState.offsetY, 0, PAPER_HEIGHT - 60);
  const element = layer.querySelector(`[data-id="${CSS.escape(object.id)}"]`);
  if (element) {
    element.style.left = `${object.x}px`;
    element.style.top = `${object.y}px`;
  }
});
window.addEventListener("pointerup", () => {
  if (dragState) {
    dragState = null;
    scheduleSave();
  }
});
window.addEventListener("pointercancel", () => { dragState = null; });

$("#boardTitle").addEventListener("input", scheduleSave);
$("#paperStyle").addEventListener("change", () => {
  paper.classList.remove("grid","dots","lines","plain");
  paper.classList.add($("#paperStyle").value);
  scheduleSave();
});
$("#undoBtn").addEventListener("click", undo);
$("#redoBtn").addEventListener("click", redo);

$("#objectFontSize").addEventListener("input", event => {
  const object = objects.find(item => item.id === selectedId);
  if (!object) return;
  object.fontSize = Number(event.target.value);
  const editor = layer.querySelector(`[data-id="${CSS.escape(object.id)}"] math-field, [data-id="${CSS.escape(object.id)}"] textarea`);
  if (editor) editor.style.fontSize = `${object.fontSize}px`;
  $("#objectSizeValue").textContent = `${object.fontSize}px`;
  scheduleSave();
});
$("#fontFamily").addEventListener("change", event => {
  const object = objects.find(item => item.id === selectedId);
  if (!object) {
    toast("Select a text box first to change its font.");
    return;
  }
  if (object.kind === "eq") {
    toast("Font family changes apply to text boxes. Equation fonts are controlled by MathLive.");
    return;
  }
  object.fontFamily = event.target.value;
  const editor = layer.querySelector(`[data-id="${CSS.escape(object.id)}"] textarea`);
  if (editor) editor.style.fontFamily = object.fontFamily;
  scheduleSave();
});
function setZoom(value) {
  zoom = clamp(value, 0.5, 1.5);
  paper.style.zoom = String(zoom);
  $("#zoomLabel").textContent = `${Math.round(zoom * 100)}%`;
}
$("#zoomIn").addEventListener("click", () => setZoom(zoom + 0.1));
$("#zoomOut").addEventListener("click", () => setZoom(zoom - 0.1));

$("#helpBtn").addEventListener("click", () => $("#helpDialog").showModal());
$("#closeHelp").addEventListener("click", () => $("#helpDialog").close());
$("#addShape").addEventListener("click", () => $("#shapeDialog").showModal());
$("#closeShape").addEventListener("click", () => $("#shapeDialog").close());

const shapeSvg = {
 triangle:'<svg viewBox="0 0 180 150"><polygon points="90,8 170,138 10,138"/></svg>',
 rightTriangle:'<svg viewBox="0 0 180 150"><polygon points="20,15 20,135 165,135"/></svg>',
 square:'<svg viewBox="0 0 160 140"><rect x="18" y="10" width="124" height="124"/></svg>',
 rectangle:'<svg viewBox="0 0 180 130"><rect x="10" y="20" width="160" height="90"/></svg>',
 circle:'<svg viewBox="0 0 160 140"><circle cx="80" cy="70" r="58"/></svg>',
 semicircle:'<svg viewBox="0 0 180 120"><path d="M10 105 A80 80 0 0 1 170 105 Z"/></svg>',
 sector:'<svg viewBox="0 0 180 150"><path d="M90 75 L170 75 A80 80 0 0 0 50 10 Z"/></svg>',
 arc:'<svg viewBox="0 0 180 140"><path d="M15 120 A80 80 0 0 1 165 120"/></svg>',
 oval:'<svg viewBox="0 0 180 130"><ellipse cx="90" cy="65" rx="78" ry="48"/></svg>',
 rhombus:'<svg viewBox="0 0 180 140"><polygon points="90,8 168,70 90,132 12,70"/></svg>',
 parallelogram:'<svg viewBox="0 0 180 130"><polygon points="48,15 170,15 132,115 10,115"/></svg>',
 trapezoid:'<svg viewBox="0 0 180 130"><polygon points="48,15 132,15 170,115 10,115"/></svg>',
 pentagon:'<svg viewBox="0 0 180 150"><polygon points="90,8 170,65 140,140 40,140 10,65"/></svg>',
 hexagon:'<svg viewBox="0 0 180 140"><polygon points="45,10 135,10 175,70 135,130 45,130 5,70"/></svg>',
 octagon:'<svg viewBox="0 0 180 140"><polygon points="48,8 132,8 172,48 172,92 132,132 48,132 8,92 8,48"/></svg>',
 line:'<svg viewBox="0 0 180 140"><line x1="10" y1="125" x2="170" y2="15"/></svg>',
 cube:'<svg viewBox="0 0 180 160"><polygon points="55,48 112,18 165,48 108,80"/><polygon points="55,48 108,80 108,145 55,112"/><polygon points="108,80 165,48 165,112 108,145"/><polyline points="55,48 55,112 108,145 165,112 165,48"/><line class="hidden-edge" x1="108" y1="80" x2="108" y2="145"/><line class="hidden-edge" x1="55" y1="48" x2="108" y2="18"/></svg>',
 cuboid:'<svg viewBox="0 0 190 155"><polygon points="25,48 115,18 170,48 80,80"/><polygon points="25,48 80,80 80,140 25,108"/><polygon points="80,80 170,48 170,108 80,140"/><polyline points="25,48 25,108 80,140 170,108 170,48"/></svg>',
 cylinder:'<svg viewBox="0 0 170 160"><path d="M25 35 A60 18 0 0 1 145 35 L145 125 A60 18 0 0 1 25 125 Z"/><path d="M25 35 A60 18 0 0 0 145 35"/><path d="M25 125 A60 18 0 0 0 145 125"/></svg>',
 cone:'<svg viewBox="0 0 170 160"><path d="M85 12 L25 130 A60 18 0 0 0 145 130 Z"/><path d="M25 130 A60 18 0 0 1 145 130"/></svg>',
 sphere:'<svg viewBox="0 0 160 150"><circle cx="80" cy="75" r="62"/><ellipse cx="80" cy="75" rx="62" ry="23"/><path d="M80 13 C45 40 45 110 80 137 M80 13 C115 40 115 110 80 137"/></svg>',
 hemisphere:'<svg viewBox="0 0 170 130"><path d="M20 95 A65 65 0 0 1 150 95 Z"/><path d="M20 95 A65 18 0 0 0 150 95"/></svg>',
 squarePyramid:'<svg viewBox="0 0 180 155"><polygon points="90,12 20,115 90,140 160,115"/><line x1="90" y1="12" x2="90" y2="140"/><line x1="20" y1="115" x2="160" y2="115"/><line class="hidden-edge" x1="90" y1="12" x2="90" y2="140"/></svg>',
 triangularPrism:'<svg viewBox="0 0 190 150"><polygon points="20,105 55,30 90,105"/><polygon points="95,125 130,50 165,125"/><line x1="20" y1="105" x2="95" y2="125"/><line x1="55" y1="30" x2="130" y2="50"/><line x1="90" y1="105" x2="165" y2="125"/></svg>',
 angle:'<svg viewBox="0 0 180 140"><line x1="25" y1="120" x2="150" y2="120"/><line x1="25" y1="120" x2="100" y2="18"/><path d="M60 120 A35 35 0 0 0 45 92"/><text x="62" y="105">θ</text></svg>',
 parallel:'<svg viewBox="0 0 180 140"><line x1="20" y1="45" x2="160" y2="45"/><line x1="20" y1="95" x2="160" y2="95"/><text x="145" y="32">a</text><text x="145" y="82">b</text></svg>',
 perpendicular:'<svg viewBox="0 0 180 140"><line x1="25" y1="105" x2="155" y2="105"/><line x1="90" y1="15" x2="90" y2="125"/><path d="M90 85 L110 85 L110 105"/></svg>',
 coordinateAxes:'<svg viewBox="0 0 180 150"><line x1="20" y1="125" x2="165" y2="125"/><line x1="35" y1="138" x2="35" y2="10"/><polyline points="155,118 165,125 155,132"/><polyline points="28,20 35,10 42,20"/><text x="155" y="143">x</text><text x="18" y="15">y</text></svg>',
 numberLine:'<svg viewBox="0 0 190 120"><line x1="12" y1="55" x2="178" y2="55"/><polyline points="20,48 12,55 20,62"/><polyline points="170,48 178,55 170,62"/><g><line x1="45" y1="47" x2="45" y2="63"/><line x1="75" y1="47" x2="75" y2="63"/><line x1="105" y1="47" x2="105" y2="63"/><line x1="135" y1="47" x2="135" y2="63"/></g><text x="40" y="82">−2</text><text x="71" y="82">−1</text><text x="102" y="82">0</text><text x="132" y="82">1</text></svg>',
 arrow:'<svg viewBox="0 0 180 120"><line x1="15" y1="60" x2="155" y2="60"/><polyline points="137,42 155,60 137,78"/></svg>'
};
$$("[data-shape]").forEach(button => button.addEventListener("click", () => {
  checkpoint();
  const pos = defaultPosition(35);
  const shapeName = button.dataset.shape;
  const solid = ["cube","cuboid","cylinder","cone","sphere","hemisphere","squarePyramid","triangularPrism"].includes(shapeName);
  addObject({id:uid(),kind:"shape",shape:shapeName,svg:shapeSvg[shapeName],x:pos.x,y:pos.y,w:solid?280:240,h:solid?230:190}, false);
  $("#shapeDialog").close();
}));

function setDrawMode(mode) {
  currentMode = mode;
  ["selectMode","penMode","eraserMode"].forEach(id => {
    $(`#${id}`).classList.toggle("selected", id === `${mode}Mode`);
  });
  canvas.style.pointerEvents = mode === "select" ? "none" : "auto";
  canvas.style.touchAction = mode === "select" ? "auto" : "none";
  paper.style.cursor = mode === "pen" ? "crosshair" : mode === "eraser" ? "cell" : "default";
  canvas.dataset.mode = mode;
  toast(mode === "pen" ? "Pen mode: draw with mouse, touchpad or stylus." :
    mode === "eraser" ? "Eraser mode: drag over ink to erase." :
    "Select mode: add, move and edit objects.");
}
$("#selectMode").addEventListener("click", () => setDrawMode("select"));
$("#penMode").addEventListener("click", () => setDrawMode("pen"));
$("#eraserMode").addEventListener("click", () => setDrawMode("eraser"));

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = PAPER_WIDTH * dpr;
  canvas.height = PAPER_HEIGHT * dpr;
  canvas.style.width = `${PAPER_WIDTH}px`;
  canvas.style.height = `${PAPER_HEIGHT}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawInk();
}
function redrawInk() {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  objects.filter(object => object.kind === "ink").forEach(stroke => {
    if (!stroke.points || !stroke.points.length) return;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.size || 4;
    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke.points[0].x, stroke.points[0].y, (stroke.size || 4) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let index = 1; index < stroke.points.length - 1; index++) {
      const current = stroke.points[index];
      const next = stroke.points[index + 1];
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  });
}
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {x:(event.clientX - rect.left) * (PAPER_WIDTH / rect.width),y:(event.clientY - rect.top) * (PAPER_HEIGHT / rect.height)};
}
function getSamples(event) {
  try {
    const samples = event.getCoalescedEvents?.();
    return samples && samples.length ? samples : [event];
  } catch (_) {
    return [event];
  }
}
canvas.addEventListener("pointerdown", event => {
  if (currentMode !== "pen" && currentMode !== "eraser") return;
  if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;
  event.preventDefault();
  try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
  const point = canvasPoint(event);
  if (currentMode === "eraser") {
    checkpoint();
    const radius = Number($("#brushSize").value) * 3;
    const before = objects.length;
    objects = objects.filter(object => object.kind !== "ink" ||
      !object.points?.some(p => Math.hypot(p.x - point.x, p.y - point.y) <= radius));
    if (objects.length !== before) {
      redrawInk();
      scheduleSave();
    }
    drawing = true;
    activeStroke = {eraser:true,last:point};
    return;
  }
  checkpoint();
  drawing = true;
  activeStroke = {
    id:uid(),kind:"ink",color:$("#penColor").value,
    size:Number($("#brushSize").value),points:[point]
  };
  objects.push(activeStroke);
  redrawInk();
});
canvas.addEventListener("pointermove", event => {
  if (!drawing || !activeStroke) return;
  event.preventDefault();
  const samples = getSamples(event);
  if (activeStroke.eraser) {
    const radius = Number($("#brushSize").value) * 3;
    let changed = false;
    samples.forEach(sample => {
      const p = canvasPoint(sample);
      const before = objects.length;
      objects = objects.filter(object => object.kind !== "ink" ||
        !object.points?.some(q => Math.hypot(q.x-p.x,q.y-p.y) <= radius));
      changed ||= before !== objects.length;
    });
    activeStroke.last = canvasPoint(event);
    if (changed) redrawInk();
    return;
  }
  samples.forEach(sample => activeStroke.points.push(canvasPoint(sample)));
  redrawInk();
});
function finishPointer() {
  if (!drawing) return;
  drawing = false;
  activeStroke = null;
  scheduleSave();
}
canvas.addEventListener("pointerup", finishPointer);
canvas.addEventListener("pointercancel", finishPointer);
$("#brushSize").addEventListener("input", event => {
  $("#brushSizeValue").textContent = `${event.target.value} px`;
});
$("#clearInkBtn").addEventListener("click", () => {
  if (!objects.some(object => object.kind === "ink")) return;
  checkpoint();
  objects = objects.filter(object => object.kind !== "ink");
  redrawInk();
  scheduleSave();
});

function getProjects() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}
function setProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
function saveBoard() {
  const title = $("#boardTitle").value.trim() || "My Maths Board";
  $("#boardTitle").value = title;
  const data = {objects:clone(objects),title,paper:$("#paperStyle").value};
  const projects = getProjects();
  const id = activeProjectId || uid();
  const entry = {id,title,data,updatedAt:new Date().toISOString()};
  const index = projects.findIndex(project => project.id === id);
  if (index >= 0) projects[index] = entry;
  else projects.unshift(entry);
  try {
    setProjects(projects);
    activeProjectId = id;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    $("#saveStatus").textContent = "Saved";
    toast("Board saved successfully.");
  } catch (_) {
    toast("Browser storage is full. Delete old boards or export a PDF.");
  }
}
function renderSavedBoards() {
  const host = $("#savedBoardsList");
  host.replaceChildren();
  const projects = getProjects();
  if (!projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "No saved boards yet.";
    host.append(empty);
    return;
  }
  projects.forEach(project => {
    const row = document.createElement("div");
    row.className = "saved-board-row";
    const info = document.createElement("div");
    info.className = "saved-board-info";
    const title = document.createElement("b");
    title.textContent = project.title;
    const date = document.createElement("small");
    date.textContent = new Date(project.updatedAt).toLocaleString();
    info.append(title,date);
    const open = document.createElement("button");
    open.className = "small-action";
    open.textContent = "Open";
    open.addEventListener("click", () => {
      if (objects.length && !confirm("Open this board? Current unsaved work will be replaced.")) return;
      activeProjectId = project.id;
      restore(project.data);
      undoStack = [];
      redoStack = [];
      updateHistoryButtons();
      $("#boardsDialog").close();
      viewport.scrollTo(0,0);
      scheduleSave();
    });
    const remove = document.createElement("button");
    remove.className = "small-action danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => {
      if (!confirm("Delete this saved board?")) return;
      setProjects(getProjects().filter(item => item.id !== project.id));
      if (activeProjectId === project.id) activeProjectId = null;
      renderSavedBoards();
    });
    row.append(info,open,remove);
    host.append(row);
  });
}
$("#saveBtn").addEventListener("click", saveBoard);
$("#openBoardBtn").addEventListener("click", () => {
  renderSavedBoards();
  $("#boardsDialog").showModal();
});
$("#closeBoards").addEventListener("click", () => $("#boardsDialog").close());
$("#newBoardBtn").addEventListener("click", () => {
  if (objects.length && !confirm("Start a new blank board? Save your current board first if needed.")) return;
  objects = [];
  selectedId = null;
  activeProjectId = null;
  undoStack = [];
  redoStack = [];
  $("#boardTitle").value = "New Maths Board";
  $("#paperStyle").value = "grid";
  paper.className = "paper grid";
  viewport.scrollTo(0,0);
  renderObjects();
  redrawInk();
  updateHistoryButtons();
  scheduleSave();
});
$("#downloadBtn").addEventListener("click", () => {
  renderObjects();
  redrawInk();
  window.print();
});

document.addEventListener("keydown", event => {
  const target = event.target;
  const editing = target && (target.matches("input,textarea,math-field,select") || target.isContentEditable);
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !editing) {
    event.preventDefault();
    undo();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y" && !editing) {
    event.preventDefault();
    redo();
  } else if (event.key === "Escape" && !editing) {
    selectedId = null;
    $$(".board-object").forEach(element => element.classList.remove("selected"));
  }
});

window.addEventListener("beforeunload", () => {
  try { localStorage.setItem(DRAFT_KEY, getSnapshot()); } catch (_) {}
});
window.addEventListener("resize", () => {
  // Canvas backing resolution follows the current display density.
  resizeCanvas();
});

renderPalette();
resizeCanvas();
updatePlaceholder();
updateHistoryButtons();
setDrawMode("select");
try {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) restore(draft);
} catch (_) {}
})();