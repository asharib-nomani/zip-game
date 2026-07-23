const startScreen  = document.getElementById("start-screen");
const gameCard     = document.getElementById("game-card");
const mode1pBtn    = document.getElementById("mode-1p");
const mode2pBtn    = document.getElementById("mode-2p");
const menuBtn      = document.getElementById("menu-btn");
const boardsEl     = document.getElementById("boards");
const hintTextEl   = document.getElementById("hint-text");
const resetBtn     = document.getElementById("reset-btn");
const soundBtn     = document.getElementById("sound-btn");
const overlay      = document.getElementById("overlay");
const modalEl      = document.querySelector(".modal");
const starsEl      = document.getElementById("stars");
const winTitleEl   = document.getElementById("win-title");
const winPerfectEl = document.getElementById("win-perfect");
const winTimeEl    = document.getElementById("win-time");
const winBtEl      = document.getElementById("win-backtracks");
const bestRowEl    = document.getElementById("best-row");
const winBestEl    = document.getElementById("win-best");
const newbestEl    = document.getElementById("newbest");
const nextBtn      = document.getElementById("next-btn");
const replayBtn    = document.getElementById("replay-btn");
const shareBtn     = document.getElementById("share-btn");
const toastEl      = document.getElementById("toast");

const SVG_NS = "http://www.w3.org/2000/svg";
const STORE_LEVEL = "zip-level";
const STORE_BESTS = "zip-bests";
const STORE_SOUND = "zip-sound";
const AUTO_ADVANCE_MS = 3000;
const HINT_COOLDOWN_MS = 3000;
const TWOP_ADVANCE_MS = 1300;

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

let mode = "1p";
let games = [];
let activeGame = null;

let soundOn = loadSound();
let audioCtx = null;
let lastWinStars = 1;
let modalGame = null;

updateSoundIcon();

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
    return { puzzle: p, walls: w, solution: order };
}
function isWall(game, a, b) { return game.walls.has(edgeKey(a, b)); }

function createGame(id, name, keysLabel) {
    const panel = document.createElement("div");
    panel.className = `panel ${id}`;

    const head = document.createElement("div");
    head.className = "panel-head";
    const nameEl = document.createElement("span");
    nameEl.className = "panel-name";
    nameEl.textContent = name;
    head.appendChild(nameEl);
    if (keysLabel) {
        const keysEl = document.createElement("span");
        keysEl.className = "panel-keys";
        keysEl.textContent = keysLabel;
        head.appendChild(keysEl);
    }
    panel.appendChild(head);

    const meta = document.createElement("div");
    meta.className = "panel-meta";
    meta.innerHTML =
        '<span class="panel-level">Level 1</span>' +
        '<span class="panel-diff easy">Easy</span>' +
        '<span class="panel-streak">🔥 <b>0</b></span>';
    panel.appendChild(meta);

    const stats = document.createElement("div");
    stats.className = "panel-stats";
    stats.innerHTML =
        '<div class="chip"><span class="label">Time</span><span class="value time-val">0:00</span></div>' +
        '<div class="chip"><span class="label">Filled</span><span class="value filled-val">0/0</span></div>' +
        '<div class="chip"><span class="label">Backtracks</span><span class="value bt-val">0</span></div>';
    panel.appendChild(stats);

    const wrap = document.createElement("div");
    wrap.className = "board-container";
    const pathSvg = document.createElementNS(SVG_NS, "svg");
    pathSvg.setAttribute("class", "path-svg");
    const board = document.createElement("div");
    board.className = "game-board";
    const wallSvg = document.createElementNS(SVG_NS, "svg");
    wallSvg.setAttribute("class", "wall-svg");
    wrap.appendChild(pathSvg);
    wrap.appendChild(board);
    wrap.appendChild(wallSvg);
    panel.appendChild(wrap);

    const controls = document.createElement("div");
    controls.className = "panel-controls";
    const hintBtn = document.createElement("button");
    hintBtn.className = "btn-ghost"; hintBtn.textContent = "Hint";
    const undoBtn = document.createElement("button");
    undoBtn.className = "btn-ghost"; undoBtn.textContent = "Undo"; undoBtn.disabled = true;
    const restartBtn = document.createElement("button");
    restartBtn.className = "btn-ghost"; restartBtn.textContent = "Restart";
    const skipBtn = document.createElement("button");
    skipBtn.className = "btn-ghost"; skipBtn.textContent = "Skip";
    controls.appendChild(hintBtn);
    controls.appendChild(undoBtn);
    controls.appendChild(restartBtn);
    controls.appendChild(skipBtn);
    panel.appendChild(controls);

    boardsEl.appendChild(panel);

    const game = {
        id, name, panel, wrap, board, pathSvg, wallSvg,
        levelEl: meta.querySelector(".panel-level"),
        diffEl: meta.querySelector(".panel-diff"),
        streakEl: meta.querySelector(".panel-streak b"),
        timeEl: stats.querySelector(".time-val"),
        filledEl: stats.querySelector(".filled-val"),
        btEl: stats.querySelector(".bt-val"),
        hintBtn, undoBtn, restartBtn, skipBtn,
        cells: [], path: [], nextNumber: 2,
        isDrawing: false, backtracks: 0, solved: false,
        hintReady: true, hintTimer: null, hintTick: null,
        level: 1, grid: 5, total: 25, puzzle: {}, walls: new Set(),
        solution: [], maxNumber: 4, streak: 0,
        seconds: 0, hasStarted: false, timerId: null,
    };

    hintBtn.addEventListener("click", () => useHint(game));
    undoBtn.addEventListener("click", () => undo(game));
    restartBtn.addEventListener("click", () => restartLevel(game));
    skipBtn.addEventListener("click", () => skipLevel(game));
    return game;
}

