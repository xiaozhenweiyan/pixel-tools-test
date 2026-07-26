/**
 * image-pixelizer.js
 * AI 图像像素化工具 / AI Image Pixelizer
 *
 * 功能：
 *   - 上传任意图片（文件选择 / 拖拽上传），自动转换为像素风
 *   - 可调参数：像素大小、调色板、颜色数量
 *   - 实时预览（左原图 / 右像素化），参数改变自动重处理
 *   - 导出 PNG（1x / 2x / 4x 放大）
 *   - 纯前端 Canvas 实现，不上传服务器
 *
 * 用法：
 *   ImagePixelizer.init(originalCanvas, processedCanvas);
 *   ImagePixelizer.loadImage(file);            // file 可来自 <input> 或 drop 事件
 *   ImagePixelizer.setPixelSize(8);
 *   ImagePixelizer.setPalette('nes');
 *   ImagePixelizer.setColorCount(16);           // 仅 custom 模式生效
 *   ImagePixelizer.process();
 *   ImagePixelizer.exportImage(2);
 *   ImagePixelizer.reset();
 */
window.ImagePixelizer = (function () {
  'use strict';

  // ============================================================
  // 模块状态 / Module State
  // ============================================================
  let originalCanvas = null;  // 原图画布
  let processedCanvas = null; // 处理后画布
  let originalCtx = null;     // 原图 2D 上下文
  let processedCtx = null;    // 处理后 2D 上下文
  let currentImage = null;    // 当前加载的 Image 对象
  let pixelSize = 8;          // 像素块大小（1-32）
  let palette = 'full';       // 调色板类型：full/nes/gameboy/cga/grayscale/custom
  let colorCount = 16;        // 颜色数量（仅 custom 模式，2-32）

  // ============================================================
  // 预设调色板 / Preset Palettes
  // ============================================================

  // NES 经典 54 色调色板
  const NES_PALETTE = [
    '#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400',
    '#503000', '#007800', '#006800', '#005800', '#004058', '#000000',
    '#BCBCBC', '#0078F8', '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10',
    '#AC7C00', '#00B800', '#00A800', '#00A844', '#008888',
    '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8', '#F878F8', '#F85898', '#F87858', '#FCA044',
    '#F8B800', '#B8F818', '#58D854', '#58F898', '#00E8D8',
    '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8',
    '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8', '#00FCFC', '#787878'
  ];

  // GameBoy 4 色绿
  const GAMEBOY_PALETTE = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];

  // CGA 4 色
  const CGA_PALETTE = ['#000000', '#55ffff', '#ff55ff', '#ffffff'];

  // 16 级灰度
  const GRAYSCALE_PALETTE = (function () {
    const arr = [];
    for (let i = 0; i < 16; i++) {
      const v = Math.round((i / 15) * 255);
      const hex = v.toString(16).padStart(2, '0');
      arr.push('#' + hex + hex + hex);
    }
    return arr;
  })();

  // ============================================================
  // 工具函数 / Utility Functions
  // ============================================================

  // 十六进制颜色转 RGB 对象
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  // RGB 转十六进制（自动钳制到 0-255）
  function rgbToHex(r, g, b) {
    const toHex = function (v) {
      const c = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return c.length === 1 ? '0' + c : c;
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  // 计算两个 RGB 颜色的欧氏距离平方（省去开方以提升性能）
  function colorDistanceSq(c1, c2) {
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;
    return dr * dr + dg * dg + db * db;
  }

  // 在调色板中找到与目标颜色最近的色
  function findClosestColor(color, paletteRgb) {
    let minDist = Infinity;
    let closest = paletteRgb[0];
    for (let i = 0; i < paletteRgb.length; i++) {
      const d = colorDistanceSq(color, paletteRgb[i]);
      if (d < minDist) {
        minDist = d;
        closest = paletteRgb[i];
      }
    }
    return closest;
  }

  // ============================================================
  // K-means 颜色聚类 / K-means Color Clustering
  // 用于 custom 调色板：从图片中提取 N 个主色
  //   - 初始化：随机选择 K 个像素颜色作为中心
  //   - 迭代：将每个像素分配到最近中心，重新计算中心
  //   - 收敛：中心不再变化或达到最大迭代次数
  // ============================================================
  function kMeans(imageData, k, maxIterations) {
    maxIterations = maxIterations || 10;
    const data = imageData.data;

    // 采样像素（间隔采样，最多约 1 万像素以兼顾速度与质量）
    const pixels = [];
    const totalPx = data.length / 4;
    const step = Math.max(1, Math.floor(totalPx / 10000));
    for (let i = 0; i < data.length; i += 4 * step) {
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    if (pixels.length === 0) return ['#000000'];

    // 实际簇数不超过像素数
    const actualK = Math.min(k, pixels.length);

    // 初始化：随机选择 K 个不重复像素颜色作为中心
    const centers = [];
    const usedIndices = {};
    while (centers.length < actualK) {
      const idx = Math.floor(Math.random() * pixels.length);
      if (!usedIndices[idx]) {
        usedIndices[idx] = true;
        centers.push({
          r: pixels[idx].r,
          g: pixels[idx].g,
          b: pixels[idx].b
        });
      }
    }

    // 迭代
    for (let iter = 0; iter < maxIterations; iter++) {
      // 分配每个像素到最近的中心
      const clusters = [];
      for (let i = 0; i < actualK; i++) clusters.push([]);

      for (let p = 0; p < pixels.length; p++) {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let c = 0; c < centers.length; c++) {
          const d = colorDistanceSq(pixels[p], centers[c]);
          if (d < minDist) {
            minDist = d;
            bestCluster = c;
          }
        }
        clusters[bestCluster].push(pixels[p]);
      }

      // 重新计算中心，并判断是否收敛
      let changed = false;
      for (let c = 0; c < actualK; c++) {
        const cluster = clusters[c];
        if (cluster.length === 0) continue;
        let sumR = 0, sumG = 0, sumB = 0;
        for (let i = 0; i < cluster.length; i++) {
          sumR += cluster[i].r;
          sumG += cluster[i].g;
          sumB += cluster[i].b;
        }
        const newR = sumR / cluster.length;
        const newG = sumG / cluster.length;
        const newB = sumB / cluster.length;
        // 中心位移超过阈值则视为未收敛
        if (Math.abs(centers[c].r - newR) > 0.5 ||
            Math.abs(centers[c].g - newG) > 0.5 ||
            Math.abs(centers[c].b - newB) > 0.5) {
          changed = true;
        }
        centers[c] = { r: newR, g: newG, b: newB };
      }

      // 收敛：中心不再变化
      if (!changed) break;
    }

    // 转为十六进制返回
    return centers.map(function (c) {
      return rgbToHex(c.r, c.g, c.b);
    });
  }

  // ============================================================
  // 调色板量化 / Palette Quantization
  // 将每个像素映射到最近的调色板颜色
  // ============================================================
  function quantize(imageData, palette, colorCount) {
    let paletteColors = [];

    if (palette === 'full') {
      // 不量化，保留原色
      return imageData;
    } else if (palette === 'nes') {
      paletteColors = NES_PALETTE;
    } else if (palette === 'gameboy') {
      paletteColors = GAMEBOY_PALETTE;
    } else if (palette === 'cga') {
      paletteColors = CGA_PALETTE;
    } else if (palette === 'grayscale') {
      paletteColors = GRAYSCALE_PALETTE;
    } else if (palette === 'custom') {
      // 用 K-means 从图片中提取 N 个主色
      const k = Math.max(2, Math.min(32, colorCount));
      paletteColors = kMeans(imageData, k);
    } else {
      return imageData;
    }

    // 转换调色板为 RGB 数组
    const paletteRgb = paletteColors.map(hexToRgb);

    // 每个像素映射到最近的调色板颜色
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const color = { r: data[i], g: data[i + 1], b: data[i + 2] };
      const closest = findClosestColor(color, paletteRgb);
      data[i] = closest.r;
      data[i + 1] = closest.g;
      data[i + 2] = closest.b;
      // alpha 通道保持不变
    }

    return imageData;
  }

  // ============================================================
  // 公开 API / Public API
  // ============================================================

  // 初始化：传入原图画布与处理后画布
  function init(originalCanvasEl, processedCanvasEl) {
    originalCanvas = originalCanvasEl;
    processedCanvas = processedCanvasEl;
    originalCtx = originalCanvas.getContext('2d');
    processedCtx = processedCanvas.getContext('2d');
    // 原图启用平滑，处理图关闭平滑以保持像素感
    originalCtx.imageSmoothingEnabled = true;
    processedCtx.imageSmoothingEnabled = false;
  }

  // 加载图片文件（File 对象，可来自 <input type=file> 或拖拽 drop 事件）
  // 返回 Promise，加载完成后自动处理一次
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      if (!originalCanvas || !processedCanvas) {
        reject(new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('pixelizer_error_not_init')) || '未初始化，请先调用 init()'));
        return;
      }
      if (!file) {
        reject(new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('pixelizer_error_no_file')) || '未提供文件'));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        currentImage = img;
        // 绘制原图到左画布
        originalCanvas.width = img.width;
        originalCanvas.height = img.height;
        originalCtx.imageSmoothingEnabled = true;
        originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
        originalCtx.drawImage(img, 0, 0);
        // 自动处理一次
        process();
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('pixelizer_error_load_failed')) || '图片加载失败'));
      };
      img.src = url;
    });
  }

  // 设置像素块大小（1-32），若已有图片则自动重处理（实时预览）
  function setPixelSize(size) {
    pixelSize = Math.max(1, Math.min(32, parseInt(size, 10) || 1));
    if (currentImage) process();
  }

  // 设置调色板类型，若已有图片则自动重处理（实时预览）
  function setPalette(paletteType) {
    const valid = ['full', 'nes', 'gameboy', 'cga', 'grayscale', 'custom'];
    if (valid.indexOf(paletteType) !== -1) {
      palette = paletteType;
      if (currentImage) process();
    }
  }

  // 设置颜色数量（2-32，仅 custom 模式），若已有图片则自动重处理（实时预览）
  function setColorCount(count) {
    colorCount = Math.max(2, Math.min(32, parseInt(count, 10) || 2));
    if (currentImage && palette === 'custom') process();
  }

  // 处理图片：像素化 + 调色板量化
  //   1. 将图片缩小到 width/pixelSize × height/pixelSize（缩小时取平均色）
  //   2. 对缩小后的像素数据进行调色板量化
  //   3. 放大回原尺寸（imageSmoothingEnabled=false 保持像素感）
  function process() {
    if (!currentImage || !processedCtx) return;

    const img = currentImage;
    const w = img.width;
    const h = img.height;

    // 1. 像素化：缩小到小画布（drawImage 缩放自动做平均色）
    const smallW = Math.max(1, Math.floor(w / pixelSize));
    const smallH = Math.max(1, Math.floor(h / pixelSize));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = smallW;
    tempCanvas.height = smallH;
    const tempCtx = tempCanvas.getContext('2d');
    // 缩小时启用平滑，使每个目标像素等于对应源块的平均颜色
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.drawImage(img, 0, 0, smallW, smallH);

    // 2. 量化：对小画布的像素数据应用调色板
    const smallData = tempCtx.getImageData(0, 0, smallW, smallH);
    quantize(smallData, palette, colorCount);
    tempCtx.putImageData(smallData, 0, 0);

    // 3. 放大回原尺寸（关闭平滑保持像素感）
    processedCanvas.width = w;
    processedCanvas.height = h;
    processedCtx.imageSmoothingEnabled = false;
    processedCtx.clearRect(0, 0, w, h);
    processedCtx.drawImage(tempCanvas, 0, 0, smallW, smallH, 0, 0, w, h);
  }

  // 导出 PNG（可选放大倍数 1x / 2x / 4x），返回 data URL
  function exportImage(scale) {
    if (!processedCanvas) return null;
    const validScales = [1, 2, 4];
    scale = validScales.indexOf(scale) !== -1 ? scale : 1;

    if (scale === 1) {
      return processedCanvas.toDataURL('image/png');
    }

    // 放大导出（关闭平滑保持像素感）
    const w = processedCanvas.width * scale;
    const h = processedCanvas.height * scale;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.imageSmoothingEnabled = false;
    exportCtx.drawImage(processedCanvas, 0, 0, w, h);
    return exportCanvas.toDataURL('image/png');
  }

  // 重置：清空画布与状态，参数恢复默认
  function reset() {
    currentImage = null;
    if (originalCanvas) {
      originalCanvas.width = 0;
      originalCanvas.height = 0;
    }
    if (processedCanvas) {
      processedCanvas.width = 0;
      processedCanvas.height = 0;
    }
    pixelSize = 8;
    palette = 'full';
    colorCount = 16;
  }

  return {
    init: init,
    loadImage: loadImage,
    setPixelSize: setPixelSize,
    setPalette: setPalette,
    setColorCount: setColorCount,
    process: process,
    exportImage: exportImage,
    reset: reset
  };
})();
