/**
 * function-plotter.js
 * 函数系统 / Function Plotter
 * 平面直角坐标系 + 函数图像绘制
 *
 * 功能：
 *   - 网格 + 坐标轴 + 刻度数字
 *   - 鼠标拖拽平移
 *   - 滚轮缩放（以鼠标位置为中心）
 *   - +/- 按钮缩放
 *   - 多函数叠加（不同颜色）
 *   - 支持 y=表达式 和 f(x)=表达式 格式
 *   - 支持 sin/cos/tan/log/sqrt/abs/exp + ^ 幂运算
 */
(function () {
  'use strict';

  // 调色板（像素风）
  const PLOT_COLORS = [
    '#ffd700', // 金色（主色）
    '#1e90ff', // 水蓝
    '#ff4500', // 火红
    '#228b22', // 树叶绿
    '#9370db', // 紫色
    '#ff69b4', // 粉色
    '#00ffff', // 青色
    '#ffffff'  // 白色
  ];

  class FunctionPlotter {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.originX = 0;  // 原点像素坐标（相对 canvas 左上）
      this.originY = 0;
      this.scale = 40;   // 单位长度像素数
      this.functions = [];  // [{ expr, fn, color, input, ast }]
      this.params = {};  // 参数值 { a: 1, b: 2, ... }
      this.customParams = [];  // 用户手动添加的自定义参数 [{ name, value, min, max, step, phase }]
      this.dragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.colorIndex = 0;
      this._originInitialized = false;
      this.touchPinching = false;
      this.lastTouchDist = 0;
      this.lastTouchCenterX = 0;
      this.lastTouchCenterY = 0;
      this._touchRafPending = false;

      this.resize();
      this.bindEvents();
      const self = this;
      window.addEventListener('resize', function () {
        self.resize();
        self.redraw();
      });
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      const cssW = Math.max(1, rect.width);
      const cssH = Math.max(1, rect.height);
      this.canvas.width = Math.floor(cssW * dpr);
      this.canvas.height = Math.floor(cssH * dpr);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
      this.width = cssW;
      this.height = cssH;
      // 原点默认居中
      if (!this._originInitialized) {
        this.originX = this.width / 2;
        this.originY = this.height / 2;
        this._originInitialized = true;
      }
    }

    // 坐标转换：数学坐标 → 像素坐标
    toPixelX(mathX) { return this.originX + mathX * this.scale; }
    toPixelY(mathY) { return this.originY - mathY * this.scale; }
    // 像素坐标 → 数学坐标
    toMathX(px) { return (px - this.originX) / this.scale; }
    toMathY(py) { return (this.originY - py) / this.scale; }

    drawGrid() {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      const niceUnit = this.getUnitLength();

      // 次网格线（更淡）：步长 niceUnit / 5
      // 仅当次网格像素间距 >= 8px 时绘制，避免过密影响性能与视觉
      const minorUnit = niceUnit / 5;
      if (minorUnit * this.scale >= 8) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        // 垂直次网格线
        const xmStart = Math.floor(this.toMathX(0) / minorUnit) * minorUnit;
        const xmEnd = Math.ceil(this.toMathX(w) / minorUnit) * minorUnit;
        for (let x = xmStart; x <= xmEnd + minorUnit * 1e-6; x += minorUnit) {
          const px = this.toPixelX(x);
          ctx.beginPath();
          ctx.moveTo(px, 0);
          ctx.lineTo(px, h);
          ctx.stroke();
        }
        // 水平次网格线
        const ymStart = Math.floor(this.toMathY(h) / minorUnit) * minorUnit;
        const ymEnd = Math.ceil(this.toMathY(0) / minorUnit) * minorUnit;
        for (let y = ymStart; y <= ymEnd + minorUnit * 1e-6; y += minorUnit) {
          const py = this.toPixelY(y);
          ctx.beginPath();
          ctx.moveTo(0, py);
          ctx.lineTo(w, py);
          ctx.stroke();
        }
      }

      // 主网格线：步长 niceUnit（保持原有淡色风格）
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      // 垂直主网格线（沿 x 方向），加 niceUnit * 1e-6 容差防浮点漂移漏画
      const xStart = Math.floor(this.toMathX(0) / niceUnit) * niceUnit;
      const xEnd = Math.ceil(this.toMathX(w) / niceUnit) * niceUnit;
      for (let x = xStart; x <= xEnd + niceUnit * 1e-6; x += niceUnit) {
        const px = this.toPixelX(x);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, h);
        ctx.stroke();
      }
      // 水平主网格线（沿 y 方向）
      const yStart = Math.floor(this.toMathY(h) / niceUnit) * niceUnit;
      const yEnd = Math.ceil(this.toMathY(0) / niceUnit) * niceUnit;
      for (let y = yStart; y <= yEnd + niceUnit * 1e-6; y += niceUnit) {
        const py = this.toPixelY(y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(w, py);
        ctx.stroke();
      }
    }

    drawAxes() {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      // 坐标轴（白色 2px）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      // x 轴（y=0 的水平线）
      const xAxisY = this.toPixelY(0);
      if (xAxisY >= 0 && xAxisY <= h) {
        ctx.beginPath();
        ctx.moveTo(0, xAxisY);
        ctx.lineTo(w, xAxisY);
        ctx.stroke();
        // x 轴箭头
        ctx.beginPath();
        ctx.moveTo(w - 8, xAxisY - 4);
        ctx.lineTo(w, xAxisY);
        ctx.lineTo(w - 8, xAxisY + 4);
        ctx.stroke();
      }
      // y 轴（x=0 的垂直线）
      const yAxisX = this.toPixelX(0);
      if (yAxisX >= 0 && yAxisX <= w) {
        ctx.beginPath();
        ctx.moveTo(yAxisX, 0);
        ctx.lineTo(yAxisX, h);
        ctx.stroke();
        // y 轴箭头
        ctx.beginPath();
        ctx.moveTo(yAxisX - 4, 8);
        ctx.lineTo(yAxisX, 0);
        ctx.lineTo(yAxisX + 4, 8);
        ctx.stroke();
      }
      // 原点标记 "O"
      if (yAxisX >= 0 && yAxisX <= w && xAxisY >= 0 && xAxisY <= h) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('O', yAxisX - 4, xAxisY + 4);
      }
      // 刻度数字（与主网格线使用同一 niceUnit，确保对齐）
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "Courier New", monospace';
      const niceUnit = this.getUnitLength();
      // x 轴刻度
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const xStart = Math.floor(this.toMathX(0) / niceUnit) * niceUnit;
      const xEnd = Math.ceil(this.toMathX(w) / niceUnit) * niceUnit;
      let lastTickPx = -Infinity;
      for (let x = xStart; x <= xEnd + niceUnit * 1e-6; x += niceUnit) {
        // 跳过 0（原点已标 "O"），用容差判断防浮点漂移
        if (Math.abs(x) < niceUnit * 1e-6) continue;
        const px = this.toPixelX(x);
        if (px < 0 || px > w) continue;
        // 防重叠：与上一个已绘制刻度像素间距 < 30px 则跳过
        if (px - lastTickPx < 30) continue;
        const label = this.formatTickNumber(x);
        if (xAxisY >= 0 && xAxisY <= h) {
          ctx.fillText(label, px, xAxisY + 4);
        } else if (xAxisY < 0) {
          ctx.fillText(label, px, 4);
        } else {
          ctx.fillText(label, px, h - 16);
        }
        lastTickPx = px;
      }
      // y 轴刻度
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const yStart = Math.floor(this.toMathY(h) / niceUnit) * niceUnit;
      const yEnd = Math.ceil(this.toMathY(0) / niceUnit) * niceUnit;
      let lastTickPy = -Infinity;
      for (let y = yStart; y <= yEnd + niceUnit * 1e-6; y += niceUnit) {
        if (Math.abs(y) < niceUnit * 1e-6) continue;
        const py = this.toPixelY(y);
        if (py < 0 || py > h) continue;
        // 防重叠：Y 轴方向用绝对值判断（py 可能递减）
        if (Math.abs(py - lastTickPy) < 30) continue;
        const label = this.formatTickNumber(y);
        if (yAxisX >= 0 && yAxisX <= w) {
          ctx.fillText(label, yAxisX - 4, py);
        } else if (yAxisX < 0) {
          ctx.fillText(label, w - 4, py);
        } else {
          ctx.fillText(label, 36, py);
        }
        lastTickPy = py;
      }
      // 轴标签 x / y
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      if (xAxisY >= 0 && xAxisY <= h) {
        ctx.fillText('x', w - 8, xAxisY - 12);
      }
      ctx.textAlign = 'left';
      if (yAxisX >= 0 && yAxisX <= w) {
        ctx.fillText('y', yAxisX + 8, 12);
      }

      // 单位长度标识
      this.drawUnitLength(ctx, w, h, yAxisX, xAxisY);
    }

    drawUnitLength(ctx, w, h, yAxisX, xAxisY) {
      const unitLen = this.getUnitLength();
      const pxLen = this.scale * unitLen;
      // 标签格式：<niceUnit> unit = <niceUnit * scale>px，niceUnit 用 formatTickNumber 格式化
      const label = this.formatTickNumber(unitLen) + ' unit = ' + this.formatTickNumber(pxLen) + 'px';

      ctx.strokeStyle = '#ffd700';
      ctx.fillStyle = '#ffd700';
      ctx.lineWidth = 2;

      if (xAxisY >= 0 && xAxisY <= h && yAxisX + pxLen + 40 < w) {
        var sx = yAxisX + 10;
        var sy = xAxisY - 12;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + pxLen, sy);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3);
        ctx.lineTo(sx, sy + 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx + pxLen, sy - 3);
        ctx.lineTo(sx + pxLen, sy + 3);
        ctx.stroke();
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, sx + pxLen / 2, sy - 4);
      }

      if (yAxisX >= 0 && yAxisX <= w && xAxisY - pxLen - 30 > 0) {
        var sx2 = yAxisX - 12;
        var sy2 = xAxisY - 10;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2);
        ctx.lineTo(sx2, sy2 - pxLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx2 - 3, sy2);
        ctx.lineTo(sx2 + 3, sy2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx2 - 3, sy2 - pxLen);
        ctx.lineTo(sx2 + 3, sy2 - pxLen);
        ctx.stroke();
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, sx2 + 6, sy2 - pxLen / 2);
      }
    }

    getUnitLength() {
      const targetPixels = 60;
      const rawUnits = targetPixels / this.scale;
      // 扩展的 1-2-5 序列，覆盖 1e-9 到 1e9 全范围，支持无限缩放
      const magnitudes = [
        1e-9, 5e-9, 1e-8, 5e-8, 1e-7, 5e-7, 1e-6, 5e-6, 1e-5, 5e-5,
        1e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5,
        1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000,
        20000, 50000, 100000, 5e5, 1e6, 5e6, 1e7, 5e7, 1e8, 5e8, 1e9
      ];
      let best = magnitudes[0];
      let minDiff = Math.abs(rawUnits - best);
      for (let i = 1; i < magnitudes.length; i++) {
        const diff = Math.abs(rawUnits - magnitudes[i]);
        if (diff < minDiff) {
          minDiff = diff;
          best = magnitudes[i];
        }
      }
      return best;
    }

    // 格式化刻度数字：整数原样显示，小数最多 3 位去尾零，过大/过小用科学计数法
    formatTickNumber(value) {
      if (value === 0) return '0';
      // 清理浮点累加噪声（如 1.5000000000000001e-4 -> 1.5e-4），12 位有效数字足够且不丢真值
      value = Number(value.toPrecision(12));
      const abs = Math.abs(value);
      // |value| >= 10000 或 0 < |value| < 0.001 时用科学计数法
      if (abs >= 10000 || abs < 0.001) {
        // toExponential 返回 "1e+4" / "1e-4"，统一为 "1e4" / "1e-4"
        return value.toExponential().replace('e+', 'e');
      }
      // 整数直接转字符串
      if (Number.isInteger(value)) return String(value);
      // 小数最多 3 位，去掉尾零
      let s = value.toFixed(3);
      s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    }

    plotFunction(fn, color) {
      const ctx = this.ctx;
      const w = this.width, h = this.height;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      let lastY = null;
      const params = this.params;
      for (let px = 0; px <= w; px += 1) {
        const mathX = this.toMathX(px);
        let mathY;
        try {
          mathY = fn(mathX, params);
        } catch (e) {
          started = false;
          continue;
        }
        if (!isFinite(mathY)) {
          started = false;
          continue;
        }
        const py = this.toPixelY(mathY);
        // 防止函数值过大导致线段跨越整个画面（如 tan 在 π/2 附近）
        if (lastY !== null && Math.abs(py - lastY) > h) {
          started = false;
        }
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
        lastY = py;
      }
      ctx.stroke();
    }

    redraw() {
      const ctx = this.ctx;
      // 清空（深空背景）
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.width, this.height);
      this.drawGrid();
      this.drawAxes();
      // 绘制所有函数
      for (let i = 0; i < this.functions.length; i++) {
        this.plotFunction(this.functions[i].fn, this.functions[i].color);
      }
    }

    // 解析函数输入
    // 支持 y=表达式 或 f(x)=表达式
    parseFunction(input) {
      let expr = (input || '').trim();
      if (!expr) return { ok: false, error: i18n.t('func_empty_input') };
      // 去除 y= 或 f(x)= 前缀
      expr = expr.replace(/^y\s*=\s*/i, '');
      expr = expr.replace(/^f\s*\(\s*x\s*\)\s*=\s*/i, '');
      if (!expr) return { ok: false, error: i18n.t('func_empty_expr') };
      // 使用安全的表达式解析器
      const parseResult = window.ExpressionParser.parse(expr);
      if (!parseResult.ok) {
        return { ok: false, error: i18n.t('func_parse_error', { msg: parseResult.error }) };
      }
      // 测试求值（为识别到但未定义的参数提供临时默认值 1，避免因参数未定义而拒绝添加函数）
      // 这样含参数的函数（如 y=a*x^2+b*x+c 或隐式乘法 y=ax^2+bx+c）能成功添加，
      // 随后由 addFromInput 中的多参数弹窗逻辑提示用户创建参数滑动条
      try {
        const tempParams = {};
        // 合并当前已有的 params（用户已创建的参数值优先）
        if (this.params) {
          for (const key in this.params) {
            if (this.params.hasOwnProperty(key)) tempParams[key] = this.params[key];
          }
        }
        // 为表达式中识别到但未定义的参数提供临时默认值 1
        if (window.ExpressionParser && window.ExpressionParser.extractParams) {
          const paramNames = window.ExpressionParser.extractParams(parseResult.ast);
          for (let k = 0; k < paramNames.length; k++) {
            if (!tempParams.hasOwnProperty(paramNames[k])) {
              tempParams[paramNames[k]] = 1;
            }
          }
        }
        const testVal = window.ExpressionParser.evalAst(parseResult.ast, 1, tempParams);
        if (typeof testVal !== 'number') return { ok: false, error: i18n.t('func_not_number') };
      } catch (e) {
        return { ok: false, error: i18n.t('func_parse_error', { msg: e.message }) };
      }
      // 创建求值函数
      const fn = window.ExpressionParser.createEvaluator(parseResult.ast);
      return { ok: true, fn: fn, expr: expr, ast: parseResult.ast };
    }

    addFunction(input) {
      const result = this.parseFunction(input);
      if (!result.ok) return { ok: false, error: result.error };
      const color = PLOT_COLORS[this.colorIndex % PLOT_COLORS.length];
      this.colorIndex++;
      this.functions.push({
        input: input.trim(),
        expr: result.expr,
        fn: result.fn,
        color: color,
        ast: result.ast
      });
      this.redraw();
      return { ok: true, color: color, expr: result.expr, ast: result.ast };
    }

    removeFunction(index) {
      if (index < 0 || index >= this.functions.length) return;
      this.functions.splice(index, 1);
      this.colorIndex = Math.max(0, this.colorIndex - 1);
      this.redraw();
    }

    clearFunctions() {
      this.functions = [];
      this.colorIndex = 0;
      this.redraw();
    }

    setParams(params) {
      this.params = params || {};
      this.redraw();
    }

    getAllParams() {
      const paramSet = {};
      for (let i = 0; i < this.functions.length; i++) {
        const ast = this.functions[i].ast;
        if (ast && window.ExpressionParser && window.ExpressionParser.extractParams) {
          const params = window.ExpressionParser.extractParams(ast);
          for (let j = 0; j < params.length; j++) {
            paramSet[params[j]] = true;
          }
        }
      }
      return Object.keys(paramSet).sort();
    }

    bindEvents() {
      const self = this;
      // 鼠标拖拽平移
      this.canvas.addEventListener('mousedown', function (e) {
        self.dragging = true;
        self.lastMouseX = e.clientX;
        self.lastMouseY = e.clientY;
      });
      window.addEventListener('mousemove', function (e) {
        if (!self.dragging) return;
        const dx = e.clientX - self.lastMouseX;
        const dy = e.clientY - self.lastMouseY;
        self.originX += dx;
        self.originY += dy;
        self.lastMouseX = e.clientX;
        self.lastMouseY = e.clientY;
        self.redraw();
      });
      window.addEventListener('mouseup', function () {
        self.dragging = false;
      });
      // 滚轮缩放（以鼠标位置为中心）
      this.canvas.addEventListener('wheel', function (e) {
        e.preventDefault();
        const rect = self.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const mathX = self.toMathX(mx);
        const mathY = self.toMathY(my);
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        self.scale = Math.max(1e-9, Math.min(1e9, self.scale * factor));
        self.originX = mx - mathX * self.scale;
        self.originY = my + mathY * self.scale;
        self.redraw();
      });

      // 触摸事件：单指拖拽平移，双指捏合缩放
      this.canvas.addEventListener('touchstart', function (e) {
        e.preventDefault();
        if (e.touches.length === 1) {
          self.dragging = true;
          self.touchPinching = false;
          self.lastMouseX = e.touches[0].clientX;
          self.lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
          self.dragging = false;
          self.touchPinching = true;
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          self.lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          self.lastTouchCenterX = (t1.clientX + t2.clientX) / 2;
          self.lastTouchCenterY = (t1.clientY + t2.clientY) / 2;
        }
      }, { passive: false });

      this.canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
        if (self._touchRafPending) return;
        self._touchRafPending = true;
        requestAnimationFrame(function () {
          self._touchRafPending = false;
          if (!self.canvas) return;

          if (self.dragging && e.touches.length === 1) {
            const dx = e.touches[0].clientX - self.lastMouseX;
            const dy = e.touches[0].clientY - self.lastMouseY;
            self.originX += dx;
            self.originY += dy;
            self.lastMouseX = e.touches[0].clientX;
            self.lastMouseY = e.touches[0].clientY;
            self.redraw();
          } else if (self.touchPinching && e.touches.length === 2) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const centerX = (t1.clientX + t2.clientX) / 2;
            const centerY = (t1.clientY + t2.clientY) / 2;

            if (self.lastTouchDist > 0 && dist > 0) {
              const rect = self.canvas.getBoundingClientRect();
              const cx = self.lastTouchCenterX - rect.left;
              const cy = self.lastTouchCenterY - rect.top;
              const mathX = self.toMathX(cx);
              const mathY = self.toMathY(cy);

              const factor = dist / self.lastTouchDist;
              self.scale = Math.max(1e-9, Math.min(1e9, self.scale * factor));

              const newCx = centerX - rect.left;
              const newCy = centerY - rect.top;
              self.originX = newCx - mathX * self.scale;
              self.originY = newCy + mathY * self.scale;

              const dx = centerX - self.lastTouchCenterX;
              const dy = centerY - self.lastTouchCenterY;
              self.originX += dx;
              self.originY += dy;

              self.redraw();
            }

            self.lastTouchDist = dist;
            self.lastTouchCenterX = centerX;
            self.lastTouchCenterY = centerY;
          }
        });
      }, { passive: false });

      this.canvas.addEventListener('touchend', function (e) {
        e.preventDefault();
        if (e.touches.length === 0) {
          self.dragging = false;
          self.touchPinching = false;
          self.lastTouchDist = 0;
        } else if (e.touches.length === 1) {
          self.touchPinching = false;
          self.lastTouchDist = 0;
          self.dragging = true;
          self.lastMouseX = e.touches[0].clientX;
          self.lastMouseY = e.touches[0].clientY;
        }
      }, { passive: false });

      this.canvas.addEventListener('touchcancel', function () {
        self.dragging = false;
        self.touchPinching = false;
        self.lastTouchDist = 0;
      });
    }

    zoomByButton(factor) {
      // 以 canvas 中心为缩放中心，factor > 1 放大, factor < 1 缩小
      const cx = this.width / 2;
      const cy = this.height / 2;
      const mathX = this.toMathX(cx);
      const mathY = this.toMathY(cy);
      this.scale = Math.max(1e-9, Math.min(1e9, this.scale * factor));
      this.originX = cx - mathX * this.scale;
      this.originY = cy + mathY * this.scale;
      this.redraw();
    }
  }

  // 暴露到全局
  window.FunctionPlotter = FunctionPlotter;
})();