function startMode(m) {
    mode = m;
    boardsEl.innerHTML = "";
    games = [];
    gameCard.classList.toggle("two-player", mode === "2p");
    startScreen.classList.add("hidden");
    gameCard.classList.remove("hidden");

    if (mode === "1p") {
        const g = createGame("p1", "You", "");
        g.level = loadLevel();
        games.push(g);
        hintTextEl.innerHTML =
            "Drag from <b>1</b>, or use the <b>arrow keys</b> / <b>WASD</b>. " +
            "Dark bars are walls. Tap a filled cell to jump back. " +
            "Fill every square and finish on the highest number.";
    } else {
        games.push(createGame("p1", "Player 1", "W A S D"));
        games.push(createGame("p2", "Player 2", "← ↑ ↓ →"));
        hintTextEl.innerHTML =
            "<b>Player 1</b> uses <b>W A S D</b> (hint <b>Q</b>, undo <b>E</b>), " +
            "<b>Player 2</b> uses the <b>arrow keys</b> (hint <b>P</b>, undo <b>O</b>). " +
            "Finish your board to move to the next level — the other player keeps " +
            "going at their own pace, or can press <b>Skip</b> for a new board.";
    }
    games.forEach((g) => { loadPuzzleForGame(g); buildBoard(g, true); resetGameTimer(g); });
}

function backToMenu() {
    games.forEach((g) => { clearTimeout(g.advanceId); stopGameTimer(g); resetHint(g); });
    overlay.classList.remove("show");
    gameCard.classList.add("hidden");
    startScreen.classList.remove("hidden");
}

function loadPuzzleForGame(game) {
    const cfg = configForLevel(game.level);
    game.grid = cfg.grid;
    game.total = cfg.grid * cfg.grid;
    game.maxNumber = cfg.cp;
    const built = buildLevel(cfg.grid, cfg.cp, wallBudgetFor(game.level));
    game.puzzle = built.puzzle;
    game.walls = built.walls;
    game.solution = built.solution;

    const diff = difficultyFor(game.level);
    game.levelEl.textContent = `Level ${game.level}`;
    game.diffEl.textContent = diff.name;
    game.diffEl.className = `panel-diff ${diff.cls}`;

    const gap = game.grid <= 5 ? 9 : game.grid === 6 ? 8 : game.grid === 7 ? 7 : 6;
    game.board.style.setProperty("--gap", `${gap}px`);
}

