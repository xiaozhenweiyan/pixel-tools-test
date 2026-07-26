/**
 * pixel-drawing-editor.js
 * 像素绘图编辑器 - 进阶功能模块
 * Pixel Drawing Editor - Advanced Features Module
 *
 * 功能：
 *   - 画笔 / Brush
 *   - 橡皮 / Eraser
 *   - 取色器 / Color Picker
 *   - 填色桶 / Fill Bucket
 *   - 清空画布 / Clear Canvas
 *   - 网格线开关 / Grid Toggle
 *   - 16 色调色板 / 16-color Palette
 *   - 自定义颜色 / Custom Color
 *   - 画布尺寸切换 / Canvas Size Switching
 *   - 导出 PNG / Export PNG
 *   - 右键取色 / Right-click Color Pick
 *   - 撤销/重做 / Undo/Redo
 *   - 直线工具 / Line Tool
 *   - 矩形工具 / Rectangle Tool
 *   - 圆形工具 / Circle Tool
 *   - 水平镜像 / Horizontal Mirror
 *   - 键盘快捷键 / Keyboard Shortcuts
 */
(function () {
  'use strict';

  const PALETTE = [
    '#000000', '#1D2B53', '#7E2553', '#008751',
    '#AB5236', '#5F574F', '#C2C3C7', '#FFF1E8',
    '#FF004D', '#FFA300', '#FFEC27', '#00E436',
    '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
  ];

  const MAX_HISTORY = 50;

  const state = {
    canvasSize: 32,
    currentTool: 'brush',
    foregroundColor: '#FF004D',
    backgroundColor: '#000000',
    isDrawing: false,
    showGrid: true,
    imageData: null,
    lastPixelX: -1,
    lastPixelY: -1,
    historyStack: [],
    historyIndex: -1,
    isDrawingShape: false,
    shapeStartX: 0,
    shapeStartY: 0,
    shapeCurrentX: 0,
    shapeCurrentY: 0,
    mirrorEnabled: false
  };

  let canvas = null;
  let ctx = null;

  function init() {
    canvas = document.getElementById('pixel-drawing-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    initCanvas();
    initToolbar();
    initPalette();
    initColorPicker();
    initSizeButtons();
    initExportButton();
    initCanvasEvents();
    initKeyboardShortcuts();
    saveHistory();
    document.addEventListener('languagechange', onLanguageChange);
  }

  function initCanvas() {
    canvas.width = state.canvasSize;
    canvas.height = state.canvasSize;
    ctx.imageSmoothingEnabled = false;
    clearCanvas(false);
    state.historyStack = [];
    state.historyIndex = -1;
  }

  function clearCanvas(showNotification) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (showNotification) {
      showToast(i18n.t('toast_canvas_cleared'));
    }
  }

  function saveHistory() {
    if (!state.imageData) return;

    state.historyStack = state.historyStack.slice(0, state.historyIndex + 1);

    const snapshot = new ImageData(
      new Uint8ClampedArray(state.imageData.data),
      state.imageData.width,
      state.imageData.height
    );
    state.historyStack.push(snapshot);

    if (state.historyStack.length > MAX_HISTORY) {
      state.historyStack.shift();
    } else {
      state.historyIndex++;
    }

    updateUndoRedoButtons();
  }

  function undo() {
    if (state.historyIndex <= 0) return;

    state.historyIndex--;
    const snapshot = state.historyStack[state.historyIndex];
    state.imageData = new ImageData(
      new Uint8ClampedArray(snapshot.data),
      snapshot.width,
      snapshot.height
    );
    ctx.putImageData(state.imageData, 0, 0);

    if (state.showGrid) {
      drawGridOverlay();
    }

    updateUndoRedoButtons();
    showToast(i18n.t('tool_undo'));
  }

  function redo() {
    if (state.historyIndex >= state.historyStack.length - 1) return;

    state.historyIndex++;
    const snapshot = state.historyStack[state.historyIndex];
    state.imageData = new ImageData(
      new Uint8ClampedArray(snapshot.data),
      snapshot.width,
      snapshot.height
    );
    ctx.putImageData(state.imageData, 0, 0);

    if (state.showGrid) {
      drawGridOverlay();
    }

    updateUndoRedoButtons();
    showToast(i18n.t('tool_redo'));
  }

  function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('tool-undo');
    const redoBtn = document.getElementById('tool-redo');
    if (undoBtn) {
      undoBtn.classList.toggle('disabled', state.historyIndex <= 0);
    }
    if (redoBtn) {
      redoBtn.classList.toggle('disabled', state.historyIndex >= state.historyStack.length - 1);
    }
  }

  function initToolbar() {
    const tools = [
      { id: 'tool-undo', tool: 'undo', icon: '↶', label: 'tool_undo' },
      { id: 'tool-redo', tool: 'redo', icon: '↷', label: 'tool_redo' },
      { id: 'tool-brush', tool: 'brush', icon: '✏', label: 'tool_brush' },
      { id: 'tool-eraser', tool: 'eraser', icon: '⌫', label: 'tool_eraser' },
      { id: 'tool-picker', tool: 'picker', icon: '💧', label: 'tool_picker' },
      { id: 'tool-bucket', tool: 'bucket', icon: '🪣', label: 'tool_bucket' },
      { id: 'tool-line', tool: 'line', icon: '━', label: 'tool_line' },
      { id: 'tool-rect', tool: 'rect', icon: '▭', label: 'tool_rect' },
      { id: 'tool-circle', tool: 'circle', icon: '◯', label: 'tool_circle' },
      { id: 'tool-mirror', tool: 'mirror', icon: '⇋', label: 'tool_mirror' },
      { id: 'tool-clear', tool: 'clear', icon: '🗑', label: 'tool_clear' },
      { id: 'tool-grid', tool: 'grid', icon: '⊞', label: 'tool_grid' }
    ];

    tools.forEach(function (t) {
      const btn = document.getElementById(t.id);
      if (!btn) return;

      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.setAttribute('data-i18n', t.label);
      tooltip.textContent = i18n.t(t.label);
      btn.appendChild(tooltip);

      btn.addEventListener('click', function () {
        handleToolClick(t.tool, btn);
      });
    });

    updateActiveToolButton();
  }

  function handleToolClick(tool, btn) {
    if (tool === 'undo') {
      undo();
      return;
    }

    if (tool === 'redo') {
      redo();
      return;
    }

    if (tool === 'clear') {
      if (confirm(i18n.t('confirm_clear_canvas'))) {
        clearCanvas(true);
        saveHistory();
      }
      return;
    }

    if (tool === 'grid') {
      state.showGrid = !state.showGrid;
      btn.classList.toggle('active', state.showGrid);
      toggleGrid();
      return;
    }

    if (tool === 'mirror') {
      state.mirrorEnabled = !state.mirrorEnabled;
      btn.classList.toggle('active', state.mirrorEnabled);
      showToast(state.mirrorEnabled ? i18n.t('tool_mirror') + ' ON' : i18n.t('tool_mirror') + ' OFF');
      return;
    }

    state.currentTool = tool;
    updateActiveToolButton();
    updateCursor();
  }

  function updateActiveToolButton() {
    const toolIds = ['tool-brush', 'tool-eraser', 'tool-picker', 'tool-bucket', 'tool-line', 'tool-rect', 'tool-circle'];
    toolIds.forEach(function (id) {
      const btn = document.getElementById(id);
      if (!btn) return;
      const tool = id.replace('tool-', '');
      btn.classList.toggle('active', state.currentTool === tool);
    });
  }

  function updateCursor() {
    if (!canvas) return;
    switch (state.currentTool) {
      case 'brush':
      case 'line':
      case 'rect':
      case 'circle':
        canvas.style.cursor = 'crosshair';
        break;
      case 'eraser':
        canvas.style.cursor = 'cell';
        break;
      case 'picker':
        canvas.style.cursor = 'copy';
        break;
      case 'bucket':
        canvas.style.cursor = 'pointer';
        break;
      default:
        canvas.style.cursor = 'crosshair';
    }
  }

  function toggleGrid() {
    if (!canvas) return;
    if (state.showGrid) {
      canvas.style.boxShadow = '4px 4px 0 rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255,255,255,0.1)';
      drawGridOverlay();
    } else {
      redrawCanvas();
    }
  }

  function drawGridOverlay() {
    redrawCanvas();
    if (!state.showGrid) return;
    const size = state.canvasSize;
    const pixelSize = canvas.clientWidth / size;
    if (pixelSize < 4) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / pixelSize;

    for (let i = 1; i < size; i++) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
    for (let i = 1; i < size; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
    ctx.restore();
  }

  function initPalette() {
    const paletteContainer = document.getElementById('pixel-drawing-palette');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';

    PALETTE.forEach(function (color, index) {
      const colorEl = document.createElement('div');
      colorEl.className = 'pixel-drawing-palette-color';
      colorEl.style.backgroundColor = color;
      colorEl.dataset.color = color;
      colorEl.title = color;
      if (color === state.foregroundColor) {
        colorEl.classList.add('active');
      }

      colorEl.addEventListener('click', function (e) {
        if (e.button === 2 || e.ctrlKey) {
          setBackgroundColor(color);
        } else {
          setForegroundColor(color);
        }
      });

      colorEl.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        setBackgroundColor(color);
      });

      paletteContainer.appendChild(colorEl);
    });
  }

  function setForegroundColor(color) {
    state.foregroundColor = color;
    updateColorSwatches();
    updateActivePaletteColor();
  }

  function setBackgroundColor(color) {
    state.backgroundColor = color;
    updateColorSwatches();
  }

  function updateColorSwatches() {
    const fgSwatch = document.getElementById('color-swatch-fg');
    const bgSwatch = document.getElementById('color-swatch-bg');
    if (fgSwatch) fgSwatch.style.backgroundColor = state.foregroundColor;
    if (bgSwatch) bgSwatch.style.backgroundColor = state.backgroundColor;
  }

  function updateActivePaletteColor() {
    const colors = document.querySelectorAll('.pixel-drawing-palette-color');
    colors.forEach(function (el) {
      el.classList.toggle('active', el.dataset.color === state.foregroundColor);
    });
  }

  function initColorPicker() {
    const colorPicker = document.getElementById('custom-color-picker');
    if (!colorPicker) return;

    colorPicker.value = state.foregroundColor;
    colorPicker.addEventListener('input', function () {
      setForegroundColor(this.value);
    });

    const fgSwatch = document.getElementById('color-swatch-fg');
    const bgSwatch = document.getElementById('color-swatch-bg');

    if (fgSwatch) {
      fgSwatch.addEventListener('click', function () {
        colorPicker.value = state.foregroundColor;
        colorPicker.click();
      });
    }

    if (bgSwatch) {
      bgSwatch.addEventListener('click', function () {
        const temp = state.foregroundColor;
        setForegroundColor(state.backgroundColor);
        setBackgroundColor(temp);
        colorPicker.value = state.foregroundColor;
      });
    }
  }

  function initSizeButtons() {
    const sizes = [16, 32, 64, 128];
    sizes.forEach(function (size) {
      const btn = document.getElementById('size-' + size);
      if (!btn) return;
      if (size === state.canvasSize) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', function () {
        if (size === state.canvasSize) return;
        if (confirm(i18n.t('confirm_resize_canvas'))) {
          resizeCanvas(size);
        }
      });
    });
  }

  function resizeCanvas(size) {
    state.canvasSize = size;
    canvas.width = size;
    canvas.height = size;
    ctx.imageSmoothingEnabled = false;
    clearCanvas(false);
    state.historyStack = [];
    state.historyIndex = -1;
    saveHistory();

    document.querySelectorAll('.pixel-drawing-size-btn').forEach(function (btn) {
      btn.classList.remove('active');
    });
    const activeBtn = document.getElementById('size-' + size);
    if (activeBtn) activeBtn.classList.add('active');

    showToast(i18n.t('toast_canvas_resized', { size: size }));
  }

  function initExportButton() {
    const btn = document.getElementById('btn-export-png');
    if (!btn) return;
    btn.addEventListener('click', exportPNG);
  }

  function exportPNG() {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = state.canvasSize;
    exportCanvas.height = state.canvasSize;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.imageSmoothingEnabled = false;

    if (state.imageData) {
      exportCtx.putImageData(state.imageData, 0, 0);
    } else {
      exportCtx.drawImage(canvas, 0, 0);
    }

    const link = document.createElement('a');
    link.download = 'pixel-art-' + state.canvasSize + 'x' + state.canvasSize + '.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    showToast(i18n.t('toast_export_png'));
  }

  function initCanvasEvents() {
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    });

    let touchRafPending = false;

    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const fakeEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        preventDefault: function () {}
      };
      handleMouseDown(fakeEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (touchRafPending) return;
      if (e.touches.length !== 1) return;
      touchRafPending = true;
      requestAnimationFrame(function () {
        touchRafPending = false;
        if (!canvas) return;
        const touch = e.touches[0];
        const fakeEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY,
          preventDefault: function () {}
        };
        handleMouseMove(fakeEvent);
      });
    }, { passive: false });

    canvas.addEventListener('touchend', function (e) {
      e.preventDefault();
      handleMouseUp({ preventDefault: function () {} });
    }, { passive: false });

    canvas.addEventListener('touchcancel', function () {
      handleMouseUp({ preventDefault: function () {} });
    });
  }

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const page = document.getElementById('pixel-drawing-page');
      if (!page || !page.classList.contains('active')) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          undo();
          return;
        }
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
          return;
        }
      }

      const key = e.key.toLowerCase();
      const keyMap = {
        'b': 'brush',
        'e': 'eraser',
        'i': 'picker',
        'f': 'bucket',
        'l': 'line',
        'r': 'rect',
        'c': 'circle',
        'g': 'grid',
        'm': 'mirror'
      };

      if (keyMap[key]) {
        e.preventDefault();
        const tool = keyMap[key];
        if (tool === 'grid') {
          state.showGrid = !state.showGrid;
          const btn = document.getElementById('tool-grid');
          if (btn) btn.classList.toggle('active', state.showGrid);
          toggleGrid();
        } else if (tool === 'mirror') {
          state.mirrorEnabled = !state.mirrorEnabled;
          const btn = document.getElementById('tool-mirror');
          if (btn) btn.classList.toggle('active', state.mirrorEnabled);
        } else {
          state.currentTool = tool;
          updateActiveToolButton();
          updateCursor();
        }
      }
    });
  }

  function getPixelCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    return {
      x: Math.max(0, Math.min(state.canvasSize - 1, x)),
      y: Math.max(0, Math.min(state.canvasSize - 1, y))
    };
  }

  function handleMouseDown(e) {
    e.preventDefault();
    const pos = getPixelCoords(e);

    if (e.button === 2) {
      pickColor(pos.x, pos.y);
      return;
    }

    if (state.currentTool === 'picker') {
      pickColor(pos.x, pos.y);
      return;
    }

    if (state.currentTool === 'bucket') {
      floodFill(pos.x, pos.y, state.foregroundColor);
      saveHistory();
      return;
    }

    if (state.currentTool === 'line' || state.currentTool === 'rect' || state.currentTool === 'circle') {
      state.isDrawingShape = true;
      state.shapeStartX = pos.x;
      state.shapeStartY = pos.y;
      state.shapeCurrentX = pos.x;
      state.shapeCurrentY = pos.y;
      return;
    }

    state.isDrawing = true;
    state.lastPixelX = pos.x;
    state.lastPixelY = pos.y;

    if (state.currentTool === 'brush') {
      setPixel(pos.x, pos.y, state.foregroundColor);
    } else if (state.currentTool === 'eraser') {
      setPixel(pos.x, pos.y, null);
    }
  }

  function handleMouseMove(e) {
    const pos = getPixelCoords(e);

    if (state.isDrawingShape) {
      state.shapeCurrentX = pos.x;
      state.shapeCurrentY = pos.y;
      drawShapePreview();
      return;
    }

    if (!state.isDrawing) return;

    if (pos.x === state.lastPixelX && pos.y === state.lastPixelY) return;

    if (state.currentTool === 'brush' || state.currentTool === 'eraser') {
      drawLinePixels(state.lastPixelX, state.lastPixelY, pos.x, pos.y,
        state.currentTool === 'brush' ? state.foregroundColor : null);
    }

    state.lastPixelX = pos.x;
    state.lastPixelY = pos.y;
  }

  function handleMouseUp(e) {
    if (state.isDrawingShape) {
      state.isDrawingShape = false;
      applyShape();
      saveHistory();
      state.shapeStartX = 0;
      state.shapeStartY = 0;
      state.shapeCurrentX = 0;
      state.shapeCurrentY = 0;
      return;
    }

    if (state.isDrawing) {
      saveHistory();
    }

    state.isDrawing = false;
    state.lastPixelX = -1;
    state.lastPixelY = -1;
  }

  function drawShapePreview() {
    redrawCanvas();
    if (state.showGrid) {
      drawGridOverlay();
    }

    const x0 = state.shapeStartX;
    const y0 = state.shapeStartY;
    const x1 = state.shapeCurrentX;
    const y1 = state.shapeCurrentY;

    ctx.save();
    ctx.strokeStyle = state.foregroundColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    if (state.currentTool === 'line') {
      drawBresenhamLine(x0, y0, x1, y1, state.foregroundColor);
    } else if (state.currentTool === 'rect') {
      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);
      drawRectOutline(left, top, right, bottom, state.foregroundColor);
    } else if (state.currentTool === 'circle') {
      const cx = Math.floor((x0 + x1) / 2);
      const cy = Math.floor((y0 + y1) / 2);
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      drawMidpointEllipse(cx, cy, Math.floor(rx), Math.floor(ry), state.foregroundColor);
    }

    ctx.restore();
  }

  function applyShape() {
    const x0 = state.shapeStartX;
    const y0 = state.shapeStartY;
    const x1 = state.shapeCurrentX;
    const y1 = state.shapeCurrentY;

    if (state.currentTool === 'line') {
      drawLinePixels(x0, y0, x1, y1, state.foregroundColor);
    } else if (state.currentTool === 'rect') {
      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);

      for (let x = left; x <= right; x++) {
        setPixel(x, top, state.foregroundColor);
        setPixel(x, bottom, state.foregroundColor);
      }
      for (let y = top + 1; y < bottom; y++) {
        setPixel(left, y, state.foregroundColor);
        setPixel(right, y, state.foregroundColor);
      }
    } else if (state.currentTool === 'circle') {
      const cx = Math.floor((x0 + x1) / 2);
      const cy = Math.floor((y0 + y1) / 2);
      const rx = Math.abs(x1 - x0) / 2;
      const ry = Math.abs(y1 - y0) / 2;
      drawMidpointEllipse(cx, cy, Math.floor(rx), Math.floor(ry), state.foregroundColor, true);
    }
  }

  function drawRectOutline(left, top, right, bottom, color) {
    for (let x = left; x <= right; x++) {
      setPixelPreview(x, top, color);
      setPixelPreview(x, bottom, color);
    }
    for (let y = top + 1; y < bottom; y++) {
      setPixelPreview(left, y, color);
      setPixelPreview(right, y, color);
    }
  }

  function setPixelPreview(x, y, color) {
    if (x < 0 || x >= state.canvasSize || y < 0 || y >= state.canvasSize) return;

    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    const rgb = hexToRgb(color);

    data[0] = rgb.r;
    data[1] = rgb.g;
    data[2] = rgb.b;
    data[3] = 255;

    ctx.putImageData(imageData, x, y);

    if (state.mirrorEnabled) {
      const mirrorX = state.canvasSize - 1 - x;
      if (mirrorX !== x) {
        const mirrorImageData = ctx.getImageData(mirrorX, y, 1, 1);
        const mirrorData = mirrorImageData.data;
        mirrorData[0] = rgb.r;
        mirrorData[1] = rgb.g;
        mirrorData[2] = rgb.b;
        mirrorData[3] = 255;
        ctx.putImageData(mirrorImageData, mirrorX, y);
      }
    }
  }

  function setPixel(x, y, color) {
    if (x < 0 || x >= state.canvasSize || y < 0 || y >= state.canvasSize) return;

    if (!state.imageData) {
      state.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    const index = (y * state.canvasSize + x) * 4;
    const data = state.imageData.data;

    if (color === null) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    } else {
      const rgb = hexToRgb(color);
      data[index] = rgb.r;
      data[index + 1] = rgb.g;
      data[index + 2] = rgb.b;
      data[index + 3] = 255;
    }

    ctx.putImageData(state.imageData, 0, 0, x, y, 1, 1);

    if (state.mirrorEnabled) {
      const mirrorX = state.canvasSize - 1 - x;
      if (mirrorX !== x) {
        const mirrorIndex = (y * state.canvasSize + mirrorX) * 4;
        if (color === null) {
          data[mirrorIndex] = 0;
          data[mirrorIndex + 1] = 0;
          data[mirrorIndex + 2] = 0;
          data[mirrorIndex + 3] = 0;
        } else {
          const rgb = hexToRgb(color);
          data[mirrorIndex] = rgb.r;
          data[mirrorIndex + 1] = rgb.g;
          data[mirrorIndex + 2] = rgb.b;
          data[mirrorIndex + 3] = 255;
        }
        ctx.putImageData(state.imageData, 0, 0, mirrorX, y, 1, 1);
      }
    }

    if (state.showGrid) {
      drawGridOverlay();
    }
  }

  function drawLinePixels(x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  function drawBresenhamLine(x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      setPixelPreview(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  function drawMidpointEllipse(cx, cy, rx, ry, color, applyToImageData) {
    if (rx < 1) rx = 1;
    if (ry < 1) ry = 1;

    let x = 0;
    let y = ry;
    let rx2 = rx * rx;
    let ry2 = ry * ry;
    let tworx2 = 2 * rx2;
    let twory2 = 2 * ry2;
    let p;
    let px = 0;
    let py = tworx2 * y;

    const setFn = applyToImageData ? setPixel : setPixelPreview;

    setFn(cx + x, cy + y, color);
    setFn(cx - x, cy + y, color);
    setFn(cx + x, cy - y, color);
    setFn(cx - x, cy - y, color);

    p = Math.round(ry2 - rx2 * ry + 0.25 * rx2);
    while (px < py) {
      x++;
      px += twory2;
      if (p < 0) {
        p += ry2 + px;
      } else {
        y--;
        py -= tworx2;
        p += ry2 + px - py;
      }
      setFn(cx + x, cy + y, color);
      setFn(cx - x, cy + y, color);
      setFn(cx + x, cy - y, color);
      setFn(cx - x, cy - y, color);
    }

    p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
    while (y > 0) {
      y--;
      py -= tworx2;
      if (p > 0) {
        p += rx2 - py;
      } else {
        x++;
        px += twory2;
        p += rx2 - py + px;
      }
      setFn(cx + x, cy + y, color);
      setFn(cx - x, cy + y, color);
      setFn(cx + x, cy - y, color);
      setFn(cx - x, cy - y, color);
    }
  }

  function pickColor(x, y) {
    if (!state.imageData) {
      state.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    const index = (y * state.canvasSize + x) * 4;
    const data = state.imageData.data;
    const alpha = data[index + 3];

    if (alpha === 0) {
      setForegroundColor('#000000');
    } else {
      const hex = rgbToHex(data[index], data[index + 1], data[index + 2]);
      setForegroundColor(hex);
      const colorPicker = document.getElementById('custom-color-picker');
      if (colorPicker) colorPicker.value = hex;
    }

    showToast(i18n.t('toast_color_picked'));

    if (state.currentTool === 'picker') {
      state.currentTool = 'brush';
      updateActiveToolButton();
      updateCursor();
    }
  }

  function floodFill(startX, startY, fillColor) {
    if (!state.imageData) {
      state.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    const data = state.imageData.data;
    const width = state.canvasSize;
    const height = state.canvasSize;

    const startIdx = (startY * width + startX) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    const fillRgb = hexToRgb(fillColor);

    if (startR === fillRgb.r && startG === fillRgb.g && startB === fillRgb.b && startA === 255) {
      return;
    }

    const stack = [[startX, startY]];
    const visited = new Uint8Array(width * height);

    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const idx = (y * width + x) * 4;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[y * width + x]) continue;

      if (data[idx] !== startR || data[idx + 1] !== startG ||
          data[idx + 2] !== startB || data[idx + 3] !== startA) {
        continue;
      }

      visited[y * width + x] = 1;
      data[idx] = fillRgb.r;
      data[idx + 1] = fillRgb.g;
      data[idx + 2] = fillRgb.b;
      data[idx + 3] = 255;

      if (state.mirrorEnabled) {
        const mirrorX = width - 1 - x;
        if (mirrorX !== x && !visited[y * width + mirrorX]) {
          const mirrorIdx = (y * width + mirrorX) * 4;
          if (data[mirrorIdx] === startR && data[mirrorIdx + 1] === startG &&
              data[mirrorIdx + 2] === startB && data[mirrorIdx + 3] === startA) {
            visited[y * width + mirrorX] = 1;
            data[mirrorIdx] = fillRgb.r;
            data[mirrorIdx + 1] = fillRgb.g;
            data[mirrorIdx + 2] = fillRgb.b;
            data[mirrorIdx + 3] = 255;
            stack.push([mirrorX + 1, y]);
            stack.push([mirrorX - 1, y]);
            stack.push([mirrorX, y + 1]);
            stack.push([mirrorX, y - 1]);
          }
        }
      }

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    ctx.putImageData(state.imageData, 0, 0);

    if (state.showGrid) {
      drawGridOverlay();
    }

    showToast(i18n.t('toast_bucket_filled'));
  }

  function redrawCanvas() {
    if (state.imageData) {
      ctx.putImageData(state.imageData, 0, 0);
    }
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (x) {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function showToast(message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message);
    } else if (typeof i18n !== 'undefined' && i18n.t) {
      console.log('[Pixel Drawing]', message);
    }
  }

  function resizeCanvasDisplay() {
    if (!canvas) return;
  }

  function onLanguageChange() {
    const tooltipMap = {
      'tool-undo': 'tool_undo',
      'tool-redo': 'tool_redo',
      'tool-brush': 'tool_brush',
      'tool-eraser': 'tool_eraser',
      'tool-picker': 'tool_picker',
      'tool-bucket': 'tool_bucket',
      'tool-line': 'tool_line',
      'tool-rect': 'tool_rect',
      'tool-circle': 'tool_circle',
      'tool-mirror': 'tool_mirror',
      'tool-clear': 'tool_clear',
      'tool-grid': 'tool_grid'
    };

    Object.keys(tooltipMap).forEach(function (id) {
      const btn = document.getElementById(id);
      if (!btn) return;
      const tooltip = btn.querySelector('.tooltip');
      if (tooltip) {
        tooltip.textContent = i18n.t(tooltipMap[id]);
      }
    });
  }

  window.PixelDrawingEditor = {
    init: init,
    resize: resizeCanvasDisplay,
    onLanguageChange: onLanguageChange
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
