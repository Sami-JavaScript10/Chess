// ==========================================
// 👑 CHESS GM: VIPER SPEED v212.0
// ULTRA-FAST ANIMATIONS + NO-DELAY AI
// ==========================================

const SQ = 15; const OFF_X = 2; const OFF_Y = 4;
const DIFF_NAMES = ["EASY", "NORM", "ADV", "MAST", "GM", "GOD"];
const VALS = [0, 100, 320, 330, 500, 900, 1000000];

const PST = [
    [0, 0, 0, 0, 0, 0, 0, 0], [5, 10, 10, 10, 10, 10, 10, 5],
    [4, 7, 12, 15, 15, 12, 7, 4], [2, 5, 10, 20, 20, 10, 5, 2],
    [2, 5, 10, 20, 20, 10, 5, 2], [4, 7, 12, 15, 15, 12, 7, 4],
    [5, 10, 10, 10, 10, 10, 10, 5], [0, 0, 0, 0, 0, 0, 0, 0]
];

let board: number[][] = [];
let state = "MENU"; let turn = 1; let pCol = 1; let dIdx = 2;
let cx = 4, cy = 6; let sx = -1, sy = -1;
let status = "READY"; let advantage = 0; let gameOver = false;
let whiteInCheck = false; let blackInCheck = false;
let animP = 0, animX1 = 0, animY1 = 0, animX2 = 0, animY2 = 0, animStep = -1;
let puzIdx = 0; let hintM: number[] = null;

// --- CORE LOGIC ---

function isAttacking(x1: number, y1: number, x2: number, y2: number, b: number[][]): boolean {
    let p1 = b[y1][x1], ap = Math.abs(p1), dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    if (ap == 1) return dx == 1 && (y2 - y1) == (p1 > 0 ? -1 : 1);
    if (ap == 2 || ap == 4 || ap == 5) {
        if (!((ap == 2 && (dx == 0 || dy == 0)) || (ap == 4 && dx == dy) || (ap == 5 && (dx == dy || dx == 0 || dy == 0)))) return false;
        let sX = Math.sign(x2 - x1), sY = Math.sign(y2 - y1), tx = x1 + sX, ty = y1 + sY;
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
        if (b[r][c] != 0 && (b[r][c] > 0 != side > 0) && isAttacking(c, r, kx, ky, b)) return true;
    return false;
}

function isLegal(x1: number, y1: number, x2: number, y2: number, b: number[][]): boolean {
    let p1 = b[y1][x1];
    if (p1 == 0 || (b[y2][x2] != 0 && (p1 > 0 == b[y2][x2] > 0))) return false;
    let ap = Math.abs(p1), dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    let ok = false;
    if (ap == 1) {
        let dir = (p1 > 0) ? -1 : 1;
        if (dx == 0 && (y2 - y1) == dir && b[y2][x2] == 0) ok = true;
        else if (dx == 0 && (y2 - y1) == 2 * dir && b[y2][x2] == 0 && (y1 == (p1 > 0 ? 6 : 1)) && b[y1 + dir][x1] == 0) ok = true;
        else if (dx == 1 && (y2 - y1) == dir && b[y2][x2] != 0) ok = true;
    } else if (ap == 2 || ap == 4 || ap == 5) {
        if (!((ap == 2 && (dx == 0 || dy == 0)) || (ap == 4 && dx == dy) || (ap == 5 && (dx == dy || dx == 0 || dy == 0)))) ok = false;
        else {
            let sX = Math.sign(x2 - x1), sY = Math.sign(y2 - y1), tx = x1 + sX, ty = y1 + sY;
            ok = true; while (tx != x2 || ty != y2) { if (b[ty][tx] != 0) { ok = false; break; } tx += sX; ty += sY; }
        }
    } else if (ap == 3) ok = (dx * dy == 2);
    else if (ap == 6) ok = (dx <= 1 && dy <= 1);
    if (!ok) return false;
    let tmp = b[y2][x2]; b[y2][x2] = b[y1][x1]; b[y1][x1] = 0;
    let safe = !isCheck(p1 > 0 ? 1 : -1, b);
    b[y1][x1] = b[y2][x2]; b[y2][x2] = tmp;
    return safe;
}

// --- TACTICAL ENGINE ---

function negamax(depth: number, b: number[][], side: number, alpha: number, beta: number): number {
    if (depth <= 0) {
        let s = 0;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            let p = b[y][x]; if (p != 0) s += (p > 0 ? (VALS[Math.abs(p)] + PST[y][x]) : -(VALS[Math.abs(p)] + PST[7 - y][x]));
        }
        return s * side;
    }
    let max = -Infinity;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (b[y][x] * side > 0) {
            for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
                if (isLegal(x, y, tx, ty, b)) {
                    let tmp = b[ty][tx]; b[ty][tx] = b[y][x]; b[y][x] = 0;
                    let v = -negamax(depth - 1, b, -side, -beta, -alpha);
                    b[y][x] = b[ty][tx]; b[ty][tx] = tmp;
                    if (v > max) max = v; alpha = Math.max(alpha, v);
                    if (alpha >= beta) return alpha;
                }
            }
        }
    }
    return max == -Infinity ? (isCheck(side, b) ? -1000000 : 0) : max;
}

