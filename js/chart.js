/**
 * chart.js
 * 复古深空像素风图表 — 折线图 & 权重条形图 (Pixel-style Charts) v2
 *
 * 重构要点 / Refactor highlights：
 *   - setupCanvas 幂等化（WeakMap 缓存），仅当 clientWidth/clientHeight 实际变化时
 *     才重置 backing store，且永不设置 canvas.style.*，修复 hover 反复缩放 bug。
 *   - 折线图改为“固定显示尺寸 + 内部数据视口”模型，支持自制滚动条平移与 +/- 缩放。
 *   - 新增训练阶段动画：animateWeightBarsUpdate / animateLineChartStep。
 *
 * 导出函数 / Exported functions：
 *   - setupCanvas(canvas) → ctx
 *   - drawLineChart(canvas, series, ensemblePrediction, methodPredictions)
 *   - drawWeightBars(canvas, methods, weights)
 *   - animateWeightBarsUpdate(canvas, methods, newWeights) → Promise
 *   - animateLineChartStep(canvas, stepData) → Promise
 *   - resetLineChartState()
 *   - resetWeightBarAnimState()
 *
 * 视觉规范 / Visual style：
 *   - 背景 #1a1a2e，白色 3px 边框，4px 圆角，硬阴影 (shadowBlur=0)
 *   - 文字：bold "Courier New", monospace
 *   - 分类配色：basic #8b4513 / smoothing #1e90ff / regression #228b22
 *               autoregressive #9370db / other #ffd700
 *   - 强调金 #ffd700，融合火红 #ff4500
 */

// ============================================================
// 常量 / Constants
// ============================================================

// 分类调色板 / Category palette
const CHART_PALETTE = {
  basic: '#8b4513',          // 土棕
  smoothing: '#1e90ff',      // 水蓝
  regression: '#228b22',     // 叶绿
  autoregressive: '#9370db', // 紫
  other: '#ffd700'           // 金
};

const CHART_BG = '#1a1a2e';
const CHART_BORDER = '#ffffff';
const CHART_GOLD = '#ffd700';
const CHART_FIRE = '#ff4500';
const CHART_GRID = 'rgba(255,255,255,0.08)';
const CHART_TOOLTIP_BG = '#2d2d44';

// ============================================================
// 状态 / State
// ============================================================

/**
 * 折线图状态 / Line chart state。
 * viewport 为数据坐标：x 为 1-based 索引，y 为数值。
 * xMin/xMax 默认 1..n+m（含 n 输入 + m 预测点），yMin/yMax 默认覆盖全部数据。
 */
let lineChartState = {
  canvas: null,
  series: [],
  ensemblePredictions: [],     // 融合预测值数组（多步）/ ensemble predictions array
  methodPredictions: [],     // [{id,name,category,prediction,...}] 仅第一步各方法预测
  viewport: { xMin: 1, xMax: 2, yMin: 0, yMax: 1 },
  totalY: { min: 0, max: 1 }, // 全量 Y 范围（用于垂直滚动条比较）
  trainingPoints: [],         // 训练阶段累积的回测预测点
  hoverPoint: null,         // {px,py,index,value,type} | null
  fitCurve: null             // 拟合曲线数据 { evaluate, color, degree }  | null
};

/**
 * 权重条形图动画状态 / Weight bar animation state。
 * currentWeights 与方法原始索引对齐；currentOrder 为按权重降序的原始索引数组。
 */
let weightBarAnimState = {
  currentWeights: [],
  currentOrder: [],
  animating: false,
  rafId: null
};

// setupCanvas 尺寸缓存：修复 hover 缩放 bug 的关键 / per-canvas size cache
const canvasSizeCache = new WeakMap();

// 事件处理器一次性附加标记 / one-shot handler attach flags
let lineChartHandlersAttached = false;

// 滚动条拖拽状态 / scrollbar drag state
let scrollbarDragState = null; // {axis, startMouse, startThumbPos}

// 画布拖拽平移状态 / canvas drag-to-pan state
let lineChartDragState = null; // {startX, startY, isDragging}

// ============================================================
// 通用工具 / Shared Helpers
// ============================================================

/**
 * setupCanvas(canvas) → ctx
 *
 * 按 devicePixelRatio 缩放画布以适配高 DPI 显示。幂等：仅当 clientWidth/clientHeight
 * 实际变化时才重置 backing store。永不设置 canvas.style.*（CSS 控制显示尺寸）。
 * 这是修复 hover 反复缩放 bug 的核心。
 */
function setupCanvas(canvas) {
  if (!canvas) return null;
  var dpr = window.devicePixelRatio || 1;
  var dispW = canvas.clientWidth || 800;
  var dispH = canvas.clientHeight || 420;
  var cached = canvasSizeCache.get(canvas);
  if (!cached || cached.w !== dispW || cached.h !== dispH) {
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    canvasSizeCache.set(canvas, { w: dispW, h: dispH });
  }
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 重置并按 dpr 缩放（幂等）
  return ctx;
}

/** 圆角矩形路径 / rounded rectangle path (兼容性兜底)。 */
function chartRoundRect(ctx, x, y, w, h, r) {
  var rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** 应用硬阴影 / apply hard shadow (shadowBlur=0)。 */
function chartApplyShadow(ctx) {
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.shadowBlur = 0;
}

/** 清除阴影 / clear shadow。 */
function chartClearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;
}

/** 按分类取色，未知分类回退金色 / get color by category, fallback gold。 */
function chartCategoryColor(category) {
  if (category && CHART_PALETTE[category]) return CHART_PALETTE[category];
  return CHART_PALETTE.other;
}

/** 设置粗体等宽字体 / set bold monospace font。 */
function chartFont(ctx, size) {
  ctx.font = 'bold ' + size + 'px "Courier New", Courier, monospace';
}

