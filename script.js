const gameBoard    = document.getElementById("game-board");
const boardWrap    = document.getElementById("board-container");
const svg          = document.getElementById("path-svg");
const wallSvg      = document.getElementById("wall-svg");
const restartBtn   = document.getElementById("restart-btn");
const newBtn       = document.getElementById("new-btn");
const undoBtn      = document.getElementById("undo-btn");
const resetBtn     = document.getElementById("reset-btn");
const soundBtn     = document.getElementById("sound-btn");
const timeEl       = document.getElementById("time");
const progressEl   = document.getElementById("progress");
const backtracksEl = document.getElementById("backtracks");
const levelNameEl  = document.getElementById("level-name");
const diffEl       = document.getElementById("diff");
const streakCountEl = document.getElementById("streak-count");
const overlay      = document.getElementById("overlay");
const modalEl      = document.querySelector(".modal");
const starsEl      = document.getElementById("stars");
const winTitleEl   = document.getElementById("win-title");
const winPerfectEl = document.getElementById("win-perfect");
const winTimeEl    = document.getElementById("win-time");
const winBtEl      = document.getElementById("win-backtracks");
const winBestEl    = document.getElementById("win-best");
const newbestEl    = document.getElementById("newbest");
const nextBtn      = document.getElementById("next-btn");
const replayBtn    = document.getElementById("replay-btn");
const shareBtn     = document.getElementById("share-btn");
const toastEl      = document.getElementById("toast");

const SVG_NS = "http://www.w3.org/2000/svg";
const STORE_LEVEL = "zip-level";
const STORE_BESTS = "zip-bests";
const STORE_STREAK = "zip-streak";
const STORE_SOUND = "zip-sound";
const AUTO_ADVANCE_MS = 3000;

const LEVELS = [
    { grid: 5, cp: 4 }, { grid: 5, cp: 4 }, { grid: 5, cp: 5 },
    { grid: 6, cp: 5 }, { grid: 6, cp: 6 }, { grid: 6, cp: 6 },
    { grid: 7, cp: 7 }, { grid: 7, cp: 7 }, { grid: 7, cp: 8 },
    { grid: 8, cp: 8 }, { grid: 8, cp: 9 }, { grid: 8, cp: 9 },
];
function configForLevel(level) {
    if (level <= LEVELS.length) return LEVELS[level - 1];
    const over = level - LEVELS.length;
    return { grid: 8, cp: Math.min(12, 9 + Math.floor(over / 3)) };
}
function difficultyFor(level) {
    if (level <= 3) return { name: "Easy",   cls: "easy" };
    if (level <= 6) return { name: "Medium", cls: "medium" };
    if (level <= 9) return { name: "Hard",   cls: "hard" };
    return { name: "Expert", cls: "expert" };
}
function wallBudgetFor(level) { return 2 + Math.floor(level * 0.8); }

let level = loadLevel();
let grid = 5;
let total = 25;
let puzzle = {};
let walls = new Set();
let maxNumber = 4;
let cellGap = 9;

let cells = [];
let path = [];
let nextNumber = 2;
let isDrawing = false;
let backtracks = 0;
let solved = false;

let timerId = null;
let seconds = 0;
let hasStarted = false;
let advanceId = null;

let soundOn = loadSound();
let audioCtx = null;
let lastWinStars = 1;

