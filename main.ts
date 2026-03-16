// ==========================================
// 👑 CHESS GM: PUZZLE MASTER v196.0
// STALEMATE + PROGRESSIVE PUZZLES
// ==========================================

const SQ = 15; const OFF_X = 2; const OFF_Y = 4;
const DIFF_NAMES = ["EASY", "NORMAL", "INTER", "ADVANCED", "MASTER", "GM"];
const VALS = [0, 1, 3, 3, 5, 9, 10 ** 10];

let board: number[][] = [];
let state = "MENU"; let turn = 1; let pCol = 1; let dIdx = 5;
let cx = 4, cy = 6; let sx = -1, sy = -1;
let pScore = 0, aiScore = 0; let status = "READY";
let posHistory: string[] = []; let puzIdx = 0;
let gameOver = false;

let animP = 0, animX1 = 0, animY1 = 0, animX2 = 0, animY2 = 0, animStep = -1;

function getBoardHash(b: number[][]): string {
    let h = "";
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] != 0) h += "" + c + r + b[r][c];
    return h;
}

function drawPiece(p: number, x: number, y: number) {
    let c = (p > 0) ? 1 : 15; let ap = Math.abs(p);
    screen.fillRect(x + 3, y + 10, 9, 2, c);
    if (ap == 1) { screen.fillRect(x + 6, y + 4, 3, 2, c); screen.fillRect(x + 5, y + 6, 5, 4, c); }
    else if (ap == 2) { screen.fillRect(x + 4, y + 2, 7, 8, c); screen.fillRect(x + 3, y + 1, 2, 2, c); screen.fillRect(x + 9, y + 1, 2, 2, c); }
    else if (ap == 3) { screen.fillRect(x + 5, y + 2, 5, 8, c); screen.fillRect(x + 3, y + 3, 3, 4, c); }
    else if (ap == 4) { screen.fillCircle(x + 7, y + 4, 3, c); screen.fillRect(x + 6, y + 6, 3, 5, c); }
    else if (ap == 5) { screen.fillRect(x + 4, y + 4, 7, 6, c); screen.setPixel(x + 7, y + 1, c); }
    else if (ap == 6) { screen.fillRect(x + 5, y + 3, 5, 7, c); screen.fillRect(x + 7, y + 0, 1, 4, c); }
}

function canMove(x1: number, y1: number, x2: number, y2: number, b: number[][]): boolean {
    let p1 = b[y1][x1], p2 = b[y2][x2];
    if (p1 == 0 || (p2 != 0 && (p1 > 0 == p2 > 0))) return false;
    let ap = Math.abs(p1), dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    if (ap == 1) {
        let dir = (p1 > 0) ? -1 : 1;
        if (dx == 0 && (y2 - y1) == dir && p2 == 0) return true;
        if (dx == 0 && (y2 - y1) == 2 * dir && p2 == 0 && (y1 == 1 || y1 == 6) && b[y1 + dir][x1] == 0) return true;
        return (dx == 1 && (y2 - y1) == dir && p2 != 0);
    }
    if (ap == 2 || ap == 4 || ap == 5) {
        if (ap == 2 && dx != 0 && dy != 0) return false;
        if (ap == 4 && dx != dy) return false;
        if (ap == 5 && dx != dy && dx != 0 && dy != 0) return false;
        let sX = Math.sign(x2 - x1), sY = Math.sign(y2 - y1);
        let tx = x1 + sX, ty = y1 + sY;
        while (tx != x2 || ty != y2) { if (b[ty][tx] != 0) return false; tx += sX; ty += sY; }
        return true;
    }
    return (ap == 3) ? (dx * dy == 2) : (ap == 6 && dx <= 1 && dy <= 1);
}

function isCheck(side: number, b: number[][]): boolean {
    let kx = -1, ky = -1;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] == side * 6) { kx = c; ky = r; }
    if (kx == -1) return false;
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
        if (b[r][c] != 0 && (b[r][c] > 0 != side > 0) && canMove(c, r, kx, ky, b)) return true;
    return false;
}

