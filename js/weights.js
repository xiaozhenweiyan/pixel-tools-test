/**
 * weights.js
 * 预测方法的权重计算与回测 (Weight Calculation & Backtesting for Prediction Methods)
 *
 * 通过 <script> 标签加载，导出全局函数（无模块导出）。
 * 依赖：全局 `predictors` 数组（由 predictors.js 定义，结构见该文件头部注释）。
 *
 * 导出函数 / Exported functions：
 *   - backtest(method, series) → number                     留一回测 MAPE
 *   - computeWeights(methods, series) → number[]            反 MAPE 归一化权重
 *   - uniformWeights(methods, series) → number[]            均匀归一化权重
 *   - ensemblePredict(predictions, weights) → number|null   加权集成预测
 *   - computeMethodStats(methods, series) → object[]        方法统计列表（UI 渲染用）
 *
 * 所有函数均为确定性实现（无随机数、无时间依赖），纯 JavaScript，无外部依赖。
 * All functions are deterministic (no RNG, no time dependency), pure JS, no dependencies.
 */

// ============================================================
// 辅助函数 / Helpers
// ============================================================

/**
 * 判断是否为有限数值 / Check if a value is a finite number.
 * 注意：原生 isFinite(null)===true（因 Number(null)===0），故先校验 typeof。
 */
function isFiniteNumber(x) {
  return typeof x === 'number' && isFinite(x);
}

/**
 * 安全调用方法预测 / Safely invoke a method's predict function.
 * 方法无效、返回 null/undefined 或非有限数值时统一返回 null。
 * @returns {number|null}
 */
function safePredict(method, series) {
  if (!method || typeof method.predict !== 'function') return null;
  var p = method.predict(series);
  if (p === null || p === undefined) return null;
  if (!isFiniteNumber(p)) return null;
  return p;
}

// ============================================================
// 1. 留一回测 / Leave-one-out Backtesting
// ============================================================

/**
 * backtest(method, series) → number
 *
 * 留一交叉验证式回测，返回平均绝对百分比误差 (MAPE)：
 *   对每个 i ∈ [minLen, n-1]：
 *     - 用 series.slice(0, i) 作为输入预测下一个值
 *     - 计算 APE = |actual - predicted| / |actual|
 *   返回所有有效 APE 的均值。
 *
 * 边界处理：
 *   - 序列长度 < minLen + 1：返回 Infinity（数据不足以回测）
 *   - 预测为 null 或 actual 为 0：跳过该点
 *   - 无有效回测点 / 计算结果为 NaN/Infinity：返回 Infinity
 *
 * @param {object} method  预测方法对象
 * @param {number[]} series  数值序列（长度 ≥ 2，已由调用方校验）
 * @returns {number} MAPE，或 Infinity 表示无法回测
 */
function backtest(method, series) {
  if (!method || typeof method.predict !== 'function') return Infinity;
  if (!Array.isArray(series)) return Infinity;
  var n = series.length;
  // 数据不足以构成一个回测点 / not enough data to form a backtest point
  if (n < method.minLen + 1) return Infinity;

  var sumAPE = 0;
  var count = 0;
  for (var i = method.minLen; i < n; i++) {
    var input = series.slice(0, i);          // 长度为 i 的前缀 / prefix of length i
    var predicted = safePredict(method, input);
    if (predicted === null) continue;        // 预测失败，跳过 / skip if prediction failed
    var actual = series[i];
    if (actual === 0) continue;              // actual=0 无法计算百分比 / cannot compute percentage
    if (!isFiniteNumber(actual)) continue;   // 跳过非有限实际值 / skip non-finite actual
    // 绝对百分比误差 / absolute percentage error
    var ape = Math.abs(actual - predicted) / Math.abs(actual);
    if (!isFinite(ape)) continue;            // 安全防护 / safety net
    sumAPE += ape;
    count++;
  }

  if (count === 0) return Infinity;          // 无有效回测点 / no valid backtest points
  var mape = sumAPE / count;
  return isFinite(mape) ? mape : Infinity;   // 计算结果非有限则返回 Infinity
}

// ============================================================
// 2. 反 MAPE 归一化权重 / Inverse-MAPE Normalized Weights
// ============================================================

/**
 * computeWeights(methods, series) → number[]
 *
 * 权重 ∝ 1 / (mape + ε)，归一化后求和为 1。
 *   - 若 mape 为 Infinity 或方法在完整序列上预测失败，权重置 0
 *   - 若所有方法都失败（权重和为 0），返回均匀权重 1/N（优雅降级）
 *
 * @param {object[]} methods  预测方法数组
 * @param {number[]} series   数值序列
 * @returns {number[]} 与 methods 对齐的权重数组
 */
function computeWeights(methods, series) {
  if (!Array.isArray(methods) || methods.length === 0) return [];
  var n = methods.length;
  var epsilon = 1e-10;
  var raw = new Array(n);
  var sum = 0;

  for (var i = 0; i < n; i++) {
    var method = methods[i];
    var mape = backtest(method, series);
    var fullPred = safePredict(method, series); // 全序列预测 / full-series prediction
    // mape 为 Infinity 或全序列预测失败 → 权重 0
    var ok = isFinite(mape) && fullPred !== null;
    if (ok) {
      raw[i] = 1 / (mape + epsilon);
      if (!isFinite(raw[i])) raw[i] = 0;       // 安全防护 / safety net
    } else {
      raw[i] = 0;
    }
    sum += raw[i];
  }

  // 归一化 / Normalize
  if (sum === 0) {
    // 全部方法失败，优雅降级为均匀权重 / graceful degradation: uniform weights
    var uniform = new Array(n);
    for (var j = 0; j < n; j++) uniform[j] = 1 / n;
    return uniform;
  }
  var weights = new Array(n);
  for (var k = 0; k < n; k++) weights[k] = raw[k] / sum;
  return weights;
}

// ============================================================
// 3. 均匀权重 / Uniform Weights
// ============================================================

/**
 * uniformWeights(methods, series) → number[]
 *
 * 每个能在完整序列上预测的方法获得权重 1，再归一化到求和为 1。
 * 若所有方法都失败，返回全 0 数组。
 *
 * @param {object[]} methods  预测方法数组
 * @param {number[]} series   数值序列
 * @returns {number[]} 与 methods 对齐的权重数组
 */
function uniformWeights(methods, series) {
  if (!Array.isArray(methods) || methods.length === 0) return [];
  var n = methods.length;
  var raw = new Array(n);
  var sum = 0;

  for (var i = 0; i < n; i++) {
    var pred = safePredict(methods[i], series);
    if (pred !== null) {
      raw[i] = 1;
      sum += 1;
    } else {
      raw[i] = 0;
    }
  }

  if (sum === 0) {
    // 全部方法失败，返回全 0 / all methods failed, return zeros
    var zeros = new Array(n);
    for (var j = 0; j < n; j++) zeros[j] = 0;
    return zeros;
  }
  var weights = new Array(n);
  for (var k = 0; k < n; k++) weights[k] = raw[k] / sum;
  return weights;
}

// ============================================================
// 4. 集成预测 / Ensemble Prediction
// ============================================================

/**
 * ensemblePredict(predictions, weights) → number|null
 *
 * 过滤掉 null 预测及其对应权重，对剩余权重重新归一化后加权求和。
 *   - 无有效预测 → null
 *   - 结果为 NaN/Infinity → null
 *
 * @param {(number|null)[]} predictions  预测值数组，与 weights 对齐
 * @param {number[]} weights             权重数组
 * @returns {number|null} 加权集成预测值
 */
function ensemblePredict(predictions, weights) {
  if (!Array.isArray(predictions) || !Array.isArray(weights)) return null;
  if (predictions.length === 0 || weights.length === 0) return null;

  var sum = 0;
  var sumW = 0;
  for (var i = 0; i < predictions.length; i++) {
    var pred = predictions[i];
    var w = weights[i];
    // 过滤 null/undefined 预测及对应权重 / filter null predictions and their weights
    if (pred === null || pred === undefined) continue;
    if (!isFiniteNumber(pred)) continue;
    if (!isFiniteNumber(w)) continue;
    sum += pred * w;
    sumW += w;
  }

  if (sumW === 0) return null;               // 无有效预测 / no valid predictions
  // 重新归一化后的加权求和 / re-normalized weighted sum
  var result = sum / sumW;
  return isFinite(result) ? result : null;
}

// ============================================================
// 5. 方法统计列表 / Method Statistics
// ============================================================

/**
 * computeMethodStats(methods, series) → object[]
 *
 * 为每个方法生成统计对象，供 UI 渲染方法列表：
 *   {
 *     id, name, category, minLen,
 *     prediction: number|null,  // 全序列预测结果
 *     mape: number|Infinity     // 回测误差
 *   }
 *
 * @param {object[]} methods  预测方法数组
 * @param {number[]} series   数值序列
 * @returns {object[]} 统计对象数组，与 methods 对齐
 */
function computeMethodStats(methods, series) {
  if (!Array.isArray(methods) || methods.length === 0) return [];
  var stats = [];
  for (var i = 0; i < methods.length; i++) {
    var method = methods[i];
    var prediction = safePredict(method, series); // number|null（非有限值归一为 null）
    var mape = backtest(method, series);          // number|Infinity
    stats.push({
      id: method ? method.id : undefined,
      name: method ? method.name : undefined,
      category: method ? method.category : undefined,
      minLen: method ? method.minLen : undefined,
      prediction: prediction,
      mape: mape
    });
  }
  return stats;
}

// ============================================================
// 6. 增量留一回测 / Incremental Leave-one-out Backtesting
// ============================================================

/**
 * computeIncrementalBacktest(methods, series) → object[]
 *
 * 渐进式留一回测，返回每步结果与累计权重（供训练动画使用）。
 * Progressive leave-one-out backtesting, returns per-step results with
 * cumulative weights.
 *
 * 对序列 [a1, a2, ..., an]：
 *   - step 1：用 [a1, a2]（长度 2）训练，预测位置 3，actual = a3
 *   - step 2：用 [a1, a2, a3]（长度 3）训练，预测位置 4，actual = a4
 *   - ...
 *   - step k：用 [a1, ..., a_{k+1}]（长度 k+1）训练，预测位置 k+2，actual = a_{k+2}
 *   - 最后一步：k = n-2，用 [a1, ..., a_{n-1}] 训练，预测位置 n，actual = a_n
 *   - 总步数 = n - 2（n >= 3 时；n < 3 时返回 0 步）
 *
 * 每步计算：
 *   1. methodPredictions：各方法对训练前缀的预测（number|null）。
 *      当 trainPrefix.length < method.minLen 时跳过（prediction = null）。
 *   2. methodAPEs：prediction 非空且 actual != 0 时
 *      APE = |actual - prediction| / |actual|；否则 APE = Infinity。
 *   3. cumulativeMAPEs：截至当前步的累计 MAPE（仅对有限 APE 求均值；
 *      无有限 APE 时为 Infinity）。
 *   4. weights：基于 cumulativeMAPEs 的反 MAPE 归一化权重。
 *      weight_i = 1/(cumulativeMAPE_i + ε)，ε=1e-10；
 *      cumulativeMAPE_i 为 Infinity 或方法在全序列上预测失败 → 权重 0；
 *      归一化使和为 1；全 0 时退化为均匀 1/N。
 *
 * 边界处理 / Edge cases：
 *   - n < 3：返回 []
 *   - actual == 0：该步所有方法 APE = Infinity（仍记录 methodPredictions）
 *   - 方法返回 null：该步该方法 APE = Infinity
 *   - method.minLen > trainSize：prediction = null，APE = Infinity
 *   - 全部方法累计 MAPE 为 Infinity：权重均匀 1/N（优雅降级）
 *   - methods 为空：返回 []
 *
 * 确定性实现（无随机数、无时间依赖）。
 *
 * @param {object[]} methods  预测方法数组
 * @param {number[]} series   数值序列
 * @returns {object[]} 每步结果对象数组（n < 3 或 methods 为空时为 []）
 */
function computeIncrementalBacktest(methods, series) {
  if (!Array.isArray(methods) || methods.length === 0) return [];
  if (!Array.isArray(series)) return [];

  var n = series.length;
  if (n < 3) return [];                       // 数据不足以构成训练步 / not enough data

  var methodCount = methods.length;
  var epsilon = 1e-10;
  var totalSteps = n - 2;

  // 各方法累计有限 APE / per-method accumulated finite APEs
  var finiteAPEs = new Array(methodCount);
  for (var m = 0; m < methodCount; m++) finiteAPEs[m] = [];

  // 各方法在完整序列上的预测（用于权重门控）
  // full-series prediction per method (used for weight gating)
  var fullPreds = new Array(methodCount);
  for (var f = 0; f < methodCount; f++) {
    fullPreds[f] = safePredict(methods[f], series);
  }

  var steps = [];
  for (var k = 1; k <= totalSteps; k++) {
    var trainSize = k + 1;                    // 训练前缀长度 / training prefix length
    var predictIndex = k + 2;                 // 1-based 被预测位置 / 1-based predicted position
    var actual = series[k + 1];               // 0-based 索引 k+1 对应 1-based 位置 k+2
    var trainPrefix = series.slice(0, trainSize);

    var methodPredictions = new Array(methodCount);
    var methodAPEs = new Array(methodCount);
    var cumulativeMAPEs = new Array(methodCount);
    var weights = new Array(methodCount);

    for (var i = 0; i < methodCount; i++) {
      var method = methods[i];
      var minLen = (method && typeof method.minLen === 'number') ? method.minLen : 0;

      // 1. 预测 / prediction（minLen 不足则直接 null）
      var prediction = null;
      if (trainPrefix.length >= minLen) {
        prediction = safePredict(method, trainPrefix);
      }
      methodPredictions[i] = prediction;

      // 2. APE：prediction 为空或 actual == 0 时记 Infinity
      var ape = Infinity;
      if (prediction !== null && actual !== 0) {
        ape = Math.abs(actual - prediction) / Math.abs(actual);
        if (!isFinite(ape)) ape = Infinity;   // 安全防护 / safety net
      }
      methodAPEs[i] = ape;

      // 3. 累计 MAPE：仅对有限 APE 求均值
      if (isFinite(ape)) finiteAPEs[i].push(ape);
      var cumMAPE = Infinity;
      if (finiteAPEs[i].length > 0) {
        var sumAPE = 0;
        for (var j = 0; j < finiteAPEs[i].length; j++) sumAPE += finiteAPEs[i][j];
        cumMAPE = sumAPE / finiteAPEs[i].length;
        if (!isFinite(cumMAPE)) cumMAPE = Infinity;
      }
      cumulativeMAPEs[i] = cumMAPE;
    }

    // 4. 权重：反累计 MAPE 归一化
    var raw = new Array(methodCount);
    var sumRaw = 0;
    for (var w = 0; w < methodCount; w++) {
      var cumMAPE_w = cumulativeMAPEs[w];
      // cumulativeMAPE 为 Infinity 或全序列预测失败 → 权重 0
      var ok = isFinite(cumMAPE_w) && fullPreds[w] !== null;
      if (ok) {
        raw[w] = 1 / (cumMAPE_w + epsilon);
        if (!isFinite(raw[w])) raw[w] = 0;    // 安全防护 / safety net
      } else {
        raw[w] = 0;
      }
      sumRaw += raw[w];
    }
    if (sumRaw === 0) {
      // 全部方法失败，优雅降级为均匀权重 / graceful degradation: uniform weights
      for (var u = 0; u < methodCount; u++) weights[u] = 1 / methodCount;
    } else {
      for (var v = 0; v < methodCount; v++) weights[v] = raw[v] / sumRaw;
    }

    steps.push({
      step: k,
      trainSize: trainSize,
      predictIndex: predictIndex,
      actual: actual,
      methodPredictions: methodPredictions,
      methodAPEs: methodAPEs,
      cumulativeMAPEs: cumulativeMAPEs,
      weights: weights
    });
  }

  return steps;
}

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[weights] loaded');
if (typeof predictors !== 'undefined') {
  const testSeries = [1, 2, 3, 4, 5];
  const stats = computeMethodStats(predictors, testSeries);
  const weights = computeWeights(predictors, testSeries);
  const uniformW = uniformWeights(predictors, testSeries);
  const ensemble = ensemblePredict(stats.map(s => s.prediction), weights);
  console.log('[weights] sanity check: stats =', stats.length, 'methods');
  console.log('[weights] backtest weights sum =', weights.reduce((a,b)=>a+b, 0).toFixed(6), '(should be ~1)');
  console.log('[weights] uniform weights sum =', uniformW.reduce((a,b)=>a+b, 0).toFixed(6), '(should be ~1)');
  console.log('[weights] ensemble prediction =', ensemble);
}

console.log('[weights] computeIncrementalBacktest loaded');
if (typeof predictors !== 'undefined') {
  const testSteps = computeIncrementalBacktest(predictors, [1, 2, 3, 5, 8, 13]);
  console.log('[weights] incremental backtest: ' + testSteps.length + ' steps (expected 4)');
  if (testSteps.length > 0) {
    const last = testSteps[testSteps.length - 1];
    console.log('[weights] last step weights sum =', last.weights.reduce(function(a,b){return a+b;},0).toFixed(6), '(should be ~1)');
    console.log('[weights] last step predictIndex =', last.predictIndex, '(expected 6)');
  }
}
