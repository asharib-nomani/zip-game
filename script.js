const startScreen  = document.getElementById("start-screen");
const gameCard     = document.getElementById("game-card");
const mode1pBtn    = document.getElementById("mode-1p");
const mode2pBtn    = document.getElementById("mode-2p");
const menuBtn      = document.getElementById("menu-btn");
const boardsEl     = document.getElementById("boards");
const hintTextEl   = document.getElementById("hint-text");
const restartBtn   = document.getElementById("restart-btn");
const newBtn       = document.getElementById("new-btn");
const resetBtn     = document.getElementById("reset-btn");
const soundBtn     = document.getElementById("sound-btn");
const timeEl       = document.getElementById("time");
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
const STORE_STREAK = "zip-streak";
const STORE_SOUND = "zip-sound";
const AUTO_ADVANCE_MS = 3000;
const HINT_COOLDOWN_MS = 3000;

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
let level = 1;
let grid = 5;
let total = 25;
let puzzle = {};
let walls = new Set();
let solution = [];
let maxNumber = 4;
let cellGap = 9;

let games = [];
let matchOver = false;
let activeGame = null;

let timerId = null;
let seconds = 0;
let hasStarted = false;
let advanceId = null;

let soundOn = loadSound();
let audioCtx = null;
let lastWinStars = 1;
let lastWinner = null;

updateSoundIcon();
updateStreakDisplay(currentStreak());

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
function isWall(a, b) { return walls.has(edgeKey(a, b)); }

function createGame(id, name, keysLabel) {
    const panel = document.createElement("div");
    panel.className = `panel ${id}`;
    if (mode === "2p") {
        const head = document.createElement("div");
        head.className = "panel-head";
        const nameEl = document.createElement("span");
        nameEl.className = "panel-name";
        nameEl.textContent = name;
        const keysEl = document.createElement("span");
        keysEl.className = "panel-keys";
        keysEl.textContent = keysLabel;
        head.appendChild(nameEl);
        head.appendChild(keysEl);
        panel.appendChild(head);
    }

    const stats = document.createElement("div");
    stats.className = "panel-stats";
    stats.innerHTML =
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
    hintBtn.className = "btn-ghost";
    hintBtn.textContent = "Hint";
    const undoBtn = document.createElement("button");
    undoBtn.className = "btn-ghost";
    undoBtn.textContent = "Undo";
    undoBtn.disabled = true;
    controls.appendChild(hintBtn);
    controls.appendChild(undoBtn);
    panel.appendChild(controls);

    boardsEl.appendChild(panel);

    const game = {
        id, name, panel, wrap, board, pathSvg, wallSvg,
        filledEl: stats.querySelector(".filled-val"),
        btEl: stats.querySelector(".bt-val"),
        hintBtn, undoBtn,
        cells: [], path: [], nextNumber: 2,
        isDrawing: false, backtracks: 0, solved: false,
        hintReady: true, hintTimer: null, hintTick: null,
    };

    hintBtn.addEventListener("click", () => useHint(game));
    undoBtn.addEventListener("click", () => undo(game));
    return game;
}

function startMode(m) {
    mode = m;
    matchOver = false;
    boardsEl.innerHTML = "";
    games = [];
    gameCard.classList.toggle("two-player", mode === "2p");
    startScreen.classList.add("hidden");
    gameCard.classList.remove("hidden");

    if (mode === "1p") {
        games.push(createGame("p1", "You", ""));
        hintTextEl.innerHTML =
            "Drag from <b>1</b> or use the <b>arrow keys</b> / <b>WASD</b>. " +
            "Dark bars are walls. Tap a filled cell to jump back. " +
            "Fill every square and finish on the highest number.";
        level = loadLevel();
    } else {
        games.push(createGame("p1", "Player 1", "W A S D"));
        games.push(createGame("p2", "Player 2", "← ↑ ↓ →"));
        hintTextEl.innerHTML =
            "Same board, same race. <b>Player 1</b> uses <b>W A S D</b> " +
            "(hint <b>Q</b>, undo <b>E</b>), <b>Player 2</b> uses the " +
            "<b>arrow keys</b> (hint <b>P</b>, undo <b>O</b>). First to fill the board wins.";
        level = 1;
    }
    startLevel(level);
}

function backToMenu() {
    clearTimeout(advanceId);
    stopTimer();
    overlay.classList.remove("show");
    gameCard.classList.add("hidden");
    startScreen.classList.remove("hidden");
}

function startLevel(lvl) {
    clearTimeout(advanceId);
    level = lvl;
    if (mode === "1p") saveLevel(level);
    matchOver = false;

    const cfg = configForLevel(level);
    grid = cfg.grid;
    total = grid * grid;
    maxNumber = cfg.cp;
    const built = buildLevel(grid, cfg.cp, wallBudgetFor(level));
    puzzle = built.puzzle;
    walls = built.walls;
    solution = built.solution;

    const diff = difficultyFor(level);
    levelNameEl.textContent = `Level ${level}`;
    diffEl.textContent = diff.name;
    diffEl.className = `diff ${diff.cls}`;

    cellGap = grid <= 5 ? 9 : grid === 6 ? 8 : grid === 7 ? 7 : 6;
    const radius = grid <= 5 ? 15 : grid === 6 ? 13 : grid === 7 ? 11 : 10;
    document.documentElement.style.setProperty("--cell-radius", `${radius}px`);

    games.forEach((g) => buildBoard(g, true));
    resetTimer();
}