function buildBoard(game, animateIn) {
    clearTimeout(game.advanceId);
    game.path = [];
    game.nextNumber = 2;
    game.isDrawing = false;
    game.backtracks = 0;
    game.solved = false;
    game.panel.classList.remove("won");
    game.pathSvg.innerHTML = "";
    game.board.innerHTML = "";
    game.cells = [];
    game.board.style.gridTemplateColumns = `repeat(${game.grid}, 1fr)`;
    game.board.style.gridTemplateRows = `repeat(${game.grid}, 1fr)`;
    resetHint(game);

    for (let i = 0; i < game.total; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.index = i;
        if (game.puzzle[i]) {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = game.puzzle[i];
            cell.appendChild(badge);
            if (game.puzzle[i] === 1) cell.classList.add("start");
        }
        if (animateIn) {
            cell.classList.add("enter");
            cell.style.setProperty("--d", i);
        }
        cell.addEventListener("pointerdown", (e) => onPointerDown(e, game));
        game.board.appendChild(cell);
        game.cells.push(cell);
    }
    drawWalls(game);
    updateStats(game);
    updateUndoState(game);
}

function drawWalls(game) {
    game.wallSvg.innerHTML = "";
    if (!game.walls || game.walls.size === 0) return;
    const rect = game.board.getBoundingClientRect();
    if (!rect.width) return;
    const gap = parseFloat(getComputedStyle(game.board).getPropertyValue("--gap")) || 9;
    const cellSize = (rect.width - (game.grid - 1) * gap) / game.grid;
    const step = cellSize + gap;
    const thickness = Math.max(4, cellSize * 0.16);
    game.walls.forEach((key) => {
        const parts = key.split("-");
        const a = Number(parts[0]), b = Number(parts[1]);
        const ar = Math.floor(a / game.grid), ac = a % game.grid;
        const ax = ac * step, ay = ar * step;
        let x1, y1, x2, y2;
        if (b === a + 1) {
            const x = ax + cellSize + gap / 2;
            x1 = x; y1 = ay; x2 = x; y2 = ay + cellSize;
        } else {
            const y = ay + cellSize + gap / 2;
            x1 = ax; y1 = y; x2 = ax + cellSize; y2 = y;
        }
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", x1); line.setAttribute("y1", y1);
        line.setAttribute("x2", x2); line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#12263f");
        line.setAttribute("stroke-width", thickness);
        line.setAttribute("stroke-linecap", "round");
        game.wallSvg.appendChild(line);
    });
}

function onPointerDown(event, game) {
    if (game.solved) return;
    const cell = event.currentTarget;
    ensureAudio();

    const inPath = game.path.indexOf(cell);
    if (game.path.length > 0 && inPath !== -1) {
        event.preventDefault();
        if (inPath < game.path.length - 1) {
            game.backtracks += game.path.length - 1 - inPath;
            game.path.length = inPath + 1;
            playUndo();
        }
        game.isDrawing = true;
        activeGame = game;
        startGameTimer(game);
        render(game);
        return;
    }

    if (game.puzzle[Number(cell.dataset.index)] !== 1) return;
    event.preventDefault();
    activeGame = game;
    beginPath(game, cell);
}

function beginPath(game, cell) {
    clearPath(game);
    game.isDrawing = true;
    game.nextNumber = 2;
    startGameTimer(game);
    game.path.push(cell);
    playStep(game);
    render(game);
}

document.addEventListener("pointermove", (event) => {
    const game = activeGame;
    if (!game || !game.isDrawing) return;
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el) return;
    const cell = el.closest(".cell");
    if (!cell || !game.board.contains(cell)) return;
    continueDrawing(game, cell);
});

