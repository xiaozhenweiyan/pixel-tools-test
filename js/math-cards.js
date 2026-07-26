/**
 * math-cards.js
 * 数学学习卡片模块 - 四则运算动画演示
 * Math Learning Cards Module - Arithmetic Animation Demo
 *
 * 功能：
 *   - 加法、减法、乘法、除法四种运算的像素动画演示
 *   - 混合运算（两步运算）的动画演示
 *   - Canvas 像素风格动画，使用 requestAnimationFrame
 *   - 用户自由输入数字和运算符，点击"演示"按钮播放动画
 *
 * 暴露到全局：window.MathCards
 *   - init() - 初始化四则运算页
 *   - initMixed() - 初始化混合运算页
 */
(function () {
  'use strict';

  // ============================================================
  // 常量 / Constants
  // ============================================================

  // 运算符符号映射
  const OP_SYMBOLS = {
    add: '+',
    subtract: '−',
    multiply: '×',
    divide: '÷'
  };

  // 像素方块颜色配置
  const COLORS = {
    primary: '#ffd700',   // 金色（主色）
    secondary: '#1e90ff', // 蓝色（加数）
    accent: '#ff6b9d',    // 粉色
    success: '#228b22',   // 绿色（最终结果）
    danger: '#ff4500',    // 红色（移除/消失）
    text: '#ffffff',
    textDim: '#aaaaaa',
    // 分组用颜色（循环使用）
    groups: ['#ffd700', '#1e90ff', '#ff6b9d', '#228b22', '#9b59b6', '#e67e22', '#1abc9c', '#f39c12']
  };

  // Canvas 内部分辨率
  const CANVAS_W = 680;
  const CANVAS_H = 360;

  // 输入限制
  const LIMITS = {
    addSub: { min: 0, max: 30 },
    mul: { min: 1, max: 12 },
    div: { min: 1, max: 30 },
    mixed: { min: 0, max: 20 }
  };

  // ============================================================
  // 工具函数 / Utility Functions
  // ============================================================

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * 执行单次运算
   * @param {number} a
   * @param {string} op - 运算类型
   * @param {number} b
   * @returns {number}
   */
  function computeOp(a, op, b) {
    switch (op) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return Math.floor(a / b);
      default: return 0;
    }
  }

  // ============================================================
  // 像素方块 / Pixel Block
  // ============================================================

  /**
   * 创建一个像素方块
   * @param {Object} opts
   *   - color: 颜色
   *   - size: 大小
   *   - keyframes: 关键帧数组 [{t, x, y, alpha?, scale?}]
   *   - colorChangeAt: 颜色变换时间（-1 表示不变换）
   *   - newColor: 变换后的颜色
   */
  function makeBlock(opts) {
    var kf0 = opts.keyframes[0];
    return {
      color: opts.color,
      size: opts.size,
      keyframes: opts.keyframes,
      x: kf0.x,
      y: kf0.y,
      alpha: kf0.alpha != null ? kf0.alpha : 1,
      scale: kf0.scale != null ? kf0.scale : 1,
      colorChangeAt: opts.colorChangeAt != null ? opts.colorChangeAt : -1,
      newColor: opts.newColor || null,
      colorChanged: false,
      visible: true
    };
  }

  /**
   * 根据经过的时间更新方块状态（关键帧插值）
   */
  function updateBlock(block, elapsed) {
    // 颜色变换
    if (!block.colorChanged && block.colorChangeAt >= 0 && elapsed >= block.colorChangeAt && block.newColor) {
      block.color = block.newColor;
      block.colorChanged = true;
    }

    var kfs = block.keyframes;
    if (kfs.length === 0) return;

    // 在第一帧之前
    if (elapsed <= kfs[0].t) {
      var k0 = kfs[0];
      block.x = k0.x;
      block.y = k0.y;
      block.alpha = k0.alpha != null ? k0.alpha : 1;
      block.scale = k0.scale != null ? k0.scale : 1;
      return;
    }

    // 在最后一帧之后
    var last = kfs[kfs.length - 1];
    if (elapsed >= last.t) {
      block.x = last.x;
      block.y = last.y;
      block.alpha = last.alpha != null ? last.alpha : 1;
      block.scale = last.scale != null ? last.scale : 1;
      return;
    }

    // 找到当前所处的区间并插值
    for (var i = 0; i < kfs.length - 1; i++) {
      var k1 = kfs[i];
      var k2 = kfs[i + 1];
      if (elapsed >= k1.t && elapsed < k2.t) {
        var t = (elapsed - k1.t) / (k2.t - k1.t);
        var e = easeOutCubic(t);
        block.x = lerp(k1.x, k2.x, e);
        block.y = lerp(k1.y, k2.y, e);
        var a1 = k1.alpha != null ? k1.alpha : 1;
        var a2 = k2.alpha != null ? k2.alpha : 1;
        block.alpha = lerp(a1, a2, e);
        var s1 = k1.scale != null ? k1.scale : 1;
        var s2 = k2.scale != null ? k2.scale : 1;
        block.scale = lerp(s1, s2, e);
        return;
      }
    }
  }

  /**
   * 绘制单个像素方块（带像素阴影、高光、暗角）
   */
  function drawBlock(ctx, block) {
    if (!block.visible || block.alpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = block.alpha;
    var s = block.size * block.scale;
    if (s <= 0.5) { ctx.restore(); return; }
    var x = block.x + (block.size - s) / 2;
    var y = block.y + (block.size - s) / 2;
    var edge = Math.max(2, s * 0.18);

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 3, y + 3, s, s);

    // 主体
    ctx.fillStyle = block.color;
    ctx.fillRect(x, y, s, s);

    // 高光（左上）
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillRect(x, y, s, edge);
    ctx.fillRect(x, y, edge, s);

    // 暗角（右下）
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x, y + s - edge, s, edge);
    ctx.fillRect(x + s - edge, y, edge, s);

    ctx.restore();
  }

  /**
   * 绘制像素风文字（带阴影）
   */
  function drawPixelText(ctx, text, x, y, opts) {
    opts = opts || {};
    var size = opts.size || 20;
    var color = opts.color || COLORS.text;
    var align = opts.align || 'center';
    ctx.save();
    ctx.font = 'bold ' + size + 'px "Courier New", monospace';
    ctx.textAlign = align;
    ctx.textBaseline = opts.baseline || 'middle';
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(text, x + 3, y + 3);
    // 主体
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * 绘制背景网格（淡）
   */
  function drawGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    var step = 32;
    for (var x = 0; x <= w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (var y = 0; y <= h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============================================================
  // 动画引擎 / Animation Engine
  // ============================================================

  /**
   * 动画引擎，管理一整个动画的播放
   * @param {HTMLCanvasElement} canvas
   */
  function AnimationEngine(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.blocks = [];
    this.staticTexts = [];     // 静态文字（一直显示）
    this.dynamicTexts = [];    // 动态文字（按时间淡入）
    this.running = false;
    this.startTime = 0;
    this.totalDuration = 0;
    this.rafId = null;
    this.onComplete = null;
  }

  AnimationEngine.prototype.reset = function () {
    this.stop();
    this.blocks = [];
    this.staticTexts = [];
    this.dynamicTexts = [];
    this.totalDuration = 0;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  AnimationEngine.prototype.stop = function () {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
  };

  AnimationEngine.prototype.addBlock = function (block) {
    this.blocks.push(block);
    var lastT = block.keyframes[block.keyframes.length - 1].t;
    if (lastT > this.totalDuration) this.totalDuration = lastT;
  };

  AnimationEngine.prototype.addStaticText = function (text, x, y, opts) {
    this.staticTexts.push({ text: text, x: x, y: y, opts: opts || {} });
  };

  /**
   * 添加按时间淡入的动态文字
   */
  AnimationEngine.prototype.addDynamicText = function (text, x, y, appearAt, opts) {
    this.dynamicTexts.push({ text: text, x: x, y: y, appearAt: appearAt, opts: opts || {} });
    if (appearAt + 400 > this.totalDuration) this.totalDuration = appearAt + 400;
  };

  /**
   * 绘制初始占位状态（未播放动画时）
   */
  AnimationEngine.prototype.drawIdle = function (hintText) {
    var ctx = this.ctx;
    var W = this.canvas.width;
    var H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, W, H);
    if (hintText) {
      drawPixelText(ctx, hintText, W / 2, H / 2, { size: 18, color: COLORS.textDim });
    }
  };

  AnimationEngine.prototype.play = function (callback) {
    var self = this;
    this.onComplete = callback;
    this.running = true;
    this.startTime = performance.now();

    function loop() {
      if (!self.running) return;
      var elapsed = performance.now() - self.startTime;
      var ctx = self.ctx;

      // 清空
      ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

      // 背景网格
      drawGrid(ctx, self.canvas.width, self.canvas.height);

      // 静态文字
      for (var i = 0; i < self.staticTexts.length; i++) {
        var st = self.staticTexts[i];
        drawPixelText(ctx, st.text, st.x, st.y, st.opts);
      }

      // 方块（更新 + 绘制）
      for (var j = 0; j < self.blocks.length; j++) {
        updateBlock(self.blocks[j], elapsed);
        drawBlock(ctx, self.blocks[j]);
      }

      // 动态文字（按时间淡入）
      for (var k = 0; k < self.dynamicTexts.length; k++) {
        var dt = self.dynamicTexts[k];
        if (elapsed >= dt.appearAt) {
          var fadeT = clamp((elapsed - dt.appearAt) / 350, 0, 1);
          ctx.save();
          ctx.globalAlpha = fadeT;
          drawPixelText(ctx, dt.text, dt.x, dt.y, dt.opts);
          ctx.restore();
        }
      }

      // 继续或停止
      if (elapsed < self.totalDuration + 200) {
        self.rafId = requestAnimationFrame(loop);
      } else {
        self.running = false;
        self.rafId = null;
        if (self.onComplete) {
          var cb = self.onComplete;
          self.onComplete = null;
          cb();
        }
      }
    }

    this.rafId = requestAnimationFrame(loop);
  };

  // ============================================================
  // 布局计算 / Layout Helpers
  // ============================================================

  /**
   * 计算方块大小（根据总数和可用宽度）
   */
  function calcBlockSize(total, maxPerRow, availWidth, gap) {
    if (total <= 0) return 32;
    var perRow = Math.min(total, maxPerRow);
    var size = Math.floor((availWidth - (perRow - 1) * gap) / perRow);
    return clamp(size, 16, 36);
  }

  /**
   * 计算 total 个方块在网格中的位置（居中）
   * @returns {Array<{x, y}>}
   */
  function gridPositions(total, maxPerRow, blockSize, gap, centerX, startY) {
    var positions = [];
    if (total <= 0) return positions;
    for (var i = 0; i < total; i++) {
      var r = Math.floor(i / maxPerRow);
      var c = i % maxPerRow;
      var blocksInRow = Math.min(maxPerRow, total - r * maxPerRow);
      var rowWidth = blocksInRow * blockSize + (blocksInRow - 1) * gap;
      var startX = centerX - rowWidth / 2;
      positions.push({
        x: startX + c * (blockSize + gap),
        y: startY + r * (blockSize + gap)
      });
    }
    return positions;
  }

  // ============================================================
  // 场景构建 / Scene Builders
  // ============================================================

  /**
   * 加法场景：a + b = c
   * 演示：a 个蓝色方块从上方落下，b 个金色方块从右侧滑入合并
   */
  function buildAddScene(engine, a, b) {
    var W = engine.canvas.width;
    var H = engine.canvas.height;
    var total = a + b;
    var gap = 6;
    var equationY = 40;

    if (total === 0) {
      engine.addDynamicText('0 + 0 = 0', W / 2, equationY, 0,
        { size: 28, color: COLORS.primary });
      engine.addDynamicText(t('arithmetic_empty_add', '两个空集相加还是空集'), W / 2, H / 2, 300,
        { size: 16, color: COLORS.textDim });
      return;
    }

    var maxPerRow = total <= 10 ? total : 10;
    var blockSize = calcBlockSize(total, maxPerRow, W - 80, gap);
    var gridStartY = (H - Math.ceil(total / maxPerRow) * (blockSize + gap)) / 2 + 30;
    var positions = gridPositions(total, maxPerRow, blockSize, gap, W / 2, gridStartY);

    // 阶段 1: a 个蓝色方块从上方落下（错开出现）
    for (var i = 0; i < a; i++) {
      var px = positions[i].x;
      var py = positions[i].y;
      var delay = i * 60;
      engine.addBlock(makeBlock({
        color: COLORS.secondary,
        size: blockSize,
        keyframes: [
          { t: delay, x: px, y: -50, alpha: 0, scale: 0.5 },
          { t: delay + 400, x: px, y: py, alpha: 1, scale: 1 },
          // 末尾脉冲
          { t: 2400, x: px, y: py, alpha: 1, scale: 1 },
          { t: 2550, x: px, y: py, alpha: 1, scale: 1.15 },
          { t: 2700, x: px, y: py, alpha: 1, scale: 1 }
        ]
      }));
    }

    // 阶段 2: b 个金色方块从右侧滑入，合并到 a 方块旁边
    var baseDelay = 1000;
    for (var j = 0; j < b; j++) {
      var idx = a + j;
      var pxB = positions[idx].x;
      var pyB = positions[idx].y;
      var delayB = baseDelay + j * 60;
      engine.addBlock(makeBlock({
        color: COLORS.primary,
        size: blockSize,
        keyframes: [
          { t: delayB, x: W + 60, y: pyB, alpha: 0, scale: 1 },
          { t: delayB + 200, x: W + 30, y: pyB, alpha: 1, scale: 1 },
          { t: delayB + 700, x: pxB, y: pyB, alpha: 1, scale: 1 },
          // 末尾脉冲
          { t: 2400, x: pxB, y: pyB, alpha: 1, scale: 1 },
          { t: 2550, x: pxB, y: pyB, alpha: 1, scale: 1.15 },
          { t: 2700, x: pxB, y: pyB, alpha: 1, scale: 1 }
        ]
      }));
    }

    // 顶部等式
    engine.addDynamicText(a + ' + ' + b + ' = ' + total, W / 2, equationY, 2200,
      { size: 28, color: COLORS.primary });

    // 说明文字
    engine.addDynamicText(a + ' 个 + ' + b + ' 个 = ' + total + ' 个', W / 2, H - 30, 2500,
      { size: 16, color: COLORS.textDim });
  }

  /**
   * 减法场景：a - b = c
   * 演示：a 个金色方块，后 b 个变红并消失，剩 c 个
   */
  function buildSubtractScene(engine, a, b) {
    var W = engine.canvas.width;
    var H = engine.canvas.height;
    var c = a - b;
    var gap = 6;
    var equationY = 40;

    if (a === 0) {
      engine.addDynamicText('0 − 0 = 0', W / 2, equationY, 0,
        { size: 28, color: COLORS.primary });
      engine.addDynamicText(t('arithmetic_empty_sub', '没有东西可以移除'), W / 2, H / 2, 300,
        { size: 16, color: COLORS.textDim });
      return;
    }

    var maxPerRow = a <= 10 ? a : 10;
    var blockSize = calcBlockSize(a, maxPerRow, W - 80, gap);
    var gridStartY = (H - Math.ceil(a / maxPerRow) * (blockSize + gap)) / 2 + 30;
    var positions = gridPositions(a, maxPerRow, blockSize, gap, W / 2, gridStartY);

    // 创建所有 a 个方块
    for (var i = 0; i < a; i++) {
      var px = positions[i].x;
      var py = positions[i].y;
      var delay = i * 50;
      var isRemoved = i >= c;  // 后 b 个被移除

      if (isRemoved) {
        // 被移除的方块：金色 → 红色 → 放大 → 消失
        engine.addBlock(makeBlock({
          color: COLORS.primary,
          size: blockSize,
          keyframes: [
            { t: delay, x: px, y: -50, alpha: 0, scale: 0.5 },
            { t: delay + 400, x: px, y: py, alpha: 1, scale: 1 },
            // 变红 + 放大
            { t: 1300, x: px, y: py, alpha: 1, scale: 1 },
            { t: 1500, x: px, y: py, alpha: 1, scale: 1.2 },
            // 消失
            { t: 1900, x: px, y: py, alpha: 0, scale: 0 }
          ],
          colorChangeAt: 1300,
          newColor: COLORS.danger
        }));
      } else {
        // 保留的方块：金色，末尾脉冲
        engine.addBlock(makeBlock({
          color: COLORS.primary,
          size: blockSize,
          keyframes: [
            { t: delay, x: px, y: -50, alpha: 0, scale: 0.5 },
            { t: delay + 400, x: px, y: py, alpha: 1, scale: 1 },
            { t: 2200, x: px, y: py, alpha: 1, scale: 1 },
            { t: 2350, x: px, y: py, alpha: 1, scale: 1.15 },
            { t: 2500, x: px, y: py, alpha: 1, scale: 1 }
          ]
        }));
      }
    }

    // 顶部等式
    engine.addDynamicText(a + ' − ' + b + ' = ' + c, W / 2, equationY, 2100,
      { size: 28, color: COLORS.primary });

    // 说明文字
    engine.addDynamicText(a + ' 个移除 ' + b + ' 个，剩 ' + c + ' 个', W / 2, H - 30, 2400,
      { size: 16, color: COLORS.textDim });
  }

  /**
   * 乘法场景：a × b = c
   * 演示：a 行 b 列的方块阵列，逐个出现，每行不同颜色
   */
  function buildMultiplyScene(engine, a, b) {
    var W = engine.canvas.width;
    var H = engine.canvas.height;
    var total = a * b;
    var gap = 6;
    var equationY = 40;

    // 乘法使用专用布局：a 行 b 列
    var blockSize = calcBlockSize(b, b, W - 100, gap);
    // 同时考虑行高度
    var maxBlockH = Math.floor((H - 120) / a) - gap;
    blockSize = Math.min(blockSize, maxBlockH);
    blockSize = clamp(blockSize, 16, 36);

    var gridWidth = b * blockSize + (b - 1) * gap;
    var gridHeight = a * blockSize + (a - 1) * gap;
    var startX = (W - gridWidth) / 2;
    var startY = (H - gridHeight) / 2 + 30;

    // 按行创建方块，每行不同颜色
    for (var r = 0; r < a; r++) {
      var rowColor = COLORS.groups[r % COLORS.groups.length];
      for (var c = 0; c < b; c++) {
        var px = startX + c * (blockSize + gap);
        var py = startY + r * (blockSize + gap);
        var idx = r * b + c;
        var delay = idx * 50;  // 按顺序出现
        engine.addBlock(makeBlock({
          color: rowColor,
          size: blockSize,
          keyframes: [
            { t: delay, x: px, y: -50, alpha: 0, scale: 0.5 },
            { t: delay + 350, x: px, y: py, alpha: 1, scale: 1 },
            // 末尾脉冲
            { t: total * 50 + 800, x: px, y: py, alpha: 1, scale: 1 },
            { t: total * 50 + 950, x: px, y: py, alpha: 1, scale: 1.15 },
            { t: total * 50 + 1100, x: px, y: py, alpha: 1, scale: 1 }
          ]
        }));
      }
    }

    // 顶部等式
    var eqDelay = total * 50 + 1000;
    engine.addDynamicText(a + ' × ' + b + ' = ' + total, W / 2, equationY, eqDelay,
      { size: 28, color: COLORS.primary });

    // 说明文字
    engine.addDynamicText(a + ' 行 × ' + b + ' 列 = ' + total + ' 个', W / 2, H - 30, eqDelay + 300,
      { size: 16, color: COLORS.textDim });
  }

  /**
   * 除法场景：a ÷ b = c
   * 演示：a 个方块先整体出现，然后按颜色分成 b 组，每组 c 个，组间分开排列
   */
  function buildDivideScene(engine, a, b) {
    var W = engine.canvas.width;
    var H = engine.canvas.height;
    var c = a / b;
    var gap = 6;
    var equationY = 40;

    // 初始位置：a 个方块在一个网格中
    var initMaxPerRow = a <= 10 ? a : 10;
    var initBlockSize = calcBlockSize(a, initMaxPerRow, W - 80, gap);

    // 最终位置：b 组，每组 c 个，组间有间隔（每组一行）
    var finalMaxPerRow = c;
    var finalBlockSize = calcBlockSize(c, finalMaxPerRow, W - 100, gap);
    var maxBlockH = Math.floor((H - 120) / b) - gap - 8;
    finalBlockSize = Math.min(finalBlockSize, maxBlockH);

    // 使用相同的 blockSize（取较小）
    var blockSize = Math.min(initBlockSize, finalBlockSize);
    blockSize = clamp(blockSize, 16, 36);

    // 初始网格位置
    var initGridHeight = Math.ceil(a / initMaxPerRow) * (blockSize + gap);
    var initStartY = (H - initGridHeight) / 2 + 30;
    var initPositions = gridPositions(a, initMaxPerRow, blockSize, gap, W / 2, initStartY);

    // 最终分组位置（每组一行，垂直排列）
    var finalPositions = [];
    var finalGridHeight = b * blockSize + (b - 1) * (gap + 12);
    var finalStartY = (H - finalGridHeight) / 2 + 30;
    for (var g = 0; g < b; g++) {
      var groupY = finalStartY + g * (blockSize + gap + 12);
      var groupWidth = c * blockSize + (c - 1) * gap;
      var groupStartX = (W - groupWidth) / 2;
      for (var k = 0; k < c; k++) {
        finalPositions.push({
          x: groupStartX + k * (blockSize + gap),
          y: groupY
        });
      }
    }

    // 计算最大滑动结束时间
    var maxSlideEnd = 0;
    for (var i = 0; i < a; i++) {
      var groupIdx = Math.floor(i / c);
      var color = COLORS.groups[groupIdx % COLORS.groups.length];
      var initP = initPositions[i];
      var finalP = finalPositions[i];
      var delay = i * 40;
      var slideDelay = 1400 + (i % c) * 60;
      var slideEnd = slideDelay + 700;
      if (slideEnd > maxSlideEnd) maxSlideEnd = slideEnd;

      engine.addBlock(makeBlock({
        color: COLORS.primary,
        size: blockSize,
        keyframes: [
          // 阶段 1: 从上方落下到初始位置
          { t: delay, x: initP.x, y: -50, alpha: 0, scale: 0.5 },
          { t: delay + 400, x: initP.x, y: initP.y, alpha: 1, scale: 1 },
          // 阶段 2: 滑动到最终分组位置
          { t: slideDelay, x: initP.x, y: initP.y, alpha: 1, scale: 1 },
          { t: slideDelay + 700, x: finalP.x, y: finalP.y, alpha: 1, scale: 1 },
          // 末尾脉冲
          { t: maxSlideEnd + 300, x: finalP.x, y: finalP.y, alpha: 1, scale: 1 },
          { t: maxSlideEnd + 450, x: finalP.x, y: finalP.y, alpha: 1, scale: 1.15 },
          { t: maxSlideEnd + 600, x: finalP.x, y: finalP.y, alpha: 1, scale: 1 }
        ],
        colorChangeAt: 1200,
        newColor: color
      }));
    }

    // 顶部等式
    var eqDelay = maxSlideEnd + 700;
    engine.addDynamicText(a + ' ÷ ' + b + ' = ' + c, W / 2, equationY, eqDelay,
      { size: 28, color: COLORS.primary });

    // 说明文字
    engine.addDynamicText(b + ' 组，每组 ' + c + ' 个', W / 2, H - 30, eqDelay + 300,
      { size: 16, color: COLORS.textDim });
  }

  /**
   * 混合运算场景：a op1 b op2 c
   * 演示：分两步显示计算过程，并用方块演示最终结果
   */
  function buildMixedScene(engine, a, op1, b, op2, c) {
    var W = engine.canvas.width;
    var H = engine.canvas.height;
    var intermediate = computeOp(a, op1, b);
    var final = computeOp(intermediate, op2, c);

    var gap = 6;

    // 顶部完整等式
    var eqText = a + ' ' + OP_SYMBOLS[op1] + ' ' + b + ' ' + OP_SYMBOLS[op2] + ' ' + c + ' = ' + final;
    engine.addDynamicText(eqText, W / 2, 40, 0, { size: 22, color: COLORS.primary });

    // 步骤 1 文字
    var step1Text = '① ' + a + ' ' + OP_SYMBOLS[op1] + ' ' + b + ' = ' + intermediate;
    engine.addDynamicText(step1Text, W / 2, 90, 500,
      { size: 18, color: COLORS.secondary });

    // 步骤 2 文字
    var step2Text = '② ' + intermediate + ' ' + OP_SYMBOLS[op2] + ' ' + c + ' = ' + final;
    engine.addDynamicText(step2Text, W / 2, 130, 1500,
      { size: 18, color: COLORS.accent });

    // 用方块演示最终结果（从中心散开出现）
    var maxPerRow = final <= 0 ? 1 : Math.min(final, 10);
    var blockSize = calcBlockSize(Math.max(final, 1), maxPerRow, W - 80, gap);
    // 考虑文字占用空间，blocks area 从 y=180 开始
    var availH = H - 200;
    var rowsNeeded = Math.max(1, Math.ceil(final / maxPerRow));
    var maxBlockH = Math.floor(availH / rowsNeeded) - gap;
    blockSize = Math.min(blockSize, maxBlockH);
    blockSize = clamp(blockSize, 16, 36);

    var gridStartY = 180 + (availH - rowsNeeded * (blockSize + gap)) / 2;
    var positions = gridPositions(Math.max(final, 1), maxPerRow, blockSize, gap, W / 2, gridStartY);

    var blockDelay = 2500;
    var perBlockDelay = 50;

    if (final === 0) {
      engine.addDynamicText(t('arithmetic_final_zero', '最终结果为 0'), W / 2, H / 2 + 30, blockDelay,
        { size: 24, color: COLORS.success });
    } else {
      var centerX = W / 2;
      var centerY = gridStartY + (rowsNeeded * (blockSize + gap)) / 2;
      for (var i = 0; i < final; i++) {
        var px = positions[i].x;
        var py = positions[i].y;
        var delay = blockDelay + i * perBlockDelay;
        engine.addBlock(makeBlock({
          color: COLORS.success,
          size: blockSize,
          keyframes: [
            { t: delay, x: centerX, y: centerY, alpha: 0, scale: 0 },
            { t: delay + 400, x: px, y: py, alpha: 1, scale: 1 },
            // 末尾脉冲
            { t: blockDelay + final * perBlockDelay + 600, x: px, y: py, alpha: 1, scale: 1 },
            { t: blockDelay + final * perBlockDelay + 750, x: px, y: py, alpha: 1, scale: 1.15 },
            { t: blockDelay + final * perBlockDelay + 900, x: px, y: py, alpha: 1, scale: 1 }
          ]
        }));
      }
    }

    // 最终答案文字
    var answerDelay = blockDelay + final * perBlockDelay + 1000;
    engine.addDynamicText(window.i18n ? (window.i18n.t('arithmetic_final_answer', { n: final }) || ('最终答案：' + final)) : ('最终答案：' + final), W / 2, H - 25, answerDelay,
      { size: 16, color: COLORS.success });
  }

  // ============================================================
  // 输入验证 / Input Validation
  // ============================================================

  /**
   * 显示错误信息
   * @param {HTMLElement} errorEl - 错误提示元素
   * @param {string} msg - 错误信息（已本地化）
   */
  function showError(errorEl, msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  /**
   * 隐藏错误信息
   */
  function hideError(errorEl) {
    if (!errorEl) return;
    errorEl.style.display = 'none';
  }

  /**
   * 获取 i18n 翻译（兼容 i18n 未加载的情况）
   */
  function t(key, fallback) {
    if (typeof window.i18n === 'object' && window.i18n && typeof window.i18n.t === 'function') {
      var v = window.i18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback != null ? fallback : key;
  }

  /**
   * 验证四则运算输入
   * @returns {{ok: boolean, msg?: string, a?: number, b?: number}}
   */
  function validateArithmetic(op, aRaw, bRaw) {
    var a = parseInt(aRaw, 10);
    var b = parseInt(bRaw, 10);

    if (isNaN(a) || isNaN(b)) {
      return { ok: false, msg: t('arithmetic_error_input', '请输入有效数字') };
    }

    switch (op) {
      case 'add':
        if (a < LIMITS.addSub.min || a > LIMITS.addSub.max ||
            b < LIMITS.addSub.min || b > LIMITS.addSub.max) {
          return { ok: false, msg: t('arithmetic_error_range_add', '数字范围：0 ~ 30') };
        }
        break;
      case 'subtract':
        if (a < LIMITS.addSub.min || a > LIMITS.addSub.max ||
            b < LIMITS.addSub.min || b > LIMITS.addSub.max) {
          return { ok: false, msg: t('arithmetic_error_range_add', '数字范围：0 ~ 30') };
        }
        if (a < b) {
          return { ok: false, msg: t('arithmetic_error_sub', '被减数不能小于减数') };
        }
        break;
      case 'multiply':
        if (a < LIMITS.mul.min || a > LIMITS.mul.max ||
            b < LIMITS.mul.min || b > LIMITS.mul.max) {
          return { ok: false, msg: t('arithmetic_error_range_mul', '数字范围：1 ~ 12') };
        }
        break;
      case 'divide':
        if (b === 0) {
          return { ok: false, msg: t('arithmetic_error_div_zero', '除数不能为 0') };
        }
        if (a < LIMITS.div.min || a > LIMITS.div.max ||
            b < LIMITS.div.min || b > LIMITS.div.max) {
          return { ok: false, msg: t('arithmetic_error_range_div', '数字范围：1 ~ 30') };
        }
        if (a % b !== 0) {
          return { ok: false, msg: t('arithmetic_error_div', '除法必须能整除') };
        }
        break;
      default:
        return { ok: false, msg: t('arithmetic_error_input', '请输入有效数字') };
    }

    return { ok: true, a: a, b: b };
  }

  /**
   * 验证混合运算输入
   * @returns {{ok: boolean, msg?: string, a?, b?, c?, op1?, op2?}}
   */
  function validateMixed(aRaw, op1, bRaw, op2, cRaw) {
    var a = parseInt(aRaw, 10);
    var b = parseInt(bRaw, 10);
    var c = parseInt(cRaw, 10);

    if (isNaN(a) || isNaN(b) || isNaN(c)) {
      return { ok: false, msg: t('arithmetic_error_input', '请输入有效数字') };
    }

    var lo = LIMITS.mixed.min;
    var hi = LIMITS.mixed.max;
    if (a < lo || a > hi || b < lo || b > hi || c < lo || c > hi) {
      return { ok: false, msg: t('arithmetic_error_range_mixed', '数字范围：0 ~ 20') };
    }

    // 验证第一步
    if (op1 === 'subtract' && a < b) {
      return { ok: false, msg: t('arithmetic_error_sub', '被减数不能小于减数') };
    }
    if (op1 === 'divide') {
      if (b === 0) {
        return { ok: false, msg: t('arithmetic_error_div_zero', '除数不能为 0') };
      }
      if (a % b !== 0) {
        return { ok: false, msg: t('arithmetic_error_div', '除法必须能整除') };
      }
    }

    var intermediate = computeOp(a, op1, b);
    if (intermediate < 0) {
      return { ok: false, msg: t('mixed_error_intermediate', '中间结果不能为负数') };
    }

    // 验证第二步
    if (op2 === 'subtract' && intermediate < c) {
      return { ok: false, msg: t('mixed_error_sub', '第二步被减数不能小于减数') };
    }
    if (op2 === 'divide') {
      if (c === 0) {
        return { ok: false, msg: t('arithmetic_error_div_zero', '除数不能为 0') };
      }
      if (intermediate % c !== 0) {
        return { ok: false, msg: t('arithmetic_error_div', '除法必须能整除') };
      }
    }

    var final = computeOp(intermediate, op2, c);
    if (final < 0) {
      return { ok: false, msg: t('mixed_error_final', '最终结果不能为负数') };
    }
    if (final > 50) {
      return { ok: false, msg: t('mixed_error_too_large', '最终结果过大（最大 50）') };
    }

    return { ok: true, a: a, b: b, c: c, op1: op1, op2: op2 };
  }

  // ============================================================
  // 四则运算页 DOM 引用 / Arithmetic Page DOM References
  // ============================================================

  let els = {};
  let engine = null;
  let isPlaying = false;

  function cacheElements() {
    els = {
      page: document.getElementById('arithmetic-page'),
      tabs: document.getElementById('arithmetic-tabs'),
      tabButtons: document.querySelectorAll('#arithmetic-tabs .arithmetic-tab'),
      canvas: document.getElementById('arithmetic-canvas'),
      inputA: document.getElementById('arithmetic-input-a'),
      inputB: document.getElementById('arithmetic-input-b'),
      opDisplay: document.getElementById('arithmetic-op-display'),
      demoBtn: document.getElementById('arithmetic-demo'),
      hint: document.getElementById('arithmetic-hint'),
      error: document.getElementById('arithmetic-error')
    };
  }

  /**
   * 更新运算符显示和提示文字
   */
  function updateOpDisplay() {
    var op = currentOp;
    if (els.opDisplay) {
      els.opDisplay.textContent = OP_SYMBOLS[op];
    }
    if (els.hint) {
      var hintKey = 'arithmetic_hint_' + op;
      var fallback = {
        add: '加法：a 个方块 + b 个方块合并',
        subtract: '减法：从 a 个方块中移除 b 个',
        multiply: '乘法：a 行 b 列的方块阵列',
        divide: '除法：a 个方块分成 b 组'
      };
      els.hint.textContent = t(hintKey, fallback[op] || '');
    }
  }

  // 当前选中的运算
  let currentOp = 'add';

  /**
   * 切换运算类型
   */
  function switchOperation(op) {
    if (currentOp === op) return;
    currentOp = op;

    if (els.tabButtons) {
      for (var i = 0; i < els.tabButtons.length; i++) {
        var btn = els.tabButtons[i];
        if (btn.getAttribute('data-op') === op) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    }

    updateOpDisplay();
    hideError(els.error);
    // 切换运算时清空 canvas 显示等待提示
    if (engine && !isPlaying) {
      engine.drawIdle(t('arithmetic_status_ready', '点击"演示"按钮开始动画'));
    }
  }

  /**
   * 播放四则运算动画
   */
  function playArithmetic() {
    if (isPlaying || !engine) return;

    var result = validateArithmetic(currentOp, els.inputA.value, els.inputB.value);
    if (!result.ok) {
      showError(els.error, result.msg);
      return;
    }
    hideError(els.error);

    engine.reset();
    switch (currentOp) {
      case 'add': buildAddScene(engine, result.a, result.b); break;
      case 'subtract': buildSubtractScene(engine, result.a, result.b); break;
      case 'multiply': buildMultiplyScene(engine, result.a, result.b); break;
      case 'divide': buildDivideScene(engine, result.a, result.b); break;
    }

    isPlaying = true;
    if (els.demoBtn) {
      els.demoBtn.disabled = true;
      els.demoBtn.classList.add('disabled');
    }
    engine.play(function () {
      isPlaying = false;
      if (els.demoBtn) {
        els.demoBtn.disabled = false;
        els.demoBtn.classList.remove('disabled');
      }
    });
  }

  // ============================================================
  // 四则运算页事件绑定 / Arithmetic Page Event Binding
  // ============================================================

  function bindEvents() {
    if (els.tabs) {
      els.tabs.addEventListener('click', function (e) {
        var target = e.target;
        while (target && target !== els.tabs) {
          if (target.classList && target.classList.contains('arithmetic-tab')) {
            var op = target.getAttribute('data-op');
            if (op) switchOperation(op);
            return;
          }
          target = target.parentNode;
        }
      });
    }

    if (els.demoBtn) {
      els.demoBtn.addEventListener('click', playArithmetic);
    }

    // 回车触发演示
    function enterHandler(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        playArithmetic();
      }
    }
    if (els.inputA) els.inputA.addEventListener('keydown', enterHandler);
    if (els.inputB) els.inputB.addEventListener('keydown', enterHandler);

    var backBtn = document.getElementById('btn-back-to-learning');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (engine) engine.stop();
        if (typeof window.showLearningLanding === 'function') {
          window.showLearningLanding();
        }
      });
    }
  }

  // ============================================================
  // 四则运算页初始化 / Arithmetic Page Init
  // ============================================================

  function init() {
    cacheElements();

    if (!els.page) {
      console.warn('[MathCards] arithmetic-page not found');
      return;
    }

    // 创建动画引擎
    if (els.canvas && !engine) {
      engine = new AnimationEngine(els.canvas);
    }

    // 如果已经绑定过事件，不重复绑定
    if (!els.page.dataset.mathCardsBound) {
      bindEvents();
      els.page.dataset.mathCardsBound = '1';
    }

    // 重置状态
    if (engine) {
      engine.reset();
      isPlaying = false;
      engine.drawIdle(t('arithmetic_status_ready', '点击"演示"按钮开始动画'));
    }

    if (els.demoBtn) {
      els.demoBtn.disabled = false;
      els.demoBtn.classList.remove('disabled');
    }

    updateOpDisplay();
  }

  // ============================================================
  // 混合运算页 / Mixed Arithmetic Page
  // ============================================================

  let mixedEls = {};
  let mixedEngine = null;
  let mixedIsPlaying = false;

  function cacheMixedElements() {
    mixedEls = {
      page: document.getElementById('mixed-arithmetic-page'),
      canvas: document.getElementById('mixed-arithmetic-canvas'),
      inputA: document.getElementById('mixed-input-a'),
      inputB: document.getElementById('mixed-input-b'),
      inputC: document.getElementById('mixed-input-c'),
      op1: document.getElementById('mixed-op1'),
      op2: document.getElementById('mixed-op2'),
      demoBtn: document.getElementById('mixed-demo'),
      error: document.getElementById('mixed-error')
    };
  }

  /**
   * 更新混合运算的运算符显示
   */
  function updateMixedOpDisplay() {
    // 更新 select 的可见选项文字（保留 value）
    if (mixedEls.op1 && mixedEls.op1.options) {
      for (var i = 0; i < mixedEls.op1.options.length; i++) {
        var opVal = mixedEls.op1.options[i].value;
        mixedEls.op1.options[i].textContent = OP_SYMBOLS[opVal] || opVal;
      }
    }
    if (mixedEls.op2 && mixedEls.op2.options) {
      for (var j = 0; j < mixedEls.op2.options.length; j++) {
        var opVal2 = mixedEls.op2.options[j].value;
        mixedEls.op2.options[j].textContent = OP_SYMBOLS[opVal2] || opVal2;
      }
    }
  }

  /**
   * 播放混合运算动画
   */
  function playMixed() {
    if (mixedIsPlaying || !mixedEngine) return;

    var op1 = mixedEls.op1 ? mixedEls.op1.value : 'add';
    var op2 = mixedEls.op2 ? mixedEls.op2.value : 'subtract';

    var result = validateMixed(
      mixedEls.inputA.value, op1, mixedEls.inputB.value, op2, mixedEls.inputC.value
    );
    if (!result.ok) {
      showError(mixedEls.error, result.msg);
      return;
    }
    hideError(mixedEls.error);

    mixedEngine.reset();
    buildMixedScene(mixedEngine, result.a, result.op1, result.b, result.op2, result.c);

    mixedIsPlaying = true;
    if (mixedEls.demoBtn) {
      mixedEls.demoBtn.disabled = true;
      mixedEls.demoBtn.classList.add('disabled');
    }
    mixedEngine.play(function () {
      mixedIsPlaying = false;
      if (mixedEls.demoBtn) {
        mixedEls.demoBtn.disabled = false;
        mixedEls.demoBtn.classList.remove('disabled');
      }
    });
  }

  function bindMixedEvents() {
    if (mixedEls.demoBtn) {
      mixedEls.demoBtn.addEventListener('click', playMixed);
    }

    function enterHandler(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        playMixed();
      }
    }
    if (mixedEls.inputA) mixedEls.inputA.addEventListener('keydown', enterHandler);
    if (mixedEls.inputB) mixedEls.inputB.addEventListener('keydown', enterHandler);
    if (mixedEls.inputC) mixedEls.inputC.addEventListener('keydown', enterHandler);

    var backBtn = document.getElementById('btn-back-to-learning-mixed');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (mixedEngine) mixedEngine.stop();
        if (typeof window.showLearningLanding === 'function') {
          window.showLearningLanding();
        }
      });
    }
  }

  function initMixed() {
    cacheMixedElements();

    if (!mixedEls.page) {
      console.warn('[MathCards] mixed-arithmetic-page not found');
      return;
    }

    if (mixedEls.canvas && !mixedEngine) {
      mixedEngine = new AnimationEngine(mixedEls.canvas);
    }

    if (!mixedEls.page.dataset.mathCardsBound) {
      bindMixedEvents();
      mixedEls.page.dataset.mathCardsBound = '1';
    }

    if (mixedEngine) {
      mixedEngine.reset();
      mixedIsPlaying = false;
      mixedEngine.drawIdle(t('mixed_status_ready', '点击"演示"按钮开始动画'));
    }

    if (mixedEls.demoBtn) {
      mixedEls.demoBtn.disabled = false;
      mixedEls.demoBtn.classList.remove('disabled');
    }

    updateMixedOpDisplay();
  }

  // ============================================================
  // 暴露到全局 / Expose to global
  // ============================================================
  window.MathCards = {
    init: init,
    initMixed: initMixed,
    OP_SYMBOLS: OP_SYMBOLS,
    // 保留兼容接口（不再使用关卡机制，但保持 API 形状以兼容外部调用）
    switchOperation: switchOperation,
    playArithmetic: playArithmetic,
    playMixed: playMixed
  };
})();
