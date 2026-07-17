/* ==========================================================================
   ZIP — level-based path puzzle
   Rules per level: draw ONE continuous path that starts at 1, passes through
   every number in order (1 → 2 → 3 …) and fills EVERY cell on the board.
   Each level increases difficulty (bigger grid, fewer checkpoints).
   Backtracks (undoing moves) are counted as mistakes.
   ========================================================================== */

const gameBoard    = document.getElementById("game-board");
const svg          = document.getElementById("path-svg");
const restartBtn   = document.getElementById("restart-btn");
const newBtn       = document.getElementById("new-btn");
const undoBtn      = document.getElementById("undo-btn");
const timeEl       = document.getElementById("time");
const progressEl   = document.getElementById("progress");
const backtracksEl = document.getElementById("backtracks");
const levelNameEl  = document.getElementById("level-name");
const diffEl       = document.getElementById("diff");
const overlay      = document.getElementById("overlay");
const winTitleEl   = document.getElementById("win-title");
const winTimeEl    = document.getElementById("win-time");
const winBtEl      = document.getElementById("win-backtracks");
const nextBtn      = document.getElementById("next-btn");
const replayBtn    = document.getElementById("replay-btn");

const SVG_NS = "http://www.w3.org/2000/svg";
const STORE_KEY = "zip-level";

/* ---- Difficulty curve: {grid, cp = number of checkpoints} ---- */
const LEVELS = [
    { grid: 5, cp: 6 }, { grid: 5, cp: 5 }, { grid: 5, cp: 4 },
    { grid: 6, cp: 6 }, { grid: 6, cp: 5 }, { grid: 6, cp: 4 },
    { grid: 7, cp: 6 }, { grid: 7, cp: 5 }, { grid: 7, cp: 4 },
];
function configForLevel(level) {
    if (level <= LEVELS.length) return LEVELS[level - 1];
    const over = level - LEVELS.length;              // 1, 2, 3 …
    return { grid: 8, cp: Math.max(3, 6 - (over - 1)) };
}
function difficultyFor(level) {
    if (level <= 2) return { name: "Easy",   cls: "easy" };
    if (level <= 4) return { name: "Medium", cls: "medium" };
    if (level <= 6) return { name: "Hard",   cls: "hard" };
    if (level <= 9) return { name: "Expert", cls: "expert" };
    return { name: "Master", cls: "master" };
}

/* ---- State ---- */
let level = loadLevel();
let grid = 5;
let total = 25;
let puzzle = {};
let maxNumber = 6;

let cells = [];
let path = [];
let nextNumber = 2;
let isDrawing = false;
let backtracks = 0;
let solved = false;

let timerId = null;
let seconds = 0;
let hasStarted = false;

startLevel(level);

/* ==========================================================================
   Puzzle generation — random Hamiltonian path (backbite), always solvable
   ========================================================================== */
function neighborsOf(i, n) {
    const r = Math.floor(i / n), c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
}
function snakePath(n) {
    const p = [];
    for (let r = 0; r < n; r++) {
        if (r % 2 === 0) for (let c = 0; c < n; c++) p.push(r * n + c);
        else for (let c = n - 1; c >= 0; c--) p.push(r * n + c);
    }
    return p;
}
function reverseSeg(arr, pos, a, b) {
    while (a < b) {
        const t = arr[a]; arr[a] = arr[b]; arr[b] = t;
        pos[arr[a]] = a; pos[arr[b]] = b;
        a++; b--;
    }
}
function generateHamiltonian(n) {
    const order = snakePath(n);
    const pos = new Array(n * n);
    order.forEach((cell, i) => (pos[cell] = i));
    const cellCount = n * n;
    const iterations = cellCount * 12;

    for (let it = 0; it < iterations; it++) {
        if (Math.random() < 0.5) {
            const tail = order[cellCount - 1];
            const nb = neighborsOf(tail, n);
            const i = pos[nb[(Math.random() * nb.length) | 0]];
            if (i < cellCount - 2) reverseSeg(order, pos, i + 1, cellCount - 1);
        } else {
            const head = order[0];
            const nb = neighborsOf(head, n);
            const i = pos[nb[(Math.random() * nb.length) | 0]];
            if (i >= 2) reverseSeg(order, pos, 0, i - 1);
        }
    }
    return order;
}
function buildPuzzle(n, cp) {
    const order = generateHamiltonian(n);
    const p = {};
    for (let i = 0; i < cp; i++) {
        const at = Math.round((i * (order.length - 1)) / (cp - 1));
        p[order[at]] = i + 1;
    }
    return p;
}

