/**
 * physics-sandbox.js
 * 像素风 2D 物理沙盒 / Pixel 2D Physics Sandbox (Falling Sand 风格)
 *
 * 功能：
 *   - 网格化元素模拟：水 / 氢气（气体，可切换可见性）
 *   - 鼠标拖拽绘制元素，实时模拟下落 / 流动 / 上浮 / 飘动
 *   - 像素风 Canvas 渲染（每格 2×2 像素），requestAnimationFrame 驱动
 *
 * 性能优化：
 *   - 从底向上扫描（先处理下层，避免上层"穿透"下层）
 *   - 每行随机左右方向（避免整体偏向一侧）
 *   - 已处理标记 moved（避免一帧内同一元素被多次处理，等效双缓冲）
 *
 * 用法：
 *   PhysicsSandbox.init('physics-sandbox-canvas');
 *   PhysicsSandbox.setElement(PhysicsSandbox.WATER);
 *   PhysicsSandbox.setBrushSize(4);
 *   PhysicsSandbox.start();
 *   PhysicsSandbox.toggleGas();   // 切换氢气可见性
 *   PhysicsSandbox.clear();
 *   PhysicsSandbox.stop();
 */
window.PhysicsSandbox = (function () {
  'use strict';

  // ============================================================
  // 元素类型 / Element Types
  // ============================================================
  const EMPTY     = 0;  // 空
  const WATER     = 1;  // 水：下落 + 流动
  const HYDROGEN  = 2;  // 氢气：上浮 + 飘动（气体）

  // ============================================================
  // 颜色 / Colors（按元素 id 索引）
  // ============================================================
  const HEX_COLORS = [
    '#1a1a2e', // EMPTY     背景色
    '#1e90ff', // WATER     蓝
    '#b4dcff'  // HYDROGEN  半透明淡蓝（可见时）
  ];

  const ELEMENT_NAMES = ['橡皮', '水', '氢气'];
  const ELEMENT_NAME_KEYS = ['physics_element_eraser', 'physics_element_water', 'physics_element_hydrogen'];

  // hex -> [r,g,b]
  function parseColor(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substr(0, 2), 16),
      parseInt(h.substr(2, 2), 16),
      parseInt(h.substr(4, 2), 16)
    ];
  }

  // 预解析 RGB（渲染时直接取用，避免重复解析）
  const COLOR_RGB = HEX_COLORS.map(parseColor);

  // ============================================================
  // 参数 / Params
  // ============================================================
  const FIRE_LIFETIME  = 60;           // 火的基础寿命（帧）
  const CELL_SIZE      = 2;            // 每格像素大小（1-2 像素）
  const DEFAULT_COLS   = 200;          // 默认网格列数
  const DEFAULT_ROWS   = 150;          // 默认网格行数
  const PLANT_GROW_CHANCE   = 0.03;    // 植物每帧生长概率
  const ACID_CORRODE_CHANCE = 0.25;    // 酸接触腐蚀触发概率

  // ============================================================
  // 运行时状态 / Runtime State
  // ============================================================
  let canvas = null;
  let ctx = null;
  let cols = DEFAULT_COLS;
  let rows = DEFAULT_ROWS;
  let grid    = null;   // 元素 id (Uint8Array)
  let auxGrid = null;   // 辅助数据（当前仅存火剩余寿命）
  let moved   = null;   // 本帧已处理标记（等效双缓冲，防重复处理）
  let imageData = null; // 渲染缓冲
  let running = false;
  let rafId   = null;
  let currentElement = WATER;
  let brushSize = 3;
  let isDrawing = false;
  let lastX = -1;
  let lastY = -1;
  let gasVisible = false;  // 氢气是否可见（false 时渲染为背景色）

  // ============================================================
  // 工具函数 / Helpers
  // ============================================================

  function inBounds(x, y) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
  }

  // 交换两格内容（含辅助数据），并标记本帧已处理
  function swap(aIdx, bIdx) {
    const t = grid[aIdx]; grid[aIdx] = grid[bIdx]; grid[bIdx] = t;
    const ta = auxGrid[aIdx]; auxGrid[aIdx] = auxGrid[bIdx]; auxGrid[bIdx] = ta;
    moved[aIdx] = 1;
    moved[bIdx] = 1;
  }

  // 把 fromIdx 的内容移动到 toIdx（toIdx 必须为空），fromIdx 清空
  function moveTo(fromIdx, toIdx) {
    grid[toIdx] = grid[fromIdx];
    auxGrid[toIdx] = auxGrid[fromIdx];
    grid[fromIdx] = EMPTY;
    auxGrid[fromIdx] = 0;
    moved[toIdx] = 1;
    moved[fromIdx] = 1;
  }

  // ============================================================
  // 物理规则 / Physics Rules
  // ============================================================

  // 液体通用流动：下、下左/下右、左/右，仅流入空格
  function flowLiquid(x, y, idx) {
    const by = y + 1;
    const dir = Math.random() < 0.5 ? 1 : -1;
    if (by < rows) {
      if (tryFlow(x, by, idx)) return;
      if (tryFlow(x + dir, by, idx)) return;
      if (tryFlow(x - dir, by, idx)) return;
    }
    if (tryFlow(x + dir, y, idx)) return;
    if (tryFlow(x - dir, y, idx)) return;
  }

  // 液体尝试流入空格
  function tryFlow(tx, ty, fromIdx) {
    if (!inBounds(tx, ty)) return false;
    const toIdx = ty * cols + tx;
    if (moved[toIdx] || grid[toIdx] !== EMPTY) return false;
    moveTo(fromIdx, toIdx);
    return true;
  }

  // 水：标准液体流动
  function updateWater(x, y, idx) {
    flowLiquid(x, y, idx);
  }

  // 氢气：比水轻，向上移动（与水相反）；可穿过水（与水 swap 模拟密度差）
  function updateHydrogen(x, y, idx) {
    const ay = y - 1;  // 上方
    const dir = Math.random() < 0.5 ? 1 : -1;
    if (ay >= 0) {
      // 优先正上方：空或水都上浮（水则 swap）
      if (tryRiseHydrogen(x, ay, idx)) return;
      // 上左 / 上右（随机方向优先）
      if (tryRiseHydrogen(x + dir, ay, idx)) return;
      if (tryRiseHydrogen(x - dir, ay, idx)) return;
    }
    // 上方都阻塞时，尝试同行左/右横向飘动（仅流入空格）
    if (tryFlow(x + dir, y, idx)) return;
    if (tryFlow(x - dir, y, idx)) return;
  }

  // 氢气尝试上浮到目标格（空：移动；水：swap）
  function tryRiseHydrogen(tx, ty, fromIdx) {
    if (!inBounds(tx, ty)) return false;
    const toIdx = ty * cols + tx;
    if (moved[toIdx]) return false;
    const t = grid[toIdx];
    if (t === EMPTY) { moveTo(fromIdx, toIdx); return true; }
    if (t === WATER) { swap(fromIdx, toIdx); return true; }
    return false;
  }

  // 单格更新分发
  function updateCell(x, y, idx, cell) {
    switch (cell) {
      case WATER:     updateWater(x, y, idx); break;
      case HYDROGEN:  updateHydrogen(x, y, idx); break;
      // EMPTY 静止不动
    }
  }

  // ============================================================
  // 模拟一步 / Simulation Step
  // ============================================================
  function step() {
    moved.fill(0);
    // 从底向上扫描：先处理下层，避免上层元素"穿透"下层
    for (let y = rows - 1; y >= 0; y--) {
      // 每行随机左右方向，避免整体偏向一侧
      const ltr = Math.random() < 0.5;
      for (let i = 0; i < cols; i++) {
        const x = ltr ? i : (cols - 1 - i);
        const idx = y * cols + x;
        if (moved[idx]) continue;       // 本帧已处理，跳过
        const cell = grid[idx];
        if (cell === EMPTY) continue;
        updateCell(x, y, idx, cell);
      }
    }
  }

  // ============================================================
  // 渲染 / Render
  // ============================================================
  function render() {
    if (!imageData) return;
    const data = imageData.data;
    const w = canvas.width;
    // 背景色 #1a1a2e = 26,26,46（与 EMPTY 相同）
    const bg = COLOR_RGB[EMPTY];
    const bg_r = bg[0], bg_g = bg[1], bg_b = bg[2];
    // 氢气可见色 #b4dcff = 180,220,255；半透明混合（背景 40% + 淡蓝 60%）
    const hg = COLOR_RGB[HYDROGEN];
    const h_r = Math.round(bg_r * 0.4 + hg[0] * 0.6);
    const h_g = Math.round(bg_g * 0.4 + hg[1] * 0.6);
    const h_b = Math.round(bg_b * 0.4 + hg[2] * 0.6);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const cell = grid[idx];
        let r, g, b;
        if (cell === HYDROGEN) {
          if (gasVisible) {
            r = h_r; g = h_g; b = h_b;
          } else {
            // 不可见时渲染为背景色（与 EMPTY 一致）
            r = bg_r; g = bg_g; b = bg_b;
          }
        } else {
          const rgb = COLOR_RGB[cell];
          r = rgb[0]; g = rgb[1]; b = rgb[2];
        }
        // 填充 CELL_SIZE × CELL_SIZE 像素块
        const bx = x * CELL_SIZE;
        const by = y * CELL_SIZE;
        for (let dy = 0; dy < CELL_SIZE; dy++) {
          const py = by + dy;
          for (let dx = 0; dx < CELL_SIZE; dx++) {
            const pidx = (py * w + bx + dx) * 4;
            data[pidx]     = r;
            data[pidx + 1] = g;
            data[pidx + 2] = b;
            data[pidx + 3] = 255;
          }
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // ============================================================
  // 笔刷绘制 / Brush Painting
  // ============================================================

  // 在 (gx,gy) 处用圆形笔刷绘制当前元素
  function paint(gx, gy) {
    const r = brushSize;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const px = gx + dx, py = gy + dy;
        if (!inBounds(px, py)) continue;
        const idx = py * cols + px;
        grid[idx] = currentElement;
        auxGrid[idx] = 0;
      }
    }
  }

  // 沿两点连线绘制（Bresenham），避免快速拖动出现断点
  function paintLine(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;
    while (true) {
      paint(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx)  { err += dx; y += sy; }
    }
  }

  // ============================================================
  // 输入事件 / Input Events
  // ============================================================

  // 屏幕坐标 -> 网格坐标
  function getGridPos(e) {
    const rect = canvas.getBoundingClientRect();
    let cx, cy;
    if (e.clientX !== undefined) {
      cx = e.clientX; cy = e.clientY;
    } else if (e.touches && e.touches[0]) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      return { x: -1, y: -1 };
    }
    const rx = (cx - rect.left) / rect.width;
    const ry = (cy - rect.top) / rect.height;
    return {
      x: Math.floor(rx * cols),
      y: Math.floor(ry * rows)
    };
  }

  function onDown(e) {
    if (e.preventDefault) e.preventDefault();
    isDrawing = true;
    const p = getGridPos(e);
    if (p.x < 0) return;
    paint(p.x, p.y);
    lastX = p.x; lastY = p.y;
    render();
  }

  function onMove(e) {
    if (!isDrawing) return;
    if (e.preventDefault) e.preventDefault();
    const p = getGridPos(e);
    if (p.x < 0) return;
    paintLine(lastX, lastY, p.x, p.y);
    lastX = p.x; lastY = p.y;
    render();
  }

  function onUp() {
    isDrawing = false;
  }

  function attachEvents() {
    // pointer 事件统一覆盖鼠标 / 触摸 / 触控笔
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    canvas.style.touchAction = 'none'; // 防止触摸时页面滚动
  }

  // ============================================================
  // 网格构建 / Grid Building
  // ============================================================
  function buildGrid(c, r) {
    cols = c; rows = r;
    canvas.width  = cols * CELL_SIZE;
    canvas.height = rows * CELL_SIZE;
    ctx.imageSmoothingEnabled = false;
    grid    = new Uint8Array(cols * rows);
    auxGrid = new Uint8Array(cols * rows);
    moved   = new Uint8Array(cols * rows);
    imageData = ctx.createImageData(canvas.width, canvas.height);
  }

  // ============================================================
  // 主循环 / Main Loop
  // ============================================================
  function loop() {
    if (!running) return;
    step();
    render();
    rafId = requestAnimationFrame(loop);
  }

  // ============================================================
  // 公共 API / Public API
  // ============================================================

  // 初始化：参数可传 canvas 元素或 id，省略则查找 id 'physics-sandbox-canvas'
  function init(canvasOrId) {
    if (typeof canvasOrId === 'string') {
      canvas = document.getElementById(canvasOrId);
    } else if (canvasOrId && canvasOrId.nodeType === 1) {
      canvas = canvasOrId;
    } else {
      canvas = document.getElementById('physics-sandbox-canvas');
    }
    if (!canvas || canvas.tagName.toLowerCase() !== 'canvas') return false;
    ctx = canvas.getContext('2d');
    buildGrid(cols, rows);
    attachEvents();
    render();
    return true;
  }

  // 选择当前绘制元素
  function setElement(id) {
    currentElement = id | 0;
  }

  // 设置笔刷大小（1-10）
  function setBrushSize(n) {
    brushSize = Math.max(1, Math.min(10, n | 0));
  }

  // 开始模拟
  function start() {
    if (running || !grid) return;
    running = true;
    loop();
  }

  // 停止模拟
  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // 清空画布
  function clear() {
    if (!grid) return;
    grid.fill(0);
    auxGrid.fill(0);
    moved.fill(0);
    render();
  }

  // 重设网格尺寸（单位：格；会清空内容）
  function resize(c, r) {
    if (!canvas || !ctx) return;
    const newC = (c && c > 0) ? (c | 0) : cols;
    const newR = (r && r > 0) ? (r | 0) : rows;
    buildGrid(newC, newR);
    render();
  }

  // 设置气体（氢气）可见性
  function setGasVisible(visible) {
    gasVisible = !!visible;
    if (grid) render();
  }

  // 切换气体可见性，返回新值
  function toggleGas() {
    gasVisible = !gasVisible;
    if (grid) render();
    return gasVisible;
  }

  // 元素列表（供 UI 构建调色板：{id, name, color}）
  // name 作为 getter，每次访问时动态调用 i18n.t()，切换语言后自动更新
  const ELEMENTS = [WATER, HYDROGEN, EMPTY].map(function (id) {
    return {
      id: id,
      nameKey: ELEMENT_NAME_KEYS[id],
      color: HEX_COLORS[id],
      get name() {
        var rawName = ELEMENT_NAMES[this.id];
        if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.t === 'function' && this.nameKey) {
          return window.i18n.t(this.nameKey) || rawName;
        }
        return rawName;
      }
    };
  });

  return {
    init,
    setElement,
    setBrushSize,
    start,
    stop,
    clear,
    resize,
    setGasVisible,
    toggleGas,
    // 附带常量，方便外部引用元素 id
    ELEMENTS,
    EMPTY, WATER, HYDROGEN,
    // 按 id 动态获取元素名称（i18n），切换语言后实时反映
    getElementName: function (id) {
      var rawName = ELEMENT_NAMES[id];
      if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.t === 'function' && ELEMENT_NAME_KEYS[id]) {
        return window.i18n.t(ELEMENT_NAME_KEYS[id]) || rawName;
      }
      return rawName;
    }
  };
})();
