/**
 * nn-visualizer.js
 * 神经网络可视化器 (Neural Network Visualizer)
 *
 * 独立实现的前馈神经网络可视化器，支持任意层数与每层神经元数。
 * 参考 nn.js 的视觉风格，但不依赖 nn.js。
 *
 * 特性：
 *   - 可调整网络结构（层数、每层神经元数）
 *   - 前向传播：sigmoid 激活函数
 *   - 反向传播：梯度下降（MSE 损失）
 *   - 实时显示权重变化（颜色=正负，粗细=大小）
 *   - 实时显示损失曲线
 *   - 内置 XOR 与正弦拟合数据集
 *   - requestAnimationFrame 动画驱动，可调节训练速度
 *
 * 导出全局对象 `NNVisualizer`：
 *   {
 *     init(networkCanvas, lossCanvas),
 *     setStructure(layers),
 *     train(dataset, epochs, learningRate, callback),
 *     reset(),
 *     stop(),
 *     setSpeed(stepsPerFrame),
 *     datasets
 *   }
 *
 * 视觉风格与网站一致：#1a1a2e 背景、金色强调。
 */

window.NNVisualizer = (function () {
  'use strict';

  // ============================================================
  // 颜色常量 / Color Palette（与网站一致）
  // ============================================================
  var COLOR_BG = '#1a1a2e';
  var COLOR_NEURON_BORDER = '#ffd700';
  var COLOR_NEURON_FILL = '#2d2d44';
  var COLOR_WEIGHT_POS = '#ff4500';   // 正权重 - 红
  var COLOR_WEIGHT_NEG = '#1e90ff';   // 负权重 - 蓝
  var COLOR_LOSS = '#ffd700';         // 损失曲线
  var COLOR_TEXT = '#ffffff';
  var COLOR_AXIS = '#3a3a55';
  var COLOR_GRID = '#2a2a44';

  // ============================================================
  // 状态 / State
  // ============================================================
  var networkCanvas = null;
  var lossCanvas = null;
  var networkCtx = null;
  var lossCtx = null;

  var layers = [2, 4, 1];      // 网络结构：每层神经元数
  var weights = [];            // weights[l][i][j]: 第 l 层神经元 i -> 第 l+1 层神经元 j
  var biases = [];             // biases[l][j]: 第 l+1 层神经元 j 的偏置

  var lossHistory = [];        // 损失历史（每轮一个值）
  var currentEpoch = 0;
  var isTraining = false;
  var rafId = null;
  var trainSpeed = 5;          // 每帧训练步数（可调节训练速度）

  // 缓存最近一次前向传播的激活值（用于绘制神经元激活状态）
  var lastActivations = null;

  // 自定义训练集状态 / Custom Dataset State
  var customDataset = [];            // 自定义样本（持久存储）
  var currentDataset = [];           // 当前活跃训练集（显示/训练/编辑）
  var currentDatasetType = 'custom'; // 当前训练集类型：xor/sine/circle/spiral/custom

  // ============================================================
  // 激活函数 / Activation Functions
  // ============================================================

  // sigmoid 激活函数（数值稳定版）
  function sigmoid(x) {
    if (x >= 0) {
      var ex = Math.exp(-x);
      return 1 / (1 + ex);
    } else {
      var ex2 = Math.exp(x);
      return ex2 / (1 + ex2);
    }
  }

  // 已知 sigmoid 输出 a，求导数 a*(1-a)
  function sigmoidDerivFromOutput(a) {
    return a * (1 - a);
  }

  // ============================================================
  // 网络初始化 / Network Initialization
  // ============================================================
  function initWeights() {
    weights = [];
    biases = [];
    for (var l = 0; l < layers.length - 1; l++) {
      var nIn = layers[l];
      var nOut = layers[l + 1];
      // Xavier 风格初始化：方差 = 1/nIn
      var scale = Math.sqrt(1 / nIn);
      var W = [];
      for (var i = 0; i < nIn; i++) {
        var row = [];
        for (var j = 0; j < nOut; j++) {
          row.push((Math.random() * 2 - 1) * scale);
        }
        W.push(row);
      }
      weights.push(W);

      var b = [];
      for (var j2 = 0; j2 < nOut; j2++) {
        b.push(0);
      }
      biases.push(b);
    }

    // 初始化激活缓存为全 0
    lastActivations = layers.map(function (n) {
      var arr = [];
      for (var k = 0; k < n; k++) arr.push(0);
      return arr;
    });
  }

  // ============================================================
  // 前向传播 / Forward Pass
  // 返回各层激活值数组（含输入层），用于反向传播和绘制
  // ============================================================
  function forward(input) {
    var activations = [input.slice()];
    var current = input;
    for (var l = 0; l < weights.length; l++) {
      var nOut = layers[l + 1];
      var next = new Array(nOut);
      for (var j = 0; j < nOut; j++) {
        var sum = biases[l][j];
        for (var i = 0; i < current.length; i++) {
          sum += current[i] * weights[l][i][j];
        }
        next[j] = sigmoid(sum);
      }
      activations.push(next);
      current = next;
    }
    return activations;
  }

  // ============================================================
  // 反向传播 / Backpropagation
  // 损失函数：L = 0.5 * sum((a - y)^2) （MSE）
  // 输出层 delta = (a - y) * sigmoid'(a)
  // 隐藏层 delta = (W^T * delta_next) * sigmoid'(a)
  // ============================================================
  function backprop(activations, target, learningRate) {
    var L = weights.length; // 权重层数 = layers.length - 1
    var output = activations[L]; // 输出层激活

    // 计算各层 delta
    var deltas = new Array(L);

    // 输出层 delta
    var outDelta = new Array(output.length);
    for (var i = 0; i < output.length; i++) {
      outDelta[i] = (output[i] - target[i]) * sigmoidDerivFromOutput(output[i]);
    }
    deltas[L - 1] = outDelta;

    // 隐藏层 delta（从后往前）
    for (var l = L - 2; l >= 0; l--) {
      var aNext = activations[l + 1];
      var deltaNext = deltas[l + 1];
      var Wnext = weights[l + 1];
      var nIn = aNext.length;
      var delta = new Array(nIn);
      for (var i2 = 0; i2 < nIn; i2++) {
        var sum = 0;
        for (var j = 0; j < deltaNext.length; j++) {
          sum += Wnext[i2][j] * deltaNext[j];
        }
        delta[i2] = sum * sigmoidDerivFromOutput(aNext[i2]);
      }
      deltas[l] = delta;
    }

    // 更新权重和偏置（梯度下降）
    for (var l2 = 0; l2 < L; l2++) {
      var aPrev = activations[l2];
      var deltaL = deltas[l2];
      var W = weights[l2];
      var b = biases[l2];
      for (var ii = 0; ii < aPrev.length; ii++) {
        for (var jj = 0; jj < deltaL.length; jj++) {
          W[ii][jj] -= learningRate * deltaL[jj] * aPrev[ii];
        }
      }
      for (var jj2 = 0; jj2 < deltaL.length; jj2++) {
        b[jj2] -= learningRate * deltaL[jj2];
      }
    }
  }

  // ============================================================
  // 损失计算 / Loss Computation
  // ============================================================
  function computeLoss(dataset) {
    var totalLoss = 0;
    var inputSize = layers[0];
    var outputSize = layers[layers.length - 1];
    for (var s = 0; s < dataset.length; s++) {
      var sample = dataset[s];
      var input = sample.slice(0, inputSize);
      var target = sample.slice(inputSize, inputSize + outputSize);
      var activations = forward(input);
      var output = activations[activations.length - 1];
      for (var i = 0; i < output.length; i++) {
        var d = output[i] - target[i];
        totalLoss += 0.5 * d * d;
      }
    }
    return totalLoss / dataset.length;
  }

  // ============================================================
  // 网络结构可视化 / Network Visualization
  // ============================================================
  function drawNetwork() {
    if (!networkCtx) return;
    var ctx = networkCtx;
    var w = networkCanvas.width;
    var h = networkCanvas.height;

    // 背景
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // 边距
    var padX = 60;
    var padY = 40;

    // 计算每层 x 坐标
    var nLayers = layers.length;
    var layerX = [];
    for (var l = 0; l < nLayers; l++) {
      if (nLayers === 1) {
        layerX.push(w / 2);
      } else {
        layerX.push(padX + (w - 2 * padX) * (l / (nLayers - 1)));
      }
    }

    // 计算每层神经元 y 坐标
    var layerY = [];
    for (var ly = 0; ly < nLayers; ly++) {
      var n = layers[ly];
      var ys = [];
      for (var i = 0; i < n; i++) {
        if (n === 1) {
          ys.push(h / 2);
        } else {
          ys.push(padY + (h - 2 * padY) * (i / (n - 1)));
        }
      }
      layerY.push(ys);
    }

    // 计算权重绝对值最大值，用于线条粗细归一化
    var maxAbsW = 0.0001;
    for (var wl = 0; wl < weights.length; wl++) {
      for (var wi = 0; wi < weights[wl].length; wi++) {
        for (var wj = 0; wj < weights[wl][wi].length; wj++) {
          var aw = Math.abs(weights[wl][wi][wj]);
          if (aw > maxAbsW) maxAbsW = aw;
        }
      }
    }

    // 绘制连接线（权重）
    for (var cl = 0; cl < weights.length; cl++) {
      var W = weights[cl];
      for (var ci = 0; ci < W.length; ci++) {
        for (var cj = 0; cj < W[ci].length; cj++) {
          var wVal = W[ci][cj];
          var x1 = layerX[cl];
          var y1 = layerY[cl][ci];
          var x2 = layerX[cl + 1];
          var y2 = layerY[cl + 1][cj];

          // 颜色：正=红，负=蓝
          var color = wVal >= 0 ? COLOR_WEIGHT_POS : COLOR_WEIGHT_NEG;
          // 粗细：按 |w|/maxAbsW 映射到 [0.3, 4]
          var thickness = 0.3 + 3.7 * (Math.abs(wVal) / maxAbsW);
          // 透明度：按 |w| 映射，弱权重更淡
          var alpha = 0.25 + 0.65 * (Math.abs(wVal) / maxAbsW);

          ctx.strokeStyle = color;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = thickness;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;

    // 绘制神经元
    var neuronRadius = Math.min(18, Math.min((w - 2 * padX) / (nLayers * 3), (h - 2 * padY) / 8));
    neuronRadius = Math.max(8, neuronRadius);
    for (var nl = 0; nl < nLayers; nl++) {
      var ys2 = layerY[nl];
      var acts = lastActivations ? lastActivations[nl] : null;
      for (var ni = 0; ni < ys2.length; ni++) {
        var cx = layerX[nl];
        var cy = ys2[ni];

        // 填充：根据激活值调整亮度（激活越强越亮）
        var act = acts ? acts[ni] : 0;
        ctx.fillStyle = COLOR_NEURON_FILL;
        ctx.beginPath();
        ctx.arc(cx, cy, neuronRadius, 0, Math.PI * 2);
        ctx.fill();

        // 激活值内圈（金色光晕表示激活强度）
        if (act > 0.01) {
          ctx.fillStyle = COLOR_NEURON_BORDER;
          ctx.globalAlpha = act * 0.6;
          ctx.beginPath();
          ctx.arc(cx, cy, neuronRadius * 0.6 * act, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // 边框
        ctx.strokeStyle = COLOR_NEURON_BORDER;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, neuronRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 神经元激活值文字
        if (act > 0.001) {
          ctx.fillStyle = COLOR_TEXT;
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(act.toFixed(2), cx, cy + neuronRadius + 12);
        }
      }
    }

    // 绘制层标签
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var labels = [];
    for (var li = 0; li < nLayers; li++) {
      if (li === 0) labels.push((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_layer_input', {n: layers[li]})) || ('输入层 (' + layers[li] + ')'));
      else if (li === nLayers - 1) labels.push((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_layer_output', {n: layers[li]})) || ('输出层 (' + layers[li] + ')'));
      else labels.push((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_layer_hidden', {idx: li, n: layers[li]})) || ('隐藏层' + li + ' (' + layers[li] + ')'));
    }
    for (var lx = 0; lx < nLayers; lx++) {
      ctx.fillText(labels[lx], layerX[lx], h - 24);
    }

    // 顶部信息
    ctx.textAlign = 'left';
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_epoch', {val: currentEpoch})) || ('轮次: ' + currentEpoch), 10, 10);
    if (lossHistory.length > 0) {
      ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_loss', {val: lossHistory[lossHistory.length - 1].toFixed(6)})) || ('损失: ' + lossHistory[lossHistory.length - 1].toFixed(6)), 10, 26);
    }
  }

  // ============================================================
  // 损失曲线可视化 / Loss Curve Visualization
  // ============================================================
  function drawLoss() {
    if (!lossCtx) return;
    var ctx = lossCtx;
    var w = lossCanvas.width;
    var h = lossCanvas.height;

    // 背景
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    // 边距
    var padL = 50;
    var padR = 20;
    var padT = 30;
    var padB = 30;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;

    // 绘制网格和坐标轴
    ctx.strokeStyle = COLOR_AXIS;
    ctx.lineWidth = 1;

    // 边框
    ctx.strokeRect(padL, padT, plotW, plotH);

    // 网格线
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 0.5;
    var nGridX = 5;
    var nGridY = 4;
    for (var gx = 1; gx < nGridX; gx++) {
      var x = padL + plotW * (gx / nGridX);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
    }
    for (var gy = 1; gy < nGridY; gy++) {
      var y = padT + plotH * (gy / nGridY);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
    }

    // 标题
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_loss_curve_title')) || '损失曲线 (Loss Curve)', padL, 8);

    // 若无数据，直接返回
    if (lossHistory.length === 0) {
      ctx.fillStyle = COLOR_TEXT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_waiting_training')) || '等待训练开始...', padL + plotW / 2, padT + plotH / 2);
      return;
    }

    // 计算坐标范围
    var maxLoss = 0;
    for (var i = 0; i < lossHistory.length; i++) {
      if (lossHistory[i] > maxLoss) maxLoss = lossHistory[i];
    }
    if (maxLoss <= 0) maxLoss = 1;
    var minLoss = 0;
    var nPoints = lossHistory.length;

    // 坐标轴标签
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    // Y 轴标签
    for (var yy = 0; yy <= nGridY; yy++) {
      var val = maxLoss - (maxLoss - minLoss) * (yy / nGridY);
      var py = padT + plotH * (yy / nGridY);
      ctx.fillText(val.toFixed(4), padL - 4, py);
    }
    // X 轴标签
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var xx = 0; xx <= nGridX; xx++) {
      var epochVal = Math.round(nPoints * (xx / nGridX));
      var px = padL + plotW * (xx / nGridX);
      ctx.fillText(epochVal, px, padT + plotH + 4);
    }
    // 轴标题
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Loss', 8, padT + plotH / 2 - 30);
    ctx.textAlign = 'right';
    ctx.fillText('Epoch', padL + plotW, h - 12);

    // 绘制损失曲线
    ctx.strokeStyle = COLOR_LOSS;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var p = 0; p < nPoints; p++) {
      var px2 = padL + (nPoints === 1 ? plotW / 2 : plotW * (p / (nPoints - 1)));
      var py2 = padT + plotH - plotH * ((lossHistory[p] - minLoss) / (maxLoss - minLoss));
      if (p === 0) ctx.moveTo(px2, py2);
      else ctx.lineTo(px2, py2);
    }
    ctx.stroke();

    // 当前点高亮
    if (nPoints > 0) {
      var lastPx = padL + (nPoints === 1 ? plotW / 2 : plotW);
      var lastPy = padT + plotH - plotH * ((lossHistory[nPoints - 1] - minLoss) / (maxLoss - minLoss));
      ctx.fillStyle = COLOR_LOSS;
      ctx.beginPath();
      ctx.arc(lastPx, lastPy, 4, 0, Math.PI * 2);
      ctx.fill();

      // 当前损失值标签
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lossHistory[nPoints - 1].toFixed(6), lastPx - 6, lastPy - 6);
    }
  }

  // ============================================================
  // 内置数据集 / Built-in Datasets
  // ============================================================

  // XOR 数据集：[x1, x2, y]
  var XOR_DATASET = [
    [0, 0, 0],
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0]
  ];

  // 生成正弦拟合数据集：[x_norm, y_norm]
  // x 在 [0, 2π] 内归一化到 [0, 1]
  // y = sin(x) 归一化到 [0, 1]（因为 sigmoid 输出在 [0,1]）
  function generateSineData(n) {
    n = n || 40;
    var data = [];
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * Math.PI * 2;
      var xNorm = x / (Math.PI * 2); // [0, 1]
      var yNorm = (Math.sin(x) + 1) / 2; // [0, 1]
      data.push([xNorm, yNorm]);
    }
    return data;
  }

  // 生成圆形分类数据集：[x1, x2, label]
  // 在 [-1,1]×[-1,1] 平面随机生成点，距离原点 < 0.5 为类 1，否则为类 0
  // 坐标归一化到 [0,1]，约 n 个点
  function generateCircleData(n) {
    n = n || 40;
    var data = [];
    for (var i = 0; i < n; i++) {
      var x = Math.random() * 2 - 1;   // [-1, 1]
      var y = Math.random() * 2 - 1;
      var dist = Math.sqrt(x * x + y * y);
      var label = dist < 0.5 ? 1 : 0;
      // 归一化到 [0, 1]
      data.push([(x + 1) / 2, (y + 1) / 2, label]);
    }
    return data;
  }

  // 生成螺旋分类数据集：[x1, x2, label]
  // 两条螺旋线，每条 n 个点，分别属于类 0 和类 1
  // 坐标归一化到 [0,1]
  function generateSpiralData(n) {
    n = n || 20;  // 每条螺旋的点数
    var data = [];
    for (var cls = 0; cls < 2; cls++) {
      for (var i = 0; i < n; i++) {
        var t = i / (n - 1);                  // [0, 1]
        var r = t * 0.45 + 0.05;              // 半径
        var theta = t * 4 * Math.PI + cls * Math.PI; // 角度，两螺旋相差 π
        var x = r * Math.cos(theta);
        var y = r * Math.sin(theta);
        // 归一化到 [0, 1]
        data.push([x + 0.5, y + 0.5, cls]);
      }
    }
    return data;
  }

  // ============================================================
  // 训练集管理 / Dataset Management
  // ============================================================

  // 选择内置或自定义训练集（不覆盖持久化的 customDataset）
  function selectDataset(type) {
    currentDatasetType = type;
    if (type === 'custom') {
      currentDataset = customDataset;
    } else if (type === 'xor') {
      currentDataset = XOR_DATASET.map(function (s) { return s.slice(); });
    } else if (type === 'sine') {
      currentDataset = generateSineData();
    } else if (type === 'circle') {
      currentDataset = generateCircleData();
    } else if (type === 'spiral') {
      currentDataset = generateSpiralData();
    } else {
      currentDataset = customDataset;
    }
    return currentDataset;
  }

  // 设置自定义训练集（切换到自定义模式，覆盖 customDataset）
  function setDataset(samples) {
    if (!Array.isArray(samples)) {
      throw new Error('samples 必须是数组');
    }
    customDataset = samples.map(function (s) {
      return Array.isArray(s) ? s.slice() : s;
    });
    currentDataset = customDataset;
    currentDatasetType = 'custom';
  }

  // 获取当前训练集
  function getDataset() {
    return currentDataset;
  }

  // 添加单个样本到当前训练集
  // 自定义模式下，customDataset 与 currentDataset 同引用，已同步
  function addSample(sample) {
    if (!Array.isArray(sample)) {
      throw new Error('sample 必须是数组');
    }
    currentDataset.push(sample.slice());
  }

  // 删除指定索引的样本
  function removeSample(index) {
    if (index < 0 || index >= currentDataset.length) return;
    currentDataset.splice(index, 1);
  }

  // 清空当前训练集（原地清空以保持引用）
  function clearDataset() {
    currentDataset.length = 0;
  }

  // ============================================================
  // 训练集散点图可视化 / Dataset Scatter Plot
  // 在 canvas 上绘制训练集散点图
  // 分类：类0=金色#ffd700，类1=红色#ff4500
  // ============================================================
  function drawDataset(ctx, canvas) {
    if (!ctx || !canvas) return;
    var w = canvas.width;
    var h = canvas.height;

    // 背景
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, w, h);

    var padL = 30, padR = 12, padT = 24, padB = 22;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;

    // 网格线
    ctx.strokeStyle = COLOR_GRID;
    ctx.lineWidth = 0.5;
    var nGrid = 5;
    for (var gx = 0; gx <= nGrid; gx++) {
      var gxp = padL + plotW * (gx / nGrid);
      ctx.beginPath();
      ctx.moveTo(gxp, padT);
      ctx.lineTo(gxp, padT + plotH);
      ctx.stroke();
    }
    for (var gy = 0; gy <= nGrid; gy++) {
      var gyp = padT + plotH * (gy / nGrid);
      ctx.beginPath();
      ctx.moveTo(padL, gyp);
      ctx.lineTo(padL + plotW, gyp);
      ctx.stroke();
    }

    // 边框（坐标轴）
    ctx.strokeStyle = COLOR_AXIS;
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, plotW, plotH);

    // 坐标轴刻度标签
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var lx = 0; lx <= nGrid; lx++) {
      ctx.fillText((lx / nGrid).toFixed(1), padL + plotW * (lx / nGrid), padT + plotH + 3);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var ly = 0; ly <= nGrid; ly++) {
      ctx.fillText((1 - ly / nGrid).toFixed(1), padL - 3, padT + plotH * (ly / nGrid));
    }

    // 顶部标题（样本数）
    ctx.fillStyle = COLOR_NEURON_BORDER;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Samples: ' + currentDataset.length, padL, 6);

    // 空数据提示
    if (currentDataset.length === 0) {
      var emptyText = 'No samples';
      if (window.i18n && typeof window.i18n.t === 'function') {
        try { emptyText = window.i18n.t('nnvis_no_samples'); } catch (e) { /* ignore */ }
      }
      ctx.fillStyle = COLOR_TEXT;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emptyText, padL + plotW / 2, padT + plotH / 2);
      return;
    }

    // 检测是否为分类数据（最后一个元素为 0 或 1）
    var isClassification = false;
    var first = currentDataset[0];
    if (first && first.length >= 3) {
      var lbl0 = first[first.length - 1];
      isClassification = (lbl0 === 0 || lbl0 === 1);
    }

    // 绘制散点
    for (var s = 0; s < currentDataset.length; s++) {
      var sample = currentDataset[s];
      if (!sample || sample.length < 2) continue;
      var sx = sample[0];
      var sy = sample[1];
      // 夹紧到 [0,1]
      if (sx < 0) sx = 0; else if (sx > 1) sx = 1;
      if (sy < 0) sy = 0; else if (sy > 1) sy = 1;
      var px = padL + plotW * sx;
      var py = padT + plotH * (1 - sy);

      var label = sample[sample.length - 1];
      var color;
      if (isClassification) {
        // 类0=金色，类1=红色
        color = (label >= 0.5) ? COLOR_WEIGHT_POS : COLOR_NEURON_BORDER;
      } else {
        // 回归数据统一用金色
        color = COLOR_NEURON_BORDER;
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      // 白色描边增强可见性
      ctx.strokeStyle = COLOR_TEXT;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 图例（仅分类数据）
    if (isClassification) {
      var legX = w - padR - 50;
      var legY = 9;
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      // 类0 - 金色
      ctx.fillStyle = COLOR_NEURON_BORDER;
      ctx.beginPath();
      ctx.arc(legX, legY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOR_TEXT;
      ctx.fillText('0', legX + 5, legY);
      // 类1 - 红色
      ctx.fillStyle = COLOR_WEIGHT_POS;
      ctx.beginPath();
      ctx.arc(legX + 20, legY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOR_TEXT;
      ctx.fillText('1', legX + 25, legY);
    }
  }

  // ============================================================
  // 训练循环 / Training Loop
  // 使用 requestAnimationFrame 驱动，每帧训练 trainSpeed 步
  // ============================================================
  function train(dataset, epochs, learningRate, callback) {
    if (isTraining) return;
    if (!weights.length) initWeights();

    isTraining = true;
    currentEpoch = 0;
    lossHistory = [];

    var inputSize = layers[0];
    var outputSize = layers[layers.length - 1];

    // 回调间隔（避免每轮都回调造成性能问题）
    var callbackInterval = Math.max(1, Math.floor(epochs / 200));

    function step() {
      if (!isTraining) return;

      // 每帧训练 trainSpeed 个 epoch
      for (var s = 0; s < trainSpeed; s++) {
        if (currentEpoch >= epochs || !isTraining) break;

        var epochLoss = 0;
        // 遍历所有样本（在线学习：逐样本更新）
        for (var i = 0; i < dataset.length; i++) {
          var sample = dataset[i];
          var input = sample.slice(0, inputSize);
          var target = sample.slice(inputSize, inputSize + outputSize);
          var activations = forward(input);
          backprop(activations, target, learningRate);
          lastActivations = activations;

          // 累计损失
          var output = activations[activations.length - 1];
          for (var k = 0; k < output.length; k++) {
            var d = output[k] - target[k];
            epochLoss += 0.5 * d * d;
          }
        }
        epochLoss /= dataset.length;
        lossHistory.push(epochLoss);
        currentEpoch++;

        // 回调通知
        if (callback && (currentEpoch % callbackInterval === 0 || currentEpoch === 1)) {
          try {
            callback({
              done: false,
              epoch: currentEpoch,
              totalEpochs: epochs,
              loss: epochLoss
            });
          } catch (e) {
            // 回调异常不影响训练
          }
        }
      }

      // 更新可视化
      drawNetwork();
      drawLoss();

      // 训练完成或被停止
      if (currentEpoch >= epochs || !isTraining) {
        isTraining = false;
        if (callback) {
          try {
            callback({
              done: true,
              epoch: currentEpoch,
              totalEpochs: epochs,
              loss: lossHistory.length > 0 ? lossHistory[lossHistory.length - 1] : 0
            });
          } catch (e) {
            // 忽略回调异常
          }
        }
        return;
      }

      // 继续下一帧
      rafId = requestAnimationFrame(step);
    }

    rafId = requestAnimationFrame(step);
  }

  // ============================================================
  // 重置 / Reset
  // ============================================================
  function reset() {
    stop();
    currentEpoch = 0;
    lossHistory = [];
    initWeights();
    drawNetwork();
    drawLoss();
  }

  // ============================================================
  // 停止 / Stop
  // ============================================================
  function stop() {
    isTraining = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ============================================================
  // 设置网络结构 / Set Network Structure
  // layers: 数组，如 [2, 4, 1]
  // ============================================================
  function setStructure(newLayers) {
    if (!Array.isArray(newLayers) || newLayers.length < 2) {
      throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_error_structure_min')) || '网络结构至少需要 2 层（输入层 + 输出层）');
    }
    for (var i = 0; i < newLayers.length; i++) {
      if (newLayers[i] < 1) {
        throw new Error((typeof window !== 'undefined' && window.i18n && window.i18n.t('nnvis_error_neurons_min')) || '每层神经元数必须 >= 1');
      }
    }
    stop();
    layers = newLayers.slice();
    currentEpoch = 0;
    lossHistory = [];
    initWeights();
    drawNetwork();
    drawLoss();
  }

  // ============================================================
  // 设置训练速度 / Set Training Speed
  // stepsPerFrame: 每帧训练的 epoch 数（1~1000）
  // ============================================================
  function setSpeed(stepsPerFrame) {
    stepsPerFrame = Math.max(1, Math.min(1000, Math.floor(stepsPerFrame) || 1));
    trainSpeed = stepsPerFrame;
  }

  // ============================================================
  // 初始化 / Init
  // networkCanvas: 网络结构画布
  // lossCanvas: 损失曲线画布
  // ============================================================
  function init(netCanvas, lossCvs) {
    networkCanvas = netCanvas;
    lossCanvas = lossCvs;
    networkCtx = networkCanvas ? networkCanvas.getContext('2d') : null;
    lossCtx = lossCanvas ? lossCanvas.getContext('2d') : null;

    if (!weights.length) initWeights();
    drawNetwork();
    drawLoss();
  }

  // ============================================================
  // 公开 API / Public API
  // ============================================================
  return {
    init: init,
    setStructure: setStructure,
    train: train,
    reset: reset,
    stop: stop,
    setSpeed: setSpeed,
    // 训练集管理 / Dataset Management
    setDataset: setDataset,
    getDataset: getDataset,
    addSample: addSample,
    removeSample: removeSample,
    clearDataset: clearDataset,
    selectDataset: selectDataset,
    drawDataset: drawDataset,
    datasets: {
      xor: XOR_DATASET,
      sine: generateSineData,
      generateSine: generateSineData,
      circle: generateCircleData,
      spiral: generateSpiralData
    }
  };
})();