/* ==========================================================================
   Level / board setup
   ========================================================================== */
function startLevel(lvl) {
    level = lvl;
    saveLevel(level);

    const cfg = configForLevel(level);
    grid = cfg.grid;
    total = grid * grid;
    maxNumber = cfg.cp;
    puzzle = buildPuzzle(grid, cfg.cp);

    const diff = difficultyFor(level);
    levelNameEl.textContent = `Level ${level}`;
    diffEl.textContent = diff.name;
    diffEl.className = `diff ${diff.cls}`;

    const gap = grid <= 5 ? 8 : grid === 6 ? 7 : grid === 7 ? 6 : 5;
    const radius = grid <= 5 ? 14 : grid === 6 ? 12 : grid === 7 ? 11 : 9;
    gameBoard.style.setProperty("--gap", `${gap}px`);
    document.documentElement.style.setProperty("--cell-radius", `${radius}px`);
    gameBoard.style.gridTemplateColumns = `repeat(${grid}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${grid}, 1fr)`;

    buildBoard(true);
    resetTimer();
}

function buildBoard(animateIn) {
    path = [];
    nextNumber = 2;
    isDrawing = false;
    backtracks = 0;
    solved = false;
    svg.innerHTML = "";
    gameBoard.innerHTML = "";
    cells = [];

    for (let i = 0; i < total; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.index = i;

        if (puzzle[i]) {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = puzzle[i];
            cell.appendChild(badge);
            if (puzzle[i] === 1) cell.classList.add("start");
        }
        if (animateIn) {
            cell.classList.add("enter");
            cell.style.setProperty("--d", i);
        }

        cell.addEventListener("pointerdown", onPointerDown);
        gameBoard.appendChild(cell);
        cells.push(cell);
    }
    updateProgress();
    updateBacktracks();
    updateUndoState();
}

/* ==========================================================================
   Pointer handling (mouse + touch, with smooth interpolation)
   ========================================================================== */
function onPointerDown(event) {
    const cell = event.currentTarget;
    if (puzzle[Number(cell.dataset.index)] !== 1) return; // must start on 1

    event.preventDefault();
    clearPath();
    isDrawing = true;
    nextNumber = 2;
    startTimer();
    path.push(cell);
    render();
}

document.addEventListener("pointermove", (event) => {
    if (!isDrawing) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el) return;
    const cell = el.closest(".cell");
    if (!cell || !gameBoard.contains(cell)) return;
    continueDrawing(cell);
});

document.addEventListener("pointerup", () => { isDrawing = false; });

function continueDrawing(target) {
    let changed = false;

    // Dragging back over the path → rewind to the hovered cell (counts as backtracks)
    const existing = path.indexOf(target);
    if (existing !== -1) {
        if (existing < path.length - 1) {
            backtracks += path.length - 1 - existing;
            path.length = existing + 1;
            changed = true;
        }
    } else {
        // Advance toward the target one straight step at a time (smooth fast drags)
        let guard = 0;
        while (guard++ < total) {
            const last = path[path.length - 1];
            const step = stepToward(last, target);
            if (step === null) break;
            const cell = cells[step];
            if (!canAdd(cell)) break;
            path.push(cell);
            if (puzzle[step] === nextNumber) nextNumber++;
            changed = true;
            if (cell === target) break;
        }
    }

    if (changed) { render(); checkWin(); }
}

function stepToward(last, target) {
    const li = Number(last.dataset.index);
    const ti = Number(target.dataset.index);
    const lr = Math.floor(li / grid), lc = li % grid;
    const tr = Math.floor(ti / grid), tc = ti % grid;
    if (lr === tr && lc !== tc) return li + (tc > lc ? 1 : -1);
    if (lc === tc && lr !== tr) return li + (tr > lr ? grid : -grid);
    return null; // not on a straight line — wait for the next event
}

function canAdd(cell) {
    if (path.includes(cell)) return false;
    const num = puzzle[Number(cell.dataset.index)];
    if (num && num !== nextNumber) return false; // numbers must be in order
    return true;
}

