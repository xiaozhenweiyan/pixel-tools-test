/**
 * overfit.js
 * 过拟合算法模块 (Overfitting Algorithm Module)
 *
 * 通过 <script> 标签加载，导出全局变量 `overfitAlgo`。
 *
 * 三种过拟合方法（都精确插值/高拟合，刻意过拟合）：
 * 1. 最高次多项式插值 (max_degree_poly) - n-1 次牛顿插值
 * 2. 高次多项式平均 (high_degree_avg) - deg=5,6,7,8 多项式回归取平均
 * 3. 三次样条插值 (cubic_spline) - 自然边界三次样条
 *
 * 加权融合策略：留一交叉验证 MAPE，反 MAPE 权重。
 */
var overfitAlgo = (function () {
  'use strict';

  // ============================================================
  // 辅助函数 / Helper Functions
  // ============================================================

  function isFiniteNumber(x) {
    return typeof x === 'number' && isFinite(x);
  }

  /**
   * 高斯消元法求解线性方程组 Ax = b（部分主元法）
   * Gaussian elimination with partial pivoting.
   * @param {number[][]} A - n×n 系数矩阵
   * @param {number[]} b - n 维右端向量
   * @returns {number[]|null} 解向量 x，奇异矩阵返回 null
   */
  function gaussianSolve(A, b) {
    var n = b.length;
    var M = [];
    for (var i = 0; i < n; i++) {
      M.push(A[i].slice());
      M[i].push(b[i]);
    }

    for (var col = 0; col < n; col++) {
      var pivotRow = col;
      var maxVal = Math.abs(M[col][col]);
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > maxVal) {
          maxVal = Math.abs(M[r][col]);
          pivotRow = r;
        }
      }
      if (maxVal === 0) return null;

      if (pivotRow !== col) {
        var tmp = M[col];
        M[col] = M[pivotRow];
        M[pivotRow] = tmp;
      }

      for (var r2 = col + 1; r2 < n; r2++) {
        var factor = M[r2][col] / M[col][col];
        for (var c = col; c <= n; c++) {
          M[r2][c] -= factor * M[col][c];
        }
      }
    }

    var x = new Array(n);
    for (var i2 = n - 1; i2 >= 0; i2--) {
      var sum = M[i2][n];
      for (var c2 = i2 + 1; c2 < n; c2++) {
        sum -= M[i2][c2] * x[c2];
      }
      x[i2] = sum / M[i2][i2];
    }
    return x;
  }

  // ============================================================
  // 1. 最高次多项式插值 (牛顿插值)
  //    Newton interpolation with divided differences
  // ============================================================

  /**
   * 构造均差表并返回牛顿系数
   * @param {number[]} xs - x 值数组
   * @param {number[]} ys - y 值数组
   * @returns {number[]|null} 牛顿基函数系数
   */
  function newtonCoeffs(xs, ys) {
    var n = xs.length;
    var table = [];
    for (var i = 0; i < n; i++) {
      table[i] = new Array(n);
      table[i][0] = ys[i];
    }
    for (var j = 1; j < n; j++) {
      for (var i = 0; i < n - j; i++) {
        var denom = xs[i + j] - xs[i];
        if (denom === 0) return null;
        table[i][j] = (table[i + 1][j - 1] - table[i][j - 1]) / denom;
      }
    }
    var coeffs = new Array(n);
    for (var k = 0; k < n; k++) {
      coeffs[k] = table[0][k];
    }
    return coeffs;
  }

  /**
   * 牛顿插值求值
   * @param {number[]} xs - 已知 x 值
   * @param {number[]} coeffs - 牛顿系数
   * @param {number} x - 求值点
   * @returns {number}
   */
  function newtonEval(xs, coeffs, x) {
    var n = coeffs.length;
    var result = coeffs[0];
    var prod = 1;
    for (var i = 1; i < n; i++) {
      prod *= (x - xs[i - 1]);
      result += coeffs[i] * prod;
    }
    return result;
  }

  /**
   * 最高次多项式插值预测下一步
   */
  function maxDegreePolyPredict(series) {
    var n = series.length;
    if (n < 2) return null;
    var xs = new Array(n);
    for (var i = 0; i < n; i++) xs[i] = i;
    var coeffs = newtonCoeffs(xs, series);
    if (!coeffs) return null;
    var val = newtonEval(xs, coeffs, n);
    return isFiniteNumber(val) ? val : null;
  }

  // ============================================================
  // 2. 高次多项式平均
  //    Polynomial regression average of degrees 5,6,7,8
  // ============================================================

  /**
   * 多项式最小二乘拟合
   * @param {number[]} xs - x 值
   * @param {number[]} ys - y 值
   * @param {number} degree - 多项式次数
   * @returns {number[]|null} 系数数组 [a0, a1, ..., a_degree]
   */
  function polyFit(xs, ys, degree) {
    var n = xs.length;
    var m = degree + 1;
    if (n < m) return null;

    var A = [];
    var b = new Array(m);
    for (var i = 0; i < m; i++) {
      A[i] = new Array(m);
      b[i] = 0;
      for (var j = 0; j < m; j++) {
        A[i][j] = 0;
      }
    }

    for (var k = 0; k < n; k++) {
      var x = xs[k];
      var y = ys[k];
      var xpows = new Array(2 * degree + 1);
      xpows[0] = 1;
      for (var p = 1; p <= 2 * degree; p++) {
        xpows[p] = xpows[p - 1] * x;
      }
      for (var i2 = 0; i2 < m; i2++) {
        for (var j2 = 0; j2 < m; j2++) {
          A[i2][j2] += xpows[i2 + j2];
        }
        b[i2] += y * xpows[i2];
      }
    }

    return gaussianSolve(A, b);
  }

  /**
   * 多项式求值
   */
  function polyEval(coeffs, x) {
    var n = coeffs.length;
    var result = 0;
    for (var i = n - 1; i >= 0; i--) {
      result = result * x + coeffs[i];
    }
    return result;
  }

  /**
   * 高次多项式平均预测下一步
   */
  function highDegreeAvgPredict(series) {
    var n = series.length;
    if (n < 3) return null;

    var xs = new Array(n);
    for (var i = 0; i < n; i++) xs[i] = i;

    var degrees = [5, 6, 7, 8];
    var sum = 0;
    var count = 0;

    for (var d = 0; d < degrees.length; d++) {
      var deg = degrees[d];
      if (deg > n - 1) continue;
      var coeffs = polyFit(xs, series, deg);
      if (!coeffs) continue;
      var val = polyEval(coeffs, n);
      if (isFiniteNumber(val)) {
        sum += val;
        count++;
      }
    }

    if (count === 0) return null;
    return sum / count;
  }

  // ============================================================
  // 3. 三次样条插值 (自然边界)
  //    Natural cubic spline with Thomas algorithm
  // ============================================================

  /**
   * Thomas 算法解三对角方程组
   * a[i] * x[i-1] + b[i] * x[i] + c[i] * x[i+1] = d[i]
   * a[0] 和 c[n-1] 未使用
   * @param {number[]} a - 下对角线
   * @param {number[]} b - 主对角线
   * @param {number[]} c - 上对角线
   * @param {number[]} d - 右端
   * @returns {number[]|null} 解 x
   */
  function thomasSolve(a, b, c, d) {
    var n = b.length;
    if (n === 0) return null;

    var cp = new Array(n);
    var dp = new Array(n);

    if (b[0] === 0) return null;
    cp[0] = c[0] / b[0];
    dp[0] = d[0] / b[0];

    for (var i = 1; i < n; i++) {
      var denom = b[i] - a[i] * cp[i - 1];
      if (denom === 0) return null;
      cp[i] = c[i] / denom;
      dp[i] = (d[i] - a[i] * dp[i - 1]) / denom;
    }

    var x = new Array(n);
    x[n - 1] = dp[n - 1];
    for (var j = n - 2; j >= 0; j--) {
      x[j] = dp[j] - cp[j] * x[j + 1];
    }
    return x;
  }

  /**
   * 自然三次样条求解 M (二阶导数组)
   * @param {number[]} xs - x 值
   * @param {number[]} ys - y 值
   * @returns {number[]|null} M 数组 (长度 n)
   */
  function naturalCubicSplineM(xs, ys) {
    var n = xs.length;
    if (n < 3) return null;

    var h = new Array(n - 1);
    for (var i = 0; i < n - 1; i++) {
      h[i] = xs[i + 1] - xs[i];
      if (h[i] === 0) return null;
    }

    var aTri = new Array(n);
    var bTri = new Array(n);
    var cTri = new Array(n);
    var dTri = new Array(n);

    aTri[0] = 0;
    bTri[0] = 1;
    cTri[0] = 0;
    dTri[0] = 0;

    aTri[n - 1] = 0;
    bTri[n - 1] = 1;
    cTri[n - 1] = 0;
    dTri[n - 1] = 0;

    for (var i2 = 1; i2 < n - 1; i2++) {
      aTri[i2] = h[i2 - 1];
      bTri[i2] = 2 * (h[i2 - 1] + h[i2]);
      cTri[i2] = h[i2];
      dTri[i2] = 6 * ((ys[i2 + 1] - ys[i2]) / h[i2] - (ys[i2] - ys[i2 - 1]) / h[i2 - 1]);
    }

    return thomasSolve(aTri, bTri, cTri, dTri);
  }

  /**
   * 三次样条求值
   * @param {number[]} xs - x 值
   * @param {number[]} ys - y 值
   * @param {number[]} M - 二阶导数组
   * @param {number} x - 求值点
   * @returns {number}
   */
  function splineEval(xs, ys, M, x) {
    var n = xs.length;
    var idx = n - 2;
    if (x <= xs[0]) {
      idx = 0;
    } else if (x >= xs[n - 1]) {
      idx = n - 2;
    } else {
      for (var i = 0; i < n - 1; i++) {
        if (x >= xs[i] && x <= xs[i + 1]) {
          idx = i;
          break;
        }
      }
    }

    var h = xs[idx + 1] - xs[idx];
    if (h === 0) return NaN;

    var xi = xs[idx];
    var xi1 = xs[idx + 1];
    var yi = ys[idx];
    var yi1 = ys[idx + 1];
    var Mi = M[idx];
    var Mi1 = M[idx + 1];

    var dxLeft = xi1 - x;
    var dxRight = x - xi;
    var h2 = h * h;

    return Mi * dxLeft * dxLeft * dxLeft / (6 * h)
         + Mi1 * dxRight * dxRight * dxRight / (6 * h)
         + (yi - Mi * h2 / 6) * dxLeft / h
         + (yi1 - Mi1 * h2 / 6) * dxRight / h;
  }

  /**
   * 三次样条预测下一步
   */
  function cubicSplinePredict(series) {
    var n = series.length;
    if (n < 3) return null;
    var xs = new Array(n);
    for (var i = 0; i < n; i++) xs[i] = i;
    var M = naturalCubicSplineM(xs, series);
    if (!M) return null;
    var val = splineEval(xs, series, M, n);
    return isFiniteNumber(val) ? val : null;
  }

  // ============================================================
  // 留一交叉验证 & MAPE
  // ============================================================

  /**
   * 计算 MAPE (平均绝对百分比误差)
   * 跳过实际值为 0 的项
   */
  function calculateMAPE(actual, predicted) {
    var n = actual.length;
    if (n === 0) return null;
    var sum = 0;
    var count = 0;
    for (var i = 0; i < n; i++) {
      if (actual[i] === 0) continue;
      if (!isFiniteNumber(predicted[i])) continue;
      sum += Math.abs((predicted[i] - actual[i]) / actual[i]);
      count++;
    }
    if (count === 0) return null;
    return sum / count;
  }

  /**
   * 留一交叉验证计算某方法的 MAPE
   * @param {number[]} series - 时间序列
   * @param {Function} predictFn - 单步预测函数
   * @param {number} minLen - 最小长度
   * @returns {number|null}
   */
  function loocvMAPE(series, predictFn, minLen) {
    var n = series.length;
    if (n <= minLen) return null;
    var actuals = [];
    var preds = [];
    for (var i = minLen; i < n; i++) {
      var sub = series.slice(0, i);
      var pred = predictFn(sub);
      if (isFiniteNumber(pred)) {
        actuals.push(series[i]);
        preds.push(pred);
      }
    }
    return calculateMAPE(actuals, preds);
  }

  // ============================================================
  // 公共 API
  // ============================================================

  var METHOD_IDS = ['max_degree_poly', 'high_degree_avg', 'cubic_spline'];
  var METHOD_NAMES = ['最高次插值', '高次平均', '三次样条'];
  var METHOD_NAME_KEYS = ['overfit_method_high_degree', 'overfit_method_avg_high', 'overfit_method_cubic_spline'];
  var METHOD_MIN_LEN = [2, 3, 3];

  function getPredictFn(id) {
    if (id === 'max_degree_poly') return maxDegreePolyPredict;
    if (id === 'high_degree_avg') return highDegreeAvgPredict;
    if (id === 'cubic_spline') return cubicSplinePredict;
    return null;
  }

  /**
   * 拟合并计算加权融合
   * @param {number[]} series
   * @returns {Object}
   */
  function fit(series) {
    var n = series.length;
    var methods = [];
    var predictions = [];

    for (var m = 0; m < METHOD_IDS.length; m++) {
      var id = METHOD_IDS[m];
      var name = METHOD_NAMES[m];
      var nameKey = METHOD_NAME_KEYS[m];
      var minLen = METHOD_MIN_LEN[m];
      var predictFn = getPredictFn(id);

      var prediction = null;
      var mape = null;
      var weight = 0;

      if (n >= minLen) {
        prediction = predictFn(series);
        mape = loocvMAPE(series, predictFn, minLen);
      }

      if (mape !== null && isFiniteNumber(mape) && mape > 0) {
        weight = 1 / mape;
      }

      methods.push({
        id: id,
        name: name,
        nameKey: nameKey,
        prediction: prediction,
        mape: mape,
        weight: weight
      });
      predictions.push(prediction);
    }

    var totalWeight = 0;
    var weightedSum = 0;
    for (var m2 = 0; m2 < methods.length; m2++) {
      if (methods[m2].weight > 0 && isFiniteNumber(methods[m2].prediction)) {
        totalWeight += methods[m2].weight;
        weightedSum += methods[m2].weight * methods[m2].prediction;
      }
    }

    var ensemble = null;
    if (totalWeight > 0) {
      ensemble = weightedSum / totalWeight;
      if (!isFiniteNumber(ensemble)) ensemble = null;
    }

    return {
      methods: methods,
      ensemble: ensemble,
      predictions: predictions
    };
  }

  /**
   * 多步预测（迭代预测，每步把预测值加入序列）
   * @param {number[]} series
   * @param {number} steps
   * @returns {number[]}
   */
  function predict(series, steps) {
    var result = [];
    var current = series.slice();
    for (var s = 0; s < steps; s++) {
      var f = fit(current);
      if (f.ensemble === null) break;
      result.push(f.ensemble);
      current.push(f.ensemble);
    }
    return result;
  }

  return {
    fit: fit,
    predict: predict
  };

})();