updateSoundIcon();
updateStreakDisplay(currentStreak());
startLevel(level);

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
function edgeKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }
function buildLevel(n, cp, wallBudget) {
    const order = generateHamiltonian(n);
    const p = {};
    for (let i = 0; i < cp; i++) {
        const at = Math.round((i * (order.length - 1)) / (cp - 1));
        p[order[at]] = i + 1;
    }
    const solEdges = new Set();
    for (let i = 0; i < order.length - 1; i++) solEdges.add(edgeKey(order[i], order[i + 1]));

    const candidates = [];
    for (let idx = 0; idx < n * n; idx++) {
        const r = Math.floor(idx / n), c = idx % n;
        if (c < n - 1) { const k = edgeKey(idx, idx + 1); if (!solEdges.has(k)) candidates.push(k); }
        if (r < n - 1) { const k = edgeKey(idx, idx + n); if (!solEdges.has(k)) candidates.push(k); }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = candidates[i]; candidates[i] = candidates[j]; candidates[j] = t;
    }
    const count = Math.min(wallBudget, candidates.length);
    const w = new Set();
    for (let i = 0; i < count; i++) w.add(candidates[i]);
    return { puzzle: p, walls: w };
}
function isWall(a, b) { return walls.has(edgeKey(a, b)); }

function startLevel(lvl) {
    clearTimeout(advanceId);
    level = lvl;
    saveLevel(level);
    const cfg = configForLevel(level);
    grid = cfg.grid;
    total = grid * grid;
    maxNumber = cfg.cp;
    const built = buildLevel(grid, cfg.cp, wallBudgetFor(level));
    puzzle = built.puzzle;
    walls = built.walls;

    const diff = difficultyFor(level);
    levelNameEl.textContent = `Level ${level}`;
    diffEl.textContent = diff.name;
    diffEl.className = `diff ${diff.cls}`;

    cellGap = grid <= 5 ? 9 : grid === 6 ? 8 : grid === 7 ? 7 : 6;
    const radius = grid <= 5 ? 15 : grid === 6 ? 13 : grid === 7 ? 11 : 10;
    gameBoard.style.setProperty("--gap", `${cellGap}px`);
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
    drawWalls();
    updateProgress();
    updateBacktracks();
    updateUndoState();
}

function drawWalls() {
    wallSvg.innerHTML = "";
    if (!walls || walls.size === 0) return;
    const board = gameBoard.getBoundingClientRect();
    const cellSize = (board.width - (grid - 1) * cellGap) / grid;
    const step = cellSize + cellGap;
    const thickness = Math.max(5, cellSize * 0.16);
    walls.forEach((key) => {
        const parts = key.split("-");
        const a = Number(parts[0]), b = Number(parts[1]);
        const ar = Math.floor(a / grid), ac = a % grid;
        const ax = ac * step, ay = ar * step;
        let x1, y1, x2, y2;
        if (b === a + 1) {
            const x = ax + cellSize + cellGap / 2;
            x1 = x; y1 = ay; x2 = x; y2 = ay + cellSize;
        } else {
            const y = ay + cellSize + cellGap / 2;
            x1 = ax; y1 = y; x2 = ax + cellSize; y2 = y;
        }
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#12263f");
        line.setAttribute("stroke-width", thickness);
        line.setAttribute("stroke-linecap", "round");
        wallSvg.appendChild(line);
    });
}

function onPointerDown(event) {
    if (solved) return;
    const cell = event.currentTarget;
    ensureAudio();

    const inPath = path.indexOf(cell);
    if (path.length > 0 && inPath !== -1) {
        event.preventDefault();
        if (inPath < path.length - 1) {
            backtracks += path.length - 1 - inPath;
            path.length = inPath + 1;
            playUndo();
        }
        isDrawing = true;
        startTimer();
        render();
        return;
    }

    if (puzzle[Number(cell.dataset.index)] !== 1) return;
    event.preventDefault();
    beginPath(cell);
}