function buildBoard(game, animateIn) {
    game.path = [];
    game.nextNumber = 2;
    game.isDrawing = false;
    game.backtracks = 0;
    game.solved = false;
    game.panel.classList.remove("won", "locked");
    game.pathSvg.innerHTML = "";
    game.board.innerHTML = "";
    game.cells = [];
    game.board.style.setProperty("--gap", `${cellGap}px`);
    game.board.style.gridTemplateColumns = `repeat(${grid}, 1fr)`;
    game.board.style.gridTemplateRows = `repeat(${grid}, 1fr)`;
    resetHint(game);

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
    if (!walls || walls.size === 0) return;
    const rect = game.board.getBoundingClientRect();
    if (!rect.width) return;
    const cellSize = (rect.width - (grid - 1) * cellGap) / grid;
    const step = cellSize + cellGap;
    const thickness = Math.max(4, cellSize * 0.16);
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
        game.wallSvg.appendChild(line);
    });
}

function onPointerDown(event, game) {
    if (matchOver || game.solved) return;
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
        startTimer();
        render(game);
        return;
    }

    if (puzzle[Number(cell.dataset.index)] !== 1) return;
    event.preventDefault();
    activeGame = game;
    beginPath(game, cell);
}

function beginPath(game, cell) {
    clearPath(game);
    game.isDrawing = true;
    game.nextNumber = 2;
    startTimer();
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
        if (!g.solved && !matchOver && g.path.length > 1) {
            g.path[g.path.length - 1].classList.add("resumable");
        }
    });
    activeGame = null;
});

function continueDrawing(game, target) {
    if (game.path.includes(target)) return;
    let changed = false;
    let guard = 0;
    while (guard++ < total) {
        const last = game.path[game.path.length - 1];
        const step = bestStepToward(game, Number(last.dataset.index), Number(target.dataset.index));
        if (step === null) break;
        const cell = game.cells[step];
        if (!canAdd(game, cell)) break;
        game.path.push(cell);
        if (puzzle[step] === game.nextNumber) { game.nextNumber++; playCheckpoint(game); vibrate(15); }
        else playStep(game);
        changed = true;
        if (cell === target) break;
    }
    if (changed) { render(game); checkWin(game); }
}

function bestStepToward(game, li, ti) {
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
    for (const n of options) if (!isWall(li, n) && canAdd(game, game.cells[n])) return n;
    return null;
}

function canAdd(game, cell) {
    if (game.path.includes(cell)) return false;
    const num = puzzle[Number(cell.dataset.index)];
    if (num && num !== game.nextNumber) return false;
    return true;
}

function keyMove(game, dir) {
    if (matchOver || game.solved) return;
    ensureAudio();
    if (game.path.length === 0) {
        const startIdx = Number(Object.keys(puzzle).find((k) => puzzle[k] === 1));
        beginPath(game, game.cells[startIdx]);
    }
    const head = game.path[game.path.length - 1];
    const hi = Number(head.dataset.index);
    const hr = Math.floor(hi / grid), hc = hi % grid;
    let ni = null;
    if (dir === "up" && hr > 0) ni = hi - grid;
    else if (dir === "down" && hr < grid - 1) ni = hi + grid;
    else if (dir === "left" && hc > 0) ni = hi - 1;
    else if (dir === "right" && hc < grid - 1) ni = hi + 1;
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
    if (isWall(hi, ni)) return;
    if (!canAdd(game, cell)) return;
    game.path.push(cell);
    if (puzzle[ni] === game.nextNumber) { game.nextNumber++; playCheckpoint(game); vibrate(15); }
    else playStep(game);
    render(game);
    checkWin(game);
}

function undo(game) {
    if (matchOver || game.solved || game.path.length <= 1) return;
    game.path.pop();
    game.backtracks++;
    playUndo();
    vibrate(10);
    render(game);
}

function useHint(game) {
    if (matchOver || game.solved || !game.hintReady || solution.length === 0) return;
    ensureAudio();
    let m = 0;
    while (m < game.path.length && m < solution.length &&
           Number(game.path[m].dataset.index) === solution[m]) m++;
    let targetLen;
    if (m === game.path.length) {
        if (game.path.length >= solution.length) return;
        targetLen = game.path.length + 1;
    } else {
        targetLen = m + 1;
    }
    startTimer();
    game.path = solution.slice(0, targetLen).map((idx) => game.cells[idx]);
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
        game.hintBtn.disabled = matchOver || game.solved;
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
        const n = puzzle[Number(c.dataset.index)];
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
    game.filledEl.textContent = `${game.path.length}/${total}`;
    game.btEl.textContent = game.backtracks;
}
function updateUndoState(game) {
    game.undoBtn.disabled = matchOver || game.solved || game.path.length <= 1;
}

function checkWin(game) {
    if (matchOver || game.solved) return;
    if (game.path.length !== total) return;
    const lastIdx = Number(game.path[game.path.length - 1].dataset.index);
    if (puzzle[lastIdx] !== maxNumber) return;
    game.solved = true;
    game.isDrawing = false;
    matchOver = true;
    lastWinner = game;
    stopTimer();
    games.forEach((g) => {
        g.isDrawing = false;
        updateUndoState(g);
        g.hintBtn.disabled = true;
        if (g !== game) g.panel.classList.add("locked");
    });
    game.panel.classList.add("won");
    finalizeWin(game);
}

function computeStars(game) {
    const par = Math.round(total * 1.6);
    if (game.backtracks <= 2 && seconds <= par) return 3;
    if (game.backtracks <= Math.ceil(total * 0.25) && seconds <= par * 2) return 2;
    return 1;
}

function finalizeWin(game) {
    const stars = computeStars(game);
    lastWinStars = stars;
    let rec = null;
    let isBest = false;
    if (mode === "1p") {
        const bests = loadBests();
        const prev = bests[level];
        rec = { time: seconds, backtracks: game.backtracks, stars: stars };
        if (!prev) {
            isBest = true;
        } else {
            isBest = seconds < prev.time || stars > prev.stars;
            rec.time = Math.min(seconds, prev.time);
            rec.backtracks = Math.min(game.backtracks, prev.backtracks);
            rec.stars = Math.max(stars, prev.stars);
        }
        bests[level] = rec;
        saveBests(bests);
        updateStreakDisplay(bumpStreak());
    }
    celebrate(game, stars, rec, isBest);
}

function celebrate(game, stars, rec, isBest) {
    game.path.forEach((c, i) => {
        c.style.setProperty("--i", i);
        c.classList.add("win-pop");
    });
    confetti(game);
    winSound(stars);
    vibrate([20, 30, 40]);

    const delay = Math.min(game.path.length * 26 + 450, 1300);
    setTimeout(() => {
        if (mode === "2p") {
            winTitleEl.textContent = `${game.name} wins!`;
            winPerfectEl.textContent = `Level ${level} cleared first`;
            bestRowEl.classList.add("hidden");
            starsEl.classList.add("hidden");
        } else {
            winTitleEl.textContent = `Level ${level} complete!`;
            winPerfectEl.textContent = game.backtracks === 0 ? "Perfect — no backtracks" : "";
            bestRowEl.classList.remove("hidden");
            starsEl.classList.remove("hidden");
            winBestEl.textContent = `${formatTime(rec.time)} · ${"★".repeat(rec.stars)}`;
            newbestEl.classList.toggle("show", isBest);
            renderStars(stars);
        }
        winTimeEl.textContent = formatTime(seconds);
        winBtEl.textContent = game.backtracks;
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

function restartLevel() {
    clearTimeout(advanceId);
    matchOver = false;
    overlay.classList.remove("show");
    games.forEach((g) => {
        g.panel.classList.remove("won", "locked");
        clearPath(g);
        resetHint(g);
    });
    resetTimer();
}

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
    level = 1;
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
    const bt = lastWinner ? lastWinner.backtracks : 0;
    let text;
    if (mode === "2p") {
        text = `ZIP — Level ${level}\n${lastWinner ? lastWinner.name : "Player"} won in ${formatTime(seconds)}  ↩ ${bt}\nThink you can beat that?`;
    } else {
        const st = "★".repeat(lastWinStars) + "☆".repeat(3 - lastWinStars);
        text = `ZIP — Level ${level}\n⏱ ${formatTime(seconds)}  ↩ ${bt}  ${st}\nCan you beat me?`;
    }
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

const ARROWS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
const WASD = { w: "up", s: "down", a: "left", d: "right" };

document.addEventListener("keydown", (e) => {
    if (gameCard.classList.contains("hidden") || !games.length) return;
    const k = e.key;
    const lower = typeof k === "string" ? k.toLowerCase() : "";

    if (k === "Enter" && matchOver) { e.preventDefault(); goNext(); return; }

    if (mode === "1p") {
        const g = games[0];
        if (k in ARROWS) { e.preventDefault(); keyMove(g, ARROWS[k]); return; }
        if (lower in WASD) { e.preventDefault(); keyMove(g, WASD[lower]); return; }
        if (k === "Backspace" || k === "Delete") { e.preventDefault(); undo(g); return; }
        if (lower === "h") { e.preventDefault(); useHint(g); return; }
        if (lower === "r") restartLevel();
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

modalEl.addEventListener("pointerdown", () => clearTimeout(advanceId));
mode1pBtn.addEventListener("click", () => startMode("1p"));
mode2pBtn.addEventListener("click", () => startMode("2p"));
menuBtn.addEventListener("click", backToMenu);
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
window.addEventListener("resize", () => {
    games.forEach((g) => { drawWalls(g); drawLine(g); });
});