// ============================================================
// 自检 / Self-test
// ============================================================
(function () {
  'use strict';

  function assert(cond, msg) {
    if (!cond) {
      console.log('FAIL: ' + msg);
    } else {
      console.log('OK: ' + msg);
    }
  }

  var series1 = [1, 2, 4, 7, 11];
  var result1 = overfitAlgo.fit(series1);
  assert(Array.isArray(result1.methods) && result1.methods.length === 3, 'fit returns 3 methods');
  assert(result1.methods[0].id === 'max_degree_poly', 'method 0 id correct');
  assert(result1.methods[1].id === 'high_degree_avg', 'method 1 id correct');
  assert(result1.methods[2].id === 'cubic_spline', 'method 2 id correct');
  assert(result1.ensemble !== null, 'ensemble is not null');
  assert(typeof result1.ensemble === 'number' && isFinite(result1.ensemble), 'ensemble is finite number');

  var pred5 = overfitAlgo.predict(series1, 5);
  assert(Array.isArray(pred5), 'predict returns array');
  assert(pred5.length > 0, 'predict returns at least one value');

  var series2 = [2, 4, 6, 8, 10, 12, 14];
  var result2 = overfitAlgo.fit(series2);
  assert(result2.methods[0].prediction !== null, 'linear series: max_degree_poly works');
  assert(Math.abs(result2.methods[0].prediction - 16) < 0.01, 'linear series: max_degree_poly predicts 16');

  var series3 = [1, 4, 9, 16, 25];
  var result3 = overfitAlgo.fit(series3);
  assert(result3.methods[0].prediction !== null, 'quadratic: max_degree_poly works');
  assert(Math.abs(result3.methods[0].prediction - 36) < 0.1, 'quadratic: max_degree_poly predicts ~36');

  console.log('Self-test complete.');
})();