document.addEventListener("pointerup", () => {
    games.forEach((g) => {
        g.isDrawing = false;
        if (!g.solved && g.path.length > 1) g.path[g.path.length - 1].classList.add("resumable");
    });
    activeGame = null;
});

function continueDrawing(game, target) {
    if (game.path.includes(target)) return;
    let changed = false;
    let guard = 0;
    while (guard++ < game.total) {
        const last = game.path[game.path.length - 1];
        const step = bestStepToward(game, Number(last.dataset.index), Number(target.dataset.index));
        if (step === null) break;
        const cell = game.cells[step];
        if (!canAdd(game, cell)) break;
        game.path.push(cell);
        if (game.puzzle[step] === game.nextNumber) { game.nextNumber++; playCheckpoint(game); vibrate(15); }
        else playStep(game);
        changed = true;
        if (cell === target) break;
    }
    if (changed) { render(game); checkWin(game); }
}

function bestStepToward(game, li, ti) {
    if (li === ti) return null;
    const g = game.grid;
    const lr = Math.floor(li / g), lc = li % g;
    const tr = Math.floor(ti / g), tc = ti % g;
    const dr = tr - lr, dc = tc - lc;
    const options = [];
    if (Math.abs(dc) >= Math.abs(dr)) {
        if (dc !== 0) options.push(li + (dc > 0 ? 1 : -1));
        if (dr !== 0) options.push(li + (dr > 0 ? g : -g));
    } else {
        if (dr !== 0) options.push(li + (dr > 0 ? g : -g));
        if (dc !== 0) options.push(li + (dc > 0 ? 1 : -1));
    }
    for (const n of options) if (!isWall(game, li, n) && canAdd(game, game.cells[n])) return n;
    return null;
}

function canAdd(game, cell) {
    if (game.path.includes(cell)) return false;
    const num = game.puzzle[Number(cell.dataset.index)];
    if (num && num !== game.nextNumber) return false;
    return true;
}

function keyMove(game, dir) {
    if (game.solved) return;
    ensureAudio();
    if (game.path.length === 0) {
        const startIdx = Number(Object.keys(game.puzzle).find((k) => game.puzzle[k] === 1));
        beginPath(game, game.cells[startIdx]);
    }
    const g = game.grid;
    const head = game.path[game.path.length - 1];
    const hi = Number(head.dataset.index);
    const hr = Math.floor(hi / g), hc = hi % g;
    let ni = null;
    if (dir === "up" && hr > 0) ni = hi - g;
    else if (dir === "down" && hr < g - 1) ni = hi + g;
    else if (dir === "left" && hc > 0) ni = hi - 1;
    else if (dir === "right" && hc < g - 1) ni = hi + 1;
    if (ni === null) return;

    const cell = game.cells[ni];
    if (game.path.length > 1 && game.path[game.path.length - 2] === cell) {
        game.path.pop();
        game.backtracks++;
        playUndo();
        vibrate(10);
        render(game);
        return;
    }
    if (isWall(game, hi, ni)) return;
    if (!canAdd(game, cell)) return;
    game.path.push(cell);
    if (game.puzzle[ni] === game.nextNumber) { game.nextNumber++; playCheckpoint(game); vibrate(15); }
    else playStep(game);
    render(game);
    checkWin(game);
}

function undo(game) {
    if (game.solved || game.path.length <= 1) return;
    game.path.pop();
    game.backtracks++;
    playUndo();
    vibrate(10);
    render(game);
}

function useHint(game) {
    if (game.solved || !game.hintReady || game.solution.length === 0) return;
    ensureAudio();
    let m = 0;
    while (m < game.path.length && m < game.solution.length &&
           Number(game.path[m].dataset.index) === game.solution[m]) m++;
    let targetLen;
    if (m === game.path.length) {
        if (game.path.length >= game.solution.length) return;
        targetLen = game.path.length + 1;
    } else {
        targetLen = m + 1;
    }
    startGameTimer(game);
    game.path = game.solution.slice(0, targetLen).map((idx) => game.cells[idx]);
    playCheckpoint(game);
    vibrate(15);
    render(game);
    startHintCooldown(game);
    checkWin(game);
}