function beginPath(cell) {
    clearPath();
    isDrawing = true;
    nextNumber = 2;
    startTimer();
    path.push(cell);
    playStep();
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

document.addEventListener("pointerup", () => {
    isDrawing = false;
    if (!solved && path.length > 1) path[path.length - 1].classList.add("resumable");
});

function continueDrawing(target) {
    let changed = false;
    let rewound = false;
    const existing = path.indexOf(target);
    if (existing !== -1) {
        if (existing < path.length - 1) {
            backtracks += path.length - 1 - existing;
            path.length = existing + 1;
            changed = true;
            rewound = true;
        }
    } else {
        let guard = 0;
        while (guard++ < total) {
            const last = path[path.length - 1];
            const step = bestStepToward(Number(last.dataset.index), Number(target.dataset.index));
            if (step === null) break;
            const cell = cells[step];
            if (!canAdd(cell)) break;
            path.push(cell);
            if (puzzle[step] === nextNumber) { nextNumber++; playCheckpoint(); vibrate(15); }
            else playStep();
            changed = true;
            if (cell === target) break;
        }
    }
    if (rewound) { playUndo(); vibrate(10); }
    if (changed) { render(); checkWin(); }
}

function bestStepToward(li, ti) {
    if (li === ti) return null;
    const lr = Math.floor(li / grid), lc = li % grid;
    const tr = Math.floor(ti / grid), tc = ti % grid;
    const dr = tr - lr, dc = tc - lc;
    const options = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push(li + (dc > 0 ? 1 : -1));
        if (dr !== 0) options.push(li + (dr > 0 ? grid : -grid));
    } else {
        if (dr !== 0) options.push(li + (dr > 0 ? grid : -grid));
        if (dc !== 0) options.push(li + (dc > 0 ? 1 : -1));
    }
    for (const n of options) if (!isWall(li, n) && canAdd(cells[n])) return n;
    return null;
}

function canAdd(cell) {
    if (path.includes(cell)) return false;
    const num = puzzle[Number(cell.dataset.index)];
    if (num && num !== nextNumber) return false;
    return true;
}

function keyMove(dir) {
    if (solved) return;
    ensureAudio();
    if (path.length === 0) {
        const startIdx = Number(Object.keys(puzzle).find((k) => puzzle[k] === 1));
        beginPath(cells[startIdx]);
    }
    const head = path[path.length - 1];
    const hi = Number(head.dataset.index);
    const hr = Math.floor(hi / grid), hc = hi % grid;
    let ni = null;
    if (dir === "up" && hr > 0) ni = hi - grid;
    else if (dir === "down" && hr < grid - 1) ni = hi + grid;
    else if (dir === "left" && hc > 0) ni = hi - 1;
    else if (dir === "right" && hc < grid - 1) ni = hi + 1;
    if (ni === null) return;

    const cell = cells[ni];
    if (path.length > 1 && path[path.length - 2] === cell) {
        path.pop();
        backtracks++;
        playUndo();
        vibrate(10);
        render();
        return;
    }
    if (isWall(hi, ni)) return;
    if (!canAdd(cell)) return;
    path.push(cell);
    if (puzzle[ni] === nextNumber) { nextNumber++; playCheckpoint(); vibrate(15); }
    else playStep();
    render();
    checkWin();
}

function undo() {
    if (solved || path.length <= 1) return;
    path.pop();
    backtracks++;
    playUndo();
    vibrate(10);
    render();
    checkWin();
}

