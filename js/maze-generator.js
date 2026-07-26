/**
 * maze-generator.js
 * 像素迷宫生成器 / Pixel Maze Generator
 *
 * 功能：
 *   - 四种算法生成迷宫：递归回溯 / Prim / Kruskal / Eller
 *   - 可调参数：迷宫大小（宽×高，必须是奇数）、墙壁厚度（1-3 像素）、入口与出口位置
 *   - BFS 自动求解最短路径，并使用 requestAnimationFrame 逐步动画显示
 *   - Canvas 像素风渲染，可导出像素图（PNG dataURL）
 *
 * 迷宫数据模型：
 *   - 二维数组 maze[row][col]，0=通路，1=墙壁，2=求解路径
 *   - 网格宽高均为奇数；逻辑单元格位于奇数索引 (1,3,5,...)，墙壁位于偶数索引与外边界
 *
 * 用法：
 *   MazeGenerator.init(canvas);
 *   MazeGenerator.generate('recursive', 21, 21);
 *   MazeGenerator.solve();
 *   MazeGenerator.exportImage('maze.png');   // 或 MazeGenerator.export('maze.png')
 *
 * 算法哲学：像素深空 Pixel Deep Space（与站点 pixel.css 调色板一致）
 */
window.MazeGenerator = (function () {
  'use strict';

  // ============================================================
  // 常量 / Constants
  // ============================================================

  // 颜色（与站点 pixel.css 变量保持一致）
  const COLOR = {
    WALL:      '#2d2d44', // bg-panel  墙壁
    PATH:      '#1a1a2e', // bg-deep   通路
    SOLUTION:  '#ffd700', // accent    求解路径（金）
    ENTRANCE:  '#228b22', // leaf 绿   入口
    EXIT:      '#ff4500', // fire 红   出口
    CANVAS_BG: '#1a1a2e'  // 画布底色（通路色）
  };

  // 单元格取值
  const CELL = { PATH: 0, WALL: 1, SOLUTION: 2 };

  // 算法名别名映射（允许中英文）
  const ALGORITHM_ALIASES = {
    'recursive':    'recursive',
    'backtracking': 'recursive',
    '递归回溯':      'recursive',
    'prim':         'prim',
    'kruskal':      'kruskal',
    'eller':        'eller'
  };

  // ============================================================
  // 模块状态 / Module State
  // ============================================================

  let canvas = null;
  let ctx = null;

  let maze = null;          // 二维数组 maze[row][col]
  let mazeWidth = 0;        // 网格宽度（奇数）
  let mazeHeight = 0;       // 网格高度（奇数）
  let cellCols = 0;         // 逻辑单元格列数 = (width-1)/2
  let cellRows = 0;         // 逻辑单元格行数 = (height-1)/2

  let wallThickness = 2;    // 墙壁厚度 1-3（导出像素图中每格的像素数；同时影响屏幕方块大小）
  let pixelSize = 16;       // 屏幕渲染时每格的像素大小（由 wallThickness 与迷宫尺寸推算）

  // 用户配置的入口/出口规格（在 setOptions / generate 时设置，跨多次 generate 保留）
  let entranceSpec = null;
  let exitSpec = null;
  // 解析后的网格坐标 {row, col}（每次 generate 重新计算）
  let entrance = null;
  let exit = null;

  let solving = false;          // 是否正在播放求解动画
  let animationFrameId = null; // requestAnimationFrame 句柄

  // ============================================================
  // 初始化 / Init
  // ============================================================

  /**
   * 初始化迷宫生成器，绑定 canvas 与 2d 上下文。
   * @param {HTMLCanvasElement} canvasEl
   */
  function init(canvasEl) {
    canvas = canvasEl;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // 像素风：CSS 放大时禁用平滑
    canvas.style.imageRendering = 'pixelated';
    clear();
  }

  /**
   * 设置可选参数（墙壁厚度、入口、出口）。
   * @param {Object} opts
   *   - wallThickness: 1|2|3
   *   - entrance/exit: { side:'left'|'right'|'top'|'bottom', index } 或 { row, col }
   */
  function setOptions(opts) {
    opts = opts || {};
    if (opts.wallThickness != null) {
      const t = Math.round(opts.wallThickness);
      if (t >= 1 && t <= 3) wallThickness = t;
    }
    if (opts.entrance != null) entranceSpec = opts.entrance;
    if (opts.exit != null) exitSpec = opts.exit;
  }

  // ============================================================
  // 生成 / Generate
  // ============================================================

  /**
   * 生成迷宫。
   * @param {string} algorithm 'recursive'|'prim'|'kruskal'|'eller'（支持中文别名）
   * @param {number} width  网格宽度（奇数；偶数自动 +1）
   * @param {number} height 网格高度（奇数；偶数自动 +1）
   * @param {Object} [opts] 可选 { wallThickness, entrance, exit }
   */
  function generate(algorithm, width, height, opts) {
    if (!ctx) return;
    if (opts) setOptions(opts);

    // 强制奇数 & 最小尺寸 5
    let W = Math.max(5, Math.floor(width) || 15);
    let H = Math.max(5, Math.floor(height) || 15);
    if (W % 2 === 0) W++;
    if (H % 2 === 0) H++;
    mazeWidth = W;
    mazeHeight = H;
    cellCols = (W - 1) / 2;
    cellRows = (H - 1) / 2;

    // 取消正在进行的求解动画
    stopAnimation();

    // 初始化全墙网格，并挖出逻辑单元格位置
    initGrid();

    // 分发到对应算法
    const algoKey = ALGORITHM_ALIASES[String(algorithm).toLowerCase()] || 'recursive';
    switch (algoKey) {
      case 'prim':    generatePrim();    break;
      case 'kruskal': generateKruskal(); break;
      case 'eller':   generateEller();   break;
      default:        generateRecursive(); break;
    }

    // 在边界上挖出入口与出口
    setupEntranceExit();

    // 推算屏幕像素大小并渲染
    pixelSize = computePixelSize();
    render();
  }

  // ============================================================
  // 网格初始化与坐标辅助 / Grid helpers
  // ============================================================

  /** 创建全墙网格，并把逻辑单元格（奇数索引）设为通路。 */
  function initGrid() {
    maze = [];
    for (let r = 0; r < mazeHeight; r++) {
      maze.push(new Array(mazeWidth).fill(CELL.WALL));
    }
    for (let r = 0; r < cellRows; r++) {
      for (let c = 0; c < cellCols; c++) {
        maze[2 * r + 1][2 * c + 1] = CELL.PATH;
      }
    }
  }

  /** 打通逻辑单元格 (cr,cc) 与 (cr,cc+1) 之间的墙。 */
  function carveH(cr, cc) {
    maze[2 * cr + 1][2 * cc + 2] = CELL.PATH;
  }
  /** 打通逻辑单元格 (cr,cc) 与 (cr+1,cc) 之间的墙。 */
  function carveV(cr, cc) {
    maze[2 * cr + 2][2 * cc + 1] = CELL.PATH;
  }

  /** Fisher-Yates 洗牌（就地）。 */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  // ============================================================
  // 算法 1：递归回溯 / Recursive Backtracking
  // ============================================================

  /** 用栈实现：从起点随机走，走不通时回溯。 */
  function generateRecursive() {
    const visited = [];
    for (let r = 0; r < cellRows; r++) visited.push(new Array(cellCols).fill(false));

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上/下/左/右
    const stack = [[0, 0]];
    visited[0][0] = true;

    while (stack.length > 0) {
      const cur = stack[stack.length - 1];
      const cr = cur[0], cc = cur[1];

      // 收集未访问邻居
      const neighbors = [];
      for (let i = 0; i < 4; i++) {
        const nr = cr + dirs[i][0], nc = cc + dirs[i][1];
        if (nr >= 0 && nr < cellRows && nc >= 0 && nc < cellCols && !visited[nr][nc]) {
          neighbors.push([nr, nc]);
        }
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        const nr = next[0], nc = next[1];
        // 打通中间墙
        if (nr === cr) {
          carveH(cr, Math.min(cc, nc));
        } else {
          carveV(Math.min(cr, nr), cc);
        }
        visited[nr][nc] = true;
        stack.push([nr, nc]);
      } else {
        // 走不通，回溯
        stack.pop();
      }
    }
  }

  // ============================================================
  // 算法 2：Prim
  // ============================================================

  /** 从起点开始维护墙壁列表，随机选择墙壁打通（仅当恰好一侧已访问）。 */
  function generatePrim() {
    const visited = [];
    for (let r = 0; r < cellRows; r++) visited.push(new Array(cellCols).fill(false));

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const walls = []; // 每项 { cr, cc, ncr, ncc }

    /** 把 (cr,cc) 与未越界邻居之间的墙加入列表。 */
    function addWalls(cr, cc) {
      for (let i = 0; i < 4; i++) {
        const nr = cr + dirs[i][0], nc = cc + dirs[i][1];
        if (nr >= 0 && nr < cellRows && nc >= 0 && nc < cellCols) {
          walls.push({ cr: cr, cc: cc, ncr: nr, ncc: nc });
        }
      }
    }

    visited[0][0] = true;
    addWalls(0, 0);

    while (walls.length > 0) {
      // 随机取一面墙（swap-pop 删除）
      const idx = Math.floor(Math.random() * walls.length);
      const w = walls[idx];
      walls[idx] = walls[walls.length - 1];
      walls.pop();

      const cr = w.cr, cc = w.cc, ncr = w.ncr, ncc = w.ncc;
      // 仅当一侧已访问、另一侧未访问时打通（避免成环）
      if (visited[cr][cc] !== visited[ncr][ncc]) {
        if (cr === ncr) {
          carveH(cr, Math.min(cc, ncc));
        } else {
          carveV(Math.min(cr, ncr), cc);
        }
        // 标记未访问一侧为已访问，并把它的墙加入列表
        if (!visited[ncr][ncc]) { visited[ncr][ncc] = true; addWalls(ncr, ncc); }
        if (!visited[cr][cc])   { visited[cr][cc]   = true; addWalls(cr, cc);   }
      }
    }
  }

  // ============================================================
  // 算法 3：Kruskal（并查集）
  // ============================================================

  /** 并查集（带路径压缩与按秩合并）。 */
  function UnionFind(n) {
    this.parent = new Array(n);
    this.rank = new Array(n);
    for (let i = 0; i < n; i++) { this.parent[i] = i; this.rank[i] = 0; }
  }
  UnionFind.prototype.find = function (x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // 路径压缩
      x = this.parent[x];
    }
    return x;
  };
  UnionFind.prototype.union = function (a, b) {
    const ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    return true;
  };

  /** 随机选择墙壁，若两侧单元格不连通则打通。 */
  function generateKruskal() {
    const uf = new UnionFind(cellRows * cellCols);
    const walls = [];
    // 收集所有内部墙
    for (let r = 0; r < cellRows; r++) {
      for (let c = 0; c < cellCols; c++) {
        const id = r * cellCols + c;
        if (c < cellCols - 1) walls.push({ a: id, b: id + 1,         type: 'H', r: r, c: c });
        if (r < cellRows - 1) walls.push({ a: id, b: id + cellCols,  type: 'V', r: r, c: c });
      }
    }
    shuffle(walls);
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (uf.union(w.a, w.b)) {
        if (w.type === 'H') carveH(w.r, w.c);
        else                carveV(w.r, w.c);
      }
    }
  }

  // ============================================================
  // 算法 4：Eller（逐行）
  // ============================================================

  /** 逐行处理，维护集合编号；最后一行强制合并所有相邻不同集合。 */
  function generateEller() {
    let set = new Array(cellCols).fill(0); // 0 表示尚无集合
    let nextSet = 1;

    for (let r = 0; r < cellRows; r++) {
      const isLastRow = (r === cellRows - 1);

      // 1) 为本行中没有集合的单元格分配新集合（从上一行延伸下来的会保留集合）
      for (let c = 0; c < cellCols; c++) {
        if (set[c] === 0) set[c] = nextSet++;
      }

      // 2) 水平合并：随机合并相邻不同集合（最后一行强制合并）
      for (let c = 0; c < cellCols - 1; c++) {
        if (set[c] !== set[c + 1]) {
          if (isLastRow || Math.random() < 0.5) {
            const old = set[c + 1];
            const neu = set[c];
            for (let k = 0; k < cellCols; k++) {
              if (set[k] === old) set[k] = neu;
            }
            carveH(r, c);
          }
        }
      }

      // 3) 垂直合并（非最后一行）：每个集合至少向下延伸一格
      if (!isLastRow) {
        const groups = {};
        for (let c = 0; c < cellCols; c++) {
          const key = set[c];
          if (!groups[key]) groups[key] = [];
          groups[key].push(c);
        }
        const nextRow = new Array(cellCols).fill(0);
        for (const key in groups) {
          if (!groups.hasOwnProperty(key)) continue;
          const cols = groups[key];
          let extended = false;
          for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            if (!extended || Math.random() < 0.5) {
              carveV(r, c);
              nextRow[c] = set[c]; // 下方继承集合
              extended = true;
            }
          }
          // 兜底：保证每个集合至少向下延伸一格
          if (!extended) {
            const c = cols[0];
            carveV(r, c);
            nextRow[c] = set[c];
          }
        }
        // 未延伸的列 nextRow 为 0，下一行将分配新集合
        set = nextRow;
      }
    }
  }

  // ============================================================
  // 入口 / 出口 / Entrance & Exit
  // ============================================================

  /** 根据配置或默认值设置入口、出口，并在边界挖洞。 */
  function setupEntranceExit() {
    entrance = resolveOpening(
      entranceSpec != null ? entranceSpec : { side: 'left', index: 0 }
    );
    exit = resolveOpening(
      exitSpec != null ? exitSpec : { side: 'right', index: cellRows - 1 }
    );
    if (entrance) maze[entrance.row][entrance.col] = CELL.PATH;
    if (exit)     maze[exit.row][exit.col] = CELL.PATH;
  }

  /**
   * 把入口/出口规格解析为网格坐标 {row,col}。
   * 支持 { side:'left'|'right'|'top'|'bottom', index } 或 { row, col }。
   */
  function resolveOpening(spec) {
    if (!spec) return null;
    // 直接给定网格坐标
    if (typeof spec.row === 'number' && typeof spec.col === 'number') {
      const rr = Math.max(0, Math.min(mazeHeight - 1, spec.row));
      const cc = Math.max(0, Math.min(mazeWidth - 1, spec.col));
      return { row: rr, col: cc };
    }
    const side = spec.side;
    const i = Math.max(0, Math.min(cellRows - 1, Math.floor(spec.index) || 0));
    switch (side) {
      case 'left':   return { row: 2 * i + 1, col: 0 };
      case 'right':  return { row: 2 * i + 1, col: mazeWidth - 1 };
      case 'top':    return { row: 0, col: 2 * i + 1 };
      case 'bottom': return { row: mazeHeight - 1, col: 2 * i + 1 };
      default:       return { row: 1, col: 0 };
    }
  }

  // ============================================================
  // 渲染 / Render
  // ============================================================

  /** 根据 wallThickness 与迷宫尺寸推算屏幕每格像素大小。 */
  function computePixelSize() {
    const maxDim = Math.max(mazeWidth, mazeHeight);
    const target = 560; // 目标最大边长（屏幕像素）
    let k = Math.floor(target / (maxDim * wallThickness));
    if (k < 1) k = 1;
    if (k > 8) k = 8;
    return wallThickness * k;
  }

  /** 返回某格应使用的颜色。 */
  function colorOf(r, c) {
    if (entrance && r === entrance.row && c === entrance.col) return COLOR.ENTRANCE;
    if (exit && r === exit.row && c === exit.col) return COLOR.EXIT;
    const v = maze[r][c];
    if (v === CELL.WALL) return COLOR.WALL;
    if (v === CELL.SOLUTION) return COLOR.SOLUTION;
    return COLOR.PATH;
  }

  /** 全量渲染迷宫到 canvas。 */
  function render() {
    if (!ctx || !maze) return;
    const ps = pixelSize;
    canvas.width = mazeWidth * ps;
    canvas.height = mazeHeight * ps;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = COLOR.CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < mazeHeight; r++) {
      for (let c = 0; c < mazeWidth; c++) {
        ctx.fillStyle = colorOf(r, c);
        ctx.fillRect(c * ps, r * ps, ps, ps);
      }
    }
  }

  // ============================================================
  // 求解 / Solve（BFS + 动画）
  // ============================================================

  /**
   * 自动求解：BFS 找到从入口到出口的最短路径，并用 requestAnimationFrame 逐步动画绘制。
   * @returns {boolean} 是否成功找到路径
   */
  function solve() {
    if (!maze || !entrance || !exit) return false;
    if (solving) return false; // 防止重复触发

    // 先清除上一次的求解路径（SOLUTION 还原为 PATH）并全量重绘
    clearSolution();

    const path = bfsPath(entrance, exit);
    if (!path || path.length === 0) return false;

    solving = true;
    let idx = 0;
    // 每帧绘制的格数（路径越长每帧越多，保证动画约 1 秒内完成）
    const stepPerFrame = Math.max(1, Math.ceil(path.length / 60));
    const ps = pixelSize;

    function step() {
      if (!solving) return;
      const end = Math.min(idx + stepPerFrame, path.length);
      // 增量绘制本帧覆盖的格子（不重绘整个迷宫，保证流畅）
      for (let i = idx; i < end; i++) {
        const p = path[i];
        const isEntrance = (p.row === entrance.row && p.col === entrance.col);
        const isExit = (p.row === exit.row && p.col === exit.col);
        if (!isEntrance && !isExit) {
          maze[p.row][p.col] = CELL.SOLUTION;
          ctx.fillStyle = COLOR.SOLUTION;
        } else if (isEntrance) {
          ctx.fillStyle = COLOR.ENTRANCE;
        } else {
          ctx.fillStyle = COLOR.EXIT;
        }
        ctx.fillRect(p.col * ps, p.row * ps, ps, ps);
      }
      idx = end;
      if (idx < path.length) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        solving = false;
        animationFrameId = null;
      }
    }
    animationFrameId = requestAnimationFrame(step);
    return true;
  }

  /** BFS 求最短路径，返回坐标数组 [{row,col}, ...] 或 null。 */
  function bfsPath(start, end) {
    const visited = [];
    const prev = [];
    for (let r = 0; r < mazeHeight; r++) {
      visited.push(new Array(mazeWidth).fill(false));
      prev.push(new Array(mazeWidth).fill(null));
    }
    const queue = [start];
    visited[start.row][start.col] = true;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let found = false;
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.row === end.row && cur.col === end.col) { found = true; break; }
      for (let i = 0; i < 4; i++) {
        const nr = cur.row + dirs[i][0], nc = cur.col + dirs[i][1];
        if (nr < 0 || nr >= mazeHeight || nc < 0 || nc >= mazeWidth) continue;
        if (visited[nr][nc]) continue;
        if (maze[nr][nc] === CELL.WALL) continue; // 墙壁不可走
        visited[nr][nc] = true;
        prev[nr][nc] = { row: cur.row, col: cur.col };
        queue.push({ row: nr, col: nc });
      }
    }
    if (!found) return null;
    // 由终点回溯到起点
    const path = [];
    let cur = end;
    while (cur && !(cur.row === start.row && cur.col === start.col)) {
      path.push({ row: cur.row, col: cur.col });
      cur = prev[cur.row][cur.col];
    }
    path.push({ row: start.row, col: start.col });
    path.reverse();
    return path;
  }

  /** 把所有 SOLUTION 格还原为 PATH（保留入口/出口）并重绘。 */
  function clearSolution() {
    if (!maze) return;
    for (let r = 0; r < mazeHeight; r++) {
      for (let c = 0; c < mazeWidth; c++) {
        if (maze[r][c] === CELL.SOLUTION) maze[r][c] = CELL.PATH;
      }
    }
    render();
  }

  /** 取消正在进行的求解动画。 */
  function stopAnimation() {
    if (animationFrameId != null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    solving = false;
  }

  // ============================================================
  // 导出 / Export
  // ============================================================

  /**
   * 导出像素图（PNG dataURL）。
   * 每个网格单元 = wallThickness 像素，因此墙壁在导出图中即为 wallThickness 像素厚。
   * @param {string} [filename] 若提供则触发浏览器下载
   * @returns {string} PNG dataURL（无迷宫时返回空串）
   */
  function exportImage(filename) {
    if (!maze) return '';
    const s = wallThickness;
    const off = document.createElement('canvas');
    off.width = mazeWidth * s;
    off.height = mazeHeight * s;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    for (let r = 0; r < mazeHeight; r++) {
      for (let c = 0; c < mazeWidth; c++) {
        octx.fillStyle = colorOf(r, c);
        octx.fillRect(c * s, r * s, s, s);
      }
    }
    const url = off.toDataURL('image/png');
    if (filename) {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) { /* 忽略下载错误，仍返回 dataURL */ }
    }
    return url;
  }

  // ============================================================
  // 清除 / Clear
  // ============================================================

  /** 清除迷宫并取消动画，画布恢复底色（保留用户设置的入口/出口规格与墙壁厚度）。 */
  function clear() {
    stopAnimation();
    maze = null;
    mazeWidth = 0;
    mazeHeight = 0;
    cellCols = 0;
    cellRows = 0;
    entrance = null;
    exit = null;
    if (ctx && canvas) {
      ctx.fillStyle = COLOR.CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ============================================================
  // 公共 API / Public API
  // ============================================================
  return {
    init: init,
    setOptions: setOptions,
    generate: generate,
    solve: solve,
    export: exportImage,      // 与需求中的 export 同义
    exportImage: exportImage, // 与需求中描述的 exportImage() 同义
    clear: clear,
    isSolving: function () { return solving; },
    getAlgorithms: function () { return ['recursive', 'prim', 'kruskal', 'eller']; }
  };
})();