function getBestMove(side: number): number[] {
    let moves: number[][] = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (board[y][x] * side > 0) {
            for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) {
                if (isLegal(x, y, tx, ty, board)) moves.push([x, y, tx, ty]);
            }
        }
    }
    if (moves.length == 0) return null;
    let blunderChance = [70, 40, 15, 5, 0, 0][dIdx];
    if (Math.percentChance(blunderChance)) return moves[Math.randomRange(0, moves.length - 1)];

    let bestV = -Infinity; let bestM = moves[0];
    let d = (dIdx >= 4) ? 3 : 2;
    for (let m of moves) {
        let tmp = board[m[3]][m[2]]; board[m[3]][m[2]] = board[m[1]][m[0]]; board[m[1]][m[0]] = 0;
        let v = -negamax(d - 1, board, -side, -Infinity, Infinity);
        board[m[1]][m[0]] = board[m[3]][m[2]]; board[m[3]][m[2]] = tmp;
        if (v > bestV) { bestV = v; bestM = m; }
    }
    return bestM;
}

function updateStats() {
    whiteInCheck = isCheck(1, board); blackInCheck = isCheck(-1, board);
    let wV = 0, bV = 0;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        if (board[y][x] > 0) wV += VALS[Math.abs(board[y][x])];
        else if (board[y][x] < 0) bV += VALS[Math.abs(board[y][x])];
    }
    advantage = (pCol == 1) ? (wV - bV) : (bV - wV);
    let m = getBestMove(turn);
    if (!m) { gameOver = true; status = isCheck(turn, board) ? "MATE!" : "STALE"; }
    else status = isCheck(turn, board) ? "CHECK" : "PLAY";
}

// --- RENDER ---

function drawPiece(p: number, x: number, y: number) {
    let ap = Math.abs(p); let c = (p > 0) ? 1 : 15;
    if (ap == 6) {
        let inC = (p > 0) ? whiteInCheck : blackInCheck;
        if (inC) c = (gameOver && status == "MATE!") ? 2 : 4;
    }
    screen.fillRect(x + 3, y + 10, 9, 2, c);
    if (ap == 1) { screen.fillRect(x + 6, y + 4, 3, 2, c); screen.fillRect(x + 5, y + 6, 5, 4, c); }
    else if (ap == 2) { screen.fillRect(x + 4, y + 2, 7, 8, c); screen.fillRect(x + 3, y + 1, 2, 2, c); screen.fillRect(x + 9, y + 1, 2, 2, c); }
    else if (ap == 3) { screen.fillRect(x + 5, y + 2, 5, 8, c); screen.fillRect(x + 3, y + 3, 3, 4, c); }
    else if (ap == 4) { screen.fillCircle(x + 7, y + 4, 3, c); screen.fillRect(x + 6, y + 6, 3, 5, c); }
    else if (ap == 5) { screen.fillRect(x + 4, y + 4, 7, 6, c); screen.setPixel(x + 7, y + 1, c); }
    else if (ap == 6) { screen.fillRect(x + 5, y + 3, 5, 7, c); screen.fillRect(x + 7, y + 0, 1, 4, c); }
}