function startHintCooldown(game) {
    game.hintReady = false;
    game.hintBtn.disabled = true;
    let remaining = Math.ceil(HINT_COOLDOWN_MS / 1000);
    game.hintBtn.textContent = `Hint ${remaining}s`;
    clearInterval(game.hintTick);
    game.hintTick = setInterval(() => {
        remaining--;
        if (remaining > 0) game.hintBtn.textContent = `Hint ${remaining}s`;
    }, 1000);
    clearTimeout(game.hintTimer);
    game.hintTimer = setTimeout(() => {
        clearInterval(game.hintTick);
        game.hintReady = true;
        game.hintBtn.disabled = game.solved;
        game.hintBtn.textContent = "Hint";
    }, HINT_COOLDOWN_MS);
}

function resetHint(game) {
    clearTimeout(game.hintTimer);
    clearInterval(game.hintTick);
    game.hintReady = true;
    game.hintBtn.disabled = false;
    game.hintBtn.textContent = "Hint";
}

function render(game) {
    game.nextNumber = 2;
    game.cells.forEach((c) => c.classList.remove("filled", "head", "resumable"));
    game.path.forEach((c, i) => {
        c.classList.add("filled");
        const n = game.puzzle[Number(c.dataset.index)];
        if (n && n >= game.nextNumber) game.nextNumber = n + 1;
        if (i === game.path.length - 1) c.classList.add("head");
    });
    drawLine(game);
    updateStats(game);
    updateUndoState(game);
}

