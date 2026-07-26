/**
 * function-3d.js
 * 函数系统 3D 扩展 / 3D Function Plotter
 * 渲染 z = f(x, y) 三维函数图像（像素风格体素表面）
 *
 * 功能：
 *   - 渲染 z = f(x, y) 三维函数图像
 *   - 鼠标拖拽旋转视角（yaw / pitch）
 *   - 滚轮缩放
 *   - 伪 3D 像素风格体素表面渲染
 *   - 高度映射到颜色（地形等高线色阶）
 *   - 自动检测表达式中的参数（a, b, c 等）
 *
 * 使用：
 *   window.Function3D.init(canvas)
 *   window.Function3D.setExpression('sin(x) * cos(y)')
 *   window.Function3D.setParams({ a: 1 })
 *   window.Function3D.reset()
 *
 * 依赖：
 *   window.ExpressionParser（来自 expression-parser.js）
 *
 * 注意：
 *   - 在 expression-parser.js 的 tokenizer 中，'y' 字符属于 PARAM_CHARS，
 *     因此会作为 Param 节点出现。evalAst3D 会拦截 Param.name === 'y'，
 *     将其当作第二个变量处理；其他 Param 节点从 params 中读取。
 */
window.Function3D = (function () {
  'use strict';

  // ===== 颜色变量（与网站一致）=====
  var COLOR_BG = '#1a1a2e';       // 背景 (bg-deep)
  var COLOR_PANEL = '#2d2d44';    // 面板 (bg-panel)
  var COLOR_BORDER = '#ffffff';   // 边框
  var COLOR_ACCENT = '#ffd700';   // 强调色 (accent)

  // 地形色阶（低 → 高）：深蓝 → 浅蓝 → 绿 → 黄 → 红
  var TERRAIN_STOPS = [
    { t: 0.00, c: [30, 144, 255] },   // #1e90ff 深蓝
    { t: 0.25, c: [135, 206, 250] },  // 浅蓝
    { t: 0.50, c: [34, 139, 34] },    // #228b22 绿
    { t: 0.75, c: [255, 215, 0] },    // #ffd700 黄
    { t: 1.00, c: [255, 69, 0] }      // #ff4500 红
  ];

  // ===== 默认参数 =====
  var DEFAULTS = {
    yaw: Math.PI * 0.25,         // 默认 yaw（绕 Y 轴旋转角）
    pitch: Math.PI * 0.28,       // 默认 pitch（绕 X 轴俯仰角）
    scale: 70,                   // 屏幕像素缩放
    range: 2.2,                  // x / y 数学坐标范围 [-range, range]
    gridResolution: 32,          // 网格细分（像素风格的方块感）
    heightScale: 0.7,            // 高度方向缩放
    minHeight: -2,
    maxHeight: 2,
    minScale: 15,
    maxScale: 300,
    // 等高线量化：高度离散化等级（0 = 关闭，>0 = 启用阶梯色带）
    contourBands: 12
  };

  // ===== 内部状态 =====
  var canvas = null;
  var ctx = null;
  var width = 0;
  var height = 0;
  var dpr = 1;

  // 视角状态
  var state = {
    yaw: DEFAULTS.yaw,
    pitch: DEFAULTS.pitch,
    scale: DEFAULTS.scale,
    centerX: 0,
    centerY: 0
  };

  // 表达式状态
  var expression = '';
  var ast = null;
  var parseError = null;
  var params = {};
  var paramNames = [];

  // 鼠标交互
  var dragging = false;
  var lastMouseX = 0;
  var lastMouseY = 0;

  // 缓存最后一次高度范围（图例用）
  var lastMinH = DEFAULTS.minHeight;
  var lastMaxH = DEFAULTS.maxHeight;

  /**
   * 3D AST 求值：支持 x 和 y 两个变量
   * 与 ExpressionParser.evalAst 兼容，但 Variable.name === 'y' 和 Param.name === 'y'
   * 都返回 y 值（因为 tokenizer 会把单字符 'y' 解析为 Param）
   */
  function evalAst3D(node, x, y, paramsObj) {
    if (node === null || node === undefined) {
      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_invalid_ast')) || '无效的 AST 节点');
    }
    if (paramsObj === undefined || paramsObj === null) paramsObj = {};

    switch (node.type) {
      case 'Number':
        return node.value;

      case 'Variable':
        // 'x' 与 'y' 都作为变量
        if (node.name === 'x') return x;
        if (node.name === 'y') return y;
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_unknown_variable', {val: node.name})) || ('未知变量: ' + node.name));

      case 'Param':
        // 在 3D 模式中，'y' 既是 Param token 又是函数变量
        if (node.name === 'y') return y;
        if (Object.prototype.hasOwnProperty.call(paramsObj, node.name)) {
          var val = paramsObj[node.name];
          if (typeof val !== 'number') {
            throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_param_not_number', {val: node.name})) || ('参数 ' + node.name + ' 不是数字'));
          }
          return val;
        }
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_undefined_param', {val: node.name})) || ('未定义参数: ' + node.name));

      case 'Constant':
        if (node.name === 'pi') return Math.PI;
        if (node.name === 'e') return Math.E;
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_unknown_constant', {val: node.name})) || ('未知常量: ' + node.name));

      case 'UnaryOp': {
        var operandVal = evalAst3D(node.operand, x, y, paramsObj);
        if (node.op === '-') return -operandVal;
        if (node.op === '+') return operandVal;
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_unknown_unary_op', {val: node.op})) || ('未知一元运算符: ' + node.op));
      }

      case 'BinaryOp': {
        var left = evalAst3D(node.left, x, y, paramsObj);
        var right = evalAst3D(node.right, x, y, paramsObj);
        switch (node.op) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/':
            if (right === 0) throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_div_zero')) || '除数不能为零');
            return left / right;
          case '^':
            return Math.pow(left, right);
          default:
            throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_unknown_binary_op', {val: node.op})) || ('未知二元运算符: ' + node.op));
        }
      }

      case 'FunctionCall': {
        var arg = evalAst3D(node.argument, x, y, paramsObj);
        var fn = window.ExpressionParser.FUNCTIONS[node.name];
        if (!fn) {
          throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_unknown_function', {val: node.name})) || ('未知函数: ' + node.name));
        }
        return fn(arg);
      }

      default:
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_error_unknown_ast_type', {val: node.type})) || ('未知 AST 节点类型: ' + node.type));
    }
  }

  // ===== 颜色映射：归一化高度 [0,1] → 颜色字符串 =====
  function terrainColor(t, useBands) {
    if (t < 0) t = 0;
    if (t > 1) t = 1;

    // 等高线量化：将连续高度离散化为色带，形成等高线效果
    if (useBands && DEFAULTS.contourBands > 0) {
      var bands = DEFAULTS.contourBands;
      t = Math.floor(t * bands) / (bands - 0.0001);
      if (t > 1) t = 1;
    }

    for (var i = 0; i < TERRAIN_STOPS.length - 1; i++) {
      var a = TERRAIN_STOPS[i];
      var b = TERRAIN_STOPS[i + 1];
      if (t >= a.t && t <= b.t) {
        var localT = (t - a.t) / (b.t - a.t);
        var r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * localT);
        var g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * localT);
        var bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * localT);
        return 'rgb(' + r + ',' + g + ',' + bl + ')';
      }
    }
    var last = TERRAIN_STOPS[TERRAIN_STOPS.length - 1];
    return 'rgb(' + last.c[0] + ',' + last.c[1] + ',' + last.c[2] + ')';
  }

  // ===== 3D 投影：世界坐标 (x, y, z) → 屏幕坐标 =====
  // 流程：绕 Y 轴旋转 yaw → 绕 X 轴旋转 pitch → 透视投影
  // y 表示数学上的高度方向（向上为正）
  function project(x, y, z) {
    // 绕 Y 轴旋转（yaw）
    var cosY = Math.cos(state.yaw);
    var sinY = Math.sin(state.yaw);
    var x1 = x * cosY - z * sinY;
    var z1 = x * sinY + z * cosY;

    // 绕 X 轴旋转（pitch）
    var cosP = Math.cos(state.pitch);
    var sinP = Math.sin(state.pitch);
    var y1 = y * cosP - z1 * sinP;
    var z2 = y * sinP + z1 * cosP;

    // 透视投影：z2 越大（越远）物体越小
    var focal = 700;
    var persp = focal / Math.max(1, focal + z2);

    var sx = state.centerX + x1 * persp * state.scale;
    var sy = state.centerY - y1 * persp * state.scale;
    return { x: sx, y: sy, depth: z2 };
  }

  // ===== 计算高度网格 =====
  function computeHeightGrid() {
    var N = DEFAULTS.gridResolution;
    var range = DEFAULTS.range;
    var grid = [];
    var minH = Infinity, maxH = -Infinity;

    for (var i = 0; i <= N; i++) {
      var row = [];
      var xv = -range + (2 * range) * (i / N);
      for (var j = 0; j <= N; j++) {
        var yv = -range + (2 * range) * (j / N);
        var zv = 0;
        var valid = true;
        if (ast) {
          try {
            zv = evalAst3D(ast, xv, yv, params);
            if (!isFinite(zv) || isNaN(zv)) {
              valid = false;
              zv = 0;
            }
          } catch (e) {
            valid = false;
            zv = 0;
          }
        }
        // 钳制极端值
        var cap = 6;
        if (zv > cap) zv = cap;
        if (zv < -cap) zv = -cap;
        row.push({ x: xv, y: zv, z: yv, valid: valid });
        if (valid) {
          if (zv < minH) minH = zv;
          if (zv > maxH) maxH = zv;
        }
      }
      grid.push(row);
    }

    if (!isFinite(minH)) minH = DEFAULTS.minHeight;
    if (!isFinite(maxH)) maxH = DEFAULTS.maxHeight;
    if (maxH - minH < 0.001) {
      var mid = (minH + maxH) / 2;
      minH = mid - 1;
      maxH = mid + 1;
    }
    return { grid: grid, minH: minH, maxH: maxH };
  }

  // ===== 渲染表面（体素方块） =====
  function renderSurface() {
    var N = DEFAULTS.gridResolution;
    var result = computeHeightGrid();
    var grid = result.grid;
    var minH = result.minH;
    var maxH = result.maxH;
    var hRange = maxH - minH;

    lastMinH = minH;
    lastMaxH = maxH;

    var quads = [];
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        var p00 = grid[i][j];
        var p10 = grid[i + 1][j];
        var p01 = grid[i][j + 1];
        var p11 = grid[i + 1][j + 1];
        if (!p00.valid || !p10.valid || !p01.valid || !p11.valid) continue;

        // 投影四个角点（y 应用高度缩放）
        var s00 = project(p00.x, p00.y * DEFAULTS.heightScale, p00.z);
        var s10 = project(p10.x, p10.y * DEFAULTS.heightScale, p10.z);
        var s11 = project(p11.x, p11.y * DEFAULTS.heightScale, p11.z);
        var s01 = project(p01.x, p01.y * DEFAULTS.heightScale, p01.z);

        // 平均高度 → 颜色
        var avgH = (p00.y + p10.y + p11.y + p01.y) / 4;
        var t = (avgH - minH) / hRange;
        var color = terrainColor(t, true);

        // 平均深度 → 排序
        var avgDepth = (s00.depth + s10.depth + s11.depth + s01.depth) / 4;

        // 简单光照：根据面法线在屏幕空间的朝向决定亮度系数
        // 用相邻边叉乘近似法线
        var dx1 = s10.x - s00.x, dy1 = s10.y - s00.y;
        var dx2 = s01.x - s00.x, dy2 = s01.y - s00.y;
        var cross = dx1 * dy2 - dy1 * dx2; // 屏幕空间叉积
        // cross > 0 表示面朝向相机，<0 表示背向（用更暗的色）
        var shade = cross >= 0 ? 1.0 : 0.7;

        quads.push({
          pts: [s00, s10, s11, s01],
          color: color,
          shade: shade,
          depth: avgDepth
        });
      }
    }

    // painter 算法：从远到近绘制
    quads.sort(function (a, b) { return b.depth - a.depth; });

    ctx.lineJoin = 'miter';
    for (var k = 0; k < quads.length; k++) {
      var q = quads[k];
      ctx.beginPath();
      ctx.moveTo(q.pts[0].x, q.pts[0].y);
      ctx.lineTo(q.pts[1].x, q.pts[1].y);
      ctx.lineTo(q.pts[2].x, q.pts[2].y);
      ctx.lineTo(q.pts[3].x, q.pts[3].y);
      ctx.closePath();
      ctx.fillStyle = applyShade(q.color, q.shade);
      ctx.fill();
      // 像素风格：用半透明深色描边强化方块感
      ctx.strokeStyle = 'rgba(26, 26, 46, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 应用亮度系数到 rgb 颜色字符串
  function applyShade(rgbStr, factor) {
    var m = rgbStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (!m) return rgbStr;
    var r = Math.max(0, Math.min(255, Math.round(parseInt(m[1], 10) * factor)));
    var g = Math.max(0, Math.min(255, Math.round(parseInt(m[2], 10) * factor)));
    var b = Math.max(0, Math.min(255, Math.round(parseInt(m[3], 10) * factor)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ===== 底部参考网格 =====
  function drawFloorGrid() {
    var range = DEFAULTS.range;
    var step = range / 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (var v = -range; v <= range + 0.001; v += step) {
      // 沿 z 方向的线
      var a1 = project(-range, 0, v);
      var b1 = project(range, 0, v);
      ctx.beginPath();
      ctx.moveTo(a1.x, a1.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.stroke();
      // 沿 x 方向的线
      var a2 = project(v, 0, -range);
      var b2 = project(v, 0, range);
      ctx.beginPath();
      ctx.moveTo(a2.x, a2.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.stroke();
    }
  }

  // ===== 坐标轴 =====
  function renderAxes() {
    var range = DEFAULTS.range;
    var hAxis = 1.6;

    // X 轴（数学 x 输入）：红色
    var xa = project(-range, 0, 0);
    var xb = project(range, 0, 0);
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xa.x, xa.y);
    ctx.lineTo(xb.x, xb.y);
    ctx.stroke();

    // Y 轴（数学 y 输入，3D 中沿 z）：蓝色
    var ya = project(0, 0, -range);
    var yb = project(0, 0, range);
    ctx.strokeStyle = '#1e90ff';
    ctx.beginPath();
    ctx.moveTo(ya.x, ya.y);
    ctx.lineTo(yb.x, yb.y);
    ctx.stroke();

    // Z 轴（高度方向）：金色
    var za = project(0, -hAxis, 0);
    var zb = project(0, hAxis, 0);
    ctx.strokeStyle = COLOR_ACCENT;
    ctx.beginPath();
    ctx.moveTo(za.x, za.y);
    ctx.lineTo(zb.x, zb.y);
    ctx.stroke();

    // 轴标签
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff4500';
    var xLabel = project(range + 0.3, 0, 0);
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_axis_label_x')) || 'x', xLabel.x, xLabel.y);
    ctx.fillStyle = '#1e90ff';
    var yLabel = project(0, 0, range + 0.3);
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_axis_label_y')) || 'y', yLabel.x, yLabel.y);
    ctx.fillStyle = COLOR_ACCENT;
    var zLabel = project(0, hAxis + 0.3, 0);
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('f3d_axis_label_z')) || 'z', zLabel.x, zLabel.y);
  }

  // ===== 色阶图例 =====
  function renderLegend() {
    var w = 16;
    var h = 140;
    var x0 = width - w - 16;
    var y0 = (height - h) / 2;

    // 渐变色条
    for (var i = 0; i < h; i++) {
      var t = 1 - i / (h - 1);
      ctx.fillStyle = terrainColor(t, true);
      ctx.fillRect(x0, y0 + i, w, 1);
    }
    ctx.strokeStyle = COLOR_BORDER;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);

    // 标签：上端 maxH，下端 minH
    ctx.fillStyle = COLOR_ACCENT;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(lastMaxH.toFixed(1), x0 + w + 4, y0 + 4);
    ctx.fillText(lastMinH.toFixed(1), x0 + w + 4, y0 + h - 4);
    // 中间标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('z', x0 + w + 4, y0 + h / 2);
  }

  // ===== 提示信息 =====
  function renderInfo() {
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = COLOR_ACCENT;
    var noExprText = (typeof window !== 'undefined' && window.i18n && window.i18n.t('function3d_no_expr')) || 'f(x, y) = (未设置表达式)';
    var exprText = expression ? ('f(x, y) = ' + expression) : noExprText;
    ctx.fillText(exprText, 12, 12);

    if (parseError) {
      ctx.fillStyle = '#ff4500';
      var parseErrPrefix = (typeof window !== 'undefined' && window.i18n && window.i18n.t('function3d_parse_error')) || '解析错误: ';
      ctx.fillText(parseErrPrefix + parseError, 12, 32);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      var dragHint = (typeof window !== 'undefined' && window.i18n && window.i18n.t('function3d_drag_hint')) || '拖拽旋转 · 滚轮缩放';
      ctx.fillText(dragHint, 12, height - 22);
    }

    // 参数显示
    if (paramNames.length > 0) {
      var parts = [];
      for (var i = 0; i < paramNames.length; i++) {
        var n = paramNames[i];
        parts.push(n + '=' + (params[n] != null ? params[n].toFixed(2) : '?'));
      }
      ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
      ctx.font = '11px monospace';
      ctx.fillText(parts.join('  '), 12, 32);
    }
  }

  // ===== 主渲染入口 =====
  function redraw() {
    if (!ctx) return;

    // 清屏（背景色）
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, width, height);

    // 关闭抗锯齿以增强像素感
    ctx.imageSmoothingEnabled = false;

    // 底部网格
    drawFloorGrid();

    // 函数表面
    renderSurface();

    // 坐标轴
    renderAxes();

    // 色阶
    renderLegend();

    // 提示信息
    renderInfo();
  }

  // ===== Canvas 尺寸调整 =====
  function resize() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var cssW = Math.max(1, rect.width);
    var cssH = Math.max(1, rect.height);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    width = cssW;
    height = cssH;
    state.centerX = width / 2;
    state.centerY = height / 2;
  }

  // ===== 事件绑定 =====
  function bindEvents() {
    if (!canvas) return;

    // 鼠标按下：开始拖拽
    canvas.addEventListener('mousedown', function (e) {
      dragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    });

    // 鼠标移动：旋转视角
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastMouseX;
      var dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      // 水平拖拽改 yaw，垂直拖拽改 pitch
      state.yaw += dx * 0.01;
      state.pitch += dy * 0.01;
      // 限制 pitch 范围避免视角翻转
      var pitchLimit = Math.PI / 2 - 0.05;
      if (state.pitch > pitchLimit) state.pitch = pitchLimit;
      if (state.pitch < -pitchLimit) state.pitch = -pitchLimit;
      redraw();
    });

    // 鼠标松开：结束拖拽
    window.addEventListener('mouseup', function () {
      dragging = false;
      if (canvas) canvas.style.cursor = 'grab';
    });

    // 滚轮缩放
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = e.deltaY < 0 ? 1.1 : 0.9;
      state.scale *= factor;
      if (state.scale < DEFAULTS.minScale) state.scale = DEFAULTS.minScale;
      if (state.scale > DEFAULTS.maxScale) state.scale = DEFAULTS.maxScale;
      redraw();
    }, { passive: false });

    // 触摸支持（单指拖拽）
    var touchLastX = 0, touchLastY = 0;
    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        touchLastX = e.touches[0].clientX;
        touchLastY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) {
        var dx = e.touches[0].clientX - touchLastX;
        var dy = e.touches[0].clientY - touchLastY;
        touchLastX = e.touches[0].clientX;
        touchLastY = e.touches[0].clientY;
        state.yaw += dx * 0.01;
        state.pitch += dy * 0.01;
        var pitchLimit = Math.PI / 2 - 0.05;
        if (state.pitch > pitchLimit) state.pitch = pitchLimit;
        if (state.pitch < -pitchLimit) state.pitch = -pitchLimit;
        redraw();
        e.preventDefault();
      }
    }, { passive: false });

    // 窗口尺寸变化
    window.addEventListener('resize', function () {
      resize();
      redraw();
    });
  }

  // ===== 公共 API =====

  // 初始化：传入 canvas 元素
  function init(canvasEl) {
    canvas = canvasEl;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.style.cursor = 'grab';
    resize();
    bindEvents();
    redraw();
  }

  // 设置表达式
  function setExpression(expr) {
    expression = expr || '';
    parseError = null;
    if (!expression) {
      ast = null;
      redraw();
      return;
    }
    var result = window.ExpressionParser.parse(expression);
    if (!result.ok) {
      ast = null;
      parseError = result.error;
      redraw();
      return;
    }
    ast = result.ast;
    // 自动检测参数（排除 'x' 和 'y'）
    var detected = window.ExpressionParser.extractParams(ast);
    paramNames = detected.filter(function (n) {
      return n !== 'x' && n !== 'y';
    });
    // 新参数填充默认值 1
    for (var i = 0; i < paramNames.length; i++) {
      var name = paramNames[i];
      if (!Object.prototype.hasOwnProperty.call(params, name)) {
        params[name] = 1;
      }
    }
    redraw();
  }

  // 设置参数值
  function setParams(newParams) {
    if (!newParams || typeof newParams !== 'object') return;
    for (var k in newParams) {
      if (Object.prototype.hasOwnProperty.call(newParams, k)) {
        var v = newParams[k];
        if (typeof v === 'number' && isFinite(v)) {
          params[k] = v;
        }
      }
    }
    redraw();
  }

  // 获取参数列表与当前值（供 HTML 端构建滑块）
  function getParams() {
    var values = {};
    for (var i = 0; i < paramNames.length; i++) {
      var n = paramNames[i];
      values[n] = params[n] != null ? params[n] : 1;
    }
    return { names: paramNames.slice(), values: values };
  }

  // 重置视角
  function reset() {
    state.yaw = DEFAULTS.yaw;
    state.pitch = DEFAULTS.pitch;
    state.scale = DEFAULTS.scale;
    redraw();
  }

  return {
    init: init,
    setExpression: setExpression,
    setParams: setParams,
    getParams: getParams,
    redraw: redraw,
    reset: reset
  };
})();
