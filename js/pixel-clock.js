/**
 * pixel-clock.js
 * 像素时钟 + 日历 + 番茄钟 / Pixel Clock, Calendar & Pomodoro Timer
 *
 * 功能：
 *   - 复古像素风数字时钟（时分秒实时显示，闪烁冒号）
 *   - 像素日历（可标记事件、切换月份，事件存 localStorage）
 *   - 番茄钟（25 分钟工作 + 5 分钟休息，圆形进度条）
 *   - 3 种像素字体风格：digital / matrix / block
 *
 * 渲染：
 *   - Canvas 2D 像素风渲染（imageSmoothingEnabled = false）
 *   - requestAnimationFrame 驱动时钟与番茄钟刷新
 *
 * 用法：
 *   PixelClock.initClock(canvas);
 *   PixelClock.initCalendar(canvas);
 *   PixelClock.initPomodoro(canvas);
 *   PixelClock.setFontStyle('digital'); // 'digital' | 'matrix' | 'block'
 *
 * 算法哲学：像素深空 Pixel Deep Space（与站点 pixel.css 调色板一致）
 */
window.PixelClock = (function () {
  'use strict';

  // ============================================================
  // 颜色常量 / Colors（与 pixel.css 变量保持一致）
  // ============================================================
  const COLOR = {
    BG_DEEP:  '#1a1a2e', // 深空背景
    BG_PANEL: '#2d2d44', // 面板背景
    ACCENT:   '#ffd700', // 金色强调
    WORK:     '#ff4500', // 工作时间（火红）
    BREAK:    '#228b22', // 休息时间（树叶绿）
    TEXT:     '#ffffff', // 白色文字
    BORDER:   '#ffffff', // 边框
    DIM:      '#5a5a7a', // 暗色（未点亮段 / 灰色文字）
    GRID:     '#3d3d54'  // 网格线
  };

  // 字体风格列表
  const FONT_STYLES = ['digital', 'matrix', 'block'];

  // 星期中文名
  const WEEKDAY_CN = ['日', '一', '二', '三', '四', '五', '六'];

  // 运行时获取星期短名（支持 i18n）
  function getWeekdayShort(i) {
    return (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_weekday_short_' + i)) || WEEKDAY_CN[i];
  }

  // 运行时获取月份名（支持 i18n）
  function getMonthName(i) {
    return (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_month_' + (i + 1))) ||
      ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][i];
  }

  // localStorage 键
  const EVENTS_KEY = 'pixel_clock_calendar_events';

  // ============================================================
  // 像素数字图案 / Pixel Digit Patterns
  // ============================================================

  // 7 段数码管段定义：
  //   aaa
  //  f   b
  //  f   b
  //   ggg
  //  e   c
  //  e   c
  //   ddd
  // 每个数字对应点亮的段集合
  const SEGMENT_DIGITS = {
    '0': ['a', 'b', 'c', 'd', 'e', 'f'],
    '1': ['b', 'c'],
    '2': ['a', 'b', 'g', 'e', 'd'],
    '3': ['a', 'b', 'g', 'c', 'd'],
    '4': ['f', 'g', 'b', 'c'],
    '5': ['a', 'f', 'g', 'c', 'd'],
    '6': ['a', 'f', 'g', 'e', 'c', 'd'],
    '7': ['a', 'b', 'c'],
    '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    '9': ['a', 'b', 'c', 'd', 'f', 'g']
  };

  // 5x7 方块字体图案（1=亮，0=暗）—— block 风格
  const BLOCK_DIGITS = {
    '0': [
      '01110',
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '01110'
    ],
    '1': [
      '00100',
      '01100',
      '00100',
      '00100',
      '00100',
      '00100',
      '01110'
    ],
    '2': [
      '01110',
      '10001',
      '00001',
      '00010',
      '00100',
      '01000',
      '11111'
    ],
    '3': [
      '11110',
      '00001',
      '00001',
      '01110',
      '00001',
      '00001',
      '11110'
    ],
    '4': [
      '00010',
      '00110',
      '01010',
      '10010',
      '11111',
      '00010',
      '00010'
    ],
    '5': [
      '11111',
      '10000',
      '11110',
      '00001',
      '00001',
      '10001',
      '01110'
    ],
    '6': [
      '00110',
      '01000',
      '10000',
      '11110',
      '10001',
      '10001',
      '01110'
    ],
    '7': [
      '11111',
      '00001',
      '00010',
      '00100',
      '01000',
      '01000',
      '01000'
    ],
    '8': [
      '01110',
      '10001',
      '10001',
      '01110',
      '10001',
      '10001',
      '01110'
    ],
    '9': [
      '01110',
      '10001',
      '10001',
      '01111',
      '00001',
      '00010',
      '01100'
    ],
    ':': [
      '00000',
      '00000',
      '00100',
      '00000',
      '00000',
      '00100',
      '00000'
    ]
  };

  // 8x8 点阵字体图案（1=亮，0=暗）—— matrix 风格
  const MATRIX_DIGITS = {
    '0': [
      '00111100',
      '01100110',
      '01100110',
      '01100110',
      '01100110',
      '01100110',
      '01100110',
      '00111100'
    ],
    '1': [
      '00011000',
      '00111000',
      '00011000',
      '00011000',
      '00011000',
      '00011000',
      '00011000',
      '01111110'
    ],
    '2': [
      '00111100',
      '01100110',
      '00000110',
      '00001100',
      '00011000',
      '00110000',
      '01111110',
      '00000000'
    ],
    '3': [
      '00111100',
      '01100110',
      '00000110',
      '00011100',
      '00000110',
      '01100110',
      '00111100',
      '00000000'
    ],
    '4': [
      '00001100',
      '00011100',
      '00101100',
      '01001100',
      '01111110',
      '00001100',
      '00001100',
      '00000000'
    ],
    '5': [
      '01111110',
      '01100000',
      '01111100',
      '00000110',
      '00000110',
      '01100110',
      '00111100',
      '00000000'
    ],
    '6': [
      '00011100',
      '00110000',
      '01100000',
      '01111100',
      '01100110',
      '01100110',
      '00111100',
      '00000000'
    ],
    '7': [
      '01111110',
      '00000110',
      '00001100',
      '00011000',
      '00110000',
      '00110000',
      '00110000',
      '00000000'
    ],
    '8': [
      '00111100',
      '01100110',
      '01100110',
      '00111100',
      '01100110',
      '01100110',
      '00111100',
      '00000000'
    ],
    '9': [
      '00111100',
      '01100110',
      '01100110',
      '00111110',
      '00000110',
      '00001100',
      '00111000',
      '00000000'
    ],
    ':': [
      '00000000',
      '00000000',
      '00011000',
      '00000000',
      '00000000',
      '00011000',
      '00000000',
      '00000000'
    ]
  };

  // ============================================================
  // 模块状态 / Module State
  // ============================================================

  // 当前字体风格
  let currentFontStyle = 'digital';

  // 时钟状态
  let clockCanvas = null;
  let clockCtx = null;
  let clockRAF = null;

  // 日历状态
  let calendarCanvas = null;
  let calendarCtx = null;
  let calendarViewDate = new Date(); // 当前查看的月份
  let calendarClickHandler = null;
  let calendarPrevHit = null; // 上一月按钮命中区 {x,y,w,h}
  let calendarNextHit = null; // 下一月按钮命中区

  // 番茄钟状态
  const POMODORO_WORK_MIN = 25;
  const POMODORO_BREAK_MIN = 5;
  let pomodoroCanvas = null;
  let pomodoroCtx = null;
  let pomodoroRAF = null;
  let pomodoroClickHandler = null;
  let pomodoroButtons = []; // 按钮命中区列表 [{type,x,y,w,h}]
  let pomodoroState = {
    mode: 'work',       // 'work' | 'break'
    running: false,
    remaining: POMODORO_WORK_MIN * 60, // 剩余秒数
    completed: 0,        // 完成的番茄数
    endAt: 0             // 运行时记录结束时间戳
  };

  // ============================================================
  // 工具函数 / Utilities
  // ============================================================

  // 读取事件数据
  function loadEvents() {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  // 保存事件数据
  function saveEvents(events) {
    try {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch (e) { /* 忽略写入错误 */ }
  }

  // 日期转 key（YYYY-MM-DD）
  function dateKey(year, month, day) {
    return year + '-' +
      String(month + 1).padStart(2, '0') + '-' +
      String(day).padStart(2, '0');
  }

  // 清空画布并填充背景
  function clearCanvas(ctx, canvas) {
    ctx.fillStyle = COLOR.BG_DEEP;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 命中测试
  function hitTest(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w &&
           y >= rect.y && y <= rect.y + rect.h;
  }

  // ============================================================
  // 像素数字绘制 / Pixel Digit Drawing
  // ============================================================

  /**
   * 绘制 7 段数码管字符（digital 风格）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} ch - 单个字符（0-9 或 ':'）
   * @param {number} x - 左上角 x
   * @param {number} y - 左上角 y
   * @param {number} w - 字符总宽
   * @param {number} h - 字符总高
   * @param {string} color - 点亮色
   */
  function drawDigitalChar(ctx, ch, x, y, w, h, color) {
    // ':' 特殊处理：画两个点
    if (ch === ':') {
      const dotSize = Math.max(2, Math.floor(w * 0.6));
      const cx = x + (w - dotSize) / 2;
      ctx.fillStyle = color;
      ctx.fillRect(cx, y + h * 0.28 - dotSize / 2, dotSize, dotSize);
      ctx.fillRect(cx, y + h * 0.72 - dotSize / 2, dotSize, dotSize);
      return;
    }

    const segs = SEGMENT_DIGITS[ch];
    if (!segs) return;

    // 段粗细（按尺寸自适应）
    const t = Math.max(2, Math.floor(Math.min(w, h) * 0.14));
    const innerW = w - t * 2;
    const innerH = h - t * 2;
    const midY = y + h / 2;
    const allSegs = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

    // 先画暗色底（所有段），再画亮色段，营造数码管未点亮段的效果
    ctx.fillStyle = COLOR.DIM;
    for (const s of allSegs) drawSegment(ctx, s, x, y, innerW, innerH, t, midY);
    ctx.fillStyle = color;
    for (const s of segs) drawSegment(ctx, s, x, y, innerW, innerH, t, midY);
  }

  // 绘制单段（水平/竖直长方形）
  function drawSegment(ctx, seg, x, y, innerW, innerH, t, midY) {
    const left = x + t;
    const right = x + innerW + t;
    const top = y + t;
    const bottom = y + innerH + t;
    switch (seg) {
      case 'a': // 顶
        ctx.fillRect(left, top, innerW, t);
        break;
      case 'b': // 右上
        ctx.fillRect(right - t, top, t, innerH / 2);
        break;
      case 'c': // 右下
        ctx.fillRect(right - t, midY, t, innerH / 2);
        break;
      case 'd': // 底
        ctx.fillRect(left, bottom - t, innerW, t);
        break;
      case 'e': // 左下
        ctx.fillRect(left, midY, t, innerH / 2);
        break;
      case 'f': // 左上
        ctx.fillRect(left, top, t, innerH / 2);
        break;
      case 'g': // 中
        ctx.fillRect(left, midY - t / 2, innerW, t);
        break;
    }
  }

  /**
   * 绘制点阵字符（matrix 风格，8x8）
   */
  function drawMatrixChar(ctx, ch, x, y, w, h, color) {
    const pattern = MATRIX_DIGITS[ch];
    if (!pattern) return;
    const rows = pattern.length;
    const cols = pattern[0].length;
    const cellW = w / cols;
    const cellH = h / rows;
    // 每个点画成略小的方块，保留间隙形成点阵感
    const dotSize = Math.min(cellW, cellH) * 0.78;
    const offsetX = (cellW - dotSize) / 2;
    const offsetY = (cellH - dotSize) / 2;
    ctx.fillStyle = color;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (pattern[r][c] === '1') {
          ctx.fillRect(
            x + c * cellW + offsetX,
            y + r * cellH + offsetY,
            dotSize, dotSize
          );
        }
      }
    }
  }

  /**
   * 绘制方块字符（block 风格，5x7）
   */
  function drawBlockChar(ctx, ch, x, y, w, h, color) {
    const pattern = BLOCK_DIGITS[ch];
    if (!pattern) return;
    const rows = pattern.length;
    const cols = pattern[0].length;
    const cellW = w / cols;
    const cellH = h / rows;
    ctx.fillStyle = color;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (pattern[r][c] === '1') {
          // 方块风格：填满整个格子，无间隙
          ctx.fillRect(
            Math.floor(x + c * cellW),
            Math.floor(y + r * cellH),
            Math.ceil(cellW),
            Math.ceil(cellH)
          );
        }
      }
    }
  }

  /**
   * 按当前字体风格绘制字符
   */
  function drawChar(ctx, ch, x, y, w, h, color) {
    switch (currentFontStyle) {
      case 'matrix': return drawMatrixChar(ctx, ch, x, y, w, h, color);
      case 'block':  return drawBlockChar(ctx, ch, x, y, w, h, color);
      case 'digital':
      default:       return drawDigitalChar(ctx, ch, x, y, w, h, color);
    }
  }

  // ============================================================
  // 数字时钟 / Digital Clock
  // ============================================================

  /**
   * 初始化时钟
   * @param {HTMLCanvasElement} canvas
   */
  function initClock(canvas) {
    if (!canvas) return;
    // 清理上一次的动画
    if (clockRAF) cancelAnimationFrame(clockRAF);
    clockCanvas = canvas;
    clockCtx = canvas.getContext('2d');
    clockCtx.imageSmoothingEnabled = false;

    function render() {
      drawClock();
      clockRAF = requestAnimationFrame(render);
    }
    render();
  }

  // 绘制时钟画面
  function drawClock() {
    const ctx = clockCtx;
    const canvas = clockCanvas;
    if (!ctx || !canvas) return;

    clearCanvas(ctx, canvas);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    // 闪烁冒号：每秒切换一次（前 500ms 亮，后 500ms 暗）
    const blink = now.getMilliseconds() < 500;
    const colonColor = blink ? COLOR.ACCENT : COLOR.DIM;

    // 计算字符尺寸：HH:MM:SS = 6 个数字 + 2 个冒号
    // 冒号宽度按数字宽度的 0.4 倍
    const gap = Math.max(2, Math.floor(canvas.width * 0.008));
    const availW = canvas.width * 0.92;
    let charW = Math.floor((availW - 7 * gap) / (6 + 2 * 0.4));
    let charH = Math.floor(charW * 1.6);
    // 限制高度不超过画布的 55%
    const maxH = canvas.height * 0.55;
    if (charH > maxH) {
      charH = Math.floor(maxH);
      charW = Math.floor(charH / 1.6);
    }
    const colonW = Math.max(2, Math.floor(charW * 0.4));

    // 整体居中
    const totalW = 6 * charW + 2 * colonW + 7 * gap;
    let x = (canvas.width - totalW) / 2;
    const y = canvas.height * 0.12;

    const time = hh + ':' + mm + ':' + ss;
    for (let i = 0; i < time.length; i++) {
      const ch = time[i];
      const w = (ch === ':') ? colonW : charW;
      const color = (ch === ':') ? colonColor : COLOR.ACCENT;
      drawChar(ctx, ch, x, y, w, charH, color);
      x += w + gap;
    }

    // 日期 + 星期
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const week = getWeekdayShort(now.getDay());
    var isEn = (typeof window !== 'undefined' && window.i18n && window.i18n.getCurrentLang && window.i18n.getCurrentLang() === 'en');
    var dateStr;
    if (isEn) {
      // 英文格式：MM/DD/YYYY   Day
      dateStr = String(month).padStart(2, '0') + '/' +
        String(day).padStart(2, '0') + '/' + year + '   ' + week;
    } else {
      // 中文格式：YYYY-MM-DD   星期X
      var weekdayPrefix = '星期';
      dateStr = year + '-' +
        String(month).padStart(2, '0') + '-' +
        String(day).padStart(2, '0') + '   ' + weekdayPrefix + week;
    }

    ctx.fillStyle = COLOR.TEXT;
    ctx.font = 'bold ' + Math.floor(canvas.height * 0.06) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dateStr, canvas.width / 2, canvas.height * 0.82);

    // 字体风格提示
    ctx.fillStyle = COLOR.DIM;
    ctx.font = Math.floor(canvas.height * 0.035) + 'px monospace';
    const fontHintText = (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_font_switch_hint', { style: currentFontStyle.toUpperCase() })) || '[ ' + currentFontStyle.toUpperCase() + ' ]  ·  PixelClock.setFontStyle() 切换风格';
    ctx.fillText(fontHintText,
      canvas.width / 2, canvas.height * 0.93);
  }

  // ============================================================
  // 像素日历 / Pixel Calendar
  // ============================================================

  /**
   * 初始化日历
   * @param {HTMLCanvasElement} canvas
   */
  function initCalendar(canvas) {
    if (!canvas) return;
    // 移除旧画布的监听器
    if (calendarCanvas && calendarClickHandler) {
      calendarCanvas.removeEventListener('click', calendarClickHandler);
    }
    calendarCanvas = canvas;
    calendarCtx = canvas.getContext('2d');
    calendarCtx.imageSmoothingEnabled = false;
    calendarViewDate = new Date();

    calendarClickHandler = handleCalendarClick;
    canvas.addEventListener('click', calendarClickHandler);

    drawCalendar();
  }

  // 切换月份（delta = -1 或 +1）
  function changeMonth(delta) {
    calendarViewDate.setDate(1); // 避免跨月跳转时日期溢出
    calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
    drawCalendar();
  }

  // 处理日历点击
  function handleCalendarClick(e) {
    if (!calendarCanvas) return;
    const rect = calendarCanvas.getBoundingClientRect();
    // 考虑画布 CSS 缩放
    const scaleX = calendarCanvas.width / rect.width;
    const scaleY = calendarCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 上一月 / 下一月按钮
    if (calendarPrevHit && hitTest(x, y, calendarPrevHit)) {
      changeMonth(-1);
      return;
    }
    if (calendarNextHit && hitTest(x, y, calendarNextHit)) {
      changeMonth(1);
      return;
    }

    // 日期格点击：切换事件标记
    const day = getDayAtPoint(x, y);
    if (day > 0) {
      toggleEvent(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
      drawCalendar();
    }
  }

  // 根据坐标返回对应日期（无则返回 0）
  function getDayAtPoint(x, y) {
    const layout = computeCalendarLayout();
    if (!layout) return 0;
    if (x < layout.gridX || x > layout.gridX + layout.gridW ||
        y < layout.gridY || y > layout.gridY + layout.gridH) return 0;
    const col = Math.floor((x - layout.gridX) / layout.cellW);
    const row = Math.floor((y - layout.gridY) / layout.cellH);
    if (col < 0 || col > 6 || row < 0 || row > layout.rows - 1) return 0;
    const index = row * 7 + col;
    const day = index - layout.firstWeekday + 1;
    if (day < 1 || day > layout.daysInMonth) return 0;
    return day;
  }

  // 切换事件标记
  function toggleEvent(year, month, day) {
    const events = loadEvents();
    const key = dateKey(year, month, day);
    if (events[key]) {
      delete events[key];
    } else {
      events[key] = { marked: true, ts: Date.now() };
    }
    saveEvents(events);
  }

  // 计算日历布局参数
  function computeCalendarLayout() {
    if (!calendarCanvas) return null;
    const canvas = calendarCanvas;
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=周日
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const headerH = canvas.height * 0.15;
    const weekdayH = canvas.height * 0.07;
    const gridTop = headerH + weekdayH;
    const gridBottom = canvas.height * 0.95;
    const gridX = canvas.width * 0.05;
    const gridW = canvas.width * 0.90;
    const gridH = gridBottom - gridTop;
    const cellW = gridW / 7;
    // 行数：根据当月首日与天数动态计算（5 或 6）
    const rows = Math.ceil((firstWeekday + daysInMonth) / 7);
    const cellH = gridH / rows;

    return {
      year, month, firstWeekday, daysInMonth,
      headerH, weekdayH, gridX, gridY: gridTop, gridW, gridH,
      cellW, cellH, rows
    };
  }

  // 绘制日历
  function drawCalendar() {
    const ctx = calendarCtx;
    const canvas = calendarCanvas;
    if (!ctx || !canvas) return;

    clearCanvas(ctx, canvas);
    const layout = computeCalendarLayout();
    if (!layout) return;

    const { year, month, firstWeekday, daysInMonth,
            headerH, weekdayH, gridX, gridY, gridW, gridH,
            cellW, cellH, rows } = layout;

    // ===== 标题：年月 =====
    const monthName = getMonthName(month);
    ctx.fillStyle = COLOR.ACCENT;
    ctx.font = 'bold ' + Math.floor(canvas.height * 0.06) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const yearMonthStr = (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_year_month', { year: year, month: monthName })) || (year + '年 ' + monthName);
    ctx.fillText(yearMonthStr, canvas.width / 2, headerH / 2);

    // 上一月 / 下一月按钮（像素方块箭头）
    const btnSize = Math.floor(Math.min(headerH * 0.5, canvas.width * 0.06));
    const btnY = (headerH - btnSize) / 2;
    calendarPrevHit = { x: canvas.width * 0.08, y: btnY, w: btnSize, h: btnSize };
    calendarNextHit = { x: canvas.width * 0.92 - btnSize, y: btnY, w: btnSize, h: btnSize };
    drawArrow(ctx, calendarPrevHit, 'left', COLOR.TEXT);
    drawArrow(ctx, calendarNextHit, 'right', COLOR.TEXT);

    // ===== 星期表头 =====
    const weekHeaders = [0, 1, 2, 3, 4, 5, 6].map(getWeekdayShort);
    ctx.font = 'bold ' + Math.floor(canvas.height * 0.04) + 'px monospace';
    for (let i = 0; i < 7; i++) {
      const cx = gridX + i * cellW + cellW / 2;
      const cy = headerH + weekdayH / 2;
      ctx.fillStyle = (i === 0 || i === 6) ? COLOR.WORK : COLOR.TEXT;
      ctx.fillText(weekHeaders[i], cx, cy);
    }

    // ===== 日期格 =====
    const today = new Date();
    const isCurrentMonth = (year === today.getFullYear() && month === today.getMonth());
    const events = loadEvents();

    for (let day = 1; day <= daysInMonth; day++) {
      const index = firstWeekday + day - 1;
      const row = Math.floor(index / 7);
      const col = index % 7;
      const cx = gridX + col * cellW;
      const cy = gridY + row * cellH;

      const isToday = isCurrentMonth && (day === today.getDate());
      const key = dateKey(year, month, day);
      const hasEvent = !!events[key];
      const isWeekend = (col === 0 || col === 6);

      // 格子背景
      ctx.fillStyle = isToday ? COLOR.ACCENT : COLOR.BG_PANEL;
      ctx.fillRect(cx + 1, cy + 1, cellW - 2, cellH - 2);
      // 格子边框
      ctx.strokeStyle = COLOR.GRID;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx + 1, cy + 1, cellW - 2, cellH - 2);

      // 日期数字
      ctx.fillStyle = isToday ? COLOR.BG_DEEP : (isWeekend ? COLOR.WORK : COLOR.TEXT);
      ctx.font = 'bold ' + Math.floor(cellH * 0.4) + 'px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(String(day), cx + cellW * 0.12, cy + cellH * 0.12);

      // 事件标记：小圆点
      if (hasEvent) {
        ctx.fillStyle = isToday ? COLOR.BG_DEEP : COLOR.ACCENT;
        ctx.beginPath();
        ctx.arc(cx + cellW * 0.82, cy + cellH * 0.78,
                Math.min(cellW, cellH) * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 底部提示
    ctx.fillStyle = COLOR.DIM;
    ctx.font = Math.floor(canvas.height * 0.03) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const calEventHint = (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_cal_event_hint')) || '点击日期标记事件  ·  事件保存在 localStorage';
    ctx.fillText(calEventHint, canvas.width / 2, canvas.height * 0.985);
  }

  // 绘制像素箭头按钮（5x5 像素图案）
  function drawArrow(ctx, rect, dir, color) {
    const { x, y, w, h } = rect;
    // 按钮背景与边框
    ctx.fillStyle = COLOR.BG_PANEL;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // 5x5 像素箭头图案（► 向右）
    const arrow = [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0]
    ];
    const unit = Math.floor(Math.min(w, h) / 6);
    const startX = x + w / 2 - 2.5 * unit;
    const startY = y + h / 2 - 2.5 * unit;
    ctx.fillStyle = color;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        // 向左时水平镜像
        const col = dir === 'left' ? 4 - c : c;
        if (arrow[r][col]) {
          ctx.fillRect(
            Math.floor(startX + c * unit),
            Math.floor(startY + r * unit),
            unit, unit
          );
        }
      }
    }
  }

  // ============================================================
  // 番茄钟 / Pomodoro Timer
  // ============================================================

  /**
   * 初始化番茄钟
   * @param {HTMLCanvasElement} canvas
   */
  function initPomodoro(canvas) {
    if (!canvas) return;
    if (pomodoroRAF) cancelAnimationFrame(pomodoroRAF);
    // 移除旧画布的监听器
    if (pomodoroCanvas && pomodoroClickHandler) {
      pomodoroCanvas.removeEventListener('click', pomodoroClickHandler);
    }
    pomodoroCanvas = canvas;
    pomodoroCtx = canvas.getContext('2d');
    pomodoroCtx.imageSmoothingEnabled = false;

    // 重置状态
    pomodoroState = {
      mode: 'work',
      running: false,
      remaining: POMODORO_WORK_MIN * 60,
      completed: 0,
      endAt: 0
    };

    pomodoroClickHandler = handlePomodoroClick;
    canvas.addEventListener('click', pomodoroClickHandler);

    function loop() {
      // 运行中：根据结束时间戳更新剩余秒数
      if (pomodoroState.running) {
        const remainingMs = pomodoroState.endAt - Date.now();
        if (remainingMs <= 0) {
          // 模式切换：工作 → 休息 → 工作 ...
          if (pomodoroState.mode === 'work') {
            pomodoroState.completed++;
            pomodoroState.mode = 'break';
            pomodoroState.remaining = POMODORO_BREAK_MIN * 60;
          } else {
            pomodoroState.mode = 'work';
            pomodoroState.remaining = POMODORO_WORK_MIN * 60;
          }
          pomodoroState.running = false;
        } else {
          pomodoroState.remaining = Math.ceil(remainingMs / 1000);
        }
      }
      drawPomodoro();
      pomodoroRAF = requestAnimationFrame(loop);
    }
    loop();
  }

  // 处理番茄钟按钮点击
  function handlePomodoroClick(e) {
    if (!pomodoroCanvas) return;
    const rect = pomodoroCanvas.getBoundingClientRect();
    const scaleX = pomodoroCanvas.width / rect.width;
    const scaleY = pomodoroCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (const btn of pomodoroButtons) {
      if (hitTest(x, y, btn)) {
        if (btn.type === 'start') {
          if (!pomodoroState.running) {
            pomodoroState.running = true;
            pomodoroState.endAt = Date.now() + pomodoroState.remaining * 1000;
          }
        } else if (btn.type === 'pause') {
          if (pomodoroState.running) {
            pomodoroState.running = false;
          }
        } else if (btn.type === 'reset') {
          pomodoroState.running = false;
          pomodoroState.remaining = (pomodoroState.mode === 'work'
            ? POMODORO_WORK_MIN : POMODORO_BREAK_MIN) * 60;
        }
        return;
      }
    }
  }

  // 绘制番茄钟
  function drawPomodoro() {
    const ctx = pomodoroCtx;
    const canvas = pomodoroCanvas;
    if (!ctx || !canvas) return;

    clearCanvas(ctx, canvas);

    const isWork = pomodoroState.mode === 'work';
    const primaryColor = isWork ? COLOR.WORK : COLOR.BREAK;

    // ===== 标题 =====
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold ' + Math.floor(canvas.height * 0.05) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const modeText = isWork
      ? ((typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_pomodoro_work')) || '工作时间')
      : ((typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_pomodoro_break')) || '休息时间');
    ctx.fillText(modeText, canvas.width / 2, canvas.height * 0.07);

    // ===== 圆形进度条 =====
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.42;
    const radius = Math.min(canvas.width, canvas.height) * 0.30;
    const totalSeconds = (isWork ? POMODORO_WORK_MIN : POMODORO_BREAK_MIN) * 60;
    const progress = 1 - (pomodoroState.remaining / totalSeconds);

    // 背景圆
    ctx.strokeStyle = COLOR.BG_PANEL;
    ctx.lineWidth = Math.max(6, radius * 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 进度圆弧（从顶部顺时针）
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = Math.max(6, radius * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2,
            -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // ===== 倒计时数字（大号像素风）=====
    const mins = Math.floor(pomodoroState.remaining / 60);
    const secs = pomodoroState.remaining % 60;
    const timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

    // 在圆内绘制 MM:SS（3 个数字 + 2 个冒号）
    const gap = Math.max(2, Math.floor(canvas.width * 0.006));
    const availW = radius * 1.5;
    let charW = Math.floor((availW - 4 * gap) / (3 + 2 * 0.4));
    let charH = Math.floor(charW * 1.5);
    const maxH = radius * 1.1;
    if (charH > maxH) {
      charH = Math.floor(maxH);
      charW = Math.floor(charH / 1.5);
    }
    const colonW = Math.max(2, Math.floor(charW * 0.4));
    const totalW = 3 * charW + 2 * colonW + 4 * gap;
    let x = cx - totalW / 2;
    const y = cy - charH / 2;

    for (let i = 0; i < timeStr.length; i++) {
      const ch = timeStr[i];
      const w = (ch === ':') ? colonW : charW;
      drawChar(ctx, ch, x, y, w, charH, primaryColor);
      x += w + gap;
    }

    // ===== 已完成番茄数 =====
    ctx.fillStyle = COLOR.ACCENT;
    ctx.font = 'bold ' + Math.floor(canvas.height * 0.035) + 'px monospace';
    const completedText = (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_pomodoro_completed', { n: pomodoroState.completed })) || ('已完成 ' + pomodoroState.completed + ' 个番茄');
    ctx.fillText(completedText,
      canvas.width / 2, canvas.height * 0.70);

    // 番茄图标行（小圆点）
    const dotCount = Math.min(pomodoroState.completed, 10);
    const dotSize = Math.max(6, canvas.width * 0.014);
    const dotGap = dotSize * 0.6;
    if (dotCount > 0) {
      const dotsW = dotCount * dotSize + (dotCount - 1) * dotGap;
      let dx = cx - dotsW / 2;
      for (let i = 0; i < dotCount; i++) {
        ctx.fillStyle = COLOR.WORK;
        ctx.beginPath();
        ctx.arc(dx + dotSize / 2, canvas.height * 0.76, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
        dx += dotSize + dotGap;
      }
    }

    // ===== 按钮：开始 / 暂停 / 重置 =====
    const btnW = canvas.width * 0.18;
    const btnH = canvas.height * 0.10;
    const btnY = canvas.height * 0.86;
    const btnGap = canvas.width * 0.04;
    const totalBtnW = 3 * btnW + 2 * btnGap;
    let bx = (canvas.width - totalBtnW) / 2;

    const startBtn = { type: 'start', x: bx, y: btnY, w: btnW, h: btnH };
    bx += btnW + btnGap;
    const pauseBtn = { type: 'pause', x: bx, y: btnY, w: btnW, h: btnH };
    bx += btnW + btnGap;
    const resetBtn = { type: 'reset', x: bx, y: btnY, w: btnW, h: btnH };

    pomodoroButtons = [startBtn, pauseBtn, resetBtn];

    // 运行中：开始按钮变暗，暂停按钮高亮；反之亦然
    drawPomodoroButton(ctx, startBtn,
      (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_pomodoro_start')) || '开始',
      pomodoroState.running ? COLOR.DIM : COLOR.BREAK);
    drawPomodoroButton(ctx, pauseBtn,
      (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_pomodoro_pause')) || '暂停',
      pomodoroState.running ? COLOR.WORK : COLOR.DIM);
    drawPomodoroButton(ctx, resetBtn,
      (typeof window !== 'undefined' && window.i18n && window.i18n.t('clock_pomodoro_reset')) || '重置',
      COLOR.ACCENT);
  }

  // 绘制番茄钟按钮
  function drawPomodoroButton(ctx, rect, label, color) {
    const { x, y, w, h } = rect;
    ctx.fillStyle = COLOR.BG_PANEL;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = color;
    ctx.font = 'bold ' + Math.floor(h * 0.42) + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  // ============================================================
  // 字体风格切换 / Font Style Switching
  // ============================================================

  /**
   * 设置字体风格
   * @param {string} style - 'digital' | 'matrix' | 'block'
   */
  function setFontStyle(style) {
    if (FONT_STYLES.indexOf(style) === -1) {
      console.warn('[PixelClock] 未知字体风格：' + style +
                   '，可选：' + FONT_STYLES.join(', '));
      return;
    }
    currentFontStyle = style;
    // 时钟与番茄钟由各自的 RAF 循环自动刷新，无需手动重绘
    // 日历不依赖字体风格
  }

  // ============================================================
  // 公开接口 / Public API
  // ============================================================
  return {
    initClock: initClock,
    initCalendar: initCalendar,
    initPomodoro: initPomodoro,
    setFontStyle: setFontStyle
  };
})();