game.onPaint(function () {
    screen.fill(11);
    if (state == "MENU") {
        screen.print("CHESS VIPER", 45, 15, 1);
        screen.print("< " + DIFF_NAMES[dIdx] + " >", 55, 35, 5);
        screen.print("< " + (pCol == 1 ? "WHITE" : "BLACK") + " >", 50, 45, 2);
        screen.print("A: PLAY | B: PUZZLES", 25, 80, 15);
    } else {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            screen.fillRect(x * SQ + OFF_X, y * 14 + OFF_Y, SQ, 14, (x + y) % 2 == 0 ? 13 : 7);
        }
        if (hintM) {
            screen.fillRect(hintM[0] * SQ + OFF_X, hintM[1] * 14 + OFF_Y, SQ, 14, 5);
            screen.fillRect(hintM[2] * SQ + OFF_X, hintM[3] * 14 + OFF_Y, SQ, 14, 4);
        }
        if (sx != -1) {
            screen.drawRect(sx * SQ + OFF_X, sy * 14 + OFF_Y, SQ, 14, 4);
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
                if (isLegal(sx, sy, x, y, board)) screen.fillCircle(x * SQ + OFF_X + 7, y * 14 + OFF_Y + 7, 2, 5);
            }
        }
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
            if (board[y][x] != 0) drawPiece(board[y][x], x * SQ + 4, y * 14 + 4);
        }
        // VIPER ANIMATION (Only 2 frames!)
        if (animStep >= 0) {
            let ix = animX1 + (animX2 - animX1) * animStep / 2;
            let iy = animY1 + (animY2 - animY1) * animStep / 2;
            drawPiece(animP, ix, iy); animStep++;
            if (animStep > 2) { board[Math.floor((animY2 - 4) / 14)][Math.floor((animX2 - 4) / SQ)] = animP; animStep = -1; updateStats(); }
        }
        screen.fillRect(122, 0, 38, 120, 15);
        screen.print(status, 124, 15, status == "MATE!" ? 2 : 1);
        screen.print("ADV: " + (advantage / 100).toString(), 124, 40, 1);
        screen.drawRect(cx * SQ + OFF_X, cy * 14 + OFF_Y, SQ, 14, 1);
    }
})

// --- CONTROLS ---

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (state == "MENU") {
        board = []; hintM = null; for (let i = 0; i < 8; i++) board.push([0, 0, 0, 0, 0, 0, 0, 0]);
        let s = [2, 3, 4, 5, 6, 4, 3, 2];
        for (let i = 0; i < 8; i++) { board[7][i] = s[i] * pCol; board[6][i] = 1 * pCol; board[1][i] = -1 * pCol; board[0][i] = -s[i] * pCol; }
        state = "PLAY"; turn = 1; gameOver = false; updateStats();
    } else if (turn == pCol && animStep == -1 && !gameOver) {
        if (sx == -1) { if (board[cy][cx] * pCol > 0) { sx = cx; sy = cy; } }
        else {
            if (isLegal(sx, sy, cx, cy, board)) {
                hintM = null; animP = board[sy][sx]; animX1 = sx * SQ + 4; animY1 = sy * 14 + 4; animX2 = cx * SQ + 4; animY2 = cy * 14 + 4;
                board[sy][sx] = 0; animStep = 0; turn *= -1; sx = -1;
                control.runInParallel(function () {
                    while (animStep != -1) pause(5);
                    if (!gameOver) {
                        let m = getBestMove(turn);
                        if (m) {
                            animP = board[m[1]][m[0]]; animX1 = m[0] * SQ + 4; animY1 = m[1] * 14 + 4; animX2 = m[2] * SQ + 4; animY2 = m[3] * 14 + 4;
                            board[m[1]][m[0]] = 0; animStep = 0; turn *= -1;
                        }
                    }
                });
            } else sx = -1;
        }
    }
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    if (state == "MENU") {
        puzIdx = (puzIdx + 1) % 3;
        board = []; hintM = null; for (let i = 0; i < 8; i++) board.push([0, 0, 0, 0, 0, 0, 0, 0]);
        if (puzIdx == 0) { board[0][0] = -2; board[0][4] = -6; board[7][7] = 2; board[6][6] = 5; board[7][4] = 6; }
        if (puzIdx == 1) { board[0][4] = -6; board[1][4] = 6; board[0][0] = -2; board[7][0] = 5; }
        if (puzIdx == 2) { board[0][6] = -6; board[5][5] = 3; board[7][0] = 6; }
        state = "PLAY"; turn = 1; gameOver = false; updateStats();
    } else if (state == "PLAY") hintM = getBestMove(pCol);
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () { if (state == "MENU") pCol = -pCol; else if (cy > 0) cy--; })
controller.down.onEvent(ControllerButtonEvent.Pressed, function () { if (state == "MENU") pCol = -pCol; else if (cy < 7) cy++; })
controller.left.onEvent(ControllerButtonEvent.Pressed, function () { if (state == "MENU") dIdx = Math.max(0, dIdx - 1); else if (cx > 0) cx--; })
controller.right.onEvent(ControllerButtonEvent.Pressed, function () { if (state == "MENU") dIdx = Math.min(5, dIdx + 1); else if (cx < 7) cx++; })
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () { state = "MENU"; })