function drawLine(game) {
    game.pathSvg.innerHTML = "";
    if (game.path.length < 2) return;
    const board = game.board.getBoundingClientRect();
    const cellSize = game.path[0].getBoundingClientRect().width;
    const stroke = Math.max(4, cellSize * 0.3);
    const points = game.path.map((cell) => {
        const r = cell.getBoundingClientRect();
        const x = r.left + r.width / 2 - board.left;
        const y = r.top + r.height / 2 - board.top;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const color = game.id === "p2" ? "#7a3ec8" : "#0a66c2";
    const glow = game.id === "p2" ? "rgba(122,62,200,0.2)" : "rgba(10,102,194,0.2)";
    game.pathSvg.appendChild(makeLine(points, glow, stroke * 1.7));
    game.pathSvg.appendChild(makeLine(points, color, stroke));
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

function updateStats(game) {
    game.filledEl.textContent = `${game.path.length}/${game.total}`;
    game.btEl.textContent = game.backtracks;
    game.timeEl.textContent = formatTime(game.seconds);
}
function updateUndoState(game) {
    game.undoBtn.disabled = game.solved || game.path.length <= 1;
}
function updateStreakDisplay(game) { game.streakEl.textContent = game.streak; }

function checkWin(game) {
    if (game.solved) return;
    if (game.path.length !== game.total) return;
    const lastIdx = Number(game.path[game.path.length - 1].dataset.index);
    if (game.puzzle[lastIdx] !== game.maxNumber) return;
    game.solved = true;
    game.isDrawing = false;
    stopGameTimer(game);
    updateUndoState(game);
    game.hintBtn.disabled = true;
    game.streak += 1;
    updateStreakDisplay(game);
    game.panel.classList.add("won");
    if (mode === "1p") finalizeWin1p(game);
    else finalizeWin2p(game);
}

function computeStars(game) {
    const par = Math.round(game.total * 1.6);
    if (game.backtracks <= 2 && game.seconds <= par) return 3;
    if (game.backtracks <= Math.ceil(game.total * 0.25) && game.seconds <= par * 2) return 2;
    return 1;
}

function finalizeWin1p(game) {
    const stars = computeStars(game);
    lastWinStars = stars;
    const bests = loadBests();
    const prev = bests[game.level];
    let isBest = false;
    const rec = { time: game.seconds, backtracks: game.backtracks, stars: stars };
    if (!prev) {
        isBest = true;
    } else {
        isBest = game.seconds < prev.time || stars > prev.stars;
        rec.time = Math.min(game.seconds, prev.time);
        rec.backtracks = Math.min(game.backtracks, prev.backtracks);
        rec.stars = Math.max(stars, prev.stars);
    }
    bests[game.level] = rec;
    saveBests(bests);
    celebrate(game, stars);
    const delay = Math.min(game.path.length * 26 + 450, 1300);
    setTimeout(() => {
        modalGame = game;
        winTitleEl.textContent = `Level ${game.level} complete!`;
        winPerfectEl.textContent = game.backtracks === 0 ? "Perfect — no backtracks" : "";
        bestRowEl.classList.remove("hidden");
        starsEl.classList.remove("hidden");
        winTimeEl.textContent = formatTime(game.seconds);
        winBtEl.textContent = game.backtracks;
        winBestEl.textContent = `${formatTime(rec.time)} · ${"★".repeat(rec.stars)}`;
        newbestEl.classList.toggle("show", isBest);
        renderStars(stars);
        overlay.classList.add("show");
        game.advanceId = setTimeout(() => goNextLevel(game), AUTO_ADVANCE_MS);
    }, delay);
}

function finalizeWin2p(game) {
    celebrate(game, computeStars(game));
    const delay = Math.min(game.path.length * 26 + 450, 900);
    setTimeout(() => {
        showToast(`${game.name} cleared Level ${game.level}! Moving to Level ${game.level + 1}…`);
        game.advanceId = setTimeout(() => goNextLevel(game), TWOP_ADVANCE_MS);
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

function goNextLevel(game) {
    clearTimeout(game.advanceId);
    if (modalGame === game) {
        overlay.classList.remove("show");
        modalGame = null;
    }
    game.level += 1;
    if (mode === "1p") saveLevel(game.level);
    loadPuzzleForGame(game);
    buildBoard(game, true);
    resetGameTimer(game);
}

function clearPath(game) {
    game.path = [];
    game.nextNumber = 2;
    game.backtracks = 0;
    game.solved = false;
    game.pathSvg.innerHTML = "";
    game.cells.forEach((c) => c.classList.remove("filled", "head", "win-pop", "resumable"));
    updateStats(game);
    updateUndoState(game);
}

function restartLevel(game) {
    clearTimeout(game.advanceId);
    if (modalGame === game) { overlay.classList.remove("show"); modalGame = null; }
    game.panel.classList.remove("won");
    clearPath(game);
    resetHint(game);
    resetGameTimer(game);
}

function skipLevel(game) {
    clearTimeout(game.advanceId);
    if (modalGame === game) { overlay.classList.remove("show"); modalGame = null; }
    game.streak = 0;
    updateStreakDisplay(game);
    loadPuzzleForGame(game);
    buildBoard(game, true);
    resetGameTimer(game);
}

function resetGame() {
    if (!window.confirm("Reset all progress? This clears levels, bests and streaks.")) return;
    try {
        localStorage.removeItem(STORE_LEVEL);
        localStorage.removeItem(STORE_BESTS);
    } catch (e) {}
    overlay.classList.remove("show");
    modalGame = null;
    games.forEach((g) => {
        clearTimeout(g.advanceId);
        g.level = 1;
        g.streak = 0;
        updateStreakDisplay(g);
        loadPuzzleForGame(g);
        buildBoard(g, true);
        resetGameTimer(g);
    });
    showToast("Game reset");
}

function startGameTimer(game) {
    if (game.hasStarted) return;
    game.hasStarted = true;
    game.timerId = setInterval(() => {
        game.seconds++;
        game.timeEl.textContent = formatTime(game.seconds);
    }, 1000);
}
function stopGameTimer(game) { clearInterval(game.timerId); game.timerId = null; }
function resetGameTimer(game) {
    stopGameTimer(game);
    game.seconds = 0;
    game.hasStarted = false;
    game.timeEl.textContent = "0:00";
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
function noteFor(n, base) {
    const i = n - 1;
    const octave = Math.min(Math.floor(i / SCALE.length), 1);
    const semis = SCALE[i % SCALE.length] + 12 * octave;
    return base * Math.pow(2, semis / 12);
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
function baseFor(game) { return game && game.id === "p2" ? 262 : 220; }
function playStep(game) { blip(noteFor(game.path.length, baseFor(game)), 0.28, 0.07); }
function playCheckpoint(game) { blip(noteFor(game.path.length, baseFor(game)) * 1.5, 0.34, 0.1); }
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

function celebrate(game, stars) {
    game.path.forEach((c, i) => {
        c.style.setProperty("--i", i);
        c.classList.add("win-pop");
    });
    confetti(game);
    winSound(stars);
    vibrate([20, 30, 40]);
}

function confetti(game) {
    const rect = game.wrap.getBoundingClientRect();
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
function updateSoundIcon() {
    soundBtn.classList.toggle("muted", !soundOn);
    soundBtn.setAttribute("aria-label", soundOn ? "Mute sound" : "Unmute sound");
}

function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

function shareResult() {
    const game = modalGame || games[0];
    if (!game) return;
    const st = "★".repeat(lastWinStars) + "☆".repeat(3 - lastWinStars);
    const text = `ZIP — Level ${game.level}\n⏱ ${formatTime(game.seconds)}  ↩ ${game.backtracks}  ${st}\nCan you beat me?`;
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
    toastId = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const WASD = { w: "up", s: "down", a: "left", d: "right" };

document.addEventListener("keydown", (e) => {
    if (gameCard.classList.contains("hidden") || !games.length) return;
    const k = e.key;
    const lower = typeof k === "string" ? k.toLowerCase() : "";

    if (k === "Enter" && modalGame) { e.preventDefault(); goNextLevel(modalGame); return; }

    if (mode === "1p") {
        const g = games[0];
        if (k in ARROWS) { e.preventDefault(); keyMove(g, ARROWS[k]); return; }
        if (lower in WASD) { e.preventDefault(); keyMove(g, WASD[lower]); return; }
        if (k === "Backspace" || k === "Delete") { e.preventDefault(); undo(g); return; }
        if (lower === "h") { e.preventDefault(); useHint(g); return; }
        if (lower === "r") restartLevel(g);
        return;
    }

    const p1 = games[0], p2 = games[1];
    if (lower in WASD) { e.preventDefault(); keyMove(p1, WASD[lower]); return; }
    if (k in ARROWS) { e.preventDefault(); keyMove(p2, ARROWS[k]); return; }
    if (lower === "q") { e.preventDefault(); useHint(p1); return; }
    if (lower === "e") { e.preventDefault(); undo(p1); return; }
    if (lower === "p") { e.preventDefault(); useHint(p2); return; }
    if (lower === "o") { e.preventDefault(); undo(p2); return; }
});

modalEl.addEventListener("pointerdown", () => { if (modalGame) clearTimeout(modalGame.advanceId); });
mode1pBtn.addEventListener("click", () => startMode("1p"));
mode2pBtn.addEventListener("click", () => startMode("2p"));
menuBtn.addEventListener("click", backToMenu);
resetBtn.addEventListener("click", resetGame);
nextBtn.addEventListener("click", () => { if (modalGame) goNextLevel(modalGame); });
replayBtn.addEventListener("click", () => { if (modalGame) skipLevel(modalGame); });
shareBtn.addEventListener("click", shareResult);
soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    saveSound();
    updateSoundIcon();
    if (soundOn) ensureAudio();
});
window.addEventListener("resize", () => {
    games.forEach((g) => { drawWalls(g); drawLine(g); });
});