function isLegal(x1: number, y1: number, x2: number, y2: number, b: number[][]): boolean {
    let side = b[y1][x1] > 0 ? 1 : -1;
    let tmp = b[y2][x2]; b[y2][x2] = b[y1][x1]; b[y1][x1] = 0;
    let safe = !isCheck(side, b);
    b[y1][x1] = b[y2][x2]; b[y2][x2] = tmp;
    return safe && canMove(x1, y1, x2, y2, b);
}

function updateStats() {
    pScore = 0; aiScore = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        let p = board[y][x]; if (p > 0) pScore += (p == 6 ? 0 : VALS[p]); if (p < 0) aiScore += (p == -6 ? 0 : VALS[-p]);
    }

    let hasMove = false;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (board[y][x] * turn > 0) {
            for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
                if (isLegal(x, y, tx, ty, board)) { hasMove = true; break; }
            }
        }
        if (hasMove) break;
    }

    if (!hasMove) {
        gameOver = true;
        if (isCheck(turn, board)) { status = "MATE!"; }
        else { status = "STALE"; }
    } else {
        status = isCheck(turn, board) ? "CHECK" : "PLAYING";
    }
}

function getBestMove(side: number): number[] {
    let bestV = -Infinity, bestM = null;
    let d = (dIdx < 4) ? 2 : 3;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (board[y][x] * side > 0) {
            for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
                if (isLegal(x, y, tx, ty, board)) {
                    let tmp = board[ty][tx]; board[ty][tx] = board[y][x]; board[y][x] = 0;
                    let v = -negamax(d - 1, board, -side, -Infinity, Infinity);
                    board[y][x] = board[ty][tx]; board[ty][tx] = tmp;
                    if (v > bestV) { bestV = v; bestM = [x, y, tx, ty]; }
                }
            }
        }
    }
    return bestM;
}

function negamax(depth: number, b: number[][], side: number, alpha: number, beta: number): number {
    if (depth == 0) return evaluate(b) * side;
    let max = -Infinity;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (b[y][x] * side > 0) {
            for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
                if (canMove(x, y, tx, ty, b)) {
                    let tmp = b[ty][tx]; b[ty][tx] = b[y][x]; b[y][x] = 0;
                    let v = -negamax(depth - 1, b, -side, -beta, -alpha);
                    b[y][x] = b[ty][tx]; b[ty][tx] = tmp;
                    max = Math.max(max, v); alpha = Math.max(alpha, v);
                    if (alpha >= beta) return alpha;
                }
            }
        }
    }
    return max;
}

function evaluate(b: number[][]): number {
    let s = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        let p = b[y][x]; if (p != 0) s += (p > 0 ? VALS[Math.abs(p)] : -VALS[Math.abs(p)]);
    }
    return s;
}

function setupPuzzle(idx: number) {
    board = []; for (let i = 0; i < 8; i++) board.push([0, 0, 0, 0, 0, 0, 0, 0]);
    if (idx % 3 == 0) { board[0][4] = -6; board[2][4] = 6; board[0][0] = -4; board[7][0] = 4; } // Mate in 1 Rook
    else if (idx % 3 == 1) { board[0][7] = -6; board[0][6] = -1; board[0][5] = -1; board[7][0] = 4; board[6][4] = 6; } // Back Rank
    else { board[0][0] = -6; board[1][2] = 6; board[2][1] = 3; board[7][7] = 1; } // Smothered Theme
    status = "SOLVE!"; state = "PLAY"; turn = 1; gameOver = false; updateStats();
}