/** 数值格式化：整数原样，小数保留两位 / format number。 */
function chartFormatVal(v) {
  if (v === null || v === undefined) return '—';
  var n = Number(v);
  if (!isFinite(n)) return '—';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

// 1-2-5 nice unit 序列，覆盖 1e-9 到 1e9 全范围 / 1-2-5 magnitude series
var CHART_NICE_MAGNITUDES = [
  1e-9, 5e-9, 1e-8, 5e-8, 1e-7, 5e-7, 1e-6, 5e-6, 1e-5, 5e-5,
  1e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5,
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
  20000, 50000, 100000, 5e5, 1e6, 5e6, 1e7, 5e7, 1e8, 5e8, 1e9
];

/**
 * 在 1-2-5 nice unit 序列中找到最接近 rawUnits 的值。
 * 用于网格线 / 刻度间距自适应。返回值恒 > 0。
 */
function findNiceUnit(rawUnits) {
  var raw = Math.abs(rawUnits);
  if (!isFinite(raw) || raw <= 0) return 1;
  var best = CHART_NICE_MAGNITUDES[0];
  var minDiff = Math.abs(raw - best);
  for (var i = 1; i < CHART_NICE_MAGNITUDES.length; i++) {
    var diff = Math.abs(raw - CHART_NICE_MAGNITUDES[i]);
    if (diff < minDiff) {
      minDiff = diff;
      best = CHART_NICE_MAGNITUDES[i];
    }
  }
  return best;
}

/**
 * 刻度数字格式化：
 *   - 0 → "0"
 *   - 整数 → 原值字符串
 *   - |value| >= 10000 或 0 < |value| < 0.001 → 科学计数法（如 1e4, 1e-4）
 *   - 其他小数 → 最多 3 位小数（去尾零）
 */
function formatTickNumber(value) {
  var v = Number(value);
  if (!isFinite(v)) return '—';
  if (v === 0) return '0';
  var abs = Math.abs(v);
  if (abs >= 10000 || abs < 0.001) {
    // 科学计数法：JS 原生 toExponential 输出 "1e+4"，去掉正号和前导零
    var exp = v.toExponential(0); // "1e+4" / "1e-4"
    return exp.replace('e+', 'e').replace('e-0', 'e-').replace('e+0', 'e');
  }
  if (Number.isInteger(v)) return String(v);
  // 小数：最多 3 位，去尾零
  var s = v.toFixed(3);
  // 去掉末尾多余的零和小数点
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

// ============================================================
// 折线图布局 / Line Chart Layout（基于视口，绘制与命中测试共享）
// ============================================================

/**
 * 计算折线图几何布局 / compute line chart geometry from current viewport。
 * 返回坐标映射函数与各区域边界。
 */
function computeLineChartLayout(canvas) {
  var displayW = canvas.clientWidth || 800;
  var displayH = canvas.clientHeight || 420;
  if (displayW <= 0 || displayH <= 0) return null;

  var padL = 60, padR = 30, padT = 30, padB = 50;
  var plotL = padL, plotT = padT;
  var plotR = displayW - padR;
  var plotB = displayH - padB;
  var plotW = plotR - plotL;
  var plotH = plotB - plotT;
  if (plotW <= 0 || plotH <= 0) return null;

  var vp = lineChartState.viewport;
  var xMin = vp.xMin, xMax = vp.xMax;
  var yMin = vp.yMin, yMax = vp.yMax;

  function xToPx(idx) {
    if (xMax === xMin) return plotL + plotW / 2;
    return plotL + ((idx - xMin) / (xMax - xMin)) * plotW;
  }
  function yToPx(v) {
    if (yMax === yMin) return plotT + plotH / 2;
    return plotT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
  }

  return {
    displayW: displayW, displayH: displayH,
    plotL: plotL, plotT: plotT, plotR: plotR, plotB: plotB,
    plotW: plotW, plotH: plotH,
    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax,
    xToPx: xToPx, yToPx: yToPx
  };
}

/**
 * 计算 Y 范围（含序列/融合/各方法/训练点），带 10% 留白。
 * 可选 xMin/xMax 参数：若提供，仅纳入 X 索引落在 [xMin, xMax] 内的点
 * （用于视口内 Y 自动缩放）；不提供则纳入全部（用于垂直滚动条全量范围）。
 */
function computeTotalYRange(xMin, xMax) {
  var s = lineChartState;
  var filterX = (typeof xMin === 'number' && typeof xMax === 'number');
  var vals = [];
  function pushAt(xVal, yVal) {
    if (typeof yVal !== 'number' || !isFinite(yVal)) return;
    if (filterX && (xVal < xMin || xVal > xMax)) return;
    vals.push(yVal);
  }
  // 序列点 X = i+1（1-based）
  for (var i = 0; i < s.series.length; i++) pushAt(i + 1, s.series[i]);
  // 融合预测（多步）位于 X = n+1, n+2, ...
  var n = s.series.length;
  var ensPreds = Array.isArray(s.ensemblePredictions) ? s.ensemblePredictions :
    (s.ensemblePrediction !== undefined ? [s.ensemblePrediction] : []);
  for (var p = 0; p < ensPreds.length; p++) {
    pushAt(n + 1 + p, ensPreds[p]);
  }
  // 各方法预测位于 X = n+1（仅第一步）
  var predX = n + 1;
  for (var j = 0; j < s.methodPredictions.length; j++) {
    pushAt(predX, s.methodPredictions[j].prediction);
  }
  // 训练点位于其 predictIndex
  for (var k = 0; k < s.trainingPoints.length; k++) {
    var tp = s.trainingPoints[k];
    pushAt(tp.predictIndex, tp.ensemblePrediction);
    if (tp.methodPredictions) {
      for (var m = 0; m < tp.methodPredictions.length; m++) {
        pushAt(tp.predictIndex, tp.methodPredictions[m].prediction);
      }
    }
  }
  // 拟合曲线（采样多个点）
  if (s.fitCurve && typeof s.fitCurve.evaluate === 'function') {
    var totalX = n + (ensPreds.length > 0 ? ensPreds.length : 1);
    var samples = 50;
    for (var f = 0; f <= samples; f++) {
      var fx = (f / samples) * (totalX - 1) + 1;
      // 注意：拟合函数 x 从 0 开始，图表 x 从 1 开始
      var fy = s.fitCurve.evaluate(fx - 1);
      pushAt(fx, fy);
    }
  }

  var yMin, yMax;
  if (vals.length === 0) {
    yMin = 0; yMax = 1;
  } else {
    yMin = Math.min.apply(null, vals);
    yMax = Math.max.apply(null, vals);
    if (yMin === yMax) { yMin = yMin - 1; yMax = yMax + 1; }
    var range = yMax - yMin;
    yMin -= range * 0.1;
    yMax += range * 0.1;
  }
  return { min: yMin, max: yMax };
}

// ============================================================
// 折线图 / Line Chart
// ============================================================

/**
 * drawLineChart(canvas, series, ensemblePredictions, methodPredictions, fitCurve)
 *
 * 绘制复古像素风折线图：输入序列金色折线、融合预测火红方块、各方法预测半透明
 * 彩色方块、训练阶段回测点、拟合曲线，附带坐标轴/网格/刻度/图例/hover 工具提示。
 * 视口由 lineChartState.viewport 控制；新数据到达时自动重置为全显。
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} series  输入序列
 * @param {number[]|number} ensemblePredictions  融合预测值（数组为多步，单值为一步）
 * @param {object[]} methodPredictions  各方法预测（仅第一步）
 * @param {object|null} fitCurve  拟合曲线 { evaluate, degree, formula } 或 null
 */
function drawLineChart(canvas, series, ensemblePredictions, methodPredictions, fitCurve) {
  if (!canvas) return;
  series = series || [];
  methodPredictions = methodPredictions || [];

  // 兼容单值 / backward compat: single value → array
  var ensArray;
  if (Array.isArray(ensemblePredictions)) {
    ensArray = ensemblePredictions;
  } else if (ensemblePredictions === null || ensemblePredictions === undefined) {
    ensArray = [];
  } else {
    ensArray = [ensemblePredictions];
  }

  // 检测新数据：引用变化 → 重置水平视口 / fresh data → reset viewport
  var isNewData = series !== lineChartState.series ||
    ensArray !== lineChartState.ensemblePredictions ||
    methodPredictions !== lineChartState.methodPredictions ||
    fitCurve !== lineChartState.fitCurve;

  lineChartState.canvas = canvas;
  lineChartState.series = series;
  lineChartState.ensemblePredictions = ensArray;
  lineChartState.methodPredictions = methodPredictions;
  lineChartState.fitCurve = fitCurve || null;

  var n = series.length;
  var predCount = ensArray.length;
  var totalX = Math.max(n + Math.max(predCount, 1), 2); // 索引 1..n+m

  if (isNewData) {
    lineChartState.viewport.xMin = 1;
    lineChartState.viewport.xMax = totalX;
  }
  // 不再钳制水平视口到数据范围 [1, totalX]：允许缩放/平移超出数据范围
  // （显示空白区域，不崩溃）。仅防止视口塌缩（xMin >= xMax）。
  if (lineChartState.viewport.xMin >= lineChartState.viewport.xMax) {
    lineChartState.viewport.xMin = 1;
    lineChartState.viewport.xMax = totalX;
  }

  // 全量 Y 范围（用于垂直滚动条 thumb 比例）
  var totalY = computeTotalYRange();
  lineChartState.totalY = totalY;
  // 视口内可见 Y 范围（基于当前 X 视口内的点自动缩放）
  // 仅在新数据到达时重算 Y 视口；hover/缩放/平移重绘保持现有 Y 视口
  if (isNewData) {
    var visY = computeTotalYRange(lineChartState.viewport.xMin, lineChartState.viewport.xMax);
    lineChartState.viewport.yMin = visY.min;
    lineChartState.viewport.yMax = visY.max;
  }

  ensureLineChartHandlers(canvas);

  var ctx = setupCanvas(canvas); // 幂等：hover 重绘不会改变尺寸
  if (!ctx) return;
  ctx.setLineDash([]);
  var layout = computeLineChartLayout(canvas);
  if (!layout) return;

  // 清屏 + 背景
  ctx.clearRect(0, 0, layout.displayW, layout.displayH);
  ctx.fillStyle = CHART_BG;
  ctx.fillRect(0, 0, layout.displayW, layout.displayH);

  drawLineChartGrid(ctx, layout);
  drawLineChartAxes(ctx, layout);
  drawLineChartTicks(ctx, layout);
  drawLineChartFitCurve(ctx, layout);  // 拟合曲线（最底层）
  drawLineChartSeries(ctx, layout);
  drawLineChartMethodPredictions(ctx, layout, n);
  drawLineChartEnsemble(ctx, layout, n);
  drawLineChartTrainingPoints(ctx, layout, n);
  drawLineChartLegend(ctx, layout);
  if (lineChartState.hoverPoint) {
    drawLineChartTooltip(ctx, lineChartState.hoverPoint, layout);
  }

  updateScrollbars(canvas);
}

/** 用缓存的最新状态重绘折线图（hover/缩放/平移使用）。 */
function redrawLineChart() {
  if (!lineChartState.canvas) return;
  drawLineChart(
    lineChartState.canvas,
    lineChartState.series,
    lineChartState.ensemblePredictions,
    lineChartState.methodPredictions,
    lineChartState.fitCurve
  );
}

/** 网格线 / grid lines。 */
function drawLineChartGrid(ctx, L) {
  ctx.strokeStyle = CHART_GRID;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  var xRange = L.xMax - L.xMin;
  var yRange = L.yMax - L.yMin;
  if (xRange <= 0 || yRange <= 0) return;
  var xScale = L.plotW / xRange; // 每数据单位对应的像素数
  var yScale = L.plotH / yRange;
  // 目标刻度像素间距：X 约 80px，Y 约 60px
  var xStep = findNiceUnit(80 / xScale);
  var yStep = findNiceUnit(60 / yScale);
  // 水平网格线（Y 轴方向）
  var yStart = Math.ceil(L.yMin / yStep) * yStep;
  var yEnd = Math.floor(L.yMax / yStep) * yStep;
  // 浮点累加可能产生精度漂移，用相对容差判断终止
  for (var yv = yStart; yv <= yEnd + yStep * 1e-6; yv += yStep) {
    var gyp = L.yToPx(yv);
    ctx.beginPath(); ctx.moveTo(L.plotL, gyp); ctx.lineTo(L.plotR, gyp); ctx.stroke();
  }
  // 垂直网格线（X 轴方向）
  var xStart = Math.ceil(L.xMin / xStep) * xStep;
  var xEnd = Math.floor(L.xMax / xStep) * xStep;
  for (var xv = xStart; xv <= xEnd + xStep * 1e-6; xv += xStep) {
    var gxp = L.xToPx(xv);
    ctx.beginPath(); ctx.moveTo(gxp, L.plotT); ctx.lineTo(gxp, L.plotB); ctx.stroke();
  }
}

/** 坐标轴 / axes (white 3px)。 */
function drawLineChartAxes(ctx, L) {
  ctx.strokeStyle = CHART_BORDER;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(L.plotL, L.plotB); ctx.lineTo(L.plotR, L.plotB); ctx.stroke(); // X
  ctx.beginPath(); ctx.moveTo(L.plotL, L.plotT); ctx.lineTo(L.plotL, L.plotB); ctx.stroke();   // Y
}

/** 刻度与标签 / ticks & labels。 */
function drawLineChartTicks(ctx, L) {
  ctx.fillStyle = CHART_BORDER;
  chartFont(ctx, 11);
  var xRange = L.xMax - L.xMin;
  var yRange = L.yMax - L.yMin;
  if (xRange <= 0 || yRange <= 0) {
    drawLineChartUnitLength(ctx, L);
    return;
  }
  var xScale = L.plotW / xRange;
  var yScale = L.plotH / yRange;
  // 与 drawLineChartGrid 使用同一 nice unit，确保刻度数字与网格线对齐
  var xStep = findNiceUnit(80 / xScale);
  var yStep = findNiceUnit(60 / yScale);

  // Y 轴刻度数字（右对齐，垂直居中）
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  var yStart = Math.ceil(L.yMin / yStep) * yStep;
  var yEnd = Math.floor(L.yMax / yStep) * yStep;
  var lastYp = null;
  for (var yv = yStart; yv <= yEnd + yStep * 1e-6; yv += yStep) {
    var yp = L.yToPx(yv);
    // 防重叠：与上一个刻度数字像素间距 < 30px 时跳过
    if (lastYp !== null && Math.abs(yp - lastYp) < 30) continue;
    ctx.fillText(formatTickNumber(yv), L.plotL - 8, yp);
    lastYp = yp;
  }

  // X 轴刻度数字（水平居中，顶部对齐到轴下方）
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  var xStart = Math.ceil(L.xMin / xStep) * xStep;
  var xEnd = Math.floor(L.xMax / xStep) * xStep;
  var lastXp = null;
  for (var xv = xStart; xv <= xEnd + xStep * 1e-6; xv += xStep) {
    var xp = L.xToPx(xv);
    // 防重叠：与上一个刻度数字像素间距 < 30px 时跳过
    if (lastXp !== null && Math.abs(xp - lastXp) < 30) continue;
    ctx.fillText(formatTickNumber(xv), xp, L.plotB + 8);
    lastXp = xp;
  }

  drawLineChartUnitLength(ctx, L);
}

function drawLineChartUnitLength(ctx, L) {
  const targetPixels = 50;
  const xRange = L.xMax - L.xMin;
  const yRange = L.yMax - L.yMin;
  const xPixels = L.plotR - L.plotL;
  const yPixels = L.plotB - L.plotT;

  if (xRange <= 0 || yRange <= 0) return;

  const xScale = xPixels / xRange;
  const yScale = yPixels / yRange;

  const xRawUnits = targetPixels / xScale;
  const yRawUnits = targetPixels / yScale;

  // 复用全局 findNiceUnit（1-2-5 序列，1e-9 ~ 1e9）
  const xUnit = findNiceUnit(xRawUnits);
  const yUnit = findNiceUnit(yRawUnits);

  ctx.strokeStyle = CHART_GOLD;
  ctx.fillStyle = CHART_GOLD;
  ctx.lineWidth = 2;

  const xPxLen = xUnit * xScale;
  // 指示条标签：显示当前 nice unit（如 "1 unit = 80px" / "0.5 unit = 40px"）
  const xLabel = formatTickNumber(xUnit) + ' unit = ' + Math.round(xPxLen) + 'px';
  if (L.plotL + xPxLen + 40 < L.plotR) {
    var xsx = L.plotL + 14;
    var xsy = L.plotB - 14;
    ctx.beginPath();
    ctx.moveTo(xsx, xsy);
    ctx.lineTo(xsx + xPxLen, xsy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xsx, xsy - 3);
    ctx.lineTo(xsx, xsy + 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xsx + xPxLen, xsy - 3);
    ctx.lineTo(xsx + xPxLen, xsy + 3);
    ctx.stroke();
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(xLabel, xsx + xPxLen / 2, xsy - 4);
  }

  const yPxLen = yUnit * yScale;
  const yLabel = formatTickNumber(yUnit) + ' unit = ' + Math.round(yPxLen) + 'px';
  if (L.plotT + yPxLen + 30 < L.plotB) {
    var ysx = L.plotL + 14;
    var ysy = L.plotB - 18;
    ctx.beginPath();
    ctx.moveTo(ysx, ysy);
    ctx.lineTo(ysx, ysy - yPxLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ysx - 3, ysy);
    ctx.lineTo(ysx + 3, ysy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ysx - 3, ysy - yPxLen);
    ctx.lineTo(ysx + 3, ysy - yPxLen);
    ctx.stroke();
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(yLabel, ysx + 6, ysy - yPxLen / 2);
  }
}

/** 拟合曲线（虚线，水蓝色）/ fitted curve (dashed, teal color)。 */
function drawLineChartFitCurve(ctx, L) {
  var fc = lineChartState.fitCurve;
  if (!fc || typeof fc.evaluate !== 'function') return;
  var n = lineChartState.series.length;
  var ensPreds = lineChartState.ensemblePredictions || [];
  var predCount = ensPreds.length;
  var totalX = n + Math.max(predCount, 1);

  // 只绘制视口内部分 / only draw visible portion
  var xStart = Math.max(1, L.xMin - 0.5);
  var xEnd = Math.min(totalX, L.xMax + 0.5);
  if (xStart >= xEnd) return;

  ctx.save();
  ctx.strokeStyle = '#00ced1';  // 青色 / cyan-teal
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);      // 虚线 / dashed
  ctx.beginPath();

  var steps = 100;
  var first = true;
  for (var s = 0; s <= steps; s++) {
    var xChart = xStart + (xEnd - xStart) * (s / steps);
    // 图表 x 从 1 开始，拟合函数 x 从 0 开始
    var xFit = xChart - 1;
    var yVal = fc.evaluate(xFit);
    if (yVal === null || yVal === undefined || !isFinite(yVal)) continue;
    var px = L.xToPx(xChart);
    var py = L.yToPx(yVal);
    if (first) {
      ctx.moveTo(px, py);
      first = false;
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** 输入序列折线与数据点（仅视口内）/ input series line & points。 */
function drawLineChartSeries(ctx, L) {
  var s = lineChartState.series;
  var n = s.length;
  if (n === 0) return;
  // 视口内整数索引（1-based）∈ [ceil(xMin), floor(xMax)]，并钳制到 [1, n]
  var iStart = Math.max(0, Math.ceil(L.xMin) - 1);
  var iEnd = Math.min(n - 1, Math.floor(L.xMax) - 1);
  if (iStart > iEnd) return;

  ctx.strokeStyle = CHART_GOLD;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  ctx.beginPath();
  for (var i = iStart; i <= iEnd; i++) {
    var px = L.xToPx(i + 1);
    var py = L.yToPx(s[i]);
    if (i === iStart) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 8x8 金色方块 + 白色 2px 边框
  for (var j = iStart; j <= iEnd; j++) {
    var ppx = L.xToPx(j + 1);
    var ppy = L.yToPx(s[j]);
    ctx.fillStyle = CHART_GOLD;
    ctx.fillRect(ppx - 4, ppy - 4, 8, 8);
    ctx.strokeStyle = CHART_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(ppx - 4, ppy - 4, 8, 8);
  }
}

/** 各方法预测点（半透明，垂直抖动）/ method prediction points。 */
function drawLineChartMethodPredictions(ctx, L, n) {
  if (n === 0) return;
  var predX = n + 1;
  if (predX < L.xMin || predX > L.xMax) return;
  var valid = lineChartState.methodPredictions.filter(function (m) {
    return m.prediction !== null && m.prediction !== undefined;
  });
  var count = valid.length;
  if (count === 0) return;
  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.setLineDash([]);
  valid.forEach(function (m, idx) {
    var mx = L.xToPx(predX);
    var my = L.yToPx(m.prediction) + (idx - count / 2) * 7;
    ctx.fillStyle = chartCategoryColor(m.category);
    ctx.fillRect(mx - 3, my - 3, 6, 6);
  });
  ctx.restore();
}

/** 融合预测点（火红方块 + 虚线连接，支持多步）/ ensemble prediction points (multi-step)。 */
function drawLineChartEnsemble(ctx, L, n) {
  var ensPreds = lineChartState.ensemblePredictions;
  if (!ensPreds || ensPreds.length === 0 || n === 0) return;

  // 绘制连接线（从最后一个序列点依次连接所有预测点）
  ctx.save();
  ctx.strokeStyle = 'rgba(255,69,0,0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();

  var firstPredIdx = n + 1;
  var started = false;

  // 从最后一个序列点开始（若可见）
  if (n >= L.xMin && n <= L.xMax) {
    var lastPx = L.xToPx(n);
    var lastPy = L.yToPx(lineChartState.series[n - 1]);
    ctx.moveTo(lastPx, lastPy);
    started = true;
  }

  for (var p = 0; p < ensPreds.length; p++) {
    var predIdx = n + 1 + p;
    if (predIdx < L.xMin || predIdx > L.xMax) continue;
    if (ensPreds[p] === null || ensPreds[p] === undefined || !isFinite(ensPreds[p])) continue;
    var ex = L.xToPx(predIdx);
    var ey = L.yToPx(ensPreds[p]);
    if (!started) {
      ctx.moveTo(ex, ey);
      started = true;
    } else {
      ctx.lineTo(ex, ey);
    }
  }
  ctx.stroke();
  ctx.restore();

  // 绘制每个预测点方块 / draw each prediction point
  for (var p2 = 0; p2 < ensPreds.length; p2++) {
    var predIdx2 = n + 1 + p2;
    if (predIdx2 < L.xMin || predIdx2 > L.xMax) continue;
    var val = ensPreds[p2];
    if (val === null || val === undefined || !isFinite(val)) continue;
    var ex2 = L.xToPx(predIdx2);
    var ey2 = L.yToPx(val);

    // 14x14 火红方块 + 白色 3px 边框 / 14x14 fire-red square with white 3px border
    ctx.fillStyle = CHART_FIRE;
    ctx.fillRect(ex2 - 7, ey2 - 7, 14, 14);
    ctx.strokeStyle = CHART_BORDER;
    ctx.lineWidth = 3;
    ctx.strokeRect(ex2 - 7, ey2 - 7, 14, 14);
  }
}

/**
 * 训练阶段回测点 / training backtest points。
 * 每点带入场动画（animProgress 0..1）：尺寸从 0 放大、alpha 从 0 渐显，
 * 连接线随进度“画出”。
 */
function drawLineChartTrainingPoints(ctx, L, n) {
  var tps = lineChartState.trainingPoints;
  if (tps.length === 0) return;
  for (var i = 0; i < tps.length; i++) {
    var tp = tps[i];
    if (tp.predictIndex < L.xMin || tp.predictIndex > L.xMax) continue;
    if (tp.ensemblePrediction === null || tp.ensemblePrediction === undefined) continue;
    var progress = (tp.animProgress != null) ? tp.animProgress : 1;
    if (progress <= 0) continue;
    var px = L.xToPx(tp.predictIndex);
    var py = L.yToPx(tp.ensemblePrediction);
    var size = 12 * progress;
    var alpha = progress;

    // 连接线（前一点 → 当前），随进度画出
    var prevIdx = tp.predictIndex - 1;
    var prevPx = null, prevPy = null;
    if (prevIdx >= 1 && prevIdx <= n) {
      prevPx = L.xToPx(prevIdx);
      prevPy = L.yToPx(lineChartState.series[prevIdx - 1]);
    } else {
      // 前一个训练点
      for (var p = 0; p < tps.length; p++) {
        if (tps[p].predictIndex === prevIdx &&
            tps[p].ensemblePrediction !== null && tps[p].ensemblePrediction !== undefined) {
          prevPx = L.xToPx(prevIdx);
          prevPy = L.yToPx(tps[p].ensemblePrediction);
          break;
        }
      }
    }
    if (prevPx !== null && prevIdx >= L.xMin && prevIdx <= L.xMax) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = CHART_FIRE;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      var lineLen = Math.hypot(px - prevPx, py - prevPy);
      var visibleLen = progress * lineLen; // 0 → 不可见，1 → 全显
      ctx.setLineDash([Math.max(0.1, visibleLen), Math.max(0.1, lineLen)]);
      ctx.beginPath(); ctx.moveTo(prevPx, prevPy); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = CHART_FIRE;
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
    ctx.strokeStyle = CHART_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(px - size / 2, py - size / 2, size, size);
    ctx.restore();
  }
}

/** 图例 / legend (top-right inside plot area)。 */
function drawLineChartLegend(ctx, L) {
  var items = [
    { color: CHART_GOLD, label: (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_legend_input_series')) || '输入序列', alpha: 1, size: 8, isLine: false },
    { color: CHART_FIRE, label: (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_legend_ensemble')) || '融合预测', alpha: 1, size: 10, isLine: false },
    { color: '#1e90ff', label: (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_legend_methods')) || '各方法预测', alpha: 0.65, size: 6, isLine: false }
  ];

  // 有拟合曲线时追加图例
  if (lineChartState.fitCurve && typeof lineChartState.fitCurve.evaluate === 'function') {
    items.push({ color: '#00ced1', label: (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_legend_fit_curve')) || '拟合曲线', alpha: 1, size: 0, isLine: true });
  }

  var boxW = 132, boxH = 14 * items.length + 10;
  var x = L.plotR - boxW - 6;
  var y = L.plotT + 6;

  ctx.fillStyle = CHART_TOOLTIP_BG;
  chartApplyShadow(ctx);
  chartRoundRect(ctx, x, y, boxW, boxH, 4); ctx.fill();
  chartClearShadow(ctx);
  ctx.strokeStyle = CHART_BORDER;
  ctx.lineWidth = 2;
  chartRoundRect(ctx, x, y, boxW, boxH, 4); ctx.stroke();

  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  chartFont(ctx, 11);
  items.forEach(function (it, i) {
    var iy = y + 9 + i * 14;
    ctx.save();
    ctx.globalAlpha = it.alpha;
    if (it.isLine) {
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(x + 8, iy);
      ctx.lineTo(x + 8 + 20, iy);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = it.color;
      ctx.fillRect(x + 8, iy - it.size / 2, it.size, it.size);
    }
    ctx.restore();
    ctx.fillStyle = CHART_BORDER;
    ctx.fillText(it.label, x + 8 + 24, iy);
  });
}

/** 工具提示 / tooltip (hover)。 */
function drawLineChartTooltip(ctx, hover, L) {
  var title = (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_tooltip_index', {val: hover.index})) || ('索引: ' + hover.index);
  var body;
  if (hover.type === 'ensemble') body = (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_tooltip_ensemble', {val: chartFormatVal(hover.value)})) || ('融合预测: ' + chartFormatVal(hover.value));
  else if (hover.type === 'prediction') body = (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_tooltip_prediction', {val: chartFormatVal(hover.value)})) || ('预测: ' + chartFormatVal(hover.value));
  else if (hover.type === 'training') body = (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_tooltip_training', {val: chartFormatVal(hover.value)})) || ('训练预测: ' + chartFormatVal(hover.value));
  else body = (typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_tooltip_value', {val: chartFormatVal(hover.value)})) || ('值: ' + chartFormatVal(hover.value));

  chartFont(ctx, 11);
  var w1 = ctx.measureText(title).width;
  var w2 = ctx.measureText(body).width;
  var textW = Math.max(w1, w2);
  var boxW = textW + 16;
  var boxH = 36;

  var x = hover.px + 12;
  var y = hover.py - boxH - 8;
  if (x + boxW > L.plotR) x = hover.px - boxW - 12;
  if (y < L.plotT) y = hover.py + 12;
  if (x < L.plotL) x = L.plotL + 4;

  ctx.fillStyle = CHART_TOOLTIP_BG;
  chartApplyShadow(ctx);
  chartRoundRect(ctx, x, y, boxW, boxH, 4); ctx.fill();
  chartClearShadow(ctx);
  ctx.strokeStyle = CHART_BORDER;
  ctx.lineWidth = 2;
  chartRoundRect(ctx, x, y, boxW, boxH, 4); ctx.stroke();

  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = CHART_GOLD;
  ctx.fillText(title, x + 8, y + 6);
  ctx.fillStyle = CHART_BORDER;
  ctx.fillText(body, x + 8, y + 6 + 16);
}

// ============================================================
// 折线图交互 / Line Chart Interaction (hover / wheel / scrollbars / zoom)
// ============================================================

/** 一次性绑定 hover、wheel、滚动条与缩放按钮处理器。 */
function ensureLineChartHandlers(canvas) {
  if (lineChartHandlersAttached) return;
  lineChartHandlersAttached = true;

  // Drag-to-pan
  canvas.addEventListener('mousedown', function (ev) {
    if (!lineChartState || lineChartState.canvas !== canvas) return;
    lineChartDragState = { startX: ev.clientX, startY: ev.clientY, isDragging: false };
  });

  // hover / drag：仅更新 hoverPoint 并重绘（setupCanvas 幂等，不缩放）
  canvas.addEventListener('mousemove', function (ev) {
    if (!lineChartState || lineChartState.canvas !== canvas) return;
    var rect = canvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left;
    var my = ev.clientY - rect.top;

    // Check for drag
    if (lineChartDragState) {
      var dx = ev.clientX - lineChartDragState.startX;
      var dy = ev.clientY - lineChartDragState.startY;
      if (!lineChartDragState.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        lineChartDragState.isDragging = true;
        lineChartState.hoverPoint = null;
      }
      if (lineChartDragState.isDragging) {
        panLineChart(dx, dy);
        lineChartDragState.startX = ev.clientX;
        lineChartDragState.startY = ev.clientY;
        redrawLineChart();
        return;
      }
    }

    // Hover detection (only when not dragging)
    var hover = findNearestLineChartPoint(mx, my, 20);
    var prev = lineChartState.hoverPoint;
    var changed = !hover !== !prev ||
      (hover && prev && (hover.px !== prev.px || hover.py !== prev.py ||
        hover.type !== prev.type || hover.index !== prev.index));
    if (!changed) return;
    lineChartState.hoverPoint = hover;
    redrawLineChart();
  });

  canvas.addEventListener('mouseup', function () {
    lineChartDragState = null;
  });

  canvas.addEventListener('mouseleave', function () {
    if (!lineChartState || lineChartState.canvas !== canvas) return;
    lineChartDragState = null;
    if (!lineChartState.hoverPoint) return;
    lineChartState.hoverPoint = null;
    redrawLineChart();
  });

  // 鼠标滚轮缩放
  canvas.addEventListener('wheel', function (ev) {
    if (!lineChartState || lineChartState.canvas !== canvas) return;
    ev.preventDefault();
    var factor = ev.deltaY < 0 ? 0.8 : 1.25; // 上滚放大（显示更少），下滚缩小
    zoomLineChart(factor);
    lineChartState.hoverPoint = null;
    redrawLineChart();
  }, { passive: false });

  attachScrollControls();
}

/** 在 20px 阈值内查找最近的数据点 / find nearest point within threshold。 */
function findNearestLineChartPoint(mx, my, threshold) {
  if (!lineChartState.canvas) return null;
  var layout = computeLineChartLayout(lineChartState.canvas);
  if (!layout) return null;
  var s = lineChartState;
  var n = s.series.length;
  var best = null, bestDist = threshold;

  // 序列点（仅视口内）
  for (var i = 0; i < n; i++) {
    var idx = i + 1;
    if (idx < layout.xMin || idx > layout.xMax) continue;
    var px = layout.xToPx(idx), py = layout.yToPx(s.series[i]);
    var d = Math.hypot(px - mx, py - my);
    if (d <= bestDist) {
      bestDist = d;
      best = { px: px, py: py, index: idx, value: s.series[i], type: 'series' };
    }
  }

  // 融合预测点（多步）
  var ensPreds = s.ensemblePredictions || [];
  if (ensPreds.length > 0 && n > 0) {
    for (var ei = 0; ei < ensPreds.length; ei++) {
      var ep2 = ensPreds[ei];
      if (ep2 === null || ep2 === undefined || !isFinite(ep2)) continue;
      var eidx2 = n + 1 + ei;
      if (eidx2 >= layout.xMin && eidx2 <= layout.xMax) {
        var epx2 = layout.xToPx(eidx2), epy2 = layout.yToPx(ep2);
        var d2b = Math.hypot(epx2 - mx, epy2 - my);
        if (d2b <= bestDist) {
          bestDist = d2b;
          best = { px: epx2, py: epy2, index: eidx2, value: ep2, type: 'ensemble' };
        }
      }
    }
  }

  // 各方法预测点（含抖动）
  if (n > 0) {
    var valid = s.methodPredictions.filter(function (m) {
      return m.prediction !== null && m.prediction !== undefined;
    });
    var count = valid.length;
    var midx = n + 1;
    if (midx >= layout.xMin && midx <= layout.xMax) {
      valid.forEach(function (m, i) {
        var mpx = layout.xToPx(midx);
        var mpy = layout.yToPx(m.prediction) + (i - count / 2) * 7;
        var d3 = Math.hypot(mpx - mx, mpy - my);
        if (d3 <= bestDist) {
          bestDist = d3;
          best = { px: mpx, py: mpy, index: midx, value: m.prediction, type: 'prediction' };
        }
      });
    }
  }

  // 训练点
  s.trainingPoints.forEach(function (tp) {
    if (tp.ensemblePrediction === null || tp.ensemblePrediction === undefined) return;
    if (tp.predictIndex < layout.xMin || tp.predictIndex > layout.xMax) return;
    var tpx = layout.xToPx(tp.predictIndex), tpy = layout.yToPx(tp.ensemblePrediction);
    var d4 = Math.hypot(tpx - mx, tpy - my);
    if (d4 <= bestDist) {
      bestDist = d4;
      best = { px: tpx, py: tpy, index: tp.predictIndex, value: tp.ensemblePrediction, type: 'training' };
    }
  });

  return best;
}

/** 缩放折线图水平视口 / zoom horizontal viewport by factor (<1 放大, >1 缩小)。 */
function zoomLineChart(factor) {
  var vp = lineChartState.viewport;
  var center = (vp.xMin + vp.xMax) / 2;
  var newRange = (vp.xMax - vp.xMin) * factor;
  // 放宽钳制到 [1e-6, 1e9]：支持无限缩放，视口可超出数据范围（显示空白）
  newRange = Math.max(1e-6, Math.min(1e9, newRange));
  vp.xMin = center - newRange / 2;
  vp.xMax = center + newRange / 2;
  // 防止视口塌缩：仅当极小数值精度问题导致 xMin >= xMax 时兜底
  if (vp.xMin >= vp.xMax) {
    vp.xMin = center - 0.5;
    vp.xMax = center + 0.5;
  }
}

/** 拖拽平移折线图视口 / pan viewport by pixel deltas。 */
function panLineChart(deltaPxX, deltaPxY) {
  var vp = lineChartState.viewport;
  var canvas = lineChartState.canvas;
  if (!canvas) return;
  var layout = computeLineChartLayout(canvas);
  if (!layout) return;
  // Convert pixel delta to data coordinate delta
  var dataX = (deltaPxX / layout.plotW) * (vp.xMax - vp.xMin);
  var dataY = (deltaPxY / layout.plotH) * (vp.yMax - vp.yMin);
  // 放宽钳制：允许视口中心移到数据范围外（显示空白区域，不崩溃）
  // Pan X
  vp.xMin -= dataX;
  vp.xMax -= dataX;
  // Pan Y
  vp.yMin += dataY;
  vp.yMax += dataY;
}

/** 更新滚动条可见性与 thumb 尺寸/位置 / update scrollbar visibility & thumbs。 */
function updateScrollbars(canvas) {
  var sbH = document.getElementById('scrollbar-h');
  var thumbH = document.getElementById('scrollbar-thumb-h');
  var sbV = document.getElementById('scrollbar-v');
  var thumbV = document.getElementById('scrollbar-thumb-v');
  if (!sbH || !thumbH || !sbV || !thumbV) return;

  var vp = lineChartState.viewport;
  var n = lineChartState.series.length;
  var ensPreds = lineChartState.ensemblePredictions || [];
  var predCount = ensPreds.length;
  var totalX = Math.max(n + Math.max(predCount, 1), 2);

  // 水平滚动条
  var visX = vp.xMax - vp.xMin;
  if (visX < totalX - 0.001) {
    sbH.style.display = 'block';
    var trackW = sbH.clientWidth || 1;
    var thumbW = Math.max(20, (visX / totalX) * trackW);
    var leftMax = Math.max(0, trackW - thumbW);
    var ratio = totalX > 1 ? (vp.xMin - 1) / (totalX - 1) : 0;
    thumbH.style.width = thumbW + 'px';
    thumbH.style.left = Math.max(0, Math.min(leftMax, ratio * leftMax)) + 'px';
  } else {
    sbH.style.display = 'none';
  }

  // 垂直滚动条（默认垂直视口=全量范围，故隐藏；仅当被缩窄时显示）
  var totalYRange = lineChartState.totalY.max - lineChartState.totalY.min;
  var visY = vp.yMax - vp.yMin;
  if (totalYRange > 0 && visY < totalYRange - 0.001) {
    sbV.style.display = 'block';
    var trackH = sbV.clientHeight || 1;
    var thumbHt = Math.max(20, (visY / totalYRange) * trackH);
    var topMax = Math.max(0, trackH - thumbHt);
    var ratioV = (vp.yMin - lineChartState.totalY.min) / totalYRange;
    thumbV.style.height = thumbHt + 'px';
    thumbV.style.top = Math.max(0, Math.min(topMax, ratioV * topMax)) + 'px';
  } else {
    sbV.style.display = 'none';
  }
}

/** 绑定滚动条拖拽、轨道点击与缩放按钮（一次性）。 */
function attachScrollControls() {
  var sbH = document.getElementById('scrollbar-h');
  var thumbH = document.getElementById('scrollbar-thumb-h');
  var sbV = document.getElementById('scrollbar-v');
  var thumbV = document.getElementById('scrollbar-thumb-v');
  var btnIn = document.getElementById('btn-zoom-in');
  var btnOut = document.getElementById('btn-zoom-out');

  if (thumbH) {
    thumbH.addEventListener('mousedown', function (e) { startScrollbarDrag(e, 'h'); });
  }
  if (sbH) {
    sbH.addEventListener('mousedown', function (e) {
      if (e.target === thumbH) return; // thumb 由其自身处理
      var rect = sbH.getBoundingClientRect();
      jumpHorizontalTo(e.clientX - rect.left);
    });
  }
  if (thumbV) {
    thumbV.addEventListener('mousedown', function (e) { startScrollbarDrag(e, 'v'); });
  }
  if (sbV) {
    sbV.addEventListener('mousedown', function (e) {
      if (e.target === thumbV) return;
      var rect = sbV.getBoundingClientRect();
      jumpVerticalTo(e.clientY - rect.top);
    });
  }
  if (btnIn) btnIn.addEventListener('click', function () {
    zoomLineChart(0.7); // 显示更少
    lineChartState.hoverPoint = null;
    redrawLineChart();
  });
  if (btnOut) btnOut.addEventListener('click', function () {
    zoomLineChart(1.4); // 显示更多
    lineChartState.hoverPoint = null;
    redrawLineChart();
  });
}

/** 开始滚动条拖拽 / start scrollbar drag。 */
function startScrollbarDrag(e, axis) {
  e.preventDefault();
  e.stopPropagation();
  if (axis === 'h') {
    var thumbH = document.getElementById('scrollbar-thumb-h');
    scrollbarDragState = {
      axis: 'h',
      startMouse: e.clientX,
      startThumbPos: parseFloat(thumbH && thumbH.style.left) || 0
    };
  } else {
    var thumbV = document.getElementById('scrollbar-thumb-v');
    scrollbarDragState = {
      axis: 'v',
      startMouse: e.clientY,
      startThumbPos: parseFloat(thumbV && thumbV.style.top) || 0
    };
  }
  document.addEventListener('mousemove', onScrollbarDragMove);
  document.addEventListener('mouseup', onScrollbarDragEnd);
}

/** 拖拽中（document 级，鼠标离开滚动条仍生效）。 */
function onScrollbarDragMove(e) {
  if (!scrollbarDragState) return;
  var vp = lineChartState.viewport;
  var n = lineChartState.series.length;
  var ensPreds = lineChartState.ensemblePredictions || [];
  var predCount = ensPreds.length;
  var totalX = Math.max(n + Math.max(predCount, 1), 2);

  if (scrollbarDragState.axis === 'h') {
    var sbH = document.getElementById('scrollbar-h');
    var thumbH = document.getElementById('scrollbar-thumb-h');
    if (!sbH || !thumbH) return;
    var trackW = sbH.clientWidth || 1;
    var visX = vp.xMax - vp.xMin;
    var thumbW = Math.max(20, (visX / totalX) * trackW);
    var leftMax = Math.max(0, trackW - thumbW);
    var newLeft = scrollbarDragState.startThumbPos + (e.clientX - scrollbarDragState.startMouse);
    newLeft = Math.max(0, Math.min(leftMax, newLeft));
    thumbH.style.left = newLeft + 'px';
    var ratio = leftMax > 0 ? newLeft / leftMax : 0;
    var span = totalX - visX;
    vp.xMin = 1 + ratio * span;
    vp.xMax = vp.xMin + visX;
    if (vp.xMin < 1) { vp.xMin = 1; vp.xMax = 1 + visX; }
    if (vp.xMax > totalX) { vp.xMax = totalX; vp.xMin = totalX - visX; }
    lineChartState.hoverPoint = null;
    redrawLineChart();
  } else {
    var sbV = document.getElementById('scrollbar-v');
    var thumbV = document.getElementById('scrollbar-thumb-v');
    if (!sbV || !thumbV) return;
    var trackH = sbV.clientHeight || 1;
    var totalYRange = lineChartState.totalY.max - lineChartState.totalY.min;
    if (totalYRange <= 0) return;
    var visY = vp.yMax - vp.yMin;
    var thumbHt = Math.max(20, (visY / totalYRange) * trackH);
    var topMax = Math.max(0, trackH - thumbHt);
    var newTop = scrollbarDragState.startThumbPos + (e.clientY - scrollbarDragState.startMouse);
    newTop = Math.max(0, Math.min(topMax, newTop));
    thumbV.style.top = newTop + 'px';
    var ratioV = topMax > 0 ? newTop / topMax : 0;
    var spanY = totalYRange - visY;
    vp.yMin = lineChartState.totalY.min + ratioV * spanY;
    vp.yMax = vp.yMin + visY;
    lineChartState.hoverPoint = null;
    redrawLineChart();
  }
}

/** 结束拖拽 / end drag。 */
function onScrollbarDragEnd() {
  scrollbarDragState = null;
  document.removeEventListener('mousemove', onScrollbarDragMove);
  document.removeEventListener('mouseup', onScrollbarDragEnd);
}

/** 点击水平轨道：thumb 中心对齐点击位置。 */
function jumpHorizontalTo(clickX) {
  var vp = lineChartState.viewport;
  var n = lineChartState.series.length;
  var ensPreds = lineChartState.ensemblePredictions || [];
  var predCount = ensPreds.length;
  var totalX = Math.max(n + Math.max(predCount, 1), 2);
  var sbH = document.getElementById('scrollbar-h');
  var thumbH = document.getElementById('scrollbar-thumb-h');
  if (!sbH || !thumbH) return;
  var trackW = sbH.clientWidth || 1;
  var visX = vp.xMax - vp.xMin;
  var thumbW = Math.max(20, (visX / totalX) * trackW);
  var leftMax = Math.max(0, trackW - thumbW);
  var newLeft = clickX - thumbW / 2;
  newLeft = Math.max(0, Math.min(leftMax, newLeft));
  thumbH.style.left = newLeft + 'px';
  var ratio = leftMax > 0 ? newLeft / leftMax : 0;
  var span = totalX - visX;
  vp.xMin = 1 + ratio * span;
  vp.xMax = vp.xMin + visX;
  if (vp.xMin < 1) { vp.xMin = 1; vp.xMax = 1 + visX; }
  if (vp.xMax > totalX) { vp.xMax = totalX; vp.xMin = totalX - visX; }
  lineChartState.hoverPoint = null;
  redrawLineChart();
}

/** 点击垂直轨道：thumb 中心对齐点击位置。 */
function jumpVerticalTo(clickY) {
  var vp = lineChartState.viewport;
  var sbV = document.getElementById('scrollbar-v');
  var thumbV = document.getElementById('scrollbar-thumb-v');
  if (!sbV || !thumbV) return;
  var trackH = sbV.clientHeight || 1;
  var totalYRange = lineChartState.totalY.max - lineChartState.totalY.min;
  if (totalYRange <= 0) return;
  var visY = vp.yMax - vp.yMin;
  var thumbHt = Math.max(20, (visY / totalYRange) * trackH);
  var topMax = Math.max(0, trackH - thumbHt);
  var newTop = clickY - thumbHt / 2;
  newTop = Math.max(0, Math.min(topMax, newTop));
  thumbV.style.top = newTop + 'px';
  var ratioV = topMax > 0 ? newTop / topMax : 0;
  var spanY = totalYRange - visY;
  vp.yMin = lineChartState.totalY.min + ratioV * spanY;
  vp.yMax = vp.yMin + visY;
  lineChartState.hoverPoint = null;
  redrawLineChart();
}

// ============================================================
// 权重条形图 / Weight Bar Chart
// ============================================================

/** 按权重降序返回原始索引数组 / return original indices sorted by weight desc。 */
function computeWeightOrder(weights) {
  var idx = [];
  for (var i = 0; i < weights.length; i++) idx.push(i);
  idx.sort(function (a, b) { return weights[b] - weights[a]; });
  return idx;
}

/**
 * 以给定权重和显示位置绘制权重条形图 / draw weight bars at given positions。
 * positions[i] 为方法 i 的显示行号（浮点，动画时为插值结果）。
 */
function drawWeightBarsFrame(canvas, methods, weights, positions) {
  var ctx = setupCanvas(canvas);
  if (!ctx) return;
  var displayW = canvas.clientWidth || 400;
  var displayH = canvas.clientHeight || 500;
  if (displayW <= 0 || displayH <= 0) return;

  ctx.clearRect(0, 0, displayW, displayH);
  ctx.fillStyle = CHART_BG;
  ctx.fillRect(0, 0, displayW, displayH);

  var HEADER_H = 40, END_PAD = 20, PAD = 12;
  var count = methods.length;
  var BAR_H = 18, GAP = 6;
  // 若内容超出可用高度，按比例缩小条形 / shrink bars if needed
  if (count > 0) {
    var availH = displayH - HEADER_H - END_PAD;
    var needed = count * (BAR_H + GAP);
    if (needed > availH) {
      var per = availH / count;
      GAP = Math.max(2, Math.min(6, per * 0.25));
      BAR_H = Math.max(8, per - GAP);
    }
  }

  // 标题
  ctx.fillStyle = CHART_BORDER;
  chartFont(ctx, 14);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('chart_weights_title')) || '方法权重 (降序)', PAD, 12);

  var labelX = PAD;
  var barX = PAD + 150;
  var pctW = 70;
  var barMaxW = displayW - PAD - 150 - pctW;
  if (barMaxW < 20) barMaxW = 20;

  ctx.textBaseline = 'middle';
  for (var i = 0; i < count; i++) {
    var m = methods[i] || {};
    var w = (typeof weights[i] === 'number' && isFinite(weights[i])) ? weights[i] : 0;
    var pos = (typeof positions[i] === 'number') ? positions[i] : i;
    var y = HEADER_H + pos * (BAR_H + GAP);

    // 名称标签（超 14 字截断 …）
    var rawName = m.name ? String(m.name) : '';
    var name = (m.nameKey && window.i18n && typeof window.i18n.t === 'function')
      ? (window.i18n.t(m.nameKey) || rawName)
      : rawName;
    if (name.length > 14) name = name.slice(0, 13) + '…';
    ctx.fillStyle = CHART_BORDER;
    chartFont(ctx, 11);
    ctx.textAlign = 'left';
    ctx.fillText(name, labelX, y + BAR_H / 2);

    var color = chartCategoryColor(m.category);
    var barW = Math.max(0, Math.min(barMaxW, w * barMaxW));

    if (w === 0) {
      // 权重为 0：虚线空框
      ctx.strokeStyle = CHART_BORDER;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      chartRoundRect(ctx, barX, y, barMaxW, BAR_H, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = color;
      chartApplyShadow(ctx);
      chartRoundRect(ctx, barX, y, barW, BAR_H, 4);
      ctx.fill();
      chartClearShadow(ctx);
      ctx.strokeStyle = CHART_BORDER;
      ctx.lineWidth = 2;
      chartRoundRect(ctx, barX, y, barW, BAR_H, 4);
      ctx.stroke();
      // 顶部 2px 高光（3D 像素效果）
      if (barW > 4) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        chartRoundRect(ctx, barX + 2, y + 2, barW - 4, 2, 1);
        ctx.fill();
      }
    }

    // 百分比标签
    ctx.fillStyle = CHART_BORDER;
    chartFont(ctx, 11);
    ctx.textAlign = 'left';
    ctx.fillText((w * 100).toFixed(2) + '%', barX + barMaxW + 8, y + BAR_H / 2);
  }
}

/**
 * drawWeightBars(canvas, methods, weights)
 *
 * 非动画绘制：按权重降序排列，更新动画状态。
 */
function drawWeightBars(canvas, methods, weights) {
  if (!canvas) return;
  methods = methods || [];
  var w = [];
  for (var i = 0; i < weights.length; i++) {
    w.push((typeof weights[i] === 'number' && isFinite(weights[i])) ? weights[i] : 0);
  }
  // 若动画进行中，先取消（避免冲突）
  if (weightBarAnimState.rafId !== null) {
    cancelAnimationFrame(weightBarAnimState.rafId);
    weightBarAnimState.rafId = null;
    weightBarAnimState.animating = false;
  }
  var order = computeWeightOrder(w);
  weightBarAnimState.currentWeights = w;
  weightBarAnimState.currentOrder = order;

  var positions = new Array(methods.length);
  for (var j = 0; j < methods.length; j++) positions[j] = order.indexOf(j);
  drawWeightBarsFrame(canvas, methods, w, positions);
}

/**
 * animateWeightBarsUpdate(canvas, methods, newWeights) → Promise
 *
 * 从当前权重/顺序动画过渡到新权重/顺序，400ms，easeInOutQuad。
 * 各方法权重线性插值，显示 Y 位置从起始顺序位置插值到结束顺序位置。
 */
function animateWeightBarsUpdate(canvas, methods, newWeights) {
  return new Promise(function (resolve) {
    if (!canvas) { resolve(); return; }
    methods = methods || [];
    var nw = [];
    for (var i = 0; i < newWeights.length; i++) {
      nw.push((typeof newWeights[i] === 'number' && isFinite(newWeights[i])) ? newWeights[i] : 0);
    }

    if (methods.length === 0) {
      if (weightBarAnimState.rafId !== null) {
        cancelAnimationFrame(weightBarAnimState.rafId);
        weightBarAnimState.rafId = null;
      }
      weightBarAnimState.currentWeights = [];
      weightBarAnimState.currentOrder = [];
      weightBarAnimState.animating = false;
      drawWeightBarsFrame(canvas, methods, [], []);
      resolve();
      return;
    }

    // 取消进行中的动画
    if (weightBarAnimState.rafId !== null) {
      cancelAnimationFrame(weightBarAnimState.rafId);
      weightBarAnimState.rafId = null;
    }

    // 起始状态
    var startWeights = weightBarAnimState.currentWeights.slice();
    var startOrder = weightBarAnimState.currentOrder.slice();
    // 若长度不匹配（首次或方法数变化），用新权重作为起点
    if (startWeights.length !== methods.length) {
      startWeights = nw.slice();
      startOrder = computeWeightOrder(nw);
    }
    var startPos = new Array(methods.length);
    for (var s = 0; s < methods.length; s++) startPos[s] = startOrder.indexOf(s);

    // 结束状态
    var endOrder = computeWeightOrder(nw);
    var endPos = new Array(methods.length);
    for (var e = 0; e < methods.length; e++) endPos[e] = endOrder.indexOf(e);

    var duration = 400;
    var startTime = performance.now();
    weightBarAnimState.animating = true;

    function easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function frame(now) {
      var t = Math.min(1, (now - startTime) / duration);
      var e = easeInOutQuad(t);
      var curW = new Array(methods.length);
      var curPos = new Array(methods.length);
      for (var k = 0; k < methods.length; k++) {
        curW[k] = startWeights[k] + (nw[k] - startWeights[k]) * e;
        curPos[k] = startPos[k] + (endPos[k] - startPos[k]) * e;
      }
      drawWeightBarsFrame(canvas, methods, curW, curPos);
      if (t < 1) {
        weightBarAnimState.rafId = requestAnimationFrame(frame);
      } else {
        weightBarAnimState.rafId = null;
        weightBarAnimState.currentWeights = nw;
        weightBarAnimState.currentOrder = endOrder;
        weightBarAnimState.animating = false;
        resolve();
      }
    }
    weightBarAnimState.rafId = requestAnimationFrame(frame);
  });
}

// ============================================================
// 折线图训练动画 / Line Chart Training Animation
// ============================================================

/**
 * animateLineChartStep(canvas, stepData) → Promise
 *
 * 追加一个训练回测预测点并播放入场动画（300ms）。
 * stepData = { step, predictIndex, actual, methodPredictions, weights, ensemblePrediction }
 *   - predictIndex: 1-based X 位置
 *   - methodPredictions: [{id,name,category,prediction}]
 *   - ensemblePrediction: number|null
 */
function animateLineChartStep(canvas, stepData) {
  return new Promise(function (resolve) {
    if (!canvas) { resolve(); return; }
    stepData = stepData || {};
    var predictIndex = stepData.predictIndex;
    if (predictIndex === undefined || predictIndex === null) { resolve(); return; }

    var tp = {
      predictIndex: predictIndex,
      methodPredictions: stepData.methodPredictions || [],
      ensemblePrediction: stepData.ensemblePrediction,
      animProgress: 0
    };
    lineChartState.trainingPoints.push(tp);

    // 扩展水平视口以包含新点（若超出）
    var n = lineChartState.series.length;
    var totalX = Math.max(n + 1, predictIndex);
    if (lineChartState.viewport.xMax < totalX) {
      lineChartState.viewport.xMax = totalX;
    }
    // 更新全量 Y 范围并设为垂直视口（确保新点可见）
    var totalY = computeTotalYRange();
    lineChartState.totalY = totalY;
    lineChartState.viewport.yMin = totalY.min;
    lineChartState.viewport.yMax = totalY.max;

    var duration = 300;
    var startTime = performance.now();

    function frame(now) {
      var t = Math.min(1, (now - startTime) / duration);
      tp.animProgress = t;
      redrawLineChart();
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

// ============================================================
// 重置 / Reset
// ============================================================

/** 清空折线图状态（视口、训练点、hover）/ reset line chart state。 */
function resetLineChartState() {
  lineChartState.canvas = null;
  lineChartState.series = [];
  lineChartState.ensemblePredictions = [];
  lineChartState.methodPredictions = [];
  lineChartState.viewport = { xMin: 1, xMax: 2, yMin: 0, yMax: 1 };
  lineChartState.totalY = { min: 0, max: 1 };
  lineChartState.trainingPoints = [];
  lineChartState.hoverPoint = null;
  lineChartState.fitCurve = null;
}

/** 清空权重条形图动画状态（取消进行中的动画）/ reset weight bar anim state。 */
function resetWeightBarAnimState() {
  if (weightBarAnimState.rafId !== null) {
    cancelAnimationFrame(weightBarAnimState.rafId);
    weightBarAnimState.rafId = null;
  }
  weightBarAnimState.currentWeights = [];
  weightBarAnimState.currentOrder = [];
  weightBarAnimState.animating = false;
}

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[chart] loaded v2 (viewport+animation)');
console.log('[chart] exports:', typeof setupCanvas, typeof drawLineChart, typeof drawWeightBars, typeof animateWeightBarsUpdate, typeof animateLineChartStep, typeof resetLineChartState, typeof resetWeightBarAnimState);
