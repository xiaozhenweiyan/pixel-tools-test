/**
 * math-cards-ext.js
 * 数学学习卡片扩展模块 - 分数/小数/方程/几何/速算挑战
 *
 * 功能：
 *   - 分数学习卡片：分数加减乘除、约分、通分动画演示（纯学习）
 *   - 小数学习卡片：小数运算、与分数互转动画演示（纯学习）
 *   - 方程学习卡片：一元一次/二次方程求解分步演示（天平动画）
 *   - 几何学习卡片：面积/周长/体积公式 + 互动图形
 *   - 速算挑战：60秒限时答题，本地排行榜（localStorage）
 *
 * 暴露到全局：window.MathCardsExt
 *   - initFraction(canvas)
 *   - initDecimal(canvas)
 *   - initEquation(canvas)
 *   - initGeometry(canvas)
 *   - initSpeedChallenge(canvas, scoreList)
 */
window.MathCardsExt = (function () {
  'use strict';

  // ============================================================
  // 颜色常量 / Color Constants（与网站一致）
  // ============================================================
  const COLORS = {
    bgDeep: '#1a1a2e',   // 背景
    bgPanel: '#2d2d44',  // 面板
    accent: '#ffd700',   // 强调色（金）
    text: '#ffffff',     // 主文字
    textDim: '#aaaaaa',  // 次要文字
    brown: '#8b4513',    // 棕
    blue: '#1e90ff',     // 蓝
    green: '#228b22',    // 绿
    red: '#ff4500'       // 红
  };

  // Canvas 内部分辨率
  const CANVAS_W = 720;
  const CANVAS_H = 420;

  // 本地排行榜存储键
  const LB_KEY = 'mathCardsExt_speedChallenge_lb';

  // ============================================================
  // 工具函数 / Utility Functions
  // ============================================================

  // 最大公约数
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }

  // 最小公倍数
  function lcm(a, b) {
    return Math.abs(a * b) / gcd(a, b);
  }

  // 缓动函数
  function easeOutCubic(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // ============================================================
  // UI 控件构建 / UI Controls Builder
  // ============================================================

  /**
   * 在 canvas 上方创建控件面板
   */
  function createPanel(canvas) {
    const container = canvas.parentElement;
    // 防止重复创建
    const existing = container.querySelector('.mce-panel');
    if (existing) return existing;
    const panel = document.createElement('div');
    panel.className = 'mce-panel';
    panel.style.cssText = [
      'width: 100%',
      'margin-bottom: 8px',
      'padding: 8px 10px',
      'background: ' + COLORS.bgPanel,
      'border: 2px solid ' + COLORS.accent,
      'border-radius: 4px',
      'display: flex',
      'flex-wrap: wrap',
      'gap: 8px',
      'align-items: center',
      'font-family: monospace',
      'color: ' + COLORS.text,
      'box-sizing: border-box'
    ].join(';');
    container.insertBefore(panel, canvas);
    return panel;
  }

  // 创建输入框
  function createInput(parent, opts) {
    opts = opts || {};
    const input = document.createElement('input');
    input.type = opts.type || 'text';
    input.value = opts.value != null ? opts.value : '';
    input.placeholder = opts.placeholder || '';
    input.style.cssText = [
      'width: ' + (opts.width || '50px'),
      'padding: 4px 6px',
      'background: ' + COLORS.bgDeep,
      'border: 1px solid ' + COLORS.accent,
      'border-radius: 3px',
      'color: ' + COLORS.text,
      'font-family: monospace',
      'font-size: 14px',
      'text-align: center',
      'box-sizing: border-box'
    ].join(';');
    parent.appendChild(input);
    return input;
  }

  // 创建下拉框
  function createSelect(parent, options, selected) {
    const sel = document.createElement('select');
    sel.style.cssText = [
      'padding: 4px 6px',
      'background: ' + COLORS.bgDeep,
      'border: 1px solid ' + COLORS.accent,
      'border-radius: 3px',
      'color: ' + COLORS.text,
      'font-family: monospace',
      'font-size: 14px'
    ].join(';');
    options.forEach(function (opt) {
      const o = document.createElement('option');
      o.value = opt.value;
      // 优先使用 i18n key，回退到硬编码 label
      if (opt.i18nKey && window.i18n && typeof window.i18n.t === 'function') {
        o.textContent = window.i18n.t(opt.i18nKey) || opt.label;
        o.setAttribute('data-i18n', opt.i18nKey);
      } else {
        o.textContent = opt.label;
      }
      if (opt.value === selected) o.selected = true;
      sel.appendChild(o);
    });
    parent.appendChild(sel);
    return sel;
  }

  // 创建按钮
  function createButton(parent, label, color, bg, i18nKey) {
    const btn = document.createElement('button');
    // 优先使用 i18n key，回退到硬编码 label
    if (i18nKey && window.i18n && typeof window.i18n.t === 'function') {
      btn.textContent = window.i18n.t(i18nKey) || label;
      btn.setAttribute('data-i18n', i18nKey);
    } else {
      btn.textContent = label;
    }
    btn.style.cssText = [
      'padding: 6px 14px',
      'background: ' + (bg || COLORS.bgDeep),
      'border: 2px solid ' + COLORS.accent,
      'border-radius: 4px',
      'color: ' + (color || COLORS.accent),
      'font-family: monospace',
      'font-size: 15px',
      'font-weight: bold',
      'cursor: pointer',
      'position: relative',
      'z-index: 10',
      'display: inline-block'
    ].join(';');
    parent.appendChild(btn);
    return btn;
  }

  // 创建标签
  function createLabel(parent, text, color, i18nKey) {
    const lbl = document.createElement('span');
    // 优先使用 i18n key，回退到硬编码 text
    if (i18nKey && window.i18n && typeof window.i18n.t === 'function') {
      lbl.textContent = window.i18n.t(i18nKey) || text;
      lbl.setAttribute('data-i18n', i18nKey);
    } else {
      lbl.textContent = text;
    }
    lbl.style.cssText = [
      'color: ' + (color || COLORS.text),
      'font-family: monospace',
      'font-size: 14px'
    ].join(';');
    parent.appendChild(lbl);
    return lbl;
  }

  // 设置 canvas 标准尺寸并返回上下文
  function setupCanvas(canvas) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    canvas.style.cssText = [
      'width: 100%',
      'max-width: ' + CANVAS_W + 'px',
      'height: auto',
      'display: block',
      'background: ' + COLORS.bgDeep,
      'border: 2px solid ' + COLORS.accent,
      'border-radius: 4px',
      'touch-action: none',
      'box-sizing: border-box'
    ].join(';');
    const ctx = canvas.getContext('2d');
    return ctx;
  }

  // 绘制背景
  function drawBackground(ctx) {
    ctx.fillStyle = COLORS.bgDeep;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  // 绘制居中/任意位置文字
  function drawText(ctx, text, x, y, opts) {
    opts = opts || {};
    ctx.save();
    ctx.fillStyle = opts.color || COLORS.text;
    ctx.font = (opts.bold ? 'bold ' : '') + (opts.size || 16) + 'px monospace';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = opts.baseline || 'middle';
    if (opts.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ============================================================
  // 1. 分数学习卡片 / Fraction Learning Card
  // ============================================================

  /**
   * 初始化分数学习卡片
   * @param {HTMLCanvasElement} canvas
   */
  function initFraction(canvas) {
    const ctx = setupCanvas(canvas);
    const panel = createPanel(canvas);

    // 输入控件
    createLabel(panel, '分数1:', null, 'mathext_fraction_label1');
    const n1 = createInput(panel, { value: '1', width: '40px' });
    const slash1 = document.createElement('span');
    slash1.textContent = '/';
    slash1.style.color = COLORS.accent;
    slash1.style.fontSize = '16px';
    panel.appendChild(slash1);
    const d1 = createInput(panel, { value: '2', width: '40px' });

    const opSel = createSelect(panel, [
      { value: '+', label: '+ 加', i18nKey: 'mathext_op_add' },
      { value: '-', label: '− 减', i18nKey: 'mathext_op_sub' },
      { value: '*', label: '× 乘', i18nKey: 'mathext_op_mul' },
      { value: '/', label: '÷ 除', i18nKey: 'mathext_op_div' }
    ], '+');

    createLabel(panel, '分数2:', null, 'mathext_fraction_label2');
    const n2 = createInput(panel, { value: '1', width: '40px' });
    const slash2 = document.createElement('span');
    slash2.textContent = '/';
    slash2.style.color = COLORS.accent;
    slash2.style.fontSize = '16px';
    panel.appendChild(slash2);
    const d2 = createInput(panel, { value: '3', width: '40px' });

    const demoBtn = createButton(panel, '演示动画', null, null, 'btn_demo_anim');

    // 动画状态
    let animState = null;
    let rafId = null;
    let startTime = 0;

    // 解析输入为分数对象
    function parseFrac(nEl, dEl) {
      const n = parseInt(nEl.value, 10);
      const d = parseInt(dEl.value, 10);
      if (isNaN(n) || isNaN(d) || d === 0) return null;
      return { n: n, d: d };
    }

    // 计算分数运算结果（含约分信息）
    function computeFraction(f1, op, f2) {
      let rn, rd;
      switch (op) {
        case '+':
          rd = f1.d * f2.d;
          rn = f1.n * f2.d + f2.n * f1.d;
          break;
        case '-':
          rd = f1.d * f2.d;
          rn = f1.n * f2.d - f2.n * f1.d;
          break;
        case '*':
          rn = f1.n * f2.n;
          rd = f1.d * f2.d;
          break;
        case '/':
          if (f2.n === 0) return null;
          rn = f1.n * f2.d;
          rd = f1.d * f2.n;
          break;
        default:
          return null;
      }
      if (rd === 0) return null;
      // 规范化：分母为负时整体取反
      if (rd < 0) { rn = -rn; rd = -rd; }
      const g = gcd(Math.abs(rn), Math.abs(rd));
      return {
        n: rn, d: rd,
        reducedN: rn / g,
        reducedD: rd / g,
        gcd: g
      };
    }

    // 绘制饼图（圆形分数演示）
    function drawPie(cx, cy, r, numerator, denominator, color, fillRatio) {
      ctx.save();
      // 背景圆
      ctx.fillStyle = COLORS.bgPanel;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // 填充部分
      const totalSlices = Math.abs(denominator);
      const filled = Math.abs(numerator);
      if (totalSlices > 0 && filled > 0) {
        const sliceAngle = (Math.PI * 2) / totalSlices;
        const visible = filled * (fillRatio != null ? fillRatio : 1);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const fullVisible = Math.min(visible, totalSlices);
        const endA = -Math.PI / 2 + fullVisible * sliceAngle;
        ctx.arc(cx, cy, r, -Math.PI / 2, endA);
        ctx.closePath();
        ctx.fill();
      }

      // 分隔线
      if (totalSlices > 0 && totalSlices <= 24) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        const sliceAngle = (Math.PI * 2) / totalSlices;
        for (let i = 0; i < totalSlices; i++) {
          const a = -Math.PI / 2 + i * sliceAngle;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.stroke();
        }
      }

      // 边框
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      // 中心文字
      drawText(ctx, numerator + '/' + denominator, cx, cy, {
        color: COLORS.text, size: 16, bold: true, shadow: true
      });
      ctx.restore();
    }

    // 渲染主函数
    function render(elapsed) {
      drawBackground(ctx);
      const state = animState;
      if (!state) {
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_fraction_intro') || '输入两个分数，点击"演示动画"查看运算过程') : '输入两个分数，点击"演示动画"查看运算过程', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.textDim, size: 18
        });
        return;
      }

      const t = elapsed / 1000; // 秒
      const f1 = state.f1, f2 = state.f2, result = state.result;
      const op = state.op;

      // 阶段时间表（秒）
      // 0.0-1.2: 展示两个分数（淡入）
      // 1.2-2.4: 展示运算符与运算过程
      // 2.4-3.4: 展示结果（未约分）
      // 3.4-4.6: 约分动画
      // 4.6+: 最终结果
      const pieR = 65;
      const cy = 150;
      const leftX = 140;
      const midX = 360;
      const rightX = 580;

      // 左侧饼图（淡入）
      const leftAlpha = easeOutCubic(t / 1.0);
      ctx.save();
      ctx.globalAlpha = leftAlpha;
      drawPie(leftX, cy, pieR, f1.n, f1.d, COLORS.blue);
      ctx.restore();
      drawText(ctx, window.i18n ? (window.i18n.t('mathext_fraction_label_short') || '分数1') : '分数1', leftX, cy - pieR - 18, { color: COLORS.textDim, size: 13 });

      // 右侧饼图（延迟淡入）
      const rightAlpha = easeOutCubic((t - 0.3) / 1.0);
      ctx.save();
      ctx.globalAlpha = rightAlpha;
      drawPie(rightX, cy, pieR, f2.n, f2.d, COLORS.green);
      ctx.restore();
      drawText(ctx, window.i18n ? (window.i18n.t('mathext_fraction_label_short2') || '分数2') : '分数2', rightX, cy - pieR - 18, { color: COLORS.textDim, size: 13 });

      // 运算符
      const opSym = op === '*' ? '×' : op === '/' ? '÷' : op;
      const opAlpha = clamp((t - 0.6) / 0.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = opAlpha;
      drawText(ctx, opSym, midX, cy, { color: COLORS.accent, size: 40, bold: true });
      ctx.restore();

      // 阶段2: 运算过程文字
      if (t > 1.2) {
        const p2 = clamp((t - 1.2) / 1.2, 0, 1);
        let processText = '';
        if (op === '+') {
          processText = '通分: ' + f1.n + '×' + f2.d + ' + ' + f2.n + '×' + f1.d + ' = ' + result.n + '，分母 ' + f1.d + '×' + f2.d + ' = ' + result.d;
        } else if (op === '-') {
          processText = '通分: ' + f1.n + '×' + f2.d + ' − ' + f2.n + '×' + f1.d + ' = ' + result.n + '，分母 ' + f1.d + '×' + f2.d + ' = ' + result.d;
        } else if (op === '*') {
          processText = '分子相乘: ' + f1.n + '×' + f2.n + ' = ' + result.n + '，分母相乘: ' + f1.d + '×' + f2.d + ' = ' + result.d;
        } else if (op === '/') {
          processText = '除以分数 = 乘其倒数: ' + f1.n + '×' + f2.d + ' = ' + result.n + '，' + f1.d + '×' + f2.n + ' = ' + result.d;
        }
        ctx.save();
        ctx.globalAlpha = easeOutCubic(p2);
        drawText(ctx, processText, CANVAS_W / 2, 260, {
          color: COLORS.text, size: 13
        });
        ctx.restore();
      }

      // 阶段3: 未约分结果饼图
      if (t > 2.4) {
        const p3 = clamp((t - 2.4) / 1.0, 0, 1);
        ctx.save();
        ctx.globalAlpha = easeOutCubic(p3);
        // 显示结果饼图（如果分母合理）
        if (Math.abs(result.d) > 0 && Math.abs(result.d) <= 24) {
          drawPie(midX, 340, 40, result.n, result.d, COLORS.brown, p3);
        }
        drawText(ctx, '= ' + result.n + '/' + result.d, midX, 340 + 60, {
          color: COLORS.accent, size: 18, bold: true
        });
        ctx.restore();
      }

      // 阶段4: 约分动画
      if (t > 3.4) {
        if (result.gcd > 1) {
          const p4 = clamp((t - 3.4) / 1.0, 0, 1);
          ctx.save();
          ctx.globalAlpha = easeOutCubic(p4);
          drawText(ctx, '↓ 约分（公约数 ' + result.gcd + '）', midX + 200, 340, {
            color: COLORS.red, size: 13
          });
          ctx.restore();

          if (t > 4.3) {
            const p5 = clamp((t - 4.3) / 0.8, 0, 1);
            ctx.save();
            ctx.globalAlpha = easeOutCubic(p5);
            drawText(ctx, '= ' + result.reducedN + '/' + result.reducedD, midX + 200, 380, {
              color: COLORS.green, size: 22, bold: true
            });
            drawText(ctx, window.i18n ? (window.i18n.t('mathext_reduced') || '（最简分数）') : '（最简分数）', midX + 200, 405, {
              color: COLORS.green, size: 12
            });
            ctx.restore();
          }
        } else {
          const p4 = clamp((t - 3.4) / 1.0, 0, 1);
          ctx.save();
          ctx.globalAlpha = easeOutCubic(p4);
          drawText(ctx, window.i18n ? (window.i18n.t('mathext_already_reduced') || '已经是最简分数') : '已经是最简分数', midX + 200, 370, {
            color: COLORS.green, size: 14
          });
          ctx.restore();
        }
      }
    }

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      render(elapsed);
      // 持续渲染（保持最终态可见）
      rafId = requestAnimationFrame(loop);
    }

    function startDemo() {
      const f1 = parseFrac(n1, d1);
      const f2 = parseFrac(n2, d2);
      if (!f1 || !f2) {
        animState = null;
        drawBackground(ctx);
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_invalid_fraction') || '请输入有效分数（分母不能为0）') : '请输入有效分数（分母不能为0）', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.red, size: 18
        });
        return;
      }
      const result = computeFraction(f1, opSel.value, f2);
      if (!result) {
        animState = null;
        drawBackground(ctx);
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_div_zero') || '除数不能为0') : '除数不能为0', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.red, size: 18
        });
        return;
      }
      animState = { f1: f1, f2: f2, op: opSel.value, result: result };
      startTime = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    demoBtn.addEventListener('click', startDemo);

    // 回车触发
    [n1, d1, n2, d2].forEach(function (el) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') startDemo();
      });
    });

    // 初始绘制
    drawBackground(ctx);
    drawText(ctx, window.i18n ? (window.i18n.t('mathext_fraction_intro') || '输入两个分数，点击"演示动画"查看运算过程') : '输入两个分数，点击"演示动画"查看运算过程', CANVAS_W / 2, CANVAS_H / 2, {
      color: COLORS.textDim, size: 18
    });
  }

  // ============================================================
  // 2. 小数学习卡片 / Decimal Learning Card
  // ============================================================

  /**
   * 初始化小数学习卡片
   * @param {HTMLCanvasElement} canvas
   */
  function initDecimal(canvas) {
    const ctx = setupCanvas(canvas);
    const panel = createPanel(canvas);

    // 模式选择
    const modeSel = createSelect(panel, [
      { value: 'show', label: '小数方格演示', i18nKey: 'mathext_decimal_mode_show' },
      { value: 'tofrac', label: '小数→分数', i18nKey: 'mathext_decimal_mode_tofrac' },
      { value: 'add', label: '小数加法', i18nKey: 'mathext_decimal_mode_add' }
    ], 'show');

    createLabel(panel, '小数1:', null, 'mathext_decimal_label1');
    const dec1 = createInput(panel, { value: '0.3', width: '70px' });

    createLabel(panel, '小数2:', null, 'mathext_decimal_label2');
    const dec2 = createInput(panel, { value: '0.4', width: '70px' });

    const demoBtn = createButton(panel, '演示动画', null, null, 'btn_demo_anim');

    let animState = null;
    let rafId = null;
    let startTime = 0;

    // 解析小数
    function parseDec(el) {
      const v = parseFloat(el.value);
      if (isNaN(v)) return null;
      return v;
    }

    // 计算小数位数
    function decimalPlaces(v) {
      const s = String(v);
      const dot = s.indexOf('.');
      if (dot < 0) return 0;
      return s.length - dot - 1;
    }

    // 小数转分数（自动约分）
    function decimalToFraction(v) {
      const dp = decimalPlaces(v);
      const denom = Math.pow(10, dp);
      const num = Math.round(v * denom);
      const g = gcd(Math.abs(num), denom);
      return { n: num / g, d: denom / g, rawN: num, rawD: denom, gcd: g };
    }

    /**
     * 绘制 10x10 方格图（每格代表 0.01）
     * @param {number} x 左上角
     * @param {number} y 左上角
     * @param {number} size 整个方格图的边长
     * @param {number} value 0~1 之间的小数
     * @param {string} color 填充色
     * @param {number} fillRatio 0~1 填充进度（动画用）
     */
    function drawGrid(x, y, size, value, color, fillRatio) {
      const cells = 100; // 10x10
      const cellSize = size / 10;
      const filledCount = Math.round(value * cells);
      const visibleCount = filledCount * (fillRatio != null ? fillRatio : 1);

      ctx.save();
      // 背景框
      ctx.fillStyle = COLORS.bgPanel;
      ctx.fillRect(x, y, size, size);

      // 填充格子（按行优先）
      ctx.fillStyle = color;
      const fullCells = Math.floor(visibleCount);
      const partial = visibleCount - fullCells;
      for (let i = 0; i < fullCells; i++) {
        const row = Math.floor(i / 10);
        const col = i % 10;
        ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize);
      }
      // 部分填充的格子
      if (partial > 0 && fullCells < 100) {
        const row = Math.floor(fullCells / 10);
        const col = fullCells % 10;
        ctx.fillRect(x + col * cellSize, y + row * cellSize, cellSize, cellSize * partial);
      }

      // 网格线
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * cellSize, y);
        ctx.lineTo(x + i * cellSize, y + size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + i * cellSize);
        ctx.lineTo(x + size, y + i * cellSize);
        ctx.stroke();
      }

      // 加粗 0.1 分隔线
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * cellSize, y);
        ctx.lineTo(x + i * cellSize, y + size);
        ctx.stroke();
      }

      // 外边框
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.restore();
    }

    // 渲染
    function render(elapsed) {
      drawBackground(ctx);
      const state = animState;
      if (!state) {
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_decimal_intro') || '选择模式并输入小数，点击"演示动画"') : '选择模式并输入小数，点击"演示动画"', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.textDim, size: 18
        });
        return;
      }

      const t = elapsed / 1000;
      const mode = state.mode;
      const gridSize = 200;
      const gridY = 80;

      if (mode === 'show') {
        // 单个小数方格演示
        const p = easeOutCubic(clamp(t / 1.5, 0, 1));
        const gx = (CANVAS_W - gridSize) / 2;
        drawGrid(gx, gridY, gridSize, state.v1, COLORS.blue, p);

        drawText(ctx, '小数 ' + state.v1 + ' 的方格表示', CANVAS_W / 2, 50, {
          color: COLORS.accent, size: 18, bold: true
        });
        drawText(ctx, '每格代表 0.01，共填充 ' + Math.round(state.v1 * 100) + ' 格',
          CANVAS_W / 2, gridY + gridSize + 30, {
            color: COLORS.text, size: 14
          });

        // 拆解：十分位 + 百分位
        if (t > 1.5) {
          const p2 = easeOutCubic(clamp((t - 1.5) / 1.2, 0, 1));
          ctx.save();
          ctx.globalAlpha = p2;
          const tenths = Math.floor(state.v1 * 10);
          const hundredths = Math.round(state.v1 * 100) - tenths * 10;
          drawText(ctx, '十分位: ' + tenths + ' 大格 (' + (tenths / 10) + ') + 百分位: ' + hundredths + ' 小格 (' + (hundredths / 100) + ')',
            CANVAS_W / 2, gridY + gridSize + 60, {
              color: COLORS.green, size: 13
            });
          ctx.restore();
        }
      } else if (mode === 'tofrac') {
        // 小数转分数动画
        const p = easeOutCubic(clamp(t / 1.5, 0, 1));
        const gx = 80;
        drawGrid(gx, gridY, gridSize, state.v1, COLORS.blue, p);

        drawText(ctx, '小数 ' + state.v1, gx + gridSize / 2, 50, {
          color: COLORS.accent, size: 18, bold: true
        });

        // 右侧分数推导
        const frac = state.frac;
        const fx = 380;
        drawText(ctx, '↓ 转分数', fx, gridY + 20, { color: COLORS.textDim, size: 14 });

        if (t > 0.8) {
          const p2 = easeOutCubic(clamp((t - 0.8) / 1.0, 0, 1));
          ctx.save();
          ctx.globalAlpha = p2;
          drawText(ctx, frac.rawN + '/' + frac.rawD, fx, gridY + 60, {
            color: COLORS.blue, size: 26, bold: true
          });
          drawText(ctx, '(' + state.v1 + ' = ' + frac.rawN + ' ÷ ' + frac.rawD + ')',
            fx, gridY + 95, { color: COLORS.text, size: 12 });
          ctx.restore();
        }

        if (t > 2.0 && frac.gcd > 1) {
          const p3 = easeOutCubic(clamp((t - 2.0) / 1.0, 0, 1));
          ctx.save();
          ctx.globalAlpha = p3;
          drawText(ctx, '↓ 约分 (÷' + frac.gcd + ')', fx, gridY + 130, {
            color: COLORS.red, size: 13
          });
          ctx.restore();
        }

        if (t > 2.8) {
          const p4 = easeOutCubic(clamp((t - 2.8) / 0.8, 0, 1));
          ctx.save();
          ctx.globalAlpha = p4;
          drawText(ctx, frac.n + '/' + frac.d, fx, gridY + 175, {
            color: COLORS.green, size: 32, bold: true
          });
          drawText(ctx, '（最简分数）', fx, gridY + 210, {
            color: COLORS.green, size: 12
          });
          ctx.restore();
        }

        // 末尾：等价关系
        if (t > 3.8) {
          const p5 = easeOutCubic(clamp((t - 3.8) / 0.8, 0, 1));
          ctx.save();
          ctx.globalAlpha = p5;
          drawText(ctx, state.v1 + ' = ' + frac.n + '/' + frac.d,
            CANVAS_W / 2, 380, {
              color: COLORS.accent, size: 18, bold: true
            });
          ctx.restore();
        }
      } else if (mode === 'add') {
        // 小数加法
        const p1 = easeOutCubic(clamp(t / 1.0, 0, 1));
        const p2 = easeOutCubic(clamp((t - 0.5) / 1.0, 0, 1));
        const sum = state.v1 + state.v2;

        // 左侧 v1 方格
        const g1x = 50;
        drawGrid(g1x, gridY, 140, state.v1, COLORS.blue, p1);
        drawText(ctx, state.v1, g1x + 70, 50, { color: COLORS.blue, size: 18, bold: true });

        // 加号
        drawText(ctx, '+', g1x + 170, gridY + 70, { color: COLORS.accent, size: 36, bold: true });

        // 中间 v2 方格
        const g2x = 240;
        drawGrid(g2x, gridY, 140, state.v2, COLORS.green, p2);
        drawText(ctx, state.v2, g2x + 70, 50, { color: COLORS.green, size: 18, bold: true });

        // 等号
        drawText(ctx, '=', g2x + 170, gridY + 70, { color: COLORS.accent, size: 36, bold: true });

        // 右侧合并方格（动画填充）
        const p3 = easeOutCubic(clamp((t - 1.5) / 1.5, 0, 1));
        const g3x = 430;
        drawGrid(g3x, gridY, 200, Math.min(sum, 1), COLORS.brown, p3);
        drawText(ctx, sum, g3x + 100, 50, { color: COLORS.brown, size: 18, bold: true });

        // 过程说明
        if (t > 2.0) {
          const p4 = easeOutCubic(clamp((t - 2.0) / 1.0, 0, 1));
          ctx.save();
          ctx.globalAlpha = p4;
          // 对齐小数位说明
          const dp1 = decimalPlaces(state.v1);
          const dp2 = decimalPlaces(state.v2);
          const maxDp = Math.max(dp1, dp2);
          drawText(ctx, '小数位对齐: ' + state.v1.toFixed(maxDp) + ' + ' + state.v2.toFixed(maxDp) + ' = ' + sum.toFixed(maxDp),
            CANVAS_W / 2, 360, {
              color: COLORS.text, size: 14
            });
          drawText(ctx, '结果: ' + sum, CANVAS_W / 2, 390, {
            color: COLORS.accent, size: 18, bold: true
          });
          ctx.restore();
        }
      }
    }

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      render(elapsed);
      rafId = requestAnimationFrame(loop);
    }

    function startDemo() {
      const mode = modeSel.value;
      const v1 = parseDec(dec1);
      const v2 = parseDec(dec2);
      if (v1 === null || (mode === 'add' && v2 === null)) {
        animState = null;
        drawBackground(ctx);
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_invalid_decimal') || '请输入有效小数') : '请输入有效小数', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.red, size: 18
        });
        return;
      }
      if (mode === 'show' && (v1 < 0 || v1 > 1)) {
        animState = null;
        drawBackground(ctx);
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_decimal_range_error') || '演示模式请输入 0~1 之间的小数') : '演示模式请输入 0~1 之间的小数', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.red, size: 16
        });
        return;
      }
      if (mode === 'add' && (v1 + v2 > 1)) {
        // 仍可演示但合并方格会满
      }
      const frac = decimalToFraction(v1);
      animState = { mode: mode, v1: v1, v2: v2, frac: frac };
      startTime = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    demoBtn.addEventListener('click', startDemo);
    [dec1, dec2].forEach(function (el) {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') startDemo();
      });
    });

    drawBackground(ctx);
    drawText(ctx, window.i18n ? (window.i18n.t('mathext_decimal_intro') || '选择模式并输入小数，点击"演示动画"') : '选择模式并输入小数，点击"演示动画"', CANVAS_W / 2, CANVAS_H / 2, {
      color: COLORS.textDim, size: 18
    });
  }

  // ============================================================
  // 3. 方程学习卡片 / Equation Learning Card
  // ============================================================

  /**
   * 解析方程一端，返回 {a: x^2 系数, b: x 系数, c: 常数}
   */
  function parseSide(s) {
    s = s.replace(/\s+/g, '').toLowerCase().replace(/²/g, '^2').replace(/\*/g, '');
    if (s.length > 0 && s[0] !== '+' && s[0] !== '-') {
      s = '+' + s;
    }
    let a = 0, b = 0, c = 0;
    const re = /([+-])([^+-]+)/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      const sign = m[1] === '-' ? -1 : 1;
      let term = m[2];
      let coef = 1;
      let isX2 = false, isX = false;
      if (term.indexOf('x^2') >= 0) {
        isX2 = true;
        term = term.replace(/x\^2/, '');
      } else if (term.indexOf('x') >= 0) {
        isX = true;
        term = term.replace(/x/, '');
      }
      if (term === '' || term === '+') {
        coef = 1;
      } else {
        coef = parseFloat(term);
        if (isNaN(coef)) coef = 1;
      }
      coef *= sign;
      if (isX2) a += coef;
      else if (isX) b += coef;
      else c += coef;
    }
    return { a: a, b: b, c: c };
  }

  /**
   * 解析方程字符串，返回 {a, b, c}（移到左端后的标准形式 ax²+bx+c=0）
   */
  function parseEquation(eqStr) {
    const parts = String(eqStr).split('=');
    if (parts.length !== 2) return null;
    const left = parseSide(parts[0]);
    const right = parseSide(parts[1]);
    return {
      a: left.a - right.a,
      b: left.b - right.b,
      c: left.c - right.c
    };
  }

  /**
   * 初始化方程学习卡片
   * @param {HTMLCanvasElement} canvas
   */
  function initEquation(canvas) {
    const ctx = setupCanvas(canvas);
    const panel = createPanel(canvas);

    createLabel(panel, '方程:', null, 'mathext_equation_label');
    const eqInput = createInput(panel, { value: '2x+3=7', width: '140px' });
    const demoBtn = createButton(panel, '求解演示', null, null, 'btn_solve_demo');
    createLabel(panel, '示例: 2x+3=7 / x^2-5x+6=0', COLORS.textDim, 'mathext_equation_example');

    let animState = null;
    let rafId = null;
    let startTime = 0;

    /**
     * 生成方程求解步骤
     * 返回 { steps: [...], type: 'linear'|'quadratic', roots: [...] }
     */
    function solveEquation(coef) {
      const a = coef.a, b = coef.b, c = coef.c;
      const steps = [];
      if (a === 0) {
        // 一元一次 bx + c = 0
        if (b === 0) {
          steps.push({ text: (c === 0 ? '恒等式：所有 x 都是解' : '无解'), final: true });
          return { steps: steps, type: 'linear', roots: [] };
        }
        steps.push({ text: a + 'x² + ' + b + 'x + ' + c + ' = 0', lhs: b + 'x + ' + c, rhs: '0' });
        // 两边减 c
        steps.push({
          text: '两边' + (c >= 0 ? '减 ' : '加 ') + Math.abs(c),
          lhs: b + 'x', rhs: String(-c)
        });
        // 两边除 b
        const root = -c / b;
        steps.push({
          text: '两边' + (b >= 0 ? '除以 ' : '除以 ') + b,
          lhs: 'x', rhs: String(round(root, 4))
        });
        steps.push({ text: 'x = ' + round(root, 4), final: true, roots: [root] });
        return { steps: steps, type: 'linear', roots: [root] };
      } else {
        // 一元二次 ax² + bx + c = 0
        const disc = b * b - 4 * a * c;
        steps.push({ text: a + 'x² + ' + b + 'x + ' + c + ' = 0', lhs: a + 'x² + ' + b + 'x + ' + c, rhs: '0' });
        steps.push({
          text: '判别式 Δ = b² − 4ac = ' + b + '² − 4×' + a + '×' + c + ' = ' + disc,
          lhs: 'Δ', rhs: String(disc)
        });
        if (disc < 0) {
          steps.push({ text: 'Δ < 0，方程无实数根', final: true, roots: [] });
          return { steps: steps, type: 'quadratic', roots: [] };
        }
        const sq = Math.sqrt(disc);
        steps.push({
          text: '√Δ = ' + (Number.isInteger(sq) ? String(sq) : '≈' + round(sq, 4)),
          lhs: '√Δ', rhs: round(sq, 4)
        });
        const x1 = (-b + sq) / (2 * a);
        const x2 = (-b - sq) / (2 * a);
        steps.push({
          text: 'x = (−b ± √Δ) / (2a) = (' + (-b) + ' ± ' + round(sq, 4) + ') / ' + (2 * a),
          lhs: 'x', rhs: round(x1, 4) + ' 或 ' + round(x2, 4)
        });
        if (disc === 0) {
          steps.push({ text: 'Δ = 0，有两个相等实数根：x = ' + round(x1, 4), final: true, roots: [x1] });
        } else {
          steps.push({
            text: 'x₁ = ' + round(x1, 4) + '，x₂ = ' + round(x2, 4),
            final: true, roots: [x1, x2]
          });
        }
        return { steps: steps, type: 'quadratic', roots: [x1, x2] };
      }
    }

    // 保留指定位数小数
    function round(v, dp) {
      const f = Math.pow(10, dp);
      return Math.round(v * f) / f;
    }

    /**
     * 绘制天平（balance scale）
     * @param {number} cx 中心x
     * @param {number} cy 支点y
     * @param {number} beamLen 横梁半长
     * @param {string} leftText 左盘文字
     * @param {string} rightText 右盘文字
     * @param {number} tilt 倾斜角度（弧度），0=平衡
     */
    function drawBalance(cx, cy, beamLen, leftText, rightText, tilt) {
      ctx.save();
      // 底座
      ctx.fillStyle = COLORS.brown;
      ctx.beginPath();
      ctx.moveTo(cx - 30, cy + 90);
      ctx.lineTo(cx + 30, cy + 90);
      ctx.lineTo(cx + 20, cy + 100);
      ctx.lineTo(cx - 20, cy + 100);
      ctx.closePath();
      ctx.fill();

      // 立柱
      ctx.fillStyle = COLORS.brown;
      ctx.fillRect(cx - 4, cy, 8, 90);

      // 横梁（旋转）
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(-beamLen, -5, beamLen * 2, 10);

      // 左盘绳与盘
      ctx.strokeStyle = COLORS.textDim;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-beamLen, 5);
      ctx.lineTo(-beamLen, 35);
      ctx.stroke();
      ctx.fillStyle = COLORS.blue;
      ctx.beginPath();
      ctx.ellipse(-beamLen, 40, 35, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 右盘绳与盘
      ctx.strokeStyle = COLORS.textDim;
      ctx.beginPath();
      ctx.moveTo(beamLen, 5);
      ctx.lineTo(beamLen, 35);
      ctx.stroke();
      ctx.fillStyle = COLORS.green;
      ctx.beginPath();
      ctx.ellipse(beamLen, 40, 35, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.accent;
      ctx.stroke();

      // 盘内文字
      drawText(ctx, leftText, -beamLen, 30, { color: COLORS.text, size: 13, bold: true });
      drawText(ctx, rightText, beamLen, 30, { color: COLORS.text, size: 13, bold: true });

      ctx.restore();

      // 支点（圆球）
      ctx.fillStyle = COLORS.red;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // 渲染
    function render(elapsed) {
      drawBackground(ctx);
      const state = animState;
      if (!state) {
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_equation_intro') || '输入方程（如 2x+3=7 或 x^2-5x+6=0），点击"求解演示"') : '输入方程（如 2x+3=7 或 x^2-5x+6=0），点击"求解演示"',
          CANVAS_W / 2, CANVAS_H / 2, {
            color: COLORS.textDim, size: 16
          });
        return;
      }

      const t = elapsed / 1000;
      const solve = state.solve;
      const steps = solve.steps;

      // 每步耗时 1.8 秒
      const stepDuration = 1.8;
      const totalSteps = steps.length;
      const currentIdx = Math.min(Math.floor(t / stepDuration), totalSteps - 1);
      const stepProgress = clamp((t - currentIdx * stepDuration) / stepDuration, 0, 1);

      // 标题
      drawText(ctx, state.eqStr + '  （' + (solve.type === 'linear' ? '一元一次' : '一元二次') + '）',
        CANVAS_W / 2, 30, {
          color: COLORS.accent, size: 18, bold: true
        });

      // 当前步骤的天平动画
      const curStep = steps[currentIdx];
      const tilt = (1 - easeOutCubic(stepProgress)) * 0.15; // 平衡过程：从倾斜到水平
      drawBalance(CANVAS_W / 2, 200, 180,
        curStep.lhs || '?', curStep.rhs || '?', tilt);

      // 当前步骤说明
      drawText(ctx, '步骤 ' + (currentIdx + 1) + '/' + totalSteps + ': ' + curStep.text,
        CANVAS_W / 2, 320, {
          color: COLORS.text, size: 14
        });

      // 已完成的步骤列表
      ctx.save();
      ctx.globalAlpha = 0.85;
      const listX = 30;
      let listY = 350;
      for (let i = 0; i <= currentIdx; i++) {
        const st = steps[i];
        const prefix = st.final ? '✓ ' : (i + 1) + '. ';
        drawText(ctx, prefix + st.text, listX + 320, listY, {
          color: st.final ? COLORS.green : COLORS.textDim,
          size: 11,
          align: 'left'
        });
        listY += 16;
      }
      ctx.restore();

      // 最终结果突出显示
      if (currentIdx === totalSteps - 1 && steps[currentIdx].final) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.6 * pulse;
        drawText(ctx, steps[currentIdx].text, CANVAS_W / 2, 350, {
          color: COLORS.green, size: 22, bold: true, shadow: true
        });
        ctx.restore();
      }
    }

    function loop(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      render(elapsed);
      rafId = requestAnimationFrame(loop);
    }

    function startDemo() {
      const eqStr = eqInput.value.trim();
      const coef = parseEquation(eqStr);
      if (!coef) {
        animState = null;
        drawBackground(ctx);
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_equation_invalid') || '请输入有效方程（含 = 号）') : '请输入有效方程（含 = 号）', CANVAS_W / 2, CANVAS_H / 2, {
          color: COLORS.red, size: 16
        });
        return;
      }
      const solve = solveEquation(coef);
      animState = { eqStr: eqStr, solve: solve };
      startTime = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    demoBtn.addEventListener('click', startDemo);
    eqInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') startDemo();
    });

    drawBackground(ctx);
    drawText(ctx, window.i18n ? (window.i18n.t('mathext_equation_intro') || '输入方程（如 2x+3=7 或 x^2-5x+6=0），点击"求解演示"') : '输入方程（如 2x+3=7 或 x^2-5x+6=0），点击"求解演示"',
      CANVAS_W / 2, CANVAS_H / 2, {
        color: COLORS.textDim, size: 16
      });
  }

  // ============================================================
  // 4. 几何学习卡片 / Geometry Learning Card
  // ============================================================

  /**
   * 初始化几何学习卡片
   * @param {HTMLCanvasElement} canvas
   */
  function initGeometry(canvas) {
    const ctx = setupCanvas(canvas);
    const panel = createPanel(canvas);

    const shapeSel = createSelect(panel, [
      { value: 'rect', label: '矩形', i18nKey: 'mathext_geometry_shape_rect' },
      { value: 'tri', label: '三角形', i18nKey: 'mathext_geometry_shape_tri' },
      { value: 'circle', label: '圆形', i18nKey: 'mathext_geometry_shape_circle' },
      { value: 'cube', label: '立方体', i18nKey: 'mathext_geometry_shape_cube' }
    ], 'rect');

    createLabel(panel, '拖动图形上的黄点改变尺寸', COLORS.textDim, 'mathext_geometry_drag_hint');

    // 当前形状参数
    let shape = {
      type: 'rect',
      // 矩形：左上角 + 宽高（在 canvas 坐标系中）
      rect: { x: 200, y: 130, w: 200, h: 120 },
      // 三角形：三个顶点
      tri: { p1: { x: 200, y: 280 }, p2: { x: 450, y: 280 }, p3: { x: 325, y: 120 } },
      // 圆形：圆心 + 半径
      circle: { cx: 320, cy: 220, r: 90 },
      // 立方体：宽高深
      cube: { x: 250, y: 130, w: 140, h: 140, d: 70 }
    };

    // 拖拽状态
    let dragHandle = null; // { type, key, ox, oy }

    // 获取当前形状的所有拖拽点（屏幕坐标）
    function getHandles() {
      const t = shape.type;
      if (t === 'rect') {
        const r = shape.rect;
        return [
          { key: 'br', x: r.x + r.w, y: r.y + r.h, label: '宽' + r.w + ' 高' + r.h }
        ];
      } else if (t === 'tri') {
        const tr = shape.tri;
        return [
          { key: 'p1', x: tr.p1.x, y: tr.p1.y },
          { key: 'p2', x: tr.p2.x, y: tr.p2.y },
          { key: 'p3', x: tr.p3.x, y: tr.p3.y }
        ];
      } else if (t === 'circle') {
        const c = shape.circle;
        return [
          { key: 'edge', x: c.cx + c.r, y: c.cy, label: 'r=' + Math.round(c.r) }
        ];
      } else if (t === 'cube') {
        const cb = shape.cube;
        return [
          { key: 'wh', x: cb.x + cb.w, y: cb.y + cb.h, label: '宽高' },
          { key: 'd', x: cb.x + cb.w + cb.d, y: cb.y + cb.d, label: '深' }
        ];
      }
      return [];
    }

    // 设置拖拽点的新位置
    function setHandle(key, mx, my) {
      const t = shape.type;
      if (t === 'rect') {
        if (key === 'br') {
          shape.rect.w = Math.max(20, mx - shape.rect.x);
          shape.rect.h = Math.max(20, my - shape.rect.y);
        }
      } else if (t === 'tri') {
        if (shape.tri[key]) {
          shape.tri[key].x = clamp(mx, 10, CANVAS_W - 10);
          shape.tri[key].y = clamp(my, 10, CANVAS_H - 10);
        }
      } else if (t === 'circle') {
        if (key === 'edge') {
          const c = shape.circle;
          c.r = Math.max(15, Math.hypot(mx - c.cx, my - c.cy));
        }
      } else if (t === 'cube') {
        const cb = shape.cube;
        if (key === 'wh') {
          cb.w = Math.max(30, mx - cb.x);
          cb.h = Math.max(30, my - cb.y);
        } else if (key === 'd') {
          cb.d = Math.max(10, Math.min(mx - cb.x - cb.w, my - cb.y));
        }
      }
    }

    // 计算几何量
    function computeMeasures() {
      const t = shape.type;
      if (t === 'rect') {
        const r = shape.rect;
        return {
          formula: '面积 S = 长 × 宽\n周长 C = 2 × (长 + 宽)',
          values: '长 = ' + Math.round(r.w) + '，宽 = ' + Math.round(r.h),
          area: r.w * r.h,
          peri: 2 * (r.w + r.h),
          vol: null,
          labels: ['S', 'C']
        };
      } else if (t === 'tri') {
        const tr = shape.tri;
        const a = Math.hypot(tr.p2.x - tr.p1.x, tr.p2.y - tr.p1.y);
        const b = Math.hypot(tr.p3.x - tr.p2.x, tr.p3.y - tr.p2.y);
        const c = Math.hypot(tr.p1.x - tr.p3.x, tr.p1.y - tr.p3.y);
        const s = (a + b + c) / 2;
        const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
        return {
          formula: '面积 S = √(p(p−a)(p−b)(p−c))\n周长 C = a + b + c\n（海伦公式，p 为半周长）',
          values: 'a=' + round(a,1) + ' b=' + round(b,1) + ' c=' + round(c,1),
          area: area,
          peri: a + b + c,
          vol: null,
          labels: ['S', 'C']
        };
      } else if (t === 'circle') {
        const c = shape.circle;
        return {
          formula: '面积 S = π × r²\n周长 C = 2 × π × r',
          values: '半径 r = ' + Math.round(c.r),
          area: Math.PI * c.r * c.r,
          peri: 2 * Math.PI * c.r,
          vol: null,
          labels: ['S', 'C']
        };
      } else if (t === 'cube') {
        const cb = shape.cube;
        return {
          formula: '体积 V = 长 × 宽 × 高\n表面积 A = 2×(长×宽 + 长×高 + 宽×高)',
          values: '长=' + Math.round(cb.w) + ' 宽=' + Math.round(cb.h) + ' 高=' + Math.round(cb.d),
          area: 2 * (cb.w * cb.h + cb.w * cb.d + cb.h * cb.d),
          peri: null,
          vol: cb.w * cb.h * cb.d,
          labels: ['V', 'A']
        };
      }
    }

    function round(v, dp) {
      const f = Math.pow(10, dp);
      return Math.round(v * f) / f;
    }

    // 绘制形状
    function drawShape() {
      const t = shape.type;
      ctx.save();
      if (t === 'rect') {
        const r = shape.rect;
        ctx.fillStyle = 'rgba(30,144,255,0.35)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = COLORS.blue;
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        // 尺寸标注
        drawText(ctx, '宽 ' + Math.round(r.w), r.x + r.w / 2, r.y - 10, {
          color: COLORS.accent, size: 13
        });
        drawText(ctx, '高 ' + Math.round(r.h), r.x - 30, r.y + r.h / 2, {
          color: COLORS.accent, size: 13
        });
      } else if (t === 'tri') {
        const tr = shape.tri;
        ctx.fillStyle = 'rgba(34,139,34,0.35)';
        ctx.beginPath();
        ctx.moveTo(tr.p1.x, tr.p1.y);
        ctx.lineTo(tr.p2.x, tr.p2.y);
        ctx.lineTo(tr.p3.x, tr.p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COLORS.green;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (t === 'circle') {
        const c = shape.circle;
        ctx.fillStyle = 'rgba(255,215,0,0.25)';
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
        // 半径线
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.cx, c.cy);
        ctx.lineTo(c.cx + c.r, c.cy);
        ctx.stroke();
        drawText(ctx, 'r=' + Math.round(c.r), c.cx + c.r / 2, c.cy - 12, {
          color: COLORS.red, size: 13
        });
        // 圆心
        ctx.fillStyle = COLORS.red;
        ctx.beginPath();
        ctx.arc(c.cx, c.cy, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === 'cube') {
        const cb = shape.cube;
        // 等距投影立方体
        const dx = cb.d, dy = -cb.d * 0.5;
        // 正面
        ctx.fillStyle = 'rgba(139,69,19,0.55)';
        ctx.fillRect(cb.x, cb.y, cb.w, cb.h);
        ctx.strokeStyle = COLORS.brown;
        ctx.lineWidth = 2;
        ctx.strokeRect(cb.x, cb.y, cb.w, cb.h);
        // 顶面
        ctx.fillStyle = 'rgba(255,215,0,0.45)';
        ctx.beginPath();
        ctx.moveTo(cb.x, cb.y);
        ctx.lineTo(cb.x + dx, cb.y + dy);
        ctx.lineTo(cb.x + cb.w + dx, cb.y + dy);
        ctx.lineTo(cb.x + cb.w, cb.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 右面
        ctx.fillStyle = 'rgba(255,69,0,0.45)';
        ctx.beginPath();
        ctx.moveTo(cb.x + cb.w, cb.y);
        ctx.lineTo(cb.x + cb.w + dx, cb.y + dy);
        ctx.lineTo(cb.x + cb.w + dx, cb.y + cb.h + dy);
        ctx.lineTo(cb.x + cb.w, cb.y + cb.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 标注
        drawText(ctx, '长 ' + Math.round(cb.w), cb.x + cb.w / 2, cb.y + cb.h + 18, {
          color: COLORS.accent, size: 12
        });
      }
      ctx.restore();
    }

    // 绘制拖拽手柄
    function drawHandles() {
      const handles = getHandles();
      handles.forEach(function (h) {
        ctx.save();
        // 光晕
        ctx.fillStyle = 'rgba(255,215,0,0.25)';
        ctx.beginPath();
        ctx.arc(h.x, h.y, 12, 0, Math.PI * 2);
        ctx.fill();
        // 主体
        ctx.fillStyle = COLORS.accent;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.bgDeep;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });
    }

    // 绘制公式与计算结果
    function drawInfo() {
      const m = computeMeasures();
      // 右侧信息面板
      const ix = 510, iy = 60, iw = 200, ih = 300;
      ctx.save();
      ctx.fillStyle = COLORS.bgPanel;
      ctx.fillRect(ix, iy, iw, ih);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(ix, iy, iw, ih);

      drawText(ctx, window.i18n ? (window.i18n.t('mathext_geometry_panel_formula') || '公式') : '公式', ix + iw / 2, iy + 18, {
        color: COLORS.accent, size: 16, bold: true
      });

      // 公式多行
      const lines = m.formula.split('\n');
      lines.forEach(function (line, i) {
        drawText(ctx, line, ix + iw / 2, iy + 50 + i * 22, {
          color: COLORS.text, size: 12
        });
      });

      drawText(ctx, window.i18n ? (window.i18n.t('mathext_geometry_panel_values') || '当前数值') : '当前数值', ix + iw / 2, iy + 120, {
        color: COLORS.accent, size: 14, bold: true
      });
      drawText(ctx, m.values, ix + iw / 2, iy + 145, {
        color: COLORS.text, size: 12
      });

      drawText(ctx, window.i18n ? (window.i18n.t('mathext_geometry_panel_result') || '计算结果') : '计算结果', ix + iw / 2, iy + 180, {
        color: COLORS.accent, size: 14, bold: true
      });
      let ry = iy + 210;
      if (m.area != null) {
        drawText(ctx, '面积/体积 = ' + round(m.area, 2), ix + iw / 2, ry, {
          color: COLORS.green, size: 14, bold: true
        });
        ry += 24;
      }
      if (m.peri != null) {
        drawText(ctx, '周长 = ' + round(m.peri, 2), ix + iw / 2, ry, {
          color: COLORS.blue, size: 14, bold: true
        });
        ry += 24;
      }
      if (m.vol != null) {
        drawText(ctx, '体积 = ' + round(m.vol, 2), ix + iw / 2, ry, {
          color: COLORS.green, size: 14, bold: true
        });
        ry += 24;
        drawText(ctx, '表面积 = ' + round(m.area, 2), ix + iw / 2, ry, {
          color: COLORS.blue, size: 14, bold: true
        });
      }
      ctx.restore();
    }

    // 渲染
    function render() {
      drawBackground(ctx);
      drawText(ctx, window.i18n ? (window.i18n.t('mathext_geometry_title') || '几何图形互动演示') : '几何图形互动演示', CANVAS_W / 2, 25, {
        color: COLORS.accent, size: 18, bold: true
      });
      drawShape();
      drawHandles();
      drawInfo();
    }

    // 把鼠标事件坐标转换为 canvas 内部坐标
    function eventToCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      const sx = canvas.width / rect.width;
      const sy = canvas.height / rect.height;
      let cx, cy;
      if (e.touches && e.touches.length) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    }

    function onDown(e) {
      e.preventDefault();
      const p = eventToCanvas(e);
      const handles = getHandles();
      for (let i = 0; i < handles.length; i++) {
        const h = handles[i];
        if (Math.hypot(h.x - p.x, h.y - p.y) < 16) {
          dragHandle = { key: h.key };
          break;
        }
      }
    }

    function onMove(e) {
      if (!dragHandle) return;
      e.preventDefault();
      const p = eventToCanvas(e);
      setHandle(dragHandle.key, p.x, p.y);
      render();
    }

    function onUp() {
      dragHandle = null;
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    shapeSel.addEventListener('change', function () {
      shape.type = shapeSel.value;
      render();
    });

    // 初始渲染
    render();
  }

  // ============================================================
  // 5. 速算挑战 / Speed Challenge
  // ============================================================

  /**
   * 读取本地排行榜
   * @returns {Array} 排行榜数组（按分数从高到低排序，最多10条）
   */
  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LB_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
    } catch (e) {
      return [];
    }
  }

  /**
   * 保存分数到本地排行榜
   * @param {string} name
   * @param {number} score
   * @param {number} correct
   * @param {number} wrong
   */
  function saveScore(name, score, correct, wrong) {
    try {
      const lb = loadLeaderboard();
      lb.push({
        name: name || (window.i18n ? (window.i18n.t('mathext_anonymous') || '匿名') : '匿名'),
        score: score,
        correct: correct,
        wrong: wrong,
        date: new Date().toISOString().slice(0, 10)
      });
      lb.sort(function (a, b) { return b.score - a.score; });
      const top = lb.slice(0, 10);
      localStorage.setItem(LB_KEY, JSON.stringify(top));
      return top;
    } catch (e) {
      return loadLeaderboard();
    }
  }

  /**
   * 初始化速算挑战
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} [scoreList] 可选：用于显示排行榜的 DOM 元素
   */
  function initSpeedChallenge(canvas, scoreList) {
    const ctx = setupCanvas(canvas);
    const panel = createPanel(canvas);

    // 控件
    const startBtn = createButton(panel, '开始挑战 (60秒)', null, null, 'btn_start_challenge');
    const nameInput = createInput(panel, { value: '', placeholder: (window.i18n ? (window.i18n.t('mathext_speed_nickname_placeholder') || '昵称') : '昵称'), width: '100px' });
    createLabel(panel, '答对+10分 答错-5分 难度递增', COLORS.textDim, 'mathext_speed_rule_hint');

    // 答题输入框（覆盖在 canvas 上的隐藏输入）
    const answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.placeholder = (window.i18n ? (window.i18n.t('mathext_speed_answer_placeholder') || '在此输入答案，回车提交') : '在此输入答案，回车提交');
    answerInput.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 70%',
      'transform: translate(-50%, -50%)',
      'width: 180px',
      'padding: 6px 10px',
      'background: ' + COLORS.bgPanel,
      'border: 2px solid ' + COLORS.accent,
      'border-radius: 4px',
      'color: ' + COLORS.text,
      'font-family: monospace',
      'font-size: 22px',
      'text-align: center',
      'display: none',
      'z-index: 5'
    ].join(';');
    // 让 canvas 父元素相对定位
    const container = canvas.parentElement;
    if (getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
    container.appendChild(answerInput);

    // 游戏状态
    let gameState = {
      playing: false,
      score: 0,
      correct: 0,
      wrong: 0,
      timeLeft: 60,
      currentQ: null,
      questionNum: 0,
      startTime: 0,
      lastTick: 0,
      feedback: null,
      feedbackTime: 0
    };
    let rafId = null;

    /**
     * 根据当前题目序号生成题目（难度递增）
     */
    function generateQuestion(num) {
      // 难度等级：每 5 题升一级
      const level = Math.floor(num / 5);
      const ops = ['+', '-', '*', '/'];
      let a, b, op, ans;
      // 第 0 级：加减法 1~20
      // 第 1 级：加减乘 1~50
      // 第 2 级及以上：四则运算 1~100，包含除法（需整除）
      const range = level === 0 ? 20 : level === 1 ? 50 : 100;
      op = ops[Math.floor(Math.random() * (level === 0 ? 2 : (level === 1 ? 3 : 4)))];
      if (op === '+') {
        a = 1 + Math.floor(Math.random() * range);
        b = 1 + Math.floor(Math.random() * range);
        ans = a + b;
      } else if (op === '-') {
        a = 1 + Math.floor(Math.random() * range);
        b = 1 + Math.floor(Math.random() * a);
        ans = a - b;
      } else if (op === '*') {
        const mulRange = level === 0 ? 9 : level === 1 ? 12 : 20;
        a = 2 + Math.floor(Math.random() * mulRange);
        b = 2 + Math.floor(Math.random() * mulRange);
        ans = a * b;
      } else {
        // 除法：先选 b 和 ans，再算 a = b * ans，保证整除
        const divRange = level === 1 ? 9 : 15;
        b = 2 + Math.floor(Math.random() * divRange);
        ans = 1 + Math.floor(Math.random() * divRange);
        a = b * ans;
      }
      const sym = op === '*' ? '×' : op === '/' ? '÷' : op;
      return { a: a, b: b, op: op, sym: sym, ans: ans, level: level };
    }

    function nextQuestion() {
      gameState.questionNum++;
      gameState.currentQ = generateQuestion(gameState.questionNum);
      answerInput.value = '';
      answerInput.style.display = 'block';
      answerInput.focus();
    }

    function submitAnswer() {
      if (!gameState.playing || !gameState.currentQ) return;
      const val = parseInt(answerInput.value, 10);
      if (isNaN(val)) return;
      const q = gameState.currentQ;
      if (val === q.ans) {
        gameState.score += 10;
        gameState.correct++;
        gameState.feedback = { ok: true, text: window.i18n ? (window.i18n.t('mathext_speed_correct') || '✓ 正确！+10') : '✓ 正确！+10' };
      } else {
        gameState.score -= 5;
        gameState.wrong++;
        gameState.feedback = { ok: false, text: window.i18n ? (window.i18n.t('mathext_speed_wrong', { ans: q.ans }) || ('✗ 错误！正确答案: ' + q.ans + ' (-5)')) : ('✗ 错误！正确答案: ' + q.ans + ' (-5)') };
      }
      gameState.feedbackTime = performance.now();
      // 分数不能为负
      if (gameState.score < 0) gameState.score = 0;
      nextQuestion();
      renderLeaderboard();
    }

    function endGame() {
      gameState.playing = false;
      answerInput.style.display = 'none';
      const name = (nameInput.value || '').trim() || (window.i18n ? (window.i18n.t('mathext_anonymous') || '匿名') : '匿名');
      saveScore(name, gameState.score, gameState.correct, gameState.wrong);
      renderLeaderboard();
      startBtn.textContent = window.i18n ? (window.i18n.t('mathext_speed_retry_btn') || '再来一次 (60秒)') : '再来一次 (60秒)';
      startBtn.disabled = false;
    }

    function startGame() {
      gameState = {
        playing: true,
        score: 0,
        correct: 0,
        wrong: 0,
        timeLeft: 60,
        currentQ: null,
        questionNum: 0,
        startTime: performance.now(),
        lastTick: performance.now(),
        feedback: null,
        feedbackTime: 0
      };
      startBtn.disabled = true;
      startBtn.textContent = window.i18n ? (window.i18n.t('mathext_speed_in_progress') || '挑战中...') : '挑战中...';
      nextQuestion();
      renderLeaderboard();
    }

    // 渲染主画面
    function render(now) {
      drawBackground(ctx);

      if (gameState.playing) {
        // 更新时间
        const dt = (now - gameState.lastTick) / 1000;
        gameState.lastTick = now;
        gameState.timeLeft -= dt;
        if (gameState.timeLeft <= 0) {
          gameState.timeLeft = 0;
          endGame();
        }
      }

      // 顶部信息条
      const q = gameState.currentQ;
      drawText(ctx, window.i18n ? (window.i18n.t('mathext_score_label', { score: gameState.score }) || ('得分: ' + gameState.score)) : ('得分: ' + gameState.score), 100, 35, {
        color: COLORS.accent, size: 22, bold: true, align: 'left'
      });
      drawText(ctx, window.i18n ? (window.i18n.t('mathext_score_detail', { correct: gameState.correct, wrong: gameState.wrong }) || ('答对: ' + gameState.correct + '  答错: ' + gameState.wrong)) : ('答对: ' + gameState.correct + '  答错: ' + gameState.wrong),
        220, 35, {
          color: COLORS.text, size: 14, align: 'left'
        });

      // 时间条
      const timeRatio = clamp(gameState.timeLeft / 60, 0, 1);
      const barX = 380, barY = 25, barW = 300, barH = 20;
      ctx.fillStyle = COLORS.bgPanel;
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = timeRatio > 0.3 ? COLORS.green : COLORS.red;
      ctx.fillRect(barX, barY, barW * timeRatio, barH);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      drawText(ctx, Math.ceil(gameState.timeLeft) + ' s', barX + barW / 2, barY + barH / 2, {
        color: COLORS.text, size: 14, bold: true
      });

      if (gameState.playing && q) {
        // 难度等级
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_question_progress', { n: gameState.questionNum, level: (q.level + 1) }) || ('第 ' + gameState.questionNum + ' 题  |  难度 Lv.' + (q.level + 1))) : ('第 ' + gameState.questionNum + ' 题  |  难度 Lv.' + (q.level + 1)),
          CANVAS_W / 2, 90, {
            color: COLORS.textDim, size: 14
          });

        // 题目（大字）
        const qText = q.a + ' ' + q.sym + ' ' + q.b + ' = ?';
        drawText(ctx, qText, CANVAS_W / 2, 180, {
          color: COLORS.accent, size: 48, bold: true, shadow: true
        });

        // 反馈消息
        if (gameState.feedback) {
          const elapsed = now - gameState.feedbackTime;
          if (elapsed < 1200) {
            const alpha = 1 - elapsed / 1200;
            ctx.save();
            ctx.globalAlpha = alpha;
            drawText(ctx, gameState.feedback.text, CANVAS_W / 2, 250, {
              color: gameState.feedback.ok ? COLORS.green : COLORS.red,
              size: 22, bold: true
            });
            ctx.restore();
          }
        }

        drawText(ctx, window.i18n ? (window.i18n.t('mathext_answer_hint') || '在下方输入框答题，按回车提交') : '在下方输入框答题，按回车提交', CANVAS_W / 2, 380, {
          color: COLORS.textDim, size: 13
        });
      } else if (!gameState.playing && gameState.score > 0) {
        // 结束画面
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_challenge_end') || '挑战结束！') : '挑战结束！', CANVAS_W / 2, 150, {
          color: COLORS.accent, size: 36, bold: true
        });
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_final_score', { score: gameState.score }) || ('最终得分: ' + gameState.score)) : ('最终得分: ' + gameState.score), CANVAS_W / 2, 200, {
          color: COLORS.green, size: 28, bold: true
        });
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_summary', { correct: gameState.correct, wrong: gameState.wrong }) || ('答对 ' + gameState.correct + ' 题，答错 ' + gameState.wrong + ' 题')) : ('答对 ' + gameState.correct + ' 题，答错 ' + gameState.wrong + ' 题'),
          CANVAS_W / 2, 240, {
            color: COLORS.text, size: 16
          });
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_saved_hint') || '已保存到排行榜，点击"再来一次"重新挑战') : '已保存到排行榜，点击"再来一次"重新挑战',
          CANVAS_W / 2, 290, {
            color: COLORS.textDim, size: 14
          });
      } else {
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_start_hint') || '点击"开始挑战"进行 60 秒速算答题') : '点击"开始挑战"进行 60 秒速算答题',
          CANVAS_W / 2, 150, {
            color: COLORS.textDim, size: 18
          });
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_rule_1') || '规则：60秒内尽可能多答题，答对+10分，答错-5分') : '规则：60秒内尽可能多答题，答对+10分，答错-5分',
          CANVAS_W / 2, 200, {
            color: COLORS.text, size: 14
          });
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_rule_2') || '每答 5 题难度提升一档（加减 → 乘除 → 大数运算）') : '每答 5 题难度提升一档（加减 → 乘除 → 大数运算）',
          CANVAS_W / 2, 230, {
            color: COLORS.text, size: 14
          });
      }

      rafId = requestAnimationFrame(render);
    }

    // 渲染排行榜（到 canvas 和/或 scoreList 元素）
    function renderLeaderboard() {
      const lb = loadLeaderboard();

      // canvas 上的排行榜（左下角）
      const ix = 20, iy = 250, iw = 280, ih = 160;
      ctx.save();
      ctx.fillStyle = COLORS.bgPanel;
      ctx.fillRect(ix, iy, iw, ih);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(ix, iy, iw, ih);
      drawText(ctx, window.i18n ? (window.i18n.t('mathext_leaderboard_title') || '🏆 排行榜 Top 10') : '🏆 排行榜 Top 10', ix + iw / 2, iy + 16, {
        color: COLORS.accent, size: 14, bold: true
      });
      if (lb.length === 0) {
        drawText(ctx, window.i18n ? (window.i18n.t('mathext_no_records') || '暂无记录') : '暂无记录', ix + iw / 2, iy + ih / 2, {
          color: COLORS.textDim, size: 13
        });
      } else {
        lb.slice(0, 7).forEach(function (entry, i) {
          const line = window.i18n ? (window.i18n.t('mathext_leaderboard_canvas_row', { rank: (i + 1), name: entry.name, score: entry.score, correct: entry.correct, wrong: entry.wrong }) || ((i + 1) + '. ' + entry.name + ' - ' + entry.score + '分 (' + entry.correct + '对/' + entry.wrong + '错)')) : ((i + 1) + '. ' + entry.name + ' - ' + entry.score + '分 (' + entry.correct + '对/' + entry.wrong + '错)');
          drawText(ctx, line, ix + 12, iy + 38 + i * 16, {
            color: i === 0 ? COLORS.accent : (i < 3 ? COLORS.green : COLORS.text),
            size: 11, align: 'left'
          });
        });
      }
      ctx.restore();

      // 同时渲染到 scoreList 元素（如果传入）
      if (scoreList && scoreList.appendChild) {
        while (scoreList.firstChild) scoreList.removeChild(scoreList.firstChild);
        if (lb.length === 0) {
          const empty = document.createElement('div');
          empty.textContent = window.i18n ? (window.i18n.t('mathext_no_records') || '暂无记录') : '暂无记录';
          empty.style.color = COLORS.textDim;
          empty.style.fontFamily = 'monospace';
          scoreList.appendChild(empty);
        } else {
          lb.forEach(function (entry, i) {
            const row = document.createElement('div');
            row.style.cssText = 'padding:4px 8px;border-bottom:1px solid ' + COLORS.bgDeep + ';font-family:monospace;color:' + COLORS.text + ';font-size:13px;';
            if (i === 0) row.style.color = COLORS.accent;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
            row.textContent = window.i18n ? (window.i18n.t('mathext_leaderboard_row', { medal: medal, rank: (i + 1), name: entry.name, score: entry.score, correct: entry.correct, wrong: entry.wrong, date: entry.date }) || (medal + ' ' + (i + 1) + '. ' + entry.name + ' — ' + entry.score + ' 分 (对' + entry.correct + '/错' + entry.wrong + ') [' + entry.date + ']')) : (medal + ' ' + (i + 1) + '. ' + entry.name + ' — ' + entry.score + ' 分 (对' + entry.correct + '/错' + entry.wrong + ') [' + entry.date + ']');
            scoreList.appendChild(row);
          });
        }
      }
    }

    // 事件绑定
    startBtn.addEventListener('click', startGame);
    answerInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitAnswer();
    });

    // 启动渲染循环
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(render);
    renderLeaderboard();
  }

  // ============================================================
  // 暴露到全局 / Expose to global
  // ============================================================
  return {
    initFraction: initFraction,
    initDecimal: initDecimal,
    initEquation: initEquation,
    initGeometry: initGeometry,
    initSpeedChallenge: initSpeedChallenge
  };
})();