game.onPaint(function () {
    screen.fill(11);
    if (state == "MENU") {
        screen.print("GM CHESS MASTER", 35, 20, 1);
        screen.print("< " + DIFF_NAMES[dIdx] + " >", 50, 45, 5);
        screen.print("A: NEW GAME", 45, 75, 15);
        screen.print("B: PUZZLE " + (puzIdx + 1), 40, 90, 15);
    } else {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            screen.fillRect(x * SQ + OFF_X, y * 14 + OFF_Y, SQ, 14, (x + y) % 2 == 0 ? 13 : 7);
            if (sx == x && sy == y) screen.drawRect(x * SQ + OFF_X, y * 14 + OFF_Y, SQ, 14, 4);
            if (sx != -1 && isLegal(sx, sy, x, y, board)) screen.fillCircle(x * SQ + OFF_X + 7, y * 14 + OFF_Y + 7, 2, 5);
            if (board[y][x] != 0) drawPiece(board[y][x], x * SQ + 4, y * 14 + 4);
        }
        if (animStep >= 0) {
            let ix = animX1 + (animX2 - animX1) * animStep / 10, iy = animY1 + (animY2 - animY1) * animStep / 10;
            drawPiece(animP, ix, iy); animStep++;
            if (animStep > 10) {
                board[Math.floor((animY2 - 4) / 14)][Math.floor((animX2 - 4) / SQ)] = animP;
                for (let i = 0; i < 8; i++) { if (board[0][i] == 1) board[0][i] = 5; if (board[7][i] == -1) board[7][i] = -5; }
                animStep = -1; updateStats();
                if (gameOver) { puzIdx++; pause(2000); state = "MENU"; }
            }
        }
        screen.fillRect(122, 0, 38, 120, 15);
        screen.print(status, 124, 15, 2);
        screen.print("P:" + pScore, 124, 40, 6); screen.print("AI:" + aiScore, 124, 50, 2);
        screen.drawRect(cx * SQ + OFF_X, cy * 14 + OFF_Y, SQ, 14, 1);
    }
})

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (state == "MENU") {
        board = []; for (let i = 0; i < 8; i++) board.push([0, 0, 0, 0, 0, 0, 0, 0]);
        let s = [2, 3, 4, 5, 6, 4, 3, 2];
        for (let i = 0; i < 8; i++) { board[7][i] = s[i]; board[6][i] = 1; board[1][i] = -1; board[0][i] = -s[i]; }
        state = "PLAY"; turn = 1; gameOver = false; updateStats();
    } else if (turn == pCol && animStep == -1 && !gameOver) {
        if (sx == -1) { if (board[cy][cx] * pCol > 0) { sx = cx; sy = cy; } }
        else {
            if (isLegal(sx, sy, cx, cy, board)) {
                animP = board[sy][sx]; animX1 = sx * SQ + 4; animY1 = sy * 14 + 4; animX2 = cx * SQ + 4; animY2 = cy * 14 + 4;
                board[sy][sx] = 0; animStep = 0; sx = -1; turn *= -1;
                control.runInParallel(function () {
                    while (animStep != -1) pause(10);
                    if (!gameOver) {
                        let m = getBestMove(-pCol); if (m) {
                            animP = board[m[1]][m[0]]; animX1 = m[0] * SQ + 4; animY1 = m[1] * 14 + 4; animX2 = m[2] * SQ + 4; animY2 = m[3] * 14 + 4;
                            board[m[1]][m[0]] = 0; animStep = 0;
                        } turn = pCol;
                    }
                });
            } else { sx = -1; }
        }
    }
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (state == "MENU") setupPuzzle(puzIdx);
    else if (turn == pCol && !gameOver) {
        let h = getBestMove(pCol); if (h) { sx = h[0]; sy = h[1]; cx = h[2]; cy = h[3]; }
    }
})

controller.left.onEvent(ControllerButtonEvent.Pressed, function () { if (state == "MENU") dIdx = Math.max(0, dIdx - 1); else if (cx > 0) cx--; })
controller.right.onEvent(ControllerButtonEvent.Pressed, function () { if (state == "MENU") dIdx = Math.min(5, dIdx + 1); else if (cx < 7) cx++; })
controller.up.onEvent(ControllerButtonEvent.Pressed, function () { if (cy > 0) cy--; })
controller.down.onEvent(ControllerButtonEvent.Pressed, function () { if (cy < 7) cy++; })
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () { state = "MENU"; })