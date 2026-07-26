/**
 * nn.js
 * 神经网络预测模块 (Neural Network Prediction Module)
 *
 * 纯 JavaScript 实现的前馈神经网络 (MLP)，用于时间序列预测。
 *
 * 特性：
 *   - 输入层大小动态取决于输入序列长度（min=2, max=8）
 *   - 渐进式训练：用前 k 个数字预测第 k+1 个，误差在 ±0.1 内才训练下一组
 *   - 像素风网络可视化动画
 *
 * 通过 <script> 标签加载，导出全局对象 `neuralNet`：
 *   {
 *     progressiveTrain(canvas, series, steps, onProgress) → Promise<number[]>
 *     predict(series, steps) → number[]
 *     drawNetwork(canvas, options)
 *     reset()
 *   }
 *
 * 视觉风格与 chart.js 一致：#1a1a2e 背景、白色 3px 边框、金色强调。
 */

const neuralNet = (function () {
  'use strict';

  // ============================================================
  // 网络配置 / Network Config
  // ============================================================
  var HIDDEN_SIZE = 16;
  var OUTPUT_SIZE = 1;
  var LEARNING_RATE = 0.1;
  var TOLERANCE = 0.1;          // 渐进训练误差容忍范围 ±0.1（保留作为默认/兜底）
  var MAX_EPOCHS_PER_STEP = 5000; // 每步最大训练 epoch
  var MIN_INPUT_SIZE = 2;
  var MAX_INPUT_SIZE = 8;

  // ============================================================
  // 动态网络参数 / Dynamic Network Parameters
  // ============================================================
  var inputSize = MIN_INPUT_SIZE;
  var params = {
    W1: [],  // inputSize × HIDDEN_SIZE
    b1: [],  // HIDDEN_SIZE
    W2: [],  // HIDDEN_SIZE × OUTPUT_SIZE
    b2: []   // OUTPUT_SIZE
  };

  var lastPrediction = null;

  // ============================================================
  // 激活函数 / Activation Functions
  // ============================================================
  function relu(x) { return x > 0 ? x : 0; }
  function reluDeriv(x) { return x > 0 ? 1 : 0; }

  // ============================================================
  // 初始化 / Initialization
  // ============================================================
  function initWeights() {
    var scale1 = Math.sqrt(2 / inputSize);
    params.W1 = [];
    for (var i = 0; i < inputSize; i++) {
      var row = [];
      for (var j = 0; j < HIDDEN_SIZE; j++) {
        row.push((Math.random() * 2 - 1) * scale1);
      }
      params.W1.push(row);
    }
    params.b1 = new Array(HIDDEN_SIZE).fill(0);

    var scale2 = Math.sqrt(2 / HIDDEN_SIZE);
    params.W2 = [];
    for (var k = 0; k < HIDDEN_SIZE; k++) {
      var row2 = [];
      for (var m = 0; m < OUTPUT_SIZE; m++) {
        row2.push((Math.random() * 2 - 1) * scale2);
      }
      params.W2.push(row2);
    }
    params.b2 = new Array(OUTPUT_SIZE).fill(0);
  }

  // ============================================================
  // 前向传播 / Forward Pass
  // ============================================================
  function forward(input) {
    var z1 = new Array(HIDDEN_SIZE);
    var a1 = new Array(HIDDEN_SIZE);
    for (var j = 0; j < HIDDEN_SIZE; j++) {
      var sum = params.b1[j];
      for (var i = 0; i < inputSize; i++) {
        sum += input[i] * params.W1[i][j];
      }
      z1[j] = sum;
      a1[j] = relu(sum);
    }

    var z2 = new Array(OUTPUT_SIZE);
    var a2 = new Array(OUTPUT_SIZE);
    for (var k = 0; k < OUTPUT_SIZE; k++) {
      var sum2 = params.b2[k];
      for (var j2 = 0; j2 < HIDDEN_SIZE; j2++) {
        sum2 += a1[j2] * params.W2[j2][k];
      }
      z2[k] = sum2;
      a2[k] = sum2; // Linear activation
    }

    return { z1: z1, a1: a1, z2: z2, a2: a2 };
  }

  // ============================================================
  // 序列分析与辅助函数 / Series Analysis Helpers
  // ============================================================
  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isIntegerSeries(series) {
    for (var i = 0; i < series.length; i++) {
      if (!Number.isInteger(series[i])) return false;
    }
    return true;
  }

  function getDecimalPrecision(series) {
    var maxPrecision = 0;
    for (var i = 0; i < series.length; i++) {
      var str = String(series[i]);
      var dotIdx = str.indexOf('.');
      if (dotIdx >= 0) {
        var precision = str.length - dotIdx - 1;
        if (precision > maxPrecision) maxPrecision = precision;
      }
    }
    return maxPrecision;
  }

  function computeAdaptiveTolerance(series) {
    if (isIntegerSeries(series)) {
      return 0.1;
    }
    var precision = getDecimalPrecision(series);
    if (precision > 0) {
      return Math.pow(10, -(precision + 1));
    }
    // 大数检测
    var min = Math.min.apply(null, series);
    var max = Math.max.apply(null, series);
    var range = max - min;
    if (range > 1000) {
      return range * 0.001;
    }
    return 0.1; // 默认
  }

  // ============================================================
  // 数据归一化 / Data Normalization
  // ============================================================
  function normalizeSeries(series) {
    var n = series.length;
    if (n === 0) return { data: [], mean: 0, std: 1, min: 0, max: 1, mode: 'zscore' };

    var min = Math.min.apply(null, series);
    var max = Math.max.apply(null, series);
    var range = max - min;

    // 大范围数据用 min-max 归一化
    if (range > 100) {
      var normalized = [];
      for (var i = 0; i < n; i++) {
        normalized.push(range === 0 ? 0.5 : 0.1 + 0.8 * (series[i] - min) / range);
      }
      return { data: normalized, mean: 0, std: 1, min: min, max: max, mode: 'minmax' };
    }

    // 小范围数据用 z-score
    var sum = 0;
    for (var j = 0; j < n; j++) sum += series[j];
    var mean = sum / n;
    var sumSq = 0;
    for (var k = 0; k < n; k++) sumSq += (series[k] - mean) * (series[k] - mean);
    var std = Math.sqrt(sumSq / n);
    if (std < 1e-10) std = 1;
    var normalized2 = [];
    for (var m = 0; m < n; m++) normalized2.push((series[m] - mean) / std);
    return { data: normalized2, mean: mean, std: std, min: min, max: max, mode: 'zscore' };
  }

  function denormalize(val, norm) {
    if (norm.mode === 'minmax') {
      var range = norm.max - norm.min;
      return range === 0 ? norm.min : norm.min + (val - 0.1) / 0.8 * range;
    }
    return val * norm.std + norm.mean;
  }

  // ============================================================
  // 输出后处理 / Output Post-processing
  // ============================================================
  function postProcessPrediction(value, series) {
    if (!isFiniteNumber(value)) return value;
    // 智能吸附：仅当预测值与最近整数差距 < 0.05 时才吸附
    if (isIntegerSeries(series)) {
      var rounded = Math.round(value);
      if (Math.abs(value - rounded) < 0.05) {
        return rounded;
      }
      return value;
    }
    // 小数序列：仅当差距 < 0.5×10^(-precision) 时才四舍五入
    var precision = getDecimalPrecision(series);
    if (precision > 0) {
      var multiplier = Math.pow(10, precision);
      var roundedDec = Math.round(value * multiplier) / multiplier;
      if (Math.abs(value - roundedDec) < 0.5 * Math.pow(10, -precision)) {
        return roundedDec;
      }
      return value;
    }
    return value;
  }

  // ============================================================
  // 训练单个样本 / Train Single Sample (online SGD)
  // ============================================================
  function trainSample(input, target, lr) {
    var out = forward(input);

    // 反向传播 / backprop
    var dZ2 = new Array(OUTPUT_SIZE);
    for (var k = 0; k < OUTPUT_SIZE; k++) {
      dZ2[k] = out.a2[k] - target[k];
    }

    var dW2 = [];
    for (var j3 = 0; j3 < HIDDEN_SIZE; j3++) {
      var row = [];
      for (var k3 = 0; k3 < OUTPUT_SIZE; k3++) {
        row.push(out.a1[j3] * dZ2[k3]);
      }
      dW2.push(row);
    }
    var db2 = dZ2.slice();

    var dZ1 = new Array(HIDDEN_SIZE).fill(0);
    for (var j4 = 0; j4 < HIDDEN_SIZE; j4++) {
      var sum = 0;
      for (var k5 = 0; k5 < OUTPUT_SIZE; k5++) {
        sum += params.W2[j4][k5] * dZ2[k5];
      }
      dZ1[j4] = sum * reluDeriv(out.z1[j4]);
    }

    var dW1 = [];
    for (var i2 = 0; i2 < inputSize; i2++) {
      var row2 = [];
      for (var j5 = 0; j5 < HIDDEN_SIZE; j5++) {
        row2.push(input[i2] * dZ1[j5]);
      }
      dW1.push(row2);
    }
    var db1 = dZ1.slice();

    // 更新参数 / update parameters
    for (var i3 = 0; i3 < inputSize; i3++) {
      for (var j7 = 0; j7 < HIDDEN_SIZE; j7++) {
        params.W1[i3][j7] -= lr * dW1[i3][j7];
      }
    }
    for (var j8 = 0; j8 < HIDDEN_SIZE; j8++) {
      params.b1[j8] -= lr * db1[j8];
    }
    for (var j9 = 0; j9 < HIDDEN_SIZE; j9++) {
      for (var k6 = 0; k6 < OUTPUT_SIZE; k6++) {
        params.W2[j9][k6] -= lr * dW2[j9][k6];
      }
    }
    for (var k7 = 0; k7 < OUTPUT_SIZE; k7++) {
      params.b2[k7] -= lr * db2[k7];
    }

    // 返回损失 / return loss
    var loss = 0;
    for (var k8 = 0; k8 < OUTPUT_SIZE; k8++) {
      var diff = out.a2[k8] - target[k8];
      loss += diff * diff;
    }
    return loss / OUTPUT_SIZE;
  }

  // ============================================================
  // 预测 / Prediction
  // ============================================================
  function predict(series, steps) {
    if (!series || series.length < MIN_INPUT_SIZE) return [];
    steps = steps || 1;

    var norm = normalizeSeries(series);
    var normalized = norm.data.slice();
    var predictions = [];

    // 检测差分趋势（等差检测）
    var diffTrend = detectDiffTrend(series);

    for (var s = 0; s < steps; s++) {
      var input = [];
      var n = normalized.length;
      for (var i = 0; i < inputSize; i++) {
        input.push(normalized[n - inputSize + i]);
      }
      var out = forward(input);
      var predNorm = out.a2[0];
      var predDenorm = denormalize(predNorm, norm);
      predDenorm = postProcessPrediction(predDenorm, series);
      predictions.push(predDenorm);
      // 为了多步预测的准确性，推入后处理值对应的归一化值
      if (norm.mode === 'minmax') {
        var range = norm.max - norm.min;
        normalized.push(range === 0 ? 0.5 : 0.1 + 0.8 * (predDenorm - norm.min) / range);
      } else {
        normalized.push((predDenorm - norm.mean) / norm.std);
      }
    }

    // 多步预测差分修正：如果检测到稳定差分趋势，用趋势外推修正
    if (diffTrend !== null && steps > 1) {
      predictions = applyDiffTrendCorrection(predictions, series, diffTrend, steps);
    }

    lastPrediction = predictions[0];
    return predictions;
  }

  // 检测差分趋势
  function detectDiffTrend(series) {
    if (series.length < 3) return null;
    var diffs = [];
    for (var i = 1; i < series.length; i++) {
      diffs.push(series[i] - series[i - 1]);
    }
    // 检查差分是否稳定（等差）
    var firstDiff = diffs[0];
    var isStable = true;
    for (var j = 1; j < diffs.length; j++) {
      if (Math.abs(diffs[j] - firstDiff) > 1e-6) {
        isStable = false;
        break;
      }
    }
    if (isStable) return { type: 'arithmetic', diff: firstDiff };
    return null;
  }

  // 应用差分趋势修正
  function applyDiffTrendCorrection(predictions, series, trend, steps) {
    if (trend.type !== 'arithmetic') return predictions;
    var lastVal = series[series.length - 1];
    var corrected = [];
    for (var i = 0; i < steps; i++) {
      // 第一步用 NN 预测（信任 NN），后续步用趋势外推
      if (i === 0) {
        corrected.push(predictions[0]);
        lastVal = predictions[0];
      } else {
        // 混合：70% 趋势外推 + 30% NN 预测
        var trendVal = lastVal + trend.diff;
        var nnVal = predictions[i];
        var mixed = trendVal * 0.7 + nnVal * 0.3;
        // 整数序列保持整数
        if (isIntegerSeries(series)) {
          mixed = Math.round(mixed);
        }
        corrected.push(mixed);
        lastVal = mixed;
      }
    }
    return corrected;
  }

  // ============================================================
  // 网络可视化 / Network Visualization
  // ============================================================
  function setupCanvasNN(canvas) {
    if (!canvas) return null;
    var dpr = window.devicePixelRatio || 1;
    var dispW = canvas.clientWidth || 400;
    var dispH = canvas.clientHeight || 240;
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawNetwork(canvas, options) {
    if (!canvas) return;
    options = options || {};
    var ctx = setupCanvasNN(canvas);
    if (!ctx) return;

    var w = canvas.clientWidth || 400;
    var h = canvas.clientHeight || 240;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    var padX = 40;
    var padY = 30;
    var plotW = w - padX * 2;
    var plotH = h - padY * 2;

    var inputY = [];
    for (var i = 0; i < inputSize; i++) {
      inputY.push(padY + (plotH / (inputSize + 1)) * (i + 1));
    }
    var hiddenY = [];
    for (var j = 0; j < HIDDEN_SIZE; j++) {
      hiddenY.push(padY + (plotH / (HIDDEN_SIZE + 1)) * (j + 1));
    }
    var outputY = [padY + plotH / 2];

    var xInput = padX + 10;
    var xHidden = padX + plotW / 2;
    var xOutput = w - padX - 10;

    // 节点半径自适应：避免 HIDDEN_SIZE 增大后节点重叠
    var maxNodesInCol = Math.max(inputSize, HIDDEN_SIZE, OUTPUT_SIZE);
    var nodeSpacing = plotH / (maxNodesInCol + 1);
    var nodeR = Math.max(3, Math.min(8, nodeSpacing / 2 - 1));
    var pulse = options.pulse || 0;
    var inputAct = options.inputActivations || new Array(inputSize).fill(0.5);
    var hiddenAct = options.hiddenActivations || new Array(HIDDEN_SIZE).fill(0.5);
    var outputAct = options.outputActivations || new Array(OUTPUT_SIZE).fill(0.5);

    // 连接线 input → hidden
    for (var i2 = 0; i2 < inputSize; i2++) {
      for (var j2 = 0; j2 < HIDDEN_SIZE; j2++) {
        var weightVal = params.W1[i2] ? (params.W1[i2][j2] || 0) : 0;
        var intensity = Math.min(1, Math.abs(weightVal) * 2) * (0.3 + pulse * 0.4);
        var color = weightVal >= 0
          ? 'rgba(255, 215, 0, ' + intensity + ')'
          : 'rgba(30, 144, 255, ' + intensity + ')';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 + Math.abs(weightVal) * 2;
        ctx.beginPath();
        ctx.moveTo(xInput + nodeR, inputY[i2]);
        ctx.lineTo(xHidden - nodeR, hiddenY[j2]);
        ctx.stroke();
      }
    }

    // 连接线 hidden → output
    for (var j3 = 0; j3 < HIDDEN_SIZE; j3++) {
      for (var k = 0; k < OUTPUT_SIZE; k++) {
        var weightVal2 = params.W2[j3] ? (params.W2[j3][k] || 0) : 0;
        var intensity2 = Math.min(1, Math.abs(weightVal2) * 2) * (0.3 + pulse * 0.4);
        var color2 = weightVal2 >= 0
          ? 'rgba(255, 215, 0, ' + intensity2 + ')'
          : 'rgba(30, 144, 255, ' + intensity2 + ')';
        ctx.strokeStyle = color2;
        ctx.lineWidth = 1 + Math.abs(weightVal2) * 2;
        ctx.beginPath();
        ctx.moveTo(xHidden + nodeR, hiddenY[j3]);
        ctx.lineTo(xOutput - nodeR, outputY[k]);
        ctx.stroke();
      }
    }

    function drawNode(x, y, activation, label) {
      var radius = nodeR + activation * 2;
      if (activation > 0.3) {
        var glowRadius = radius + 4 + activation * 6;
        var grad = ctx.createRadialGradient(x, y, radius, x, y, glowRadius);
        grad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fill();
      var bodyColor = activation > 0.5
        ? 'rgba(255, 215, 0, ' + (0.6 + activation * 0.4) + ')'
        : '#2d2d44';
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
      }
    }

    for (var i3 = 0; i3 < inputSize; i3++) {
      drawNode(xInput, inputY[i3], inputAct[i3], 'x' + (i3 + 1));
    }
    for (var j4 = 0; j4 < HIDDEN_SIZE; j4++) {
      drawNode(xHidden, hiddenY[j4], hiddenAct[j4], '');
    }
    for (var k2 = 0; k2 < OUTPUT_SIZE; k2++) {
      drawNode(xOutput, outputY[k2], outputAct[k2], 'ŷ');
    }

    ctx.fillStyle = '#aaaaaa';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nn_layer_input', {n: inputSize})) || ('输入层(' + inputSize + ')'), xInput, padY - 4);
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nn_layer_hidden', {n: HIDDEN_SIZE})) || ('隐藏层(' + HIDDEN_SIZE + ')'), xHidden, padY - 4);
    ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nn_layer_output')) || '输出层', xOutput, padY - 4);

    if (options.stage) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(options.stage, padX, h - padY + 4);
    }
    if (options.loss !== undefined) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText((typeof window !== 'undefined' && window.i18n && window.i18n.t('nn_loss_label', {val: options.loss.toFixed(4)})) || ('误差: ' + options.loss.toFixed(4)), w - padX, h - padY + 4);
    }
  }

  // ============================================================
  // 渐进式训练 / Progressive Training
  //
  // 用前 k 个数字预测第 k+1 个：
  //   - 从 k = inputSize 开始，用 series[0..k-1] 预测 series[k]
  //   - 训练直到预测值与实际值误差 ≤ ±0.1，才进入下一组
  //   - 所有组训练完成后，用完整序列预测 steps 步
  // ============================================================
  function progressiveTrain(canvas, series, steps, onProgress) {
    return new Promise(function (resolve) {
      if (!series || series.length < MIN_INPUT_SIZE + 1) {
        resolve([]);
        return;
      }

      // 动态设置输入层大小 / set input size based on series length
      inputSize = Math.max(MIN_INPUT_SIZE, Math.min(MAX_INPUT_SIZE, series.length - 1));
      initWeights();

      var norm = normalizeSeries(series);
      var normData = norm.data;

      // 构建渐进训练任务 / build progressive training tasks
      // 每个任务：用 series[0..k-1] 的最后 inputSize 个值预测 series[k]
      var tasks = [];
      // 原始任务：用完整序列的滑窗
      for (var k = inputSize; k < series.length; k++) {
        var input = [];
        for (var i = 0; i < inputSize; i++) {
          input.push(normData[k - inputSize + i]);
        }
        var target = [normData[k]];
        var actualVal = series[k];
        tasks.push({
          input: input,
          target: target,
          actualVal: actualVal,
          stepIdx: k - inputSize + 1,
          isAugmented: false
        });
      }

      // 数据增强：用更短的前缀（长度 ≥ 2）补零到 inputSize，生成更多样本
      // 这让 NN 学到递增模式而非记忆特定值
      for (var augStart = 2; augStart < series.length; augStart++) {
        for (var augEnd = augStart + 1; augEnd <= series.length; augEnd++) {
          // 跳过已经作为原始任务的样本
          if (augStart === 0 && augEnd === series.length) continue;
          var augInput = [];
          var augWindow = normData.slice(Math.max(0, augEnd - inputSize - 1), augEnd - 1);
          // 补零到 inputSize 长度
          while (augWindow.length < inputSize) {
            augWindow.unshift(0);
          }
          for (var ai = 0; ai < inputSize; ai++) {
            augInput.push(augWindow[ai]);
          }
          var augTarget = [normData[augEnd - 1]];
          var augActual = series[augEnd - 1];
          tasks.push({
            input: augInput,
            target: augTarget,
            actualVal: augActual,
            stepIdx: tasks.length + 1,
            isAugmented: true
          });
        }
      }

      // 限制增强样本数量，避免训练过长
      var MAX_AUGMENTED = 20;
      var originalCount = series.length - inputSize;
      if (tasks.length > originalCount + MAX_AUGMENTED) {
        // 保留所有原始任务 + 最多 MAX_AUGMENTED 个增强任务（均匀采样）
        var originalTasks = tasks.slice(0, originalCount);
        var augmentedTasks = tasks.slice(originalCount);
        var step = Math.ceil(augmentedTasks.length / MAX_AUGMENTED);
        var sampledAug = [];
        for (var s = 0; s < augmentedTasks.length; s += step) {
          sampledAug.push(augmentedTasks[s]);
        }
        tasks = originalTasks.concat(sampledAug);
      }

      var totalTasks = tasks.length;
      var currentTask = 0;
      var lr = LEARNING_RATE;
      var animFrame = 0;

      // 自适应容差：根据序列特性（整数/大数/多小数）选择容差
      var tolerance = computeAdaptiveTolerance(series);
      // 自适应学习率衰减相关变量
      var bestLoss = Infinity;
      var patienceCounter = 0;
      var PATIENCE = 200;     // 200 epoch 无改善则衰减
      var DECAY = 0.5;
      var MIN_LR = 0.001;

      function trainStep() {
        if (currentTask >= totalTasks) {
          // 所有渐进任务完成，开始最终预测 / all progressive tasks done
          if (onProgress) onProgress(totalTasks, totalTasks, '神经网络预测中...');
          var preds = predict(series, steps);
          // 最终绘制 / final draw
          drawNetwork(canvas, {
            pulse: 0.8,
            inputActivations: new Array(inputSize).fill(0.6),
            hiddenActivations: new Array(HIDDEN_SIZE).fill(0.5),
            outputActivations: new Array(OUTPUT_SIZE).fill(0.7),
            stage: '训练完成',
            loss: 0
          });
          resolve(preds);
          return;
        }

        var task = tasks[currentTask];
        var maxEpochs = MAX_EPOCHS_PER_STEP;
        var epoch = 0;

        function frameWrapper() {
          // 每帧训练若干 epoch，用 rAF 调度避免阻塞 UI
          var epochsPerFrame = 5;
          for (var e = 0; e < epochsPerFrame && epoch < maxEpochs; e++) {
            var batchLoss = trainSample(task.input, task.target, lr);
            if (batchLoss < bestLoss) {
              bestLoss = batchLoss;
              patienceCounter = 0;
            } else {
              patienceCounter++;
              if (patienceCounter >= PATIENCE) {
                lr = Math.max(MIN_LR, lr * DECAY);
                patienceCounter = 0;
              }
            }
            epoch++;
          }

          // 计算当前预测值（反归一化）/ compute current prediction
          var out = forward(task.input);
          var predNorm = out.a2[0];
          var predDenorm = denormalize(predNorm, norm);
          var error = Math.abs(predDenorm - task.actualVal);

          // 绘制网络状态 / draw network
          var pulse = 0.5 + 0.5 * Math.sin(animFrame * 0.2);
          drawNetwork(canvas, {
            pulse: pulse,
            inputActivations: task.input.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.3);
            }),
            hiddenActivations: out.a1.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.2);
            }),
            outputActivations: out.a2.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.3);
            }),
            stage: '步骤 ' + (currentTask + 1) + '/' + totalTasks +
                   ' (目标误差≤' + tolerance + ')',
            loss: error
          });

          animFrame++;

          // 误差在容差内 → 通过，进入下一组 / within tolerance → pass
          // 增强样本跳过 tolerance 阻塞，只参与训练不阻塞流程
          if (error <= tolerance || task.isAugmented) {
            currentTask++;
            if (onProgress) {
              onProgress(currentTask, totalTasks,
                'NN步骤 ' + currentTask + '/' + totalTasks + ' 通过 (误差:' + error.toFixed(4) + ')');
            }
            setTimeout(trainStep, 100);
            return;
          }

          // 达到最大 epoch 仍未收敛，也进入下一组（避免卡死）
          if (epoch >= maxEpochs) {
            currentTask++;
            if (onProgress) {
              onProgress(currentTask, totalTasks,
                'NN步骤 ' + currentTask + '/' + totalTasks + ' 跳过 (误差:' + error.toFixed(4) + ')');
            }
            setTimeout(trainStep, 100);
            return;
          }

          requestAnimationFrame(frameWrapper);
        }

        requestAnimationFrame(frameWrapper);
      }

      if (onProgress) onProgress(0, totalTasks, '神经网络渐进训练开始...');
      trainStep();
    });
  }

  // ============================================================
  // 增量式训练 / Incremental Training
  //
  // 与 progressiveTrain 的区别：
  //   - progressiveTrain 在开始时调用 initWeights() 重置权重
  //   - incrementalTrain 不调用 initWeights()，保留当前 params（权重），
  //     在已有权重基础上继续训练
  //   - 仅当输入层维度发生变化时才重新初始化权重
  // ============================================================
  function incrementalTrain(canvas, series, steps, onProgress) {
    return new Promise(function (resolve) {
      if (!series || series.length < MIN_INPUT_SIZE + 1) {
        resolve([]);
        return;
      }

      // 动态设置输入层大小 / set input size based on series length
      // 注意：不调用 initWeights()，保留当前权重做增量训练
      inputSize = Math.max(MIN_INPUT_SIZE, Math.min(MAX_INPUT_SIZE, series.length - 1));
      // 如果当前权重维度不匹配新 inputSize，才重新初始化
      if (!params.W1 || params.W1.length !== inputSize) {
        initWeights();
      }

      var norm = normalizeSeries(series);
      var normData = norm.data;

      // 构建渐进训练任务（与 progressiveTrain 相同）
      var tasks = [];
      for (var k = inputSize; k < series.length; k++) {
        var input = [];
        for (var i = 0; i < inputSize; i++) {
          input.push(normData[k - inputSize + i]);
        }
        var target = [normData[k]];
        var actualVal = series[k];
        tasks.push({ input: input, target: target, actualVal: actualVal, stepIdx: k - inputSize + 1, isAugmented: false });
      }

      // 数据增强（与 progressiveTrain 相同）
      for (var augStart = 2; augStart < series.length; augStart++) {
        for (var augEnd = augStart + 1; augEnd <= series.length; augEnd++) {
          if (augStart === 0 && augEnd === series.length) continue;
          var augInput = [];
          var augWindow = normData.slice(Math.max(0, augEnd - inputSize - 1), augEnd - 1);
          while (augWindow.length < inputSize) {
            augWindow.unshift(0);
          }
          for (var ai = 0; ai < inputSize; ai++) {
            augInput.push(augWindow[ai]);
          }
          var augTarget = [normData[augEnd - 1]];
          var augActual = series[augEnd - 1];
          tasks.push({ input: augInput, target: augTarget, actualVal: augActual, stepIdx: tasks.length + 1, isAugmented: true });
        }
      }

      var MAX_AUGMENTED = 20;
      var originalCount = series.length - inputSize;
      if (tasks.length > originalCount + MAX_AUGMENTED) {
        var originalTasks = tasks.slice(0, originalCount);
        var augmentedTasks = tasks.slice(originalCount);
        var step = Math.ceil(augmentedTasks.length / MAX_AUGMENTED);
        var sampledAug = [];
        for (var s = 0; s < augmentedTasks.length; s += step) {
          sampledAug.push(augmentedTasks[s]);
        }
        tasks = originalTasks.concat(sampledAug);
      }

      var totalTasks = tasks.length;
      var currentTask = 0;
      var lr = LEARNING_RATE;
      var animFrame = 0;
      var tolerance = computeAdaptiveTolerance(series);
      var bestLoss = Infinity;
      var patienceCounter = 0;
      var PATIENCE = 200;
      var DECAY = 0.5;
      var MIN_LR = 0.001;

      function trainStep() {
        if (currentTask >= totalTasks) {
          if (onProgress) onProgress(totalTasks, totalTasks, '增量训练完成，预测中...');
          var preds = predict(series, steps);
          drawNetwork(canvas, {
            pulse: 0.8,
            inputActivations: new Array(inputSize).fill(0.6),
            hiddenActivations: new Array(HIDDEN_SIZE).fill(0.5),
            outputActivations: new Array(OUTPUT_SIZE).fill(0.7),
            stage: '增量训练完成',
            loss: 0
          });
          resolve(preds);
          return;
        }

        var task = tasks[currentTask];
        var maxEpochs = MAX_EPOCHS_PER_STEP;
        var epoch = 0;

        function frameWrapper() {
          var epochsPerFrame = 5;
          for (var e = 0; e < epochsPerFrame && epoch < maxEpochs; e++) {
            var batchLoss = trainSample(task.input, task.target, lr);
            if (batchLoss < bestLoss) {
              bestLoss = batchLoss;
              patienceCounter = 0;
            } else {
              patienceCounter++;
              if (patienceCounter >= PATIENCE) {
                lr = Math.max(MIN_LR, lr * DECAY);
                patienceCounter = 0;
              }
            }
            epoch++;
          }

          var out = forward(task.input);
          var predNorm = out.a2[0];
          var predDenorm = denormalize(predNorm, norm);
          var error = Math.abs(predDenorm - task.actualVal);

          var pulse = 0.5 + 0.5 * Math.sin(animFrame * 0.2);
          drawNetwork(canvas, {
            pulse: pulse,
            inputActivations: task.input.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.3);
            }),
            hiddenActivations: out.a1.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.2);
            }),
            outputActivations: out.a2.map(function (v) {
              return Math.min(1, Math.abs(v) * 0.5 + 0.3);
            }),
            stage: '增量步骤 ' + (currentTask + 1) + '/' + totalTasks + ' (容差≤' + tolerance + ')',
            loss: error
          });

          animFrame++;

          if (error <= tolerance || task.isAugmented) {
            currentTask++;
            if (onProgress) {
              onProgress(currentTask, totalTasks, '增量 ' + currentTask + '/' + totalTasks + ' (误差:' + error.toFixed(4) + ')');
            }
            setTimeout(trainStep, 100);
            return;
          }

          if (epoch >= maxEpochs) {
            currentTask++;
            if (onProgress) {
              onProgress(currentTask, totalTasks, '增量 ' + currentTask + '/' + totalTasks + ' 跳过 (误差:' + error.toFixed(4) + ')');
            }
            setTimeout(trainStep, 100);
            return;
          }

          requestAnimationFrame(frameWrapper);
        }

        requestAnimationFrame(frameWrapper);
      }

      if (onProgress) onProgress(0, totalTasks, '神经网络增量训练开始（保留旧权重）...');
      trainStep();
    });
  }

  function reset() {
    inputSize = MIN_INPUT_SIZE;
    initWeights();
    lastPrediction = null;
  }

  function getInputSize() {
    return inputSize;
  }

  // ============================================================
  // 导出 / Exports
  // ============================================================
  initWeights();

  return {
    progressiveTrain: progressiveTrain,
    incrementalTrain: incrementalTrain,
    predict: predict,
    drawNetwork: drawNetwork,
    reset: reset,
    getInputSize: getInputSize,
    INPUT_SIZE: inputSize
  };
})();

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[nn] neural network module loaded');
