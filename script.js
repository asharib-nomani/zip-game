const gameBoard = document.getElementById("game-board");
const svg = document.getElementById("path-svg");
const restartBtn = document.getElementById("restart-btn");

const GRID_SIZE = 5;

// Puzzle numbers
const puzzle = {
    0: 1,
    4: 2,
    8: 3,
    12: 4
};

let cells = [];
let path = [];
let isDrawing = false;


createBoard();


function createBoard() {

    gameBoard.innerHTML = "";
    svg.innerHTML = "";
    cells = [];

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {

        const cell = document.createElement("div");

        cell.classList.add("cell");

        cell.dataset.index = i;


        if (puzzle[i]) {
            cell.textContent = puzzle[i];

            if (puzzle[i] === 1) {
                cell.classList.add("start");
            }
        }


        cell.addEventListener("mousedown", startDrawing);
        cell.addEventListener("mouseenter", continueDrawing);


        gameBoard.appendChild(cell);

        cells.push(cell);
    }
}



function startDrawing(event) {

    const cell = event.target;
    const index = Number(cell.dataset.index);


    // Only start from 1
    if (puzzle[index] !== 1) return;


    resetPath();


    isDrawing = true;

    addToPath(cell);
}



function continueDrawing(event) {

    if (!isDrawing) return;

    const cell = event.target;

    if (path.includes(cell)) return;


    const lastCell = path[path.length - 1];

    const lastIndex = Number(lastCell.dataset.index);
    const currentIndex = Number(cell.dataset.index);


    if (!isAdjacent(lastIndex, currentIndex)) return;


    addToPath(cell);
}



function addToPath(cell) {

    path.push(cell);

    cell.style.background = "#dbeafe";

    drawLine();
}



function drawLine() {

    svg.innerHTML = "";


    for (let i = 0; i < path.length - 1; i++) {


        const cell1 = path[i].getBoundingClientRect();
        const cell2 = path[i + 1].getBoundingClientRect();

        const board = gameBoard.getBoundingClientRect();


        const x1 = cell1.left + cell1.width / 2 - board.left;
        const y1 = cell1.top + cell1.height / 2 - board.top;


        const x2 = cell2.left + cell2.width / 2 - board.left;
        const y2 = cell2.top + cell2.height / 2 - board.top;



        const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );


        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);

        line.setAttribute("stroke", "#0A66C2");
        line.setAttribute("stroke-width", "8");
        line.setAttribute("stroke-linecap", "round");


        svg.appendChild(line);

    }

}
function isAdjacent(first, second) {

    const row1 = Math.floor(first / GRID_SIZE);
    const col1 = first % GRID_SIZE;


    const row2 = Math.floor(second / GRID_SIZE);
    const col2 = second % GRID_SIZE;


    const rowDifference = Math.abs(row1 - row2);
    const colDifference = Math.abs(col1 - col2);


    return rowDifference + colDifference === 1;
}


function resetPath() {

    path = [];

    svg.innerHTML = "";


    cells.forEach(cell => {

        cell.style.background = "white";

    });

}



document.addEventListener("mouseup", () => {

    isDrawing = false;

});



restartBtn.addEventListener("click", resetPath);