/* Undo one step (also a backtrack) */
function undo() {
    if (solved || path.length <= 1) return;
    path.pop();
    backtracks++;
    render();
    checkWin();
}

/* ==========================================================================
   Rendering
   ========================================================================== */
function render() {
    nextNumber = 2;
    cells.forEach((c) => c.classList.remove("filled", "head"));
    path.forEach((c, i) => {
        c.classList.add("filled");
        const n = puzzle[Number(c.dataset.index)];
        if (n && n >= nextNumber) nextNumber = n + 1;
        if (i === path.length - 1) c.classList.add("head");
    });
    drawLine();
    updateProgress();
    updateBacktracks();
    updateUndoState();
}

function drawLine() {
    svg.innerHTML = "";
    if (path.length < 2) return;

    const board = gameBoard.getBoundingClientRect();
    const cellSize = path[0].getBoundingClientRect().width;
    const stroke = Math.max(5, cellSize * 0.3);

    const points = path.map((cell) => {
        const r = cell.getBoundingClientRect();
        const x = r.left + r.width / 2 - board.left;
        const y = r.top + r.height / 2 - board.top;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");

    svg.appendChild(makeLine(points, "rgba(10,102,194,0.22)", stroke * 1.7));
    svg.appendChild(makeLine(points, "#0a66c2", stroke));
}
function makeLine(points, color, width) {
    const line = document.createElementNS(SVG_NS, "polyline");
    line.setAttribute("points", points);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", color);
    line.setAttribute("stroke-width", width);
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    return line;
}

function updateProgress() { progressEl.textContent = `${path.length}/${total}`; }
function updateBacktracks() { backtracksEl.textContent = backtracks; }
function updateUndoState() { undoBtn.disabled = solved || path.length <= 1; }

/* ==========================================================================
   Win / reset
   ========================================================================== */
function checkWin() {
    if (!solved && path.length === total && nextNumber > maxNumber) {
        solved = true;
        isDrawing = false;
        stopTimer();
        updateUndoState();
        celebrate();
    }
}

function celebrate() {
    path.forEach((c, i) => {
        c.style.setProperty("--i", i);
        c.classList.add("win-pop");
    });
    const delay = path.length * 28 + 400;
    setTimeout(() => {
        winTitleEl.textContent = `Level ${level} solved!`;
        winTimeEl.textContent = formatTime(seconds);
        winBtEl.textContent = backtracks;
        overlay.classList.add("show");
    }, Math.min(delay, 1200));
}

function clearPath() {
    path = [];
    nextNumber = 2;
    backtracks = 0;
    solved = false;
    svg.innerHTML = "";
    cells.forEach((c) => c.classList.remove("filled", "head", "win-pop"));
    updateProgress();
    updateBacktracks();
    updateUndoState();
    overlay.classList.remove("show");
}

function restartLevel() { clearPath(); resetTimer(); }

/* ==========================================================================
   Timer
   ========================================================================== */
function startTimer() {
    if (hasStarted) return;
    hasStarted = true;
    timerId = setInterval(() => {
        seconds++;
        timeEl.textContent = formatTime(seconds);
    }, 1000);
}
function stopTimer() { clearInterval(timerId); timerId = null; }
function resetTimer() {
    stopTimer();
    seconds = 0;
    hasStarted = false;
    timeEl.textContent = "0:00";
}
function formatTime(t) {
    const m = Math.floor(t / 60);
    return `${m}:${String(t % 60).padStart(2, "0")}`;
}

/* ==========================================================================
   Persistence (remembers your level; degrades gracefully)
   ========================================================================== */
function saveLevel(l) { try { localStorage.setItem(STORE_KEY, String(l)); } catch (e) {} }
function loadLevel() {
    try {
        const v = parseInt(localStorage.getItem(STORE_KEY), 10);
        return Number.isInteger(v) && v > 0 ? v : 1;
    } catch (e) { return 1; }
}

/* ==========================================================================
   Events
   ========================================================================== */
undoBtn.addEventListener("click", undo);
restartBtn.addEventListener("click", restartLevel);
newBtn.addEventListener("click", () => startLevel(level));       // new puzzle, same level
nextBtn.addEventListener("click", () => { overlay.classList.remove("show"); startLevel(level + 1); });
replayBtn.addEventListener("click", () => { overlay.classList.remove("show"); startLevel(level); });
window.addEventListener("resize", drawLine);