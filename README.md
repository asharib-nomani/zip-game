# Zip — 1 or 2 Player Path Puzzle

A clean, LinkedIn-inspired path puzzle built with plain **HTML, CSS & JavaScript** — no frameworks, no build step.

Draw one continuous path that starts at **1**, passes through every number in order (1 → 2 → 3 …), avoids the walls, and fills **every** cell on the board — finishing on the highest number.

## Features

- 👥 **1 or 2 players** — pick your mode on the start screen
- ⚔️ **Side-by-side play** — Player 1 on **WASD**, Player 2 on **arrow keys**
- 🧭 **Independent progress** — each player advances through levels at their own
  pace. Finishing your board moves *you* to the next level; the other player
  keeps playing theirs until they finish it too, or presses **Skip** for a new
  board at the same level
- 🔀 **Own puzzle per player** — same difficulty, different layout, so no one
  can peek at the other's solution
- 🧱 **Walls** — dark barriers you cannot cross, added gradually as levels rise
- 🎚️ **Gradual difficulty** — starts on a 5×5 grid with 4 numbers, then grows
  in grid size, fixed numbers and walls as you climb
- 🔥 **Win streak** — shown above each player's board, counting consecutive
  levels cleared; a **Skip** resets it
- 💡 **Hint** — nudges the path one correct step forward, with its own
  **3-second cooldown per player**
- ↩️ **Own Restart per player** — resets only that player's current board;
  never touches the other player's progress
- ✋ **Resume anytime** — lift and tap the glowing tip of the line to continue;
  tap any filled cell to jump back to it (dragging over cells never rewinds)
- ⭐ **Stars & personal bests** (solo mode) based on speed and backtracks
- 🎉 Confetti, soft musical path sounds, and haptics on every clear
- 📤 **Share result** (solo mode) — copy a scorecard to paste anywhere
- 🔄 **Reset Game** — wipes all saved progress and starts over
- 🖱️ Desktop + mobile, smooth pointer drawing with fast-drag interpolation
- ♿ Keyboard focus states and reduced-motion support

## Controls

**1 player** — drag with the mouse or finger, or use the **arrow keys** / **WASD**.
`H` for a hint, `Backspace` to undo, `R` to restart, `Enter` for the next level.

**2 players** — same difficulty, separate boards, side by side:

| | Move | Hint | Undo |
|---|---|---|---|
| **Player 1** | `W` `A` `S` `D` | `Q` | `E` |
| **Player 2** | `←` `↑` `↓` `→` | `P` | `O` |

Each panel also has its own **Hint**, **Undo**, **Restart** and **Skip**
buttons — clicking any of them only affects that player's board.

## How difficulty scales

| Level | Grid | Fixed numbers | Difficulty |
|------:|:----:|:--------------:|:-----------|
| 1–3   | 5×5  | 4 → 5           | Easy |
| 4–6   | 6×6  | 5 → 6           | Medium |
| 7–9   | 7×7  | 7 → 8           | Hard |
| 10+   | 8×8  | 8 → 12          | Expert |

Every board is generated from a real full-board solution first, so it's
always solvable even with walls in place.

## Run it

Static files, so either:

- Double-click `index.html`, **or**
- Serve locally: `python3 -m http.server` then open `http://localhost:8000`

## Deploy (GitHub Pages)

1. Push these files to a repository.
2. **Settings → Pages** → Source: `main` branch, `/root` → **Save**.
3. Live at `https://github.com/asharib-nomani/zip-game`.

## Files

```
index.html   — markup & layout
style.css    — design system and animations
script.js    — puzzle generation, per-player game state, modes, audio
```

Level, best scores and sound preference (solo mode) are saved locally in
your browser. Win streaks reset each session.

---

Built by **Asharib Nomani** · 