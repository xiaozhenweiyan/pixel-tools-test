/**
 * offsetfit.js
 * 偏移算法模块 (Offset Fitting Module)
 *
 * 把数据 y[0..n-1] 看作某个简单函数 g(x) 经过水平平移 h 和垂直平移 k 后的采样，
 * 即 y[i] ≈ g(i - h) + k。在多个简单函数族中，找到最匹配的那个。
 *
 * 通过 <script> 标签加载，导出全局对象 `offsetFit`：
 *   {
 *     fit(series) → { best: {...}, candidates: [...], isExactMatch: boolean }
 *   }
 */
const offsetFit = (function () {
  'use strict';

  // ============================================================
  // 辅助函数 / Helper Functions
  // ============================================================

  function isFiniteNumber(x) {
    return typeof x === 'number' && isFinite(x);
  }

  /**
   * 高斯消元法求解线性方程组 Ax = b（部分主元法）
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
   * 计算 R² (R-squared)
   * 1 - SSres / SStot
   */
  function computeRSquared(ys, yPred) {
    var n = ys.length;
    if (n < 2) return 0;

    var meanY = 0;
    for (var i = 0; i < n; i++) meanY += ys[i];
    meanY /= n;

    var ssTotal = 0;
    var ssResidual = 0;
    for (var j = 0; j < n; j++) {
      var diffT = ys[j] - meanY;
      ssTotal += diffT * diffT;
      var diffR = ys[j] - yPred[j];
      ssResidual += diffR * diffR;
    }

    if (ssTotal < 1e-12) return 1;
    return 1 - ssResidual / ssTotal;
  }

  function formatNumberShort(v) {
    if (!isFinite(v)) return '0';
    if (Number.isInteger(v)) return String(v);
    var abs = Math.abs(v);
    if (abs >= 1000 || (abs < 0.001 && abs > 0)) {
      return v.toExponential(2);
    }
    return parseFloat(v.toFixed(4)).toString();
  }

  // ============================================================
  // 多项式拟合 / Polynomial Fitting
  // ============================================================

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
  // 1. 常数函数 / Constant
  //    y = A
  // ============================================================

  function fitConstant(xs, ys) {
    var n = ys.length;
    if (n < 1) return null;

    var sum = 0;
    for (var i = 0; i < n; i++) sum += ys[i];
    var A = sum / n;

    if (!isFiniteNumber(A)) return null;

    var yPred = new Array(n);
    for (var j = 0; j < n; j++) yPred[j] = A;

    var r2 = computeRSquared(ys, yPred);

    return {
      functionId: 'constant',
      functionName: '常数函数',
      functionNameKey: 'offsetfit_func_constant',
      formula: 'y = ' + formatNumberShort(A),
      rSquared: r2,
      params: { A: A },
      evaluate: function (x) { return A; },
      prediction: A
    };
  }

  // ============================================================
  // 2. 线性函数 / Linear
  //    y = A*x + B
  // ============================================================

  function fitLinear(xs, ys) {
    var coef = polyFit(xs, ys, 1);
    if (!coef) return null;
    var B = coef[0];
    var A = coef[1];
    if (!isFiniteNumber(A) || !isFiniteNumber(B)) return null;

    var n = xs.length;
    var yPred = new Array(n);
    for (var i = 0; i < n; i++) yPred[i] = evaluatePolynomial(coef, xs[i]);
    var r2 = computeRSquared(ys, yPred);

    var formula = 'y = ';
    if (Math.abs(A) < 1e-10) {
      formula += formatNumberShort(B);
    } else {
      var aStr = (Math.abs(A) === 1) ? (A < 0 ? '-x' : 'x') : (formatNumberShort(A) + 'x');
      if (Math.abs(B) < 1e-10) {
        formula += aStr;
      } else {
        formula += aStr + (B >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(B));
      }
    }

    return {
      functionId: 'linear',
      functionName: '线性函数',
      functionNameKey: 'offsetfit_func_linear',
      formula: formula,
      rSquared: r2,
      params: { A: A, B: B },
      evaluate: function (x) { return A * x + B; },
      prediction: A * n + B
    };
  }

  // ============================================================
  // 3. 二次函数 / Quadratic
  //    y = A*x² + B*x + C
  // ============================================================

  function fitQuadratic(xs, ys) {
    if (xs.length < 3) return null;
    var coef = polyFit(xs, ys, 2);
    if (!coef) return null;
    var C = coef[0];
    var B = coef[1];
    var A = coef[2];
    if (!isFiniteNumber(A) || !isFiniteNumber(B) || !isFiniteNumber(C)) return null;

    var n = xs.length;
    var yPred = new Array(n);
    for (var i = 0; i < n; i++) yPred[i] = evaluatePolynomial(coef, xs[i]);
    var r2 = computeRSquared(ys, yPred);

    var terms = [];
    if (Math.abs(A) > 1e-10) {
      var aStr = Math.abs(A) === 1 ? 'x²' : (formatNumberShort(Math.abs(A)) + 'x²');
      terms.push((A < 0 ? '-' : '') + aStr);
    }
    if (Math.abs(B) > 1e-10) {
      var bStr = Math.abs(B) === 1 ? 'x' : (formatNumberShort(Math.abs(B)) + 'x');
      terms.push((B >= 0 ? ' + ' : ' - ') + bStr);
    }
    if (Math.abs(C) > 1e-10 || terms.length === 0) {
      if (terms.length === 0) {
        terms.push(formatNumberShort(C));
      } else {
        terms.push((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
      }
    }
    var formula = 'y = ' + terms.join('');

    return {
      functionId: 'quadratic',
      functionName: '二次函数',
      functionNameKey: 'offsetfit_func_quadratic',
      formula: formula,
      rSquared: r2,
      params: { A: A, B: B, C: C },
      evaluate: function (x) { return A * x * x + B * x + C; },
      prediction: A * n * n + B * n + C
    };
  }

  // ============================================================
  // 4. 三次函数 / Cubic
  //    y = A*x³ + B*x² + C*x + D
  // ============================================================

  function fitCubic(xs, ys) {
    if (xs.length < 4) return null;
    var coef = polyFit(xs, ys, 3);
    if (!coef) return null;
    var D = coef[0];
    var C = coef[1];
    var B = coef[2];
    var A = coef[3];
    if (!isFiniteNumber(A) || !isFiniteNumber(B) || !isFiniteNumber(C) || !isFiniteNumber(D)) return null;

    var n = xs.length;
    var yPred = new Array(n);
    for (var i = 0; i < n; i++) yPred[i] = evaluatePolynomial(coef, xs[i]);
    var r2 = computeRSquared(ys, yPred);

    var terms = [];
    if (Math.abs(A) > 1e-10) {
      var aStr = Math.abs(A) === 1 ? 'x³' : (formatNumberShort(Math.abs(A)) + 'x³');
      terms.push((A < 0 ? '-' : '') + aStr);
    }
    if (Math.abs(B) > 1e-10) {
      var bStr = Math.abs(B) === 1 ? 'x²' : (formatNumberShort(Math.abs(B)) + 'x²');
      terms.push((B >= 0 ? ' + ' : ' - ') + bStr);
    }
    if (Math.abs(C) > 1e-10) {
      var cStr = Math.abs(C) === 1 ? 'x' : (formatNumberShort(Math.abs(C)) + 'x');
      terms.push((C >= 0 ? ' + ' : ' - ') + cStr);
    }
    if (Math.abs(D) > 1e-10 || terms.length === 0) {
      if (terms.length === 0) {
        terms.push(formatNumberShort(D));
      } else {
        terms.push((D >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(D)));
      }
    }
    var formula = 'y = ' + terms.join('');

    return {
      functionId: 'cubic',
      functionName: '三次函数',
      functionNameKey: 'offsetfit_func_cubic',
      formula: formula,
      rSquared: r2,
      params: { A: A, B: B, C: C, D: D },
      evaluate: function (x) { return A * x * x * x + B * x * x + C * x + D; },
      prediction: A * n * n * n + B * n * n + C * n + D
    };
  }

  // ============================================================
  // 通用：两个线性参数的最小二乘 (y = A * f(x) + C)
  // ============================================================

  function fitTwoParam(fx, ys) {
    var n = ys.length;
    var sF = 0, sY = 0, sFF = 0, sFY = 0;
    for (var i = 0; i < n; i++) {
      sF += fx[i];
      sY += ys[i];
      sFF += fx[i] * fx[i];
      sFY += fx[i] * ys[i];
    }
    var denom = n * sFF - sF * sF;
    if (Math.abs(denom) < 1e-12) return null;
    var A = (n * sFY - sF * sY) / denom;
    var C = (sY - A * sF) / n;
    if (!isFiniteNumber(A) || !isFiniteNumber(C)) return null;
    return { A: A, C: C };
  }

  // ============================================================
  // 5. 绝对值函数 / Absolute Value
  //    y = A * |x - B| + C
  // ============================================================

  function fitAbsolute(xs, ys) {
    var n = xs.length;
    if (n < 3) return null;

    var bestR2 = -Infinity;
    var best = null;

    var xMin = xs[0];
    var xMax = xs[n - 1];
    var steps = 20;

    for (var s = 0; s <= steps; s++) {
      var B = xMin + (s / steps) * (xMax - xMin);

      var fx = new Array(n);
      var valid = true;
      for (var i = 0; i < n; i++) {
        fx[i] = Math.abs(xs[i] - B);
      }

      var ac = fitTwoParam(fx, ys);
      if (!ac) continue;

      var A = ac.A;
      var C = ac.C;

      var yPred = new Array(n);
      for (var j = 0; j < n; j++) {
        yPred[j] = A * Math.abs(xs[j] - B) + C;
      }
      var r2 = computeRSquared(ys, yPred);

      if (r2 > bestR2) {
        bestR2 = r2;
        best = { A: A, B: B, C: C, r2: r2 };
      }
    }

    if (!best) return null;

    var A = best.A;
    var B = best.B;
    var C = best.C;

    var aStr = Math.abs(A) === 1 ? '' : formatNumberShort(Math.abs(A));
    var bSign = B >= 0 ? ' - ' : ' + ';
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var formula = 'y = ' + (A < 0 ? '-' : '') + aStr + '|x' + bSign + formatNumberShort(Math.abs(B)) + '|' + cStr;

    return {
      functionId: 'absolute',
      functionName: '绝对值函数',
      functionNameKey: 'offsetfit_func_abs',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, B: B, C: C },
      evaluate: function (x) { return A * Math.abs(x - B) + C; },
      prediction: A * Math.abs(n - B) + C
    };
  }

  // ============================================================
  // 6. 倒数函数 / Reciprocal
  //    y = A / (x - B) + C
  // ============================================================

  function fitReciprocal(xs, ys) {
    var n = xs.length;
    if (n < 3) return null;

    var bestR2 = -Infinity;
    var best = null;

    var xMin = xs[0];
    var xMax = xs[n - 1];
    var range = xMax - xMin;
    var steps = 20;

    var searchMin = xMin - range * 0.5;
    var searchMax = xMax + range * 0.5;

    for (var s = 0; s <= steps; s++) {
      var B = searchMin + (s / steps) * (searchMax - searchMin);

      var fx = new Array(n);
      var valid = true;
      for (var i = 0; i < n; i++) {
        var denom = xs[i] - B;
        if (Math.abs(denom) < 1e-10) { valid = false; break; }
        fx[i] = 1 / denom;
      }
      if (!valid) continue;

      var ac = fitTwoParam(fx, ys);
      if (!ac) continue;

      var A = ac.A;
      var C = ac.C;

      var yPred = new Array(n);
      var ok = true;
      for (var j = 0; j < n; j++) {
        var val = A / (xs[j] - B) + C;
        if (!isFiniteNumber(val)) { ok = false; break; }
        yPred[j] = val;
      }
      if (!ok) continue;

      var r2 = computeRSquared(ys, yPred);

      if (r2 > bestR2) {
        bestR2 = r2;
        best = { A: A, B: B, C: C, r2: r2 };
      }
    }

    if (!best) return null;

    var A = best.A;
    var B = best.B;
    var C = best.C;

    var aStr = Math.abs(A) === 1 ? (A < 0 ? '-' : '') : formatNumberShort(A);
    var bStr = B >= 0 ? (' - ' + formatNumberShort(B)) : (' + ' + formatNumberShort(Math.abs(B)));
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var formula = 'y = ' + aStr + '/(x' + bStr + ')' + cStr;

    var predX = n - B;
    var prediction = Math.abs(predX) < 1e-10 ? null : (A / predX + C);

    return {
      functionId: 'reciprocal',
      functionName: '倒数函数',
      functionNameKey: 'offsetfit_func_reciprocal',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, B: B, C: C },
      evaluate: function (x) {
        var d = x - B;
        if (Math.abs(d) < 1e-10) return NaN;
        return A / d + C;
      },
      prediction: isFiniteNumber(prediction) ? prediction : null
    };
  }

  // ============================================================
  // 7. 指数函数 / Exponential
  //    y = A * exp(b * x) + C
  // ============================================================

  function fitExponential(xs, ys) {
    var n = xs.length;
    if (n < 3) return null;

    var yMin = Infinity, yMax = -Infinity;
    for (var i = 0; i < n; i++) {
      if (ys[i] < yMin) yMin = ys[i];
      if (ys[i] > yMax) yMax = ys[i];
    }
    var yRange = yMax - yMin;
    if (yRange < 1e-12) return null;

    var bestR2 = -Infinity;
    var best = null;

    var cSteps = 20;
    var cMin = yMin - yRange * 0.5;
    var cMax = yMin + yRange * 0.3;

    for (var s = 0; s <= cSteps; s++) {
      var C = cMin + (s / cSteps) * (cMax - cMin);

      var logYs = new Array(n);
      var valid = true;
      var minLogY = Infinity;
      for (var i2 = 0; i2 < n; i2++) {
        var diff = ys[i2] - C;
        if (diff <= 1e-12) { valid = false; break; }
        logYs[i2] = Math.log(diff);
        if (logYs[i2] < minLogY) minLogY = logYs[i2];
      }
      if (!valid) continue;

      var coef = polyFit(xs, logYs, 1);
      if (!coef) continue;
      var logA = coef[0];
      var b = coef[1];
      if (!isFiniteNumber(logA) || !isFiniteNumber(b)) continue;

      var A = Math.exp(logA);
      if (!isFiniteNumber(A)) continue;

      var yPred = new Array(n);
      var ok = true;
      for (var j = 0; j < n; j++) {
        var val = A * Math.exp(b * xs[j]) + C;
        if (!isFiniteNumber(val)) { ok = false; break; }
        yPred[j] = val;
      }
      if (!ok) continue;

      var r2 = computeRSquared(ys, yPred);

      if (r2 > bestR2) {
        bestR2 = r2;
        best = { A: A, b: b, C: C, r2: r2 };
      }
    }

    if (!best) return null;

    var A = best.A;
    var b = best.b;
    var C = best.C;

    var aStr = formatNumberShort(A);
    var bStr = Math.abs(b) === 1 ? 'x' : (formatNumberShort(b) + 'x');
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var formula = 'y = ' + aStr + '·exp(' + bStr + ')' + cStr;

    var prediction = A * Math.exp(b * n) + C;

    return {
      functionId: 'exponential',
      functionName: '指数函数',
      functionNameKey: 'offsetfit_func_exponential',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, b: b, C: C },
      evaluate: function (x) { return A * Math.exp(b * x) + C; },
      prediction: isFiniteNumber(prediction) ? prediction : null
    };
  }

  // ============================================================
  // 8. 幂函数 / Power
  //    y = A * (x - B)^b + C
  // ============================================================

  function fitPower(xs, ys) {
    var n = xs.length;
    if (n < 4) return null;

    var bestR2 = -Infinity;
    var best = null;

    var xMin = xs[0];
    var xMax = xs[n - 1];
    var range = xMax - xMin;
    var steps = 20;

    var searchMin = xMin - range * 2;
    var searchMax = xMin - range * 0.05;

    for (var s = 0; s <= steps; s++) {
      var B = searchMin + (s / steps) * (searchMax - searchMin);

      var shiftedXs = new Array(n);
      var valid = true;
      for (var i = 0; i < n; i++) {
        shiftedXs[i] = xs[i] - B;
        if (shiftedXs[i] <= 0) { valid = false; break; }
      }
      if (!valid) continue;

      var logXs = new Array(n);
      var logYs = new Array(n);
      for (var i2 = 0; i2 < n; i2++) {
        logXs[i2] = Math.log(shiftedXs[i2]);
      }

      var cSteps = 10;
      var yMin = Infinity, yMax = -Infinity;
      for (var k = 0; k < n; k++) {
        if (ys[k] < yMin) yMin = ys[k];
        if (ys[k] > yMax) yMax = ys[k];
      }
      var yRange = yMax - yMin;

      for (var cs = 0; cs <= cSteps; cs++) {
        var C = yMin - yRange * 0.5 + (cs / cSteps) * yRange;

        var validC = true;
        for (var j = 0; j < n; j++) {
          var diff = ys[j] - C;
          if (diff <= 1e-12) { validC = false; break; }
          logYs[j] = Math.log(diff);
        }
        if (!validC) continue;

        var coef = polyFit(logXs, logYs, 1);
        if (!coef) continue;
        var logA = coef[0];
        var b = coef[1];
        if (!isFiniteNumber(logA) || !isFiniteNumber(b)) continue;

        var A = Math.exp(logA);
        if (!isFiniteNumber(A)) continue;

        var yPred = new Array(n);
        var ok = true;
        for (var j2 = 0; j2 < n; j2++) {
          var val = A * Math.pow(shiftedXs[j2], b) + C;
          if (!isFiniteNumber(val)) { ok = false; break; }
          yPred[j2] = val;
        }
        if (!ok) continue;

        var r2 = computeRSquared(ys, yPred);

        if (r2 > bestR2) {
          bestR2 = r2;
          best = { A: A, B: B, b: b, C: C, r2: r2 };
        }
      }
    }

    if (!best) return null;

    var A = best.A;
    var B = best.B;
    var b = best.b;
    var C = best.C;

    var aStr = formatNumberShort(A);
    var bInside = B >= 0 ? (' - ' + formatNumberShort(B)) : (' + ' + formatNumberShort(Math.abs(B)));
    var expStr = formatNumberShort(b);
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var formula = 'y = ' + aStr + '(x' + bInside + ')^' + expStr + cStr;

    var predShifted = n - B;
    var prediction = predShifted > 0 ? (A * Math.pow(predShifted, b) + C) : null;

    return {
      functionId: 'power',
      functionName: '幂函数',
      functionNameKey: 'offsetfit_func_power',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, B: B, b: b, C: C },
      evaluate: function (x) {
        var d = x - B;
        if (d <= 0) return NaN;
        return A * Math.pow(d, b) + C;
      },
      prediction: isFiniteNumber(prediction) ? prediction : null
    };
  }

  // ============================================================
  // 9. 正弦函数 / Sine
  //    y = A * sin(B * x + C) + D
  // ============================================================

  function fitSine(xs, ys) {
    var n = xs.length;
    if (n < 4) return null;

    var meanY = 0;
    for (var i = 0; i < n; i++) meanY += ys[i];
    meanY /= n;

    var bestR2 = -Infinity;
    var best = null;

    var freqSteps = 25;
    var minFreq = (2 * Math.PI) / n;
    var maxFreq = Math.PI;

    for (var fs = 0; fs <= freqSteps; fs++) {
      var B = minFreq + (fs / freqSteps) * (maxFreq - minFreq);

      var sinX = new Array(n);
      var cosX = new Array(n);
      for (var j = 0; j < n; j++) {
        sinX[j] = Math.sin(B * xs[j]);
        cosX[j] = Math.cos(B * xs[j]);
      }

      var sS = 0, sC = 0, sY = 0;
      var sSS = 0, sCC = 0, sSC = 0;
      var sSY = 0, sCY = 0;
      for (var k = 0; k < n; k++) {
        sS += sinX[k];
        sC += cosX[k];
        sY += ys[k];
        sSS += sinX[k] * sinX[k];
        sCC += cosX[k] * cosX[k];
        sSC += sinX[k] * cosX[k];
        sSY += sinX[k] * ys[k];
        sCY += cosX[k] * ys[k];
      }

      var M = [
        [sSS, sSC, sS],
        [sSC, sCC, sC],
        [sS, sC, n]
      ];
      var rhs = [sSY, sCY, sY];

      var sol = gaussianSolve(M, rhs);
      if (!sol) continue;
      var aSin = sol[0];
      var aCos = sol[1];
      var D = sol[2];
      if (!isFiniteNumber(aSin) || !isFiniteNumber(aCos) || !isFiniteNumber(D)) continue;

      var A = Math.sqrt(aSin * aSin + aCos * aCos);
      var C = Math.atan2(aCos, aSin);

      var yPred = new Array(n);
      var ok = true;
      for (var k2 = 0; k2 < n; k2++) {
        var val = A * Math.sin(B * xs[k2] + C) + D;
        if (!isFiniteNumber(val)) { ok = false; break; }
        yPred[k2] = val;
      }
      if (!ok) continue;

      var r2 = computeRSquared(ys, yPred);

      if (r2 > bestR2) {
        bestR2 = r2;
        best = { A: A, B: B, C: C, D: D, r2: r2 };
      }
    }

    if (!best) return null;

    var A = best.A;
    var B = best.B;
    var C = best.C;
    var D = best.D;

    var aStr = formatNumberShort(A);
    var bStr = Math.abs(B) === 1 ? 'x' : (formatNumberShort(B) + 'x');
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var dStr = Math.abs(D) < 1e-10 ? '' : ((D >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(D)));
    var formula = 'y = ' + aStr + '·sin(' + bStr + cStr + ')' + dStr;

    var prediction = A * Math.sin(B * n + C) + D;

    return {
      functionId: 'sine',
      functionName: '正弦函数',
      functionNameKey: 'offsetfit_func_sine',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, B: B, C: C, D: D },
      evaluate: function (x) { return A * Math.sin(B * x + C) + D; },
      prediction: isFiniteNumber(prediction) ? prediction : null
    };
  }

  // ============================================================
  // 10. 平方根绝对值 / Sqrt Abs
  //     y = A * sqrt(|x - B|) + C
  // ============================================================

  function fitSqrtAbs(xs, ys) {
    var n = xs.length;
    if (n < 3) return null;

    var bestR2 = -Infinity;
    var best = null;

    var xMin = xs[0];
    var xMax = xs[n - 1];
    var range = xMax - xMin;
    var steps = 20;

    var searchMin = xMin - range * 0.5;
    var searchMax = xMax + range * 0.5;

    for (var s = 0; s <= steps; s++) {
      var B = searchMin + (s / steps) * (searchMax - searchMin);

      var fx = new Array(n);
      for (var i = 0; i < n; i++) {
        fx[i] = Math.sqrt(Math.abs(xs[i] - B));
      }

      var ac = fitTwoParam(fx, ys);
      if (!ac) continue;

      var A = ac.A;
      var C = ac.C;

      var yPred = new Array(n);
      for (var j = 0; j < n; j++) {
        yPred[j] = A * Math.sqrt(Math.abs(xs[j] - B)) + C;
      }
      var r2 = computeRSquared(ys, yPred);

      if (r2 > bestR2) {
        bestR2 = r2;
        best = { A: A, B: B, C: C, r2: r2 };
      }
    }

    if (!best) return null;

    var A = best.A;
    var B = best.B;
    var C = best.C;

    var aStr = Math.abs(A) === 1 ? (A < 0 ? '-' : '') : formatNumberShort(A);
    var bStr = B >= 0 ? (' - ' + formatNumberShort(B)) : (' + ' + formatNumberShort(Math.abs(B)));
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var formula = 'y = ' + aStr + '√|x' + bStr + '|' + cStr;

    return {
      functionId: 'sqrt_abs',
      functionName: '平方根绝对值',
      functionNameKey: 'offsetfit_func_sqrt_abs',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, B: B, C: C },
      evaluate: function (x) { return A * Math.sqrt(Math.abs(x - B)) + C; },
      prediction: A * Math.sqrt(Math.abs(n - B)) + C
    };
  }

  // ============================================================
  // 11. 双曲正切 / Tanh
  //     y = A * tanh(B * x + C) + D
  // ============================================================

  function fitTanh(xs, ys) {
    var n = xs.length;
    if (n < 4) return null;

    var yMin = Infinity, yMax = -Infinity;
    for (var i = 0; i < n; i++) {
      if (ys[i] < yMin) yMin = ys[i];
      if (ys[i] > yMax) yMax = ys[i];
    }
    var yRange = yMax - yMin;

    var bestR2 = -Infinity;
    var best = null;

    var bSteps = 15;
    var cSteps = 15;
    var xMinX = xs[0];
    var xMaxX = xs[n - 1];
    var xRange = xMaxX - xMinX;

    for (var bs = 0; bs <= bSteps; bs++) {
      var B = 0.1 + (bs / bSteps) * (5 / (xRange || 1));

      for (var cs = 0; cs <= cSteps; cs++) {
        var C = -Math.PI + (cs / cSteps) * 2 * Math.PI;

        var tanhX = new Array(n);
        for (var j = 0; j < n; j++) {
          tanhX[j] = Math.tanh(B * xs[j] + C);
        }

        var sT = 0, sY = 0, sTT = 0, sTY = 0;
        for (var k = 0; k < n; k++) {
          sT += tanhX[k];
          sY += ys[k];
          sTT += tanhX[k] * tanhX[k];
          sTY += tanhX[k] * ys[k];
        }

        var denom = n * sTT - sT * sT;
        if (Math.abs(denom) < 1e-12) continue;
        var A = (n * sTY - sT * sY) / denom;
        var D = (sY - A * sT) / n;
        if (!isFiniteNumber(A) || !isFiniteNumber(D)) continue;

        var yPred = new Array(n);
        var ok = true;
        for (var k2 = 0; k2 < n; k2++) {
          var val = A * Math.tanh(B * xs[k2] + C) + D;
          if (!isFiniteNumber(val)) { ok = false; break; }
          yPred[k2] = val;
        }
        if (!ok) continue;

        var r2 = computeRSquared(ys, yPred);

        if (r2 > bestR2) {
          bestR2 = r2;
          best = { A: A, B: B, C: C, D: D, r2: r2 };
        }
      }
    }

    if (!best) return null;

    var A = best.A;
    var B = best.B;
    var C = best.C;
    var D = best.D;

    var aStr = formatNumberShort(A);
    var bStr = Math.abs(B) === 1 ? 'x' : (formatNumberShort(B) + 'x');
    var cStr = Math.abs(C) < 1e-10 ? '' : ((C >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(C)));
    var dStr = Math.abs(D) < 1e-10 ? '' : ((D >= 0 ? ' + ' : ' - ') + formatNumberShort(Math.abs(D)));
    var formula = 'y = ' + aStr + '·tanh(' + bStr + cStr + ')' + dStr;

    var prediction = A * Math.tanh(B * n + C) + D;

    return {
      functionId: 'tanh',
      functionName: '双曲正切',
      functionNameKey: 'offsetfit_func_tanh',
      formula: formula,
      rSquared: best.r2,
      params: { A: A, B: B, C: C, D: D },
      evaluate: function (x) { return A * Math.tanh(B * x + C) + D; },
      prediction: isFiniteNumber(prediction) ? prediction : null
    };
  }

  // ============================================================
  // 主拟合函数 / Main Fit Function
  // ============================================================

  function fit(series) {
    if (!Array.isArray(series) || series.length < 2) return null;

    var n = series.length;
    var xs = [];
    var ys = [];
    for (var i = 0; i < n; i++) {
      if (isFiniteNumber(series[i])) {
        xs.push(i);
        ys.push(series[i]);
      }
    }

    if (xs.length < 2) return null;

    var fitters = [
      fitConstant,
      fitLinear,
      fitQuadratic,
      fitCubic,
      fitAbsolute,
      fitReciprocal,
      fitExponential,
      fitPower,
      fitSine,
      fitSqrtAbs,
      fitTanh
    ];

    var candidates = [];
    for (var f = 0; f < fitters.length; f++) {
      try {
        var result = fitters[f](xs, ys);
        if (result && isFiniteNumber(result.rSquared) && result.rSquared > -10) {
          candidates.push(result);
        }
      } catch (e) {
      }
    }

    candidates.sort(function (a, b) {
      return b.rSquared - a.rSquared;
    });

    if (candidates.length === 0) return null;

    var best = candidates[0];
    var top3 = candidates.slice(0, Math.min(3, candidates.length));

    var cleanCandidates = top3.map(function (c) {
      return {
        functionId: c.functionId,
        functionName: c.functionName,
        formula: c.formula,
        rSquared: c.rSquared,
        params: c.params,
        prediction: c.prediction
      };
    });

    var cleanBest = cleanCandidates[0];

    return {
      best: cleanBest,
      candidates: cleanCandidates,
      isExactMatch: best.rSquared > 0.999
    };
  }

  // ============================================================
  // 导出 / Exports
  // ============================================================

  return {
    fit: fit
  };
})();

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[offsetfit] offset fitting module loaded');
if (typeof window !== 'undefined') {
  var testLinear = [1, 2, 3, 4, 5, 6];
  var r1 = offsetFit.fit(testLinear);
  if (r1) {
    console.log('[offsetfit] linear test: best =', r1.best.functionId, 'R² =', r1.best.rSquared.toFixed(4));
    console.log('[offsetfit] linear test: formula =', r1.best.formula);
    console.log('[offsetfit] linear test: prediction =', r1.best.prediction, '(expected ~7)');
  }

  var testQuadratic = [0, 1, 4, 9, 16, 25];
  var r2 = offsetFit.fit(testQuadratic);
  if (r2) {
    console.log('[offsetfit] quadratic test: best =', r2.best.functionId, 'R² =', r2.best.rSquared.toFixed(4));
    console.log('[offsetfit] quadratic test: formula =', r2.best.formula);
    console.log('[offsetfit] quadratic test: prediction =', r2.best.prediction, '(expected ~36)');
  }

  var testSine = [];
  for (var t = 0; t < 20; t++) {
    testSine.push(3 * Math.sin(0.5 * t + 1) + 2);
  }
  var r3 = offsetFit.fit(testSine);
  if (r3) {
    console.log('[offsetfit] sine test: best =', r3.best.functionId, 'R² =', r3.best.rSquared.toFixed(4));
    console.log('[offsetfit] sine test: formula =', r3.best.formula);
  }
}
