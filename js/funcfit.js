/**
 * funcfit.js
 * 函数拟合模块 (Function Fitting Module)
 *
 * 对时间序列数据进行多项式拟合，自动选择合适的次数以避免过拟合。
 * 使用留一交叉验证 (LOOCV) 选择最优多项式次数。
 *
 * 通过 <script> 标签加载，导出全局对象 `funcFit`：
 *   {
 *     fit(series) → { coef, degree, formula, domain, range, rSquared, evaluate }
 *     evaluatePolynomial(coef, x) → number
 *     formatFormula(coef) → string
 *   }
 *
 * 横坐标：x = 0, 1, 2, ..., n-1（从 0 开始的等差数列）
 * 最大多项式次数：min(5, floor(n/2))，避免过拟合
 */

const funcFit = (function () {
  'use strict';

  // ============================================================
  // 辅助函数 / Helper Functions
  // ============================================================

  function isFiniteNumber(x) {
    return typeof x === 'number' && isFinite(x);
  }

  /**
   * 高斯消元法 / Gaussian elimination (copied from predictors.js for independence)
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

  /**
   * 多项式拟合 / Polynomial regression via normal equations.
   * @param {number[]} xs - x coordinates
   * @param {number[]} ys - y coordinates
   * @param {number} degree - polynomial degree
   * @returns {number[]|null} coefficients [c0, c1, ..., c_deg]
   */
  function polyFit(xs, ys, degree) {
    var n = xs.length;
    var k = degree + 1;
    var X = [];
    var Y = new Array(k);
    for (var i = 0; i < k; i++) {
      X.push(new Array(k).fill(0));
      Y[i] = 0;
    }
    for (var p = 0; p < n; p++) {
      var powers = [];
      var pow = 1;
      for (var d = 0; d <= degree; d++) {
        powers.push(pow);
        pow *= xs[p];
      }
      for (var i2 = 0; i2 < k; i2++) {
        Y[i2] += powers[i2] * ys[p];
        for (var j2 = 0; j2 < k; j2++) {
          X[i2][j2] += powers[i2] * powers[j2];
        }
      }
    }
    return gaussianSolve(X, Y);
  }

  /**
   * 计算多项式值 / Evaluate polynomial at x.
   * coef = [c0, c1, c2, ...] → y = c0 + c1*x + c2*x² + ...
   */
  function evaluatePolynomial(coef, x) {
    if (!coef || coef.length === 0) return 0;
    var result = 0;
    var pow = 1;
    for (var i = 0; i < coef.length; i++) {
      result += coef[i] * pow;
      pow *= x;
    }
    return result;
  }

  // ============================================================
  // 最优次数选择 / Optimal Degree Selection (via LOOCV)
  // ============================================================

  /**
   * 使用留一交叉验证选择最优多项式次数。
   * 候选次数：1, 2, 3, min(4, floor(n/2)), min(5, floor(n/2))
   * 选择 MSE 最小的次数。
   */
  function selectOptimalDegree(xs, ys) {
    var n = xs.length;
    if (n < 3) return 1;

    var maxDegree = Math.min(5, Math.floor(n / 2));
    if (maxDegree < 1) maxDegree = 1;

    var bestDegree = 1;
    var bestMSE = Infinity;

    for (var deg = 1; deg <= maxDegree; deg++) {
      // LOOCV
      var sumSqErr = 0;
      var validCount = 0;

      for (var i = 0; i < n; i++) {
        // 留一个点 / leave one out
        var xsTrain = [];
        var ysTrain = [];
        for (var j = 0; j < n; j++) {
          if (j !== i) {
            xsTrain.push(xs[j]);
            ysTrain.push(ys[j]);
          }
        }

        var coef = polyFit(xsTrain, ysTrain, deg);
        if (!coef) continue;

        var predicted = evaluatePolynomial(coef, xs[i]);
        var err = ys[i] - predicted;
        sumSqErr += err * err;
        validCount++;
      }

      if (validCount === 0) continue;
      var mse = sumSqErr / validCount;

      // 优先低次（奥卡姆剃刀）：只有 MSE 降低超过 5% 才升级次数
      if (mse < bestMSE * 0.95 || deg === 1) {
        bestMSE = mse;
        bestDegree = deg;
      }
    }

    return bestDegree;
  }

  // ============================================================
  // R² 计算 / R-squared Calculation
  // ============================================================

  function computeRSquared(xs, ys, coef) {
    var n = xs.length;
    if (n < 2) return 0;

    // 均值 / mean
    var meanY = 0;
    for (var i = 0; i < n; i++) meanY += ys[i];
    meanY /= n;

    // 总平方和 / total sum of squares
    var ssTotal = 0;
    for (var j = 0; j < n; j++) {
      var diff = ys[j] - meanY;
      ssTotal += diff * diff;
    }
    if (ssTotal < 1e-12) return 1; // 常数序列

    // 残差平方和 / residual sum of squares
    var ssResidual = 0;
    for (var k = 0; k < n; k++) {
      var predicted = evaluatePolynomial(coef, xs[k]);
      var err = ys[k] - predicted;
      ssResidual += err * err;
    }

    return 1 - ssResidual / ssTotal;
  }

  // ============================================================
  // 公式格式化 / Formula Formatting
  // ============================================================

  function formatNumberShort(v) {
    if (!isFinite(v)) return '0';
    if (Number.isInteger(v)) return String(v);
    // 保留 4 位有效数字，去除尾随零
    var abs = Math.abs(v);
    if (abs >= 1000 || (abs < 0.001 && abs > 0)) {
      return v.toExponential(2);
    }
    return parseFloat(v.toFixed(4)).toString();
  }

  /**
   * 格式化多项式为字符串表达式。
   * coef = [c0, c1, c2, ...]
   * 输出如：f(x) = 1 + 2x + 3x²
   */
  function formatFormula(coef) {
    if (!coef || coef.length === 0) return 'f(x) = 0';

    var terms = [];

    for (var i = 0; i < coef.length; i++) {
      var c = coef[i];
      if (!isFinite(c)) continue;
      if (Math.abs(c) < 1e-10) continue; // 跳过近似零系数

      var sign = c >= 0 ? '+' : '-';
      var absC = Math.abs(c);
      var coeffStr = formatNumberShort(absC);

      if (i === 0) {
        // 常数项 / constant term
        terms.push((c < 0 ? '-' : '') + coeffStr);
      } else if (i === 1) {
        // 一次项 / linear term
        if (absC === 1) {
          terms.push(sign + ' x');
        } else {
          terms.push(sign + ' ' + coeffStr + 'x');
        }
      } else {
        // 高次项 / higher degree terms
        var sup = '';
        var degStr = String(i);
        for (var d = 0; d < degStr.length; d++) {
          var ch = degStr[d];
          switch (ch) {
            case '0': sup += '⁰'; break;
            case '1': sup += '¹'; break;
            case '2': sup += '²'; break;
            case '3': sup += '³'; break;
            case '4': sup += '⁴'; break;
            case '5': sup += '⁵'; break;
            case '6': sup += '⁶'; break;
            case '7': sup += '⁷'; break;
            case '8': sup += '⁸'; break;
            case '9': sup += '⁹'; break;
            default: sup += ch;
          }
        }
        if (absC === 1) {
          terms.push(sign + ' x' + sup);
        } else {
          terms.push(sign + ' ' + coeffStr + 'x' + sup);
        }
      }
    }

    if (terms.length === 0) return 'f(x) = 0';

    return 'f(x) = ' + terms.join(' ');
  }

  // ============================================================
  // 主拟合函数 / Main Fit Function
  // ============================================================

  /**
   * 对序列进行多项式拟合。
   * @param {number[]} series - y 值序列（x 从 0 开始）
   * @returns {object|null} 拟合结果对象
   */
  function fit(series) {
    if (!Array.isArray(series) || series.length < 2) return null;

    var n = series.length;
    var xs = [];
    var ys = [];
    for (var i = 0; i < n; i++) {
      if (isFiniteNumber(series[i])) {
        xs.push(i); // x = 0, 1, 2, ...
        ys.push(series[i]);
      }
    }

    if (xs.length < 2) return null;

    // 选择最优次数
    var degree = selectOptimalDegree(xs, ys);

    // 用全部数据拟合
    var coef = polyFit(xs, ys, degree);
    if (!coef) return null;

    // 计算 R²
    var rSquared = computeRSquared(xs, ys, coef);

    // 定义域
    var domain = 'x ∈ [0, ' + (n - 1) + ']';

    // 值域（基于拟合曲线在定义域内的极值 + 端点）
    var yVals = [];
    for (var k = 0; k < xs.length; k++) {
      yVals.push(evaluatePolynomial(coef, xs[k]));
    }
    // 采样更多点以找极值（尤其是高次多项式）
    var sampleCount = Math.max(100, n * 10);
    for (var s = 0; s <= sampleCount; s++) {
      var xVal = (s / sampleCount) * (n - 1);
      yVals.push(evaluatePolynomial(coef, xVal));
    }
    var yMin = Math.min.apply(null, yVals);
    var yMax = Math.max.apply(null, yVals);
    var range = 'y ∈ [' + formatNumberShort(yMin) + ', ' + formatNumberShort(yMax) + ']';

    return {
      coef: coef,
      degree: degree,
      formula: formatFormula(coef),
      domain: domain,
      range: range,
      rSquared: rSquared,
      xs: xs,
      ys: ys,
      evaluate: function (x) { return evaluatePolynomial(coef, x); }
    };
  }

  // ============================================================
  // 导出 / Exports
  // ============================================================

  return {
    fit: fit,
    evaluatePolynomial: evaluatePolynomial,
    formatFormula: formatFormula
  };
})();

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[funcfit] function fitting module loaded');
if (typeof window !== 'undefined') {
  var testSeries = [1, 2, 3, 4, 5, 6];
  var result = funcFit.fit(testSeries);
  if (result) {
    console.log('[funcfit] sanity: degree =', result.degree);
    console.log('[funcfit] sanity: formula =', result.formula);
    console.log('[funcfit] sanity: R² =', result.rSquared.toFixed(4));
    console.log('[funcfit] sanity: f(0) =', result.evaluate(0), '(expected ~1)');
    console.log('[funcfit] sanity: f(5) =', result.evaluate(5), '(expected ~6)');
  }
}