function render() {
    nextNumber = 2;
    cells.forEach((c) => c.classList.remove("filled", "head", "resumable"));
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
    svg.appendChild(makeLine(points, "rgba(10,102,194,0.2)", stroke * 1.7));
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

function checkWin() {
    if (solved) return;
    if (path.length !== total) return;
    const lastIdx = Number(path[path.length - 1].dataset.index);
    if (puzzle[lastIdx] !== maxNumber) return;
    solved = true;
    isDrawing = false;
    stopTimer();
    updateUndoState();
    finalizeWin();
}

function computeStars() {
    const par = Math.round(total * 1.6);
    if (backtracks <= 2 && seconds <= par) return 3;
    if (backtracks <= Math.ceil(total * 0.25) && seconds <= par * 2) return 2;
    return 1;
}

function finalizeWin() {
    const stars = computeStars();
    lastWinStars = stars;
    const bests = loadBests();
    const prev = bests[level];
    let isBest = false;
    const rec = { time: seconds, backtracks: backtracks, stars: stars };
    if (!prev) {
        isBest = true;
    } else {
        isBest = seconds < prev.time || stars > prev.stars;
        rec.time = Math.min(seconds, prev.time);
        rec.backtracks = Math.min(backtracks, prev.backtracks);
        rec.stars = Math.max(stars, prev.stars);
    }
    bests[level] = rec;
    saveBests(bests);
    updateStreakDisplay(bumpStreak());
    celebrate(stars, rec, isBest);
}

function celebrate(stars, rec, isBest) {
    path.forEach((c, i) => {
        c.style.setProperty("--i", i);
        c.classList.add("win-pop");
    });
    confetti();
    winSound(stars);
    vibrate([20, 30, 40]);

    const delay = Math.min(path.length * 26 + 450, 1300);
    setTimeout(() => {
        winTitleEl.textContent = `Level ${level} complete!`;
        winPerfectEl.textContent = backtracks === 0 ? "Perfect — no backtracks" : "";
        winTimeEl.textContent = formatTime(seconds);
        winBtEl.textContent = backtracks;
        winBestEl.textContent = `${formatTime(rec.time)} · ${"★".repeat(rec.stars)}`;
        newbestEl.classList.toggle("show", isBest);
        renderStars(stars);
        overlay.classList.add("show");
        advanceId = setTimeout(goNext, AUTO_ADVANCE_MS);
    }, delay);
}

function renderStars(stars) {
    const spans = starsEl.querySelectorAll("span");
    spans.forEach((s, i) => {
        s.classList.remove("on", "pop");
        if (i < stars) {
            s.style.animationDelay = `${i * 140}ms`;
            void s.offsetWidth;
            s.classList.add("on", "pop");
        }
    });
}

function goNext() {
    clearTimeout(advanceId);
    overlay.classList.remove("show");
    startLevel(level + 1);
}
function replayLevel() {
    clearTimeout(advanceId);
    overlay.classList.remove("show");
    startLevel(level);
}

function clearPath() {
    path = [];
    nextNumber = 2;
    backtracks = 0;
    solved = false;
    svg.innerHTML = "";
    cells.forEach((c) => c.classList.remove("filled", "head", "win-pop", "resumable"));
    updateProgress();
    updateBacktracks();
    updateUndoState();
    overlay.classList.remove("show");
}

function restartLevel() { clearTimeout(advanceId); clearPath(); resetTimer(); }

function resetGame() {
    if (!window.confirm("Reset all progress? This clears your level, best scores and streak.")) return;
    try {
        localStorage.removeItem(STORE_LEVEL);
        localStorage.removeItem(STORE_BESTS);
        localStorage.removeItem(STORE_STREAK);
    } catch (e) {}
    clearTimeout(advanceId);
    overlay.classList.remove("show");
    updateStreakDisplay(0);
    startLevel(1);
    showToast("Game reset");
}

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

function ensureAudio() {
    if (soundOn && !audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
const SCALE = [0, 2, 4, 7, 9];
function noteFor(n) {
    const i = n - 1;
    const octave = Math.min(Math.floor(i / SCALE.length), 1);
    const semis = SCALE[i % SCALE.length] + 12 * octave;
    return 220 * Math.pow(2, semis / 12);
}
function blip(freq, dur, gain) {
    if (!soundOn || !audioCtx) return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.03);
}
function playStep() { blip(noteFor(path.length), 0.28, 0.07); }
function playCheckpoint() { blip(noteFor(path.length) * 1.5, 0.34, 0.1); }
function playUndo() { blip(165, 0.22, 0.06); }
function winSound(stars) {
    if (!soundOn || !audioCtx) return;
    const notes = [0, 4, 7, 12, 16, 19];
    notes.slice(0, 3 + stars).forEach((s, i) =>
        setTimeout(() => blip(294 * Math.pow(2, s / 12), 0.5, 0.09), i * 130));
}
function vibrate(pattern) {
    if (soundOn && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

function confetti() {
    const rect = boardWrap.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ["#0a66c2", "#5b9bd8", "#057642", "#f5b301", "#e0483d"];
    for (let i = 0; i < 34; i++) {
        const p = document.createElement("div");
        p.className = "confetti";
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.background = colors[i % colors.length];
        const ang = Math.random() * Math.PI * 2;
        const dist = 70 + Math.random() * 150;
        p.style.setProperty("--tx", `${Math.cos(ang) * dist}px`);
        p.style.setProperty("--ty", `${Math.sin(ang) * dist - 30}px`);
        p.style.setProperty("--rot", `${Math.random() * 620 - 310}deg`);
        p.style.animationDelay = `${Math.random() * 0.1}s`;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1500);
    }
}

function saveLevel(l) { store(STORE_LEVEL, String(l)); }
function loadLevel() {
    const v = parseInt(read(STORE_LEVEL), 10);
    return Number.isInteger(v) && v > 0 ? v : 1;
}
function loadBests() {
    try { return JSON.parse(read(STORE_BESTS)) || {}; } catch (e) { return {}; }
}
function saveBests(b) { store(STORE_BESTS, JSON.stringify(b)); }
function loadSound() { return read(STORE_SOUND) !== "0"; }
function saveSound() { store(STORE_SOUND, soundOn ? "1" : "0"); }

function dayStamp(d) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function loadStreak() {
    try { return JSON.parse(read(STORE_STREAK)) || { date: null, count: 0 }; }
    catch (e) { return { date: null, count: 0 }; }
}
function currentStreak() {
    const s = loadStreak();
    const today = dayStamp(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (s.date === today || s.date === dayStamp(y)) return s.count;
    return 0;
}
function bumpStreak() {
    const s = loadStreak();
    const today = dayStamp(new Date());
    if (s.date === today) return s.count;
    const y = new Date(); y.setDate(y.getDate() - 1);
    s.count = s.date === dayStamp(y) ? s.count + 1 : 1;
    s.date = today;
    store(STORE_STREAK, JSON.stringify(s));
    return s.count;
}
function updateStreakDisplay(n) { streakCountEl.textContent = n; }
function updateSoundIcon() {
    soundBtn.classList.toggle("muted", !soundOn);
    soundBtn.setAttribute("aria-label", soundOn ? "Mute sound" : "Unmute sound");
}

function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

function shareResult() {
    clearTimeout(advanceId);
    const st = "★".repeat(lastWinStars) + "☆".repeat(3 - lastWinStars);
    const text = `ZIP — Level ${level}\n⏱ ${formatTime(seconds)}  ↩ ${backtracks}  ${st}\nCan you beat me?`;
    copyText(text);
    showToast("Result copied!");
}
function copyText(text) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
            return;
        }
    } catch (e) {}
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    } catch (e) {}
}
let toastId = null;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastId);
    toastId = setTimeout(() => toastEl.classList.remove("show"), 1600);
}

document.addEventListener("keydown", (e) => {
    const dirs = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (e.key in dirs) { e.preventDefault(); keyMove(dirs[e.key]); return; }
    if (e.key === "Backspace" || e.key === "Delete") { e.preventDefault(); undo(); return; }
    if (e.key === "Enter" && solved) { e.preventDefault(); goNext(); return; }
    if ((e.key === "r" || e.key === "R") && !solved) restartLevel();
});

modalEl.addEventListener("pointerdown", () => clearTimeout(advanceId));
undoBtn.addEventListener("click", undo);
restartBtn.addEventListener("click", restartLevel);
newBtn.addEventListener("click", () => startLevel(level));
resetBtn.addEventListener("click", resetGame);
nextBtn.addEventListener("click", goNext);
replayBtn.addEventListener("click", replayLevel);
shareBtn.addEventListener("click", shareResult);
soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    saveSound();
    updateSoundIcon();
    if (soundOn) ensureAudio();
});
window.addEventListener("resize", () => { drawWalls(); drawLine(); });