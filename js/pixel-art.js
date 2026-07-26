/**
 * pixel-art.js
 * 像素艺术生成器 / Pixel Art Generator
 *
 * 依赖：p5.js 1.7.0+（CDN 加载）
 * 算法哲学：像素深空 Pixel Deep Space
 *   - 复古 8-bit 星空 + 像素几何美 + 深空粒子流
 *   - 种子化随机：相同种子产生相同图像
 *   - 4 种模式：flow / particles / mosaic / spiral
 *
 * 渲染策略：
 *   - 低分辨率画布（resolution × resolution，默认 32×32）
 *   - CSS image-rendering: pixelated 放大到 600px 显示
 *   - HSB 色彩模式，调色板基于色相参数生成
 */
(function () {
  'use strict';

  // ============================================================
  // 模块状态 / Module State
  // ============================================================
  let p5Instance = null;
  let currentSeed = 1;
  let currentMode = 'flow';
  let resolution = 48;
  let density = 50;
  let hue = 45;
  let isAnimating = false;

  // 粒子状态（流场 / 粒子模式共用）/ particle state
  let particles = [];

  // 分形树参数 / fractal tree params
  let fractalDepth = 6;
  let fractalAngle = 25;
  let fractalLengthRatio = 0.7;
  let fractalInitLength = 150;

  // Voronoi 参数 / voronoi params
  let voronoiPoints = 80;
  let voronoiRelaxIterations = 3;
  let voronoiColorMode = 'distance'; // 'distance' | 'size'

  // 波干涉参数 / wave interference params
  let waveSourceCount = 4;
  let waveFrequency = 1.5;
  let waveAmplitude = 50;

  // 反应扩散参数 / reaction-diffusion params
  let rdFeedRate = 0.055;
  let rdKillRate = 0.062;
  let rdIterations = 800;

  // Wasm 加速状态 / Wasm acceleration state
  let wasmEnabled = false;
  let wasmLoaded = false;
  let wasmModule = null;
  const WASM_STORAGE_KEY = 'pixel_tools_wasm';

  // ============================================================
  // 调色板生成 / Palette Generation (HSB)
  // ============================================================
  /**
   * generatePalette(baseHue) → [{h,s,b}, ...]
   * 基于基础色相生成 8 色调色板，包含主色、邻色、互补色、三元色。
   * 调色板不含深空背景色（背景单独用 p.background 绘制）。
   */
  function generatePalette(baseHue) {
    const h = ((baseHue % 360) + 360) % 360;
    return [
      { h: h,                       s: 85, b: 95 }, // 主色亮
      { h: (h + 25) % 360,          s: 80, b: 80 }, // 邻色 1
      { h: (h + 55) % 360,          s: 90, b: 70 }, // 邻色 2
      { h: (h - 25 + 360) % 360,    s: 75, b: 95 }, // 邻色 3
      { h: (h - 55 + 360) % 360,    s: 85, b: 75 }, // 邻色 4
      { h: (h + 180) % 360,         s: 70, b: 90 }, // 互补色
      { h: (h + 120) % 360,         s: 80, b: 85 }, // 三元色 1
      { h: (h + 90) % 360,          s: 95, b: 90 }  // 三元色 2
    ];
  }

  // ============================================================
  // p5.js Sketch（实例模式）/ Instance Mode Sketch
  // ============================================================
  function createSketch() {
    return function (p) {
      let palette = null;

      p.setup = function () {
        p.createCanvas(resolution, resolution);
        p.noSmooth();
        p.pixelDensity(1);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        p.noLoop();
        palette = generatePalette(hue);
        regenerate();
      };

      p.draw = function () {
        if (!isAnimating) return;
        if (currentMode === 'flow') {
          stepFlow(true);
        } else if (currentMode === 'particles') {
          stepParticles(true);
        }
      };

      /**
       * regenerate()
       * 重置种子 + 背景 + 调色板，按当前模式重绘。
       * 动画模式下不预渲染（由 draw 循环逐帧绘制）。
       */
      function regenerate() {
        p.randomSeed(currentSeed);
        p.noiseSeed(currentSeed);
        palette = generatePalette(hue);
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.noStroke();
        // 深空背景 #1a1a2e ≈ HSB(240, 43, 18)
        p.background(240, 43, 18);

        if (currentMode === 'flow') {
          initFlow();
          if (!isAnimating) {
            // 静态预渲染：跑若干步以呈现完整图像
            for (let i = 0; i < 100; i++) stepFlow(false);
          }
        } else if (currentMode === 'particles') {
          initParticles();
          if (!isAnimating) {
            for (let i = 0; i < 80; i++) stepParticles(false);
          }
        } else if (currentMode === 'mosaic') {
          drawMosaic();
        } else if (currentMode === 'spiral') {
          drawSpiral();
        } else if (currentMode === 'fractal-tree') {
          drawFractalTree();
        } else if (currentMode === 'voronoi') {
          drawVoronoi();
        } else if (currentMode === 'wave-interference') {
          drawWaveInterference();
        } else if (currentMode === 'reaction-diffusion') {
          drawReactionDiffusion();
        }
      }

      // ============================================================
      // 模式 1：流场 Flow Field（Perlin 噪声向量场 + 粒子轨迹）
      // ============================================================
      function initFlow() {
        particles = [];
        const count = Math.max(8, Math.floor(density * 1.2));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: p.random(resolution),
            y: p.random(resolution),
            life: Math.floor(p.random(30, 90)),
            colorIdx: Math.floor(p.random(palette.length))
          });
        }
      }

      /**
       * stepFlow(animated)
       * 每步：用 Perlin 噪声采样粒子位置的向量角度，粒子沿向量移动并留下 1px 轨迹。
       * animated=true 时叠加半透明背景产生淡出拖尾；false 时纯累积。
       */
      function stepFlow(animated) {
        if (animated) {
          // 半透明背景叠加，产生拖尾淡出
          p.noStroke();
          p.fill(240, 43, 18, 18);
          p.rect(0, 0, resolution, resolution);
        }
        p.strokeWeight(1);
        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];
          // 双层噪声：主向量场 + 微扰
          const n = p.noise(pt.x * 0.10, pt.y * 0.10);
          const n2 = p.noise(pt.x * 0.25 + 100, pt.y * 0.25 + 100);
          const angle = (n + n2 * 0.3) * p.TWO_PI * 2;
          const speed = 0.75;
          const nx = pt.x + Math.cos(angle) * speed;
          const ny = pt.y + Math.sin(angle) * speed;

          const c = palette[pt.colorIdx];
          p.stroke(c.h, c.s, c.b, animated ? 85 : 95);
          p.line(Math.floor(pt.x), Math.floor(pt.y), Math.floor(nx), Math.floor(ny));

          pt.x = nx;
          pt.y = ny;
          pt.life--;

          if (pt.life <= 0 || pt.x < 0 || pt.x >= resolution || pt.y < 0 || pt.y >= resolution) {
            pt.x = p.random(resolution);
            pt.y = p.random(resolution);
            pt.life = Math.floor(p.random(30, 90));
            pt.colorIdx = Math.floor(p.random(palette.length));
          }
        }
        p.noStroke();
      }

      // ============================================================
      // 模式 2：粒子系统 Particles（中心爆发 + 重力 + 寿命淡出）
      // ============================================================
      function initParticles() {
        particles = [];
        const count = Math.max(10, Math.floor(density * 1.5));
        for (let i = 0; i < count; i++) {
          particles.push(makeParticle());
        }
      }

      function makeParticle() {
        // 多个爆发中心，增加视觉层次 / multiple burst centers
        const centers = [
          { x: resolution * 0.5, y: resolution * 0.5 },
          { x: resolution * 0.25, y: resolution * 0.3 },
          { x: resolution * 0.75, y: resolution * 0.7 }
        ];
        const center = centers[Math.floor(p.random(centers.length))];
        const angle = p.random(p.TWO_PI);
        const speed = p.random(0.25, 1.4);
        return {
          x: center.x,
          y: center.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: Math.floor(p.random(15, 45)),
          maxLife: 45,
          colorIdx: Math.floor(p.random(palette.length))
        };
      }

      /**
       * stepParticles(animated)
       * 每步：粒子受重力影响移动，按寿命降低 alpha 绘制 1px 方块。
       * animated=true 时叠加半透明背景产生拖尾。
       */
      function stepParticles(animated) {
        if (animated) {
          p.noStroke();
          p.fill(240, 43, 18, 22);
          p.rect(0, 0, resolution, resolution);
        }
        const gravity = 0.04;
        for (let i = 0; i < particles.length; i++) {
          const pt = particles[i];
          pt.vy += gravity;
          // 微弱阻力
          pt.vx *= 0.99;
          pt.vy *= 0.99;
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life--;

          if (pt.x >= 0 && pt.x < resolution && pt.y >= 0 && pt.y < resolution) {
            const c = palette[pt.colorIdx];
            const alpha = Math.max(20, Math.min(100, (pt.life / pt.maxLife) * 100));
            p.fill(c.h, c.s, c.b, alpha);
            p.rect(Math.floor(pt.x), Math.floor(pt.y), 1, 1);
          }

          // 重生
          if (pt.life <= 0 || pt.x < -2 || pt.x > resolution + 2 || pt.y > resolution + 2) {
            const np = makeParticle();
            pt.x = np.x;
            pt.y = np.y;
            pt.vx = np.vx;
            pt.vy = np.vy;
            pt.life = np.life;
            pt.maxLife = np.maxLife;
            pt.colorIdx = np.colorIdx;
          }
        }
        p.noStroke();
      }

      // ============================================================
      // 模式 3：几何马赛克 Mosaic（递归矩形分割 + 金色高光）
      // ============================================================
      function drawMosaic() {
        const minSize = Math.max(2, Math.floor(resolution / 12));
        // 先填一层底色（比背景稍亮的深空色）
        p.fill(240, 35, 12);
        p.rect(0, 0, resolution, resolution);
        splitRect(0, 0, resolution, resolution, 0, minSize);
        // 撒一些金色像素星点 / sprinkle gold pixel stars
        const starCount = Math.floor(density * 0.4);
        for (let i = 0; i < starCount; i++) {
          const sx = Math.floor(p.random(resolution));
          const sy = Math.floor(p.random(resolution));
          p.fill(45, 100, 100);
          p.rect(sx, sy, 1, 1);
        }
      }

      /**
       * splitRect(x, y, w, h, depth, minSize)
       * 递归二分矩形：随机方向分割，叶节点填充调色板色或金色。
       * 部分叶节点保留深空色作为"网格缝隙"。
       */
      function splitRect(x, y, w, h, depth, minSize) {
        const canSplit = (w > minSize * 2 || h > minSize * 2) && depth < 7;
        const shouldSplit = canSplit && p.random() < 0.82;

        if (!shouldSplit) {
          // 叶节点：决定填充类型
          const r = p.random();
          if (r < 0.12) {
            // 金色高光块
            p.fill(45, 100, 100);
          } else if (r < 0.20) {
            // 深空留白（作为缝隙）
            p.fill(240, 43, 18);
          } else if (r < 0.28) {
            // 白色亮点
            p.fill(0, 0, 100);
          } else {
            // 调色板色
            const c = palette[Math.floor(p.random(palette.length))];
            p.fill(c.h, c.s, c.b);
          }
          p.rect(x, y, w, h);
          return;
        }

        // 选择分割方向
        let splitVertical;
        if (w > h * 1.3) splitVertical = true;
        else if (h > w * 1.3) splitVertical = false;
        else splitVertical = p.random() < 0.5;

        if (splitVertical && w > minSize * 2) {
          const split = Math.floor(p.random(minSize, w - minSize));
          splitRect(x, y, split, h, depth + 1, minSize);
          splitRect(x + split, y, w - split, h, depth + 1, minSize);
        } else if (h > minSize * 2) {
          const split = Math.floor(p.random(minSize, h - minSize));
          splitRect(x, y, w, split, depth + 1, minSize);
          splitRect(x, y + split, w, h - split, depth + 1, minSize);
        } else {
          // 无法分割，填充
          const c = palette[Math.floor(p.random(palette.length))];
          p.fill(c.h, c.s, c.b);
          p.rect(x, y, w, h);
        }
      }

      // ============================================================
      // 模式 4：螺旋 Spiral（阿基米德螺旋 + 多臂 + 色相渐变）
      // ============================================================
      function drawSpiral() {
        const cx = resolution / 2;
        const cy = resolution / 2;
        const arms = Math.max(1, Math.min(6, Math.floor(density / 18)));
        const maxRadius = resolution * 0.48;
        const turns = 5;
        const stepsPerArm = Math.max(40, Math.floor(density * 3));
        const b = maxRadius / (turns * p.TWO_PI);

        // 背景星点
        const starCount = Math.floor(density * 0.3);
        for (let i = 0; i < starCount; i++) {
          const sx = Math.floor(p.random(resolution));
          const sy = Math.floor(p.random(resolution));
          p.fill(0, 0, 100, 60);
          p.rect(sx, sy, 1, 1);
        }

        for (let arm = 0; arm < arms; arm++) {
          const armOffset = (arm / arms) * p.TWO_PI;
          for (let i = 0; i < stepsPerArm; i++) {
            const t = i / stepsPerArm;
            const theta = t * turns * p.TWO_PI;
            const r = b * theta;
            if (r > maxRadius) break;
            const x = cx + Math.cos(theta + armOffset) * r;
            const y = cy + Math.sin(theta + armOffset) * r;

            if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
              // 色相沿螺旋渐变
              const cIdx = (Math.floor(t * palette.length) + arm) % palette.length;
              const c = palette[cIdx];
              // 越靠近中心越亮，边缘略暗
              const brightness = 70 + (1 - t) * 30;
              p.fill(c.h, c.s, Math.min(100, brightness), 90);
              // 像素方块大小：偶有 2px 块增加质感
              const size = (p.random() < 0.15) ? 2 : 1;
              p.rect(Math.floor(x), Math.floor(y), size, size);
            }
          }
        }

        // 中心金色核心
        p.fill(45, 100, 100);
        p.rect(Math.floor(cx) - 1, Math.floor(cy) - 1, 2, 2);
        p.fill(45, 80, 100, 70);
        p.rect(Math.floor(cx) - 2, Math.floor(cy) - 2, 4, 4);
      }

      // ============================================================
      // 模式 5：L-system 分形树 Fractal Tree
      // ============================================================
      function drawFractalTree() {
        const cx = resolution / 2;
        const bottom = resolution - 1;
        const initLen = (fractalInitLength / 300) * resolution * 0.9;
        const angleRad = (fractalAngle / 180) * Math.PI;

        p.strokeCap(p.SQUARE);
        drawBranch(cx, bottom, initLen, -Math.PI / 2, fractalDepth, angleRad, fractalLengthRatio, 1);
        p.noStroke();

        const starCount = Math.floor(density * 0.3);
        for (let i = 0; i < starCount; i++) {
          const sx = Math.floor(p.random(resolution));
          const sy = Math.floor(p.random(resolution * 0.5));
          p.fill(45, 100, 100, 70);
          p.rect(sx, sy, 1, 1);
        }
      }

      function drawBranch(x, y, len, angle, depth, branchAngle, ratio, weight) {
        if (depth <= 0 || len < 0.5) return;

        const x2 = x + Math.cos(angle) * len;
        const y2 = y + Math.sin(angle) * len;

        const depthRatio = 1 - depth / (fractalDepth + 1);
        const cIdx = Math.floor(depthRatio * (palette.length - 1));
        const c = palette[cIdx % palette.length];
        const brightness = 60 + (1 - depthRatio) * 40;

        p.stroke(c.h, c.s, Math.min(100, brightness), 95);
        p.strokeWeight(Math.max(1, Math.floor(weight)));
        p.line(Math.floor(x), Math.floor(y), Math.floor(x2), Math.floor(y2));

        const newWeight = weight * ratio * 0.9;

        drawBranch(x2, y2, len * ratio, angle - branchAngle, depth - 1, branchAngle, ratio, newWeight);
        drawBranch(x2, y2, len * ratio, angle + branchAngle, depth - 1, branchAngle, ratio, newWeight);
      }

      // ============================================================
      // 模式 6：Voronoi 镶嵌 Voronoi Tessellation
      // ============================================================
      function drawVoronoi() {
        const pointCount = Math.min(voronoiPoints, resolution * resolution);
        const points = [];

        for (let i = 0; i < pointCount; i++) {
          points.push({
            x: p.random(resolution),
            y: p.random(resolution),
            colorIdx: Math.floor(p.random(palette.length))
          });
        }

        for (let iter = 0; iter < voronoiRelaxIterations; iter++) {
          const centroids = new Array(points.length);
          const counts = new Array(points.length).fill(0);
          for (let i = 0; i < points.length; i++) {
            centroids[i] = { x: 0, y: 0, colorIdx: points[i].colorIdx };
          }

          for (let py = 0; py < resolution; py++) {
            for (let px = 0; px < resolution; px++) {
              let minDist = Infinity;
              let minIdx = 0;
              for (let i = 0; i < points.length; i++) {
                const dx = px - points[i].x;
                const dy = py - points[i].y;
                const d = dx * dx + dy * dy;
                if (d < minDist) {
                  minDist = d;
                  minIdx = i;
                }
              }
              centroids[minIdx].x += px;
              centroids[minIdx].y += py;
              counts[minIdx]++;
            }
          }

          for (let i = 0; i < points.length; i++) {
            if (counts[i] > 0) {
              points[i].x = centroids[i].x / counts[i];
              points[i].y = centroids[i].y / counts[i];
            }
          }
        }

        const cellSizes = new Array(points.length).fill(0);

        for (let py = 0; py < resolution; py++) {
          for (let px = 0; px < resolution; px++) {
            let minDist = Infinity;
            let minIdx = 0;
            for (let i = 0; i < points.length; i++) {
              const dx = px - points[i].x;
              const dy = py - points[i].y;
              const d = dx * dx + dy * dy;
              if (d < minDist) {
                minDist = d;
                minIdx = i;
              }
            }
            cellSizes[minIdx]++;
          }
        }

        let maxSize = 0;
        for (let i = 0; i < points.length; i++) {
          if (cellSizes[i] > maxSize) maxSize = cellSizes[i];
        }

        p.loadPixels();
        for (let py = 0; py < resolution; py++) {
          for (let px = 0; px < resolution; px++) {
            let minDist = Infinity;
            let secondMinDist = Infinity;
            let minIdx = 0;
            for (let i = 0; i < points.length; i++) {
              const dx = px - points[i].x;
              const dy = py - points[i].y;
              const d = dx * dx + dy * dy;
              if (d < minDist) {
                secondMinDist = minDist;
                minDist = d;
                minIdx = i;
              } else if (d < secondMinDist) {
                secondMinDist = d;
              }
            }

            const isEdge = Math.sqrt(secondMinDist) - Math.sqrt(minDist) < 1.2;

            let c;
            if (voronoiColorMode === 'distance') {
              const distNorm = Math.min(1, Math.sqrt(minDist) / (resolution * 0.3));
              const baseC = palette[points[minIdx].colorIdx % palette.length];
              const b = Math.max(30, 100 - distNorm * 50);
              c = { h: baseC.h, s: baseC.s, b: b };
            } else {
              const sizeNorm = cellSizes[minIdx] / Math.max(1, maxSize);
              const cIdx = Math.floor(sizeNorm * (palette.length - 1));
              c = palette[cIdx % palette.length];
            }

            const idx = (py * resolution + px) * 4;
            if (isEdge) {
              p.pixels[idx] = 20;
              p.pixels[idx + 1] = 20;
              p.pixels[idx + 2] = 40;
              p.pixels[idx + 3] = 255;
            } else {
              const rgb = hsbToRgb(c.h, c.s, c.b);
              p.pixels[idx] = rgb[0];
              p.pixels[idx + 1] = rgb[1];
              p.pixels[idx + 2] = rgb[2];
              p.pixels[idx + 3] = 255;
            }
          }
        }
        p.updatePixels();
      }

      function hsbToRgb(h, s, b) {
        h = h / 360;
        s = s / 100;
        b = b / 100;
        let r, g, bl;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = b * (1 - s);
        const q = b * (1 - f * s);
        const t = b * (1 - (1 - f) * s);
        switch (i % 6) {
          case 0: r = b; g = t; bl = p; break;
          case 1: r = q; g = b; bl = p; break;
          case 2: r = p; g = b; bl = t; break;
          case 3: r = p; g = q; bl = b; break;
          case 4: r = t; g = p; bl = b; break;
          case 5: r = b; g = p; bl = q; break;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(bl * 255)];
      }

      // ============================================================
      // 模式 7：波干涉 Wave Interference
      // ============================================================
      function drawWaveInterference() {
        const sources = [];
        const count = Math.max(2, Math.min(8, waveSourceCount));
        for (let i = 0; i < count; i++) {
          sources.push({
            x: p.random(resolution),
            y: p.random(resolution),
            phase: p.random(p.TWO_PI)
          });
        }

        const freq = waveFrequency * 0.1;
        const amp = waveAmplitude / 100;

        p.loadPixels();
        for (let py = 0; py < resolution; py++) {
          for (let px = 0; px < resolution; px++) {
            let sum = 0;
            for (let i = 0; i < sources.length; i++) {
              const dx = px - sources[i].x;
              const dy = py - sources[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              sum += Math.sin(dist * freq + sources[i].phase) * amp;
            }
            const normalized = (sum / sources.length + 1) / 2;
            const cIdx = Math.floor(normalized * (palette.length - 1));
            const c = palette[Math.max(0, Math.min(palette.length - 1, cIdx))];
            const brightness = 40 + normalized * 60;
            const rgb = hsbToRgb(c.h, c.s, brightness);
            const idx = (py * resolution + px) * 4;
            p.pixels[idx] = rgb[0];
            p.pixels[idx + 1] = rgb[1];
            p.pixels[idx + 2] = rgb[2];
            p.pixels[idx + 3] = 255;
          }
        }
        p.updatePixels();
      }

      // ============================================================
      // WasmReactionDiffusion 类 / Wasm Reaction-Diffusion Wrapper
      // ============================================================
      function WasmReactionDiffusion() {
        this.width = 0;
        this.height = 0;
        this.ready = false;
      }

      WasmReactionDiffusion.prototype.init = function (width, height, seed) {
        if (!wasmLoaded || !wasmModule) return false;
        this.width = width;
        this.height = height;
        try {
          wasmModule._init(width, height, seed);
          this.ready = true;
          return true;
        } catch (e) {
          console.warn('[WasmRD] init failed:', e);
          this.ready = false;
          return false;
        }
      };

      WasmReactionDiffusion.prototype.step = function (feed, kill, iterations) {
        if (!this.ready || !wasmModule) return false;
        try {
          wasmModule._step(feed, kill, iterations);
          return true;
        } catch (e) {
          console.warn('[WasmRD] step failed:', e);
          return false;
        }
      };

      WasmReactionDiffusion.prototype.getB = function () {
        if (!this.ready || !wasmModule) return null;
        try {
          const ptr = wasmModule._getB();
          const size = this.width * this.height;
          const arr = new Float32Array(wasmModule.HEAPF32.buffer, ptr, size);
          return new Float32Array(arr);
        } catch (e) {
          console.warn('[WasmRD] getB failed:', e);
          return null;
        }
      };

      // ============================================================
      // 模式 8：反应扩散 Reaction-Diffusion (Gray-Scott 模型)
      // ============================================================
      function drawReactionDiffusion() {
        const w = resolution;
        const h = resolution;
        const useWasm = wasmEnabled && wasmLoaded && wasmModule;

        if (useWasm) {
          drawReactionDiffusionWasm(w, h);
        } else {
          drawReactionDiffusionJS(w, h);
        }
      }

      function drawReactionDiffusionJS(w, h) {
        let gridA = new Float32Array(w * h);
        let gridB = new Float32Array(w * h);
        let nextA = new Float32Array(w * h);
        let nextB = new Float32Array(w * h);

        for (let i = 0; i < w * h; i++) {
          gridA[i] = 1;
          gridB[i] = 0;
        }

        const seedCount = Math.max(5, Math.floor(density * 0.3));
        for (let i = 0; i < seedCount; i++) {
          const sx = Math.floor(p.random(w));
          const sy = Math.floor(p.random(h));
          const sr = Math.max(1, Math.floor(p.random(2, 6)));
          for (let dy = -sr; dy <= sr; dy++) {
            for (let dx = -sr; dx <= sr; dx++) {
              const nx = sx + dx;
              const ny = sy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                if (dx * dx + dy * dy <= sr * sr) {
                  gridB[ny * w + nx] = 1;
                }
              }
            }
          }
        }

        const dA = 1.0;
        const dB = 0.5;
        const feed = rdFeedRate;
        const kill = rdKillRate;
        const iterations = rdIterations;

        function gIdx(x, y) { return y * w + x; }

        for (let iter = 0; iter < iterations; iter++) {
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const a = gridA[gIdx(x, y)];
              const b = gridB[gIdx(x, y)];

              const xm = x > 0 ? x - 1 : w - 1;
              const xp = x < w - 1 ? x + 1 : 0;
              const ym = y > 0 ? y - 1 : h - 1;
              const yp = y < h - 1 ? y + 1 : 0;

              const lapA =
                gridA[gIdx(xm, y)] * 0.05 +
                gridA[gIdx(xp, y)] * 0.05 +
                gridA[gIdx(x, ym)] * 0.05 +
                gridA[gIdx(x, yp)] * 0.05 +
                gridA[gIdx(xm, ym)] * 0.2 +
                gridA[gIdx(xp, ym)] * 0.2 +
                gridA[gIdx(xm, yp)] * 0.2 +
                gridA[gIdx(xp, yp)] * 0.2 -
                a;

              const lapB =
                gridB[gIdx(xm, y)] * 0.05 +
                gridB[gIdx(xp, y)] * 0.05 +
                gridB[gIdx(x, ym)] * 0.05 +
                gridB[gIdx(x, yp)] * 0.05 +
                gridB[gIdx(xm, ym)] * 0.2 +
                gridB[gIdx(xp, ym)] * 0.2 +
                gridB[gIdx(xm, yp)] * 0.2 +
                gridB[gIdx(xp, yp)] * 0.2 -
                b;

              const abb = a * b * b;
              nextA[gIdx(x, y)] = a + (dA * lapA - abb + feed * (1 - a));
              nextB[gIdx(x, y)] = b + (dB * lapB + abb - (feed + kill) * b);
            }
          }

          const tmpA = gridA; gridA = nextA; nextA = tmpA;
          const tmpB = gridB; gridB = nextB; nextB = tmpB;
        }

        p.loadPixels();
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const b = gridB[gIdx(x, y)];
            const t = Math.max(0, Math.min(1, b));
            const cIdx = Math.floor(t * (palette.length - 1));
            const c = palette[Math.max(0, Math.min(palette.length - 1, cIdx))];
            const brightness = 20 + t * 80;
            const rgb = hsbToRgb(c.h, c.s, brightness);
            const pixIdx = (y * w + x) * 4;
            p.pixels[pixIdx] = rgb[0];
            p.pixels[pixIdx + 1] = rgb[1];
            p.pixels[pixIdx + 2] = rgb[2];
            p.pixels[pixIdx + 3] = 255;
          }
        }
        p.updatePixels();
      }

      function drawReactionDiffusionWasm(w, h) {
        const rd = new WasmReactionDiffusion();

        const seedNorm = currentSeed / 999999.0;
        if (!rd.init(w, h, seedNorm)) {
          drawReactionDiffusionJS(w, h);
          return;
        }

        const seedCount = Math.max(5, Math.floor(density * 0.3));
        const gridBPtr = wasmModule._getB();
        const gridBHeap = new Float32Array(wasmModule.HEAPF32.buffer, gridBPtr, w * h);

        for (let i = 0; i < seedCount; i++) {
          const sx = Math.floor(p.random(w));
          const sy = Math.floor(p.random(h));
          const sr = Math.max(1, Math.floor(p.random(2, 6)));
          for (let dy = -sr; dy <= sr; dy++) {
            for (let dx = -sr; dx <= sr; dx++) {
              const nx = sx + dx;
              const ny = sy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                if (dx * dx + dy * dy <= sr * sr) {
                  gridBHeap[ny * w + nx] = 1;
                }
              }
            }
          }
        }

        if (!rd.step(rdFeedRate, rdKillRate, rdIterations)) {
          drawReactionDiffusionJS(w, h);
          return;
        }

        const resultB = rd.getB();
        if (!resultB) {
          drawReactionDiffusionJS(w, h);
          return;
        }

        function gIdx(x, y) { return y * w + x; }

        p.loadPixels();
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const b = resultB[gIdx(x, y)];
            const t = Math.max(0, Math.min(1, b));
            const cIdx = Math.floor(t * (palette.length - 1));
            const c = palette[Math.max(0, Math.min(palette.length - 1, cIdx))];
            const brightness = 20 + t * 80;
            const rgb = hsbToRgb(c.h, c.s, brightness);
            const pixIdx = (y * w + x) * 4;
            p.pixels[pixIdx] = rgb[0];
            p.pixels[pixIdx + 1] = rgb[1];
            p.pixels[pixIdx + 2] = rgb[2];
            p.pixels[pixIdx + 3] = 255;
          }
        }
        p.updatePixels();
      }

      // ============================================================
      // 公开方法（挂到 p5 实例上供外部调用）
      // ============================================================
      p.regenerate = regenerate;

      p.startAnimation = function () {
        if (currentMode !== 'flow' && currentMode !== 'particles') return false;
        isAnimating = true;
        p.colorMode(p.HSB, 360, 100, 100, 100);
        p.background(240, 43, 18);
        p.noStroke();
        if (currentMode === 'flow') initFlow();
        else if (currentMode === 'particles') initParticles();
        p.loop();
        return true;
      };

      p.stopAnimation = function () {
        isAnimating = false;
        p.noLoop();
      };

      p.isAnimating = function () { return isAnimating; };

      /**
       * downloadPNG() → dataURL
       * 导出高分辨率 PNG（放大 16 倍，保持像素风）。
       */
      p.downloadPNG = function () {
        const scale = 16;
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = resolution * scale;
        tmpCanvas.height = resolution * scale;
        const ctx = tmpCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'low';
        ctx.drawImage(p.canvas, 0, 0, resolution * scale, resolution * scale);
        return tmpCanvas.toDataURL('image/png');
      };
    };
  }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================
  function init() {
    loadWasmSettings();

    const container = document.getElementById('pixel-art-canvas-container');
    if (!container) {
      console.warn('[pixel-art] container #pixel-art-canvas-container not found');
      return;
    }
    if (typeof p5 === 'undefined') {
      console.warn('[pixel-art] p5.js not loaded');
      return;
    }
    // 清空容器（避免重复初始化残留）
    while (container.firstChild) container.removeChild(container.firstChild);
    p5Instance = new p5(createSketch(), container);
    bindControls();

    if (wasmEnabled && isWasmSupported()) {
      loadWasmModule();
    }
  }

  function regenerate() {
    if (p5Instance && p5Instance.regenerate) {
      p5Instance.regenerate();
    }
  }

  function toggleAnimation() {
    if (!p5Instance) return;
    if (isAnimating) {
      // 停止动画，重新静态渲染
      p5Instance.stopAnimation();
      isAnimating = false;
      regenerate();
      updateAnimateBtn(false);
      return;
    }
    // 启动动画
    if (currentMode !== 'flow' && currentMode !== 'particles') {
      showToast(i18n.t('toast_animate_not_supported'));
      return;
    }
    const ok = p5Instance.startAnimation();
    if (ok) {
      isAnimating = true;
      updateAnimateBtn(true);
    }
  }

  function updateAnimateBtn(animating) {
    const btn = document.getElementById('art-animate');
    if (btn) btn.textContent = animating ? i18n.t('btn_stop_animate') : i18n.t('btn_animate');
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    if (window.PixelArtToastTimer) {
      clearTimeout(window.PixelArtToastTimer);
    }
    window.PixelArtToastTimer = setTimeout(function () {
      el.style.display = 'none';
    }, 2200);
  }

  // ============================================================
  // 控件绑定 / Bind Controls
  // ============================================================
  function bindControls() {
    // 种子控制
    const seedInput = document.getElementById('art-seed');
    const seedPrev = document.getElementById('art-seed-prev');
    const seedNext = document.getElementById('art-seed-next');
    const seedRandom = document.getElementById('art-seed-random');

    function setSeed(v) {
      v = parseInt(v, 10);
      if (isNaN(v)) v = 1;
      v = Math.max(1, Math.min(999999, v));
      currentSeed = v;
      if (seedInput) seedInput.value = v;
      regenerate();
    }

    if (seedInput) {
      seedInput.addEventListener('change', function () {
        setSeed(this.value);
      });
    }
    if (seedPrev) {
      seedPrev.addEventListener('click', function () {
        setSeed(currentSeed - 1);
      });
    }
    if (seedNext) {
      seedNext.addEventListener('click', function () {
        setSeed(currentSeed + 1);
      });
    }
    if (seedRandom) {
      seedRandom.addEventListener('click', function () {
        setSeed(Math.floor(Math.random() * 999999) + 1);
      });
    }

    // 艺术模式
    const modeSelect = document.getElementById('art-mode');
    if (modeSelect) {
      modeSelect.addEventListener('change', function () {
        // 切换模式前先停止动画
        if (isAnimating) {
          p5Instance.stopAnimation();
          isAnimating = false;
          updateAnimateBtn(false);
        }
        currentMode = this.value;
        updateModeSections();
        regenerate();
      });
    }

    function updateModeSections() {
      const sections = ['fractal-tree', 'voronoi', 'wave-interference', 'reaction-diffusion'];
      for (let i = 0; i < sections.length; i++) {
        const el = document.getElementById('art-section-' + sections[i]);
        if (el) el.style.display = (currentMode === sections[i]) ? 'flex' : 'none';
      }
    }
    updateModeSections();

    // 分辨率滑块
    const resInput = document.getElementById('art-resolution');
    const resValue = document.getElementById('art-resolution-value');
    if (resInput) {
      resInput.addEventListener('input', function () {
        resolution = parseInt(this.value, 10) || 48;
        if (resValue) resValue.textContent = resolution;
      });
      // change 事件再重建画布（避免拖动过程中频繁重建）
      resInput.addEventListener('change', function () {
        if (p5Instance) {
          p5Instance.resizeCanvas(resolution, resolution);
          regenerate();
        }
      });
    }

    // 密度滑块
    const densityInput = document.getElementById('art-density');
    const densityValue = document.getElementById('art-density-value');
    if (densityInput) {
      densityInput.addEventListener('input', function () {
        density = parseInt(this.value, 10) || 50;
        if (densityValue) densityValue.textContent = density;
      });
      densityInput.addEventListener('change', function () {
        regenerate();
      });
    }

    // 色相滑块
    const hueInput = document.getElementById('art-hue');
    const hueValue = document.getElementById('art-hue-value');
    if (hueInput) {
      hueInput.addEventListener('input', function () {
        hue = parseInt(this.value, 10) || 45;
        if (hueValue) hueValue.textContent = hue;
      });
      hueInput.addEventListener('change', function () {
        regenerate();
      });
    }

    // 重新生成按钮
    const regenBtn = document.getElementById('art-regenerate');
    if (regenBtn) {
      regenBtn.addEventListener('click', function () {
        if (isAnimating) {
          p5Instance.stopAnimation();
          isAnimating = false;
          updateAnimateBtn(false);
        }
        regenerate();
        showToast(i18n.t('toast_regenerated'));
      });
    }

    // 下载 PNG
    const downloadBtn = document.getElementById('art-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        if (!p5Instance || !p5Instance.downloadPNG) return;
        try {
          const dataUrl = p5Instance.downloadPNG();
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'pixel-art-' + currentMode + '-seed' + currentSeed + '-' + resolution + 'px.png';
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast(i18n.t('toast_download_done', { size: resolution * 16 }));
        } catch (e) {
          showToast(i18n.t('toast_download_error', { msg: e.message || i18n.t('toast_unknown_error') }));
        }
      });
    }

    // 分形树参数
    const fractalDepthInput = document.getElementById('art-fractal-depth');
    const fractalDepthValue = document.getElementById('art-fractal-depth-value');
    if (fractalDepthInput) {
      fractalDepthInput.addEventListener('input', function () {
        fractalDepth = parseInt(this.value, 10) || 6;
        if (fractalDepthValue) fractalDepthValue.textContent = fractalDepth;
      });
      fractalDepthInput.addEventListener('change', function () { regenerate(); });
    }

    const fractalAngleInput = document.getElementById('art-fractal-angle');
    const fractalAngleValue = document.getElementById('art-fractal-angle-value');
    if (fractalAngleInput) {
      fractalAngleInput.addEventListener('input', function () {
        fractalAngle = parseInt(this.value, 10) || 25;
        if (fractalAngleValue) fractalAngleValue.textContent = fractalAngle;
      });
      fractalAngleInput.addEventListener('change', function () { regenerate(); });
    }

    const fractalRatioInput = document.getElementById('art-fractal-ratio');
    const fractalRatioValue = document.getElementById('art-fractal-ratio-value');
    if (fractalRatioInput) {
      fractalRatioInput.addEventListener('input', function () {
        fractalLengthRatio = (parseInt(this.value, 10) || 70) / 100;
        if (fractalRatioValue) fractalRatioValue.textContent = fractalLengthRatio.toFixed(2);
      });
      fractalRatioInput.addEventListener('change', function () { regenerate(); });
    }

    const fractalInitLenInput = document.getElementById('art-fractal-initlen');
    const fractalInitLenValue = document.getElementById('art-fractal-initlen-value');
    if (fractalInitLenInput) {
      fractalInitLenInput.addEventListener('input', function () {
        fractalInitLength = parseInt(this.value, 10) || 150;
        if (fractalInitLenValue) fractalInitLenValue.textContent = fractalInitLength;
      });
      fractalInitLenInput.addEventListener('change', function () { regenerate(); });
    }

    // Voronoi 参数
    const voronoiPointsInput = document.getElementById('art-voronoi-points');
    const voronoiPointsValue = document.getElementById('art-voronoi-points-value');
    if (voronoiPointsInput) {
      voronoiPointsInput.addEventListener('input', function () {
        voronoiPoints = parseInt(this.value, 10) || 80;
        if (voronoiPointsValue) voronoiPointsValue.textContent = voronoiPoints;
      });
      voronoiPointsInput.addEventListener('change', function () { regenerate(); });
    }

    const voronoiRelaxInput = document.getElementById('art-voronoi-relax');
    const voronoiRelaxValue = document.getElementById('art-voronoi-relax-value');
    if (voronoiRelaxInput) {
      voronoiRelaxInput.addEventListener('input', function () {
        voronoiRelaxIterations = parseInt(this.value, 10) || 3;
        if (voronoiRelaxValue) voronoiRelaxValue.textContent = voronoiRelaxIterations;
      });
      voronoiRelaxInput.addEventListener('change', function () { regenerate(); });
    }

    const voronoiColorModeSelect = document.getElementById('art-voronoi-color-mode');
    if (voronoiColorModeSelect) {
      voronoiColorModeSelect.addEventListener('change', function () {
        voronoiColorMode = this.value;
        regenerate();
      });
    }

    // 波干涉参数
    const waveSourcesInput = document.getElementById('art-wave-sources');
    const waveSourcesValue = document.getElementById('art-wave-sources-value');
    if (waveSourcesInput) {
      waveSourcesInput.addEventListener('input', function () {
        waveSourceCount = parseInt(this.value, 10) || 4;
        if (waveSourcesValue) waveSourcesValue.textContent = waveSourceCount;
      });
      waveSourcesInput.addEventListener('change', function () { regenerate(); });
    }

    const waveFreqInput = document.getElementById('art-wave-freq');
    const waveFreqValue = document.getElementById('art-wave-freq-value');
    if (waveFreqInput) {
      waveFreqInput.addEventListener('input', function () {
        waveFrequency = (parseInt(this.value, 10) || 15) / 10;
        if (waveFreqValue) waveFreqValue.textContent = waveFrequency.toFixed(1);
      });
      waveFreqInput.addEventListener('change', function () { regenerate(); });
    }

    const waveAmpInput = document.getElementById('art-wave-amp');
    const waveAmpValue = document.getElementById('art-wave-amp-value');
    if (waveAmpInput) {
      waveAmpInput.addEventListener('input', function () {
        waveAmplitude = parseInt(this.value, 10) || 50;
        if (waveAmpValue) waveAmpValue.textContent = waveAmplitude;
      });
      waveAmpInput.addEventListener('change', function () { regenerate(); });
    }

    // 反应扩散参数
    const rdFeedInput = document.getElementById('art-rd-feed');
    const rdFeedValue = document.getElementById('art-rd-feed-value');
    if (rdFeedInput) {
      rdFeedInput.addEventListener('input', function () {
        rdFeedRate = (parseInt(this.value, 10) || 55) / 1000;
        if (rdFeedValue) rdFeedValue.textContent = rdFeedRate.toFixed(3);
      });
      rdFeedInput.addEventListener('change', function () { regenerate(); });
    }

    const rdKillInput = document.getElementById('art-rd-kill');
    const rdKillValue = document.getElementById('art-rd-kill-value');
    if (rdKillInput) {
      rdKillInput.addEventListener('input', function () {
        rdKillRate = (parseInt(this.value, 10) || 62) / 1000;
        if (rdKillValue) rdKillValue.textContent = rdKillRate.toFixed(3);
      });
      rdKillInput.addEventListener('change', function () { regenerate(); });
    }

    const rdIterInput = document.getElementById('art-rd-iter');
    const rdIterValue = document.getElementById('art-rd-iter-value');
    if (rdIterInput) {
      rdIterInput.addEventListener('input', function () {
        rdIterations = parseInt(this.value, 10) || 800;
        if (rdIterValue) rdIterValue.textContent = rdIterations;
      });
      rdIterInput.addEventListener('change', function () { regenerate(); });
    }

    // 动画播放按钮
    const animateBtn = document.getElementById('art-animate');
    if (animateBtn) {
      animateBtn.addEventListener('click', toggleAnimation);
    }

    // 语言切换时更新动画按钮文字
    document.addEventListener('languagechange', function () {
      updateAnimateBtn(isAnimating);
    });
  }

  // ============================================================
  // Wasm 加载与设置 / Wasm Loading & Settings
  // ============================================================
  function loadWasmSettings() {
    try {
      const saved = localStorage.getItem(WASM_STORAGE_KEY);
      wasmEnabled = saved === '1';
    } catch (e) {
      wasmEnabled = false;
    }
  }

  function saveWasmSettings(enabled) {
    wasmEnabled = enabled;
    try {
      localStorage.setItem(WASM_STORAGE_KEY, enabled ? '1' : '0');
    } catch (e) { /* ignore */ }
  }

  function isWasmSupported() {
    return typeof WebAssembly !== 'undefined' && typeof WebAssembly.instantiate === 'function';
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.onload = function () { resolve(true); };
      script.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(script);
    });
  }

  // ============================================================
  // 内联 JS 优化版反应扩散内核 / Inline JS-optimized Reaction-Diffusion Kernel
  // ============================================================
  // 当 Wasm 二进制不可用时（emcc/wat2wasm 未安装或 wasm 文件缺失），
  // 使用该内联优化版替代外部 wasm 文件，避免 404 并提供与 Emscripten 模块
  // 接口兼容的加速内核（_init/_step/_getA/_getB/_getWidth/_getHeight/HEAPF32）。
  // 优化点：Float32Array 存储、内联 laplacian（避免函数调用）、缓存行长与
  // 数组长度到局部变量、热循环内不调用 Math.random。
  function createJsOptimizedReactionDiffusionModule() {
    let width = 0;
    let height = 0;
    let gridA = null;
    let gridB = null;
    let nextA = null;
    let nextB = null;
    // 兼容 Emscripten 风格：外部通过 new Float32Array(HEAPF32.buffer, ptr, size) 访问
    const HEAPF32 = { buffer: new ArrayBuffer(0) };

    function refreshHeap() {
      if (gridB) HEAPF32.buffer = gridB.buffer;
    }

    return {
      HEAPF32: HEAPF32,
      _init: function (w, h, seed) {
        width = w;
        height = h;
        const size = w * h;
        gridA = new Float32Array(size);
        gridB = new Float32Array(size);
        nextA = new Float32Array(size);
        nextB = new Float32Array(size);
        for (let i = 0; i < size; i++) {
          gridA[i] = 1.0;
          gridB[i] = 0.0;
        }
        refreshHeap();
        return 0;
      },
      _step: function (feed, kill, iterations) {
        if (!gridA || !gridB) return 0;
        const w = width;
        const h = height;
        const dA = 1.0;
        const dB = 0.5;
        const feedKill = feed + kill;

        for (let iter = 0; iter < iterations; iter++) {
          for (let y = 0; y < h; y++) {
            const ym = y > 0 ? y - 1 : h - 1;
            const yp = y < h - 1 ? y + 1 : 0;
            const ymw = ym * w;
            const yw = y * w;
            const ypw = yp * w;
            for (let x = 0; x < w; x++) {
              const xm = x > 0 ? x - 1 : w - 1;
              const xp = x < w - 1 ? x + 1 : 0;
              const idx = yw + x;

              const a = gridA[idx];
              const b = gridB[idx];

              const lapA =
                gridA[ymw + xm] * 0.2 +
                gridA[ymw + x]  * 0.05 +
                gridA[ymw + xp] * 0.2 +
                gridA[yw + xm]  * 0.05 +
                gridA[yw + xp]  * 0.05 +
                gridA[ypw + xm] * 0.2 +
                gridA[ypw + x]  * 0.05 +
                gridA[ypw + xp] * 0.2 -
                a;

              const lapB =
                gridB[ymw + xm] * 0.2 +
                gridB[ymw + x]  * 0.05 +
                gridB[ymw + xp] * 0.2 +
                gridB[yw + xm]  * 0.05 +
                gridB[yw + xp]  * 0.05 +
                gridB[ypw + xm] * 0.2 +
                gridB[ypw + x]  * 0.05 +
                gridB[ypw + xp] * 0.2 -
                b;

              const abb = a * b * b;
              nextA[idx] = a + (dA * lapA - abb + feed * (1.0 - a));
              nextB[idx] = b + (dB * lapB + abb - feedKill * b);
            }
          }
          const tmpA = gridA; gridA = nextA; nextA = tmpA;
          const tmpB = gridB; gridB = nextB; nextB = tmpB;
        }
        refreshHeap();
        return 0;
      },
      _getA: function () { refreshHeap(); return 0; },
      _getB: function () { refreshHeap(); return 0; },
      _getWidth: function () { return width; },
      _getHeight: function () { return height; }
    };
  }

  async function loadWasmModule() {
    if (!isWasmSupported()) {
      wasmLoaded = false;
      wasmModule = null;
      return false;
    }

    if (wasmLoaded && wasmModule) {
      return true;
    }

    try {
      // 不再尝试 loadScript('wasm/reaction-diffusion.js')（避免 404）。
      // 直接初始化内联 JS 优化版内核，接口与 Emscripten 模块兼容，
      // 由 WasmReactionDiffusion 包装类统一调用。
      wasmModule = createJsOptimizedReactionDiffusionModule();
      wasmLoaded = true;
      return true;
    } catch (e) {
      console.warn('[pixel-art] Acceleration module init failed:', e);
      wasmLoaded = false;
      wasmModule = null;
      return false;
    }
  }

  function initWasmToggle() {
    const toggle = document.getElementById('wasm-toggle');
    const section = document.getElementById('settings-section-wasm');

    if (!section) return;

    if (!isWasmSupported()) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'flex';

    if (toggle) {
      toggle.checked = wasmEnabled;
      toggle.addEventListener('change', function () {
        const enabled = toggle.checked;
        saveWasmSettings(enabled);
        if (enabled) {
          loadWasmModule().then(function (success) {
            if (success) {
              showToast(i18n.t('toast_wasm_enabled'));
            } else {
              showToast(i18n.t('toast_wasm_load_failed'));
              toggle.checked = false;
              saveWasmSettings(false);
            }
          });
        } else {
          showToast(i18n.t('toast_wasm_disabled'));
        }
      });
    }
  }

  function isWasmReady() {
    return wasmEnabled && wasmLoaded && wasmModule;
  }

  // ============================================================
  // 导出 / Export
  // ============================================================
  window.PixelArt = {
    init: init,
    regenerate: regenerate,
    loadWasmModule: loadWasmModule,
    isWasmSupported: isWasmSupported,
    isWasmReady: isWasmReady,
    initWasmToggle: initWasmToggle
  };
})();

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', function () {
  if (window.PixelArt) window.PixelArt.init();
});
