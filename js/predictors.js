/**
 * predictors.js
 * 40 种时间序列预测方法集合 (40 Time Series Prediction Methods)
 *
 * 通过 <script> 标签加载，导出全局变量 `predictors`。
 * 每个预测器对象结构 / Predictor object shape：
 *   {
 *     id: string,          // 唯一短标识符 (snake_case)
 *     name: string,        // 显示名称 (中文 + English)
 *     category: string,    // 'basic' | 'smoothing' | 'regression' | 'autoregressive' | 'other'
 *     minLen: number,      // 所需最小序列长度
 *     predict: function(series: number[]): number | null
 *   }
 *
 * 所有方法均为确定性实现（无随机数、无时间依赖），纯 JavaScript，无外部依赖。
 * All methods are deterministic (no RNG, no time dependency), pure JS, no dependencies.
 */
const predictors = (function () {
  'use strict';

  // ============================================================
  // 辅助函数 / Helper Functions
  // ============================================================

  /**
   * 判断是否为有限数值 / Check if a value is a finite number.
   */
  function isFiniteNumber(x) {
    return typeof x === 'number' && isFinite(x);
  }

  /**
   * 验证输入序列 / Validate input series.
   * 必须为数组、长度不小于 minLen、且所有元素均为有限数值。
   */
  function validateSeries(series, minLen) {
    if (!Array.isArray(series) || series.length < minLen) return false;
    for (var i = 0; i < series.length; i++) {
      if (!isFiniteNumber(series[i])) return false;
    }
    return true;
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
    // 构造增广矩阵副本，避免修改原始输入
    // Build augmented matrix copy to avoid mutating inputs
    var M = [];
    for (var i = 0; i < n; i++) {
      M.push(A[i].slice());
      M[i].push(b[i]);
    }

    for (var col = 0; col < n; col++) {
      // 部分主元：选取当前列绝对值最大的行 / Partial pivot: max abs in column
      var pivotRow = col;
      var maxVal = Math.abs(M[col][col]);
      for (var r = col + 1; r < n; r++) {
        if (Math.abs(M[r][col]) > maxVal) {
          maxVal = Math.abs(M[r][col]);
          pivotRow = r;
        }
      }
      if (maxVal === 0) return null; // 奇异矩阵 / Singular matrix

      // 交换行 / Swap rows
      if (pivotRow !== col) {
        var tmp = M[col];
        M[col] = M[pivotRow];
        M[pivotRow] = tmp;
      }

      // 消元 / Eliminate rows below
      for (var r2 = col + 1; r2 < n; r2++) {
        var factor = M[r2][col] / M[col][col];
        for (var c = col; c <= n; c++) {
          M[r2][c] -= factor * M[col][c];
        }
      }
    }

    // 回代 / Back-substitution
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
   * 多项式回归拟合 / Polynomial regression via normal equations.
   * 构造正规方程 (XᵀX)β = Xᵀy 并用高斯消元求解。
   * @param {number[]} xs - x 坐标
   * @param {number[]} ys - y 坐标
   * @param {number} degree - 多项式次数
   * @returns {number[]|null} 系数 [c0, c1, ..., c_deg]（c0 + c1·x + c2·x² + ...），失败返回 null
   */
  function polyFit(xs, ys, degree) {
    var n = xs.length;
    var k = degree + 1; // 系数个数 / number of coefficients
    // 构造正规方程矩阵 / Build normal-equation matrices
    var X = [];
    var Y = new Array(k);
    for (var i = 0; i < k; i++) {
      X.push(new Array(k).fill(0));
      Y[i] = 0;
    }
    for (var p = 0; p < n; p++) {
      // 预计算 [1, x, x², ..., x^degree] / Precompute powers
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

  // ============================================================
  // 预测方法 / Prediction Methods
  // ============================================================

  return [
    // ------------------------------------------------------------
    // 基础方法 / Basic Methods
    // ------------------------------------------------------------
    {
      id: 'naive',
      name: '朴素法 Naive',
      nameKey: 'predictor_method_naive',
      category: 'basic',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 直接返回最后一个值 / Return the last value
        return series[series.length - 1];
      }
    },
    {
      id: 'seasonal_naive',
      name: '季节朴素法 Seasonal Naive',
      nameKey: 'predictor_method_seasonal_naive',
      category: 'basic',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 周期 = 2，取上一周期同相位值 / period=2, use value from one period ago
        return series[series.length - 2];
      }
    },
    {
      id: 'drift',
      name: '漂移法 Drift',
      nameKey: 'predictor_method_drift',
      category: 'basic',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var first = series[0];
        var last = series[n - 1];
        // 斜率 = (last - first)/(n-1)，外推一步
        // slope between first and last point, extrapolate one step
        var forecast = last + (last - first) / (n - 1);
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'mean',
      name: '简单平均 Mean',
      nameKey: 'predictor_method_mean',
      category: 'basic',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 算术平均 / Arithmetic mean
        var sum = 0;
        for (var i = 0; i < series.length; i++) sum += series[i];
        var forecast = sum / series.length;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'median',
      name: '中位数 Median',
      nameKey: 'predictor_method_median',
      category: 'basic',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 排序副本，取中间元素或两中间元素均值
        // Sort copy, take middle or average of two middles
        var sorted = series.slice().sort(function (a, b) { return a - b; });
        var n = sorted.length;
        var median;
        if (n % 2 === 1) {
          median = sorted[(n - 1) / 2];
        } else {
          median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
        }
        return isFiniteNumber(median) ? median : null;
      }
    },

    // ------------------------------------------------------------
    // 平滑方法 / Smoothing Methods
    // ------------------------------------------------------------
    {
      id: 'sma',
      name: '简单移动平均 SMA',
      nameKey: 'predictor_method_sma',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 窗口 = min(3, n)，对最后 window 个值取平均
        var window = Math.min(3, n);
        var sum = 0;
        for (var i = n - window; i < n; i++) sum += series[i];
        var forecast = sum / window;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'wma',
      name: '加权移动平均 WMA',
      nameKey: 'predictor_method_wma',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var window = Math.min(3, n);
        var weightedSum = 0;
        var weightSum = 0;
        // 权重 1, 2, 3（从最旧到最新）/ weights 1,2,3 oldest→newest
        for (var i = 0; i < window; i++) {
          var w = i + 1;
          weightedSum += w * series[n - window + i];
          weightSum += w;
        }
        var forecast = weightedSum / weightSum;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'ses',
      name: '简单指数平滑 SES',
      nameKey: 'predictor_method_ses',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // α = 0.5；s₀ = series[0]；sₜ = α·xₜ + (1-α)·sₜ₋₁
        var alpha = 0.5;
        var s = series[0];
        for (var i = 1; i < series.length; i++) {
          s = alpha * series[i] + (1 - alpha) * s;
        }
        return isFiniteNumber(s) ? s : null;
      }
    },
    {
      id: 'holt',
      name: '二次指数平滑 Holt Linear',
      nameKey: 'predictor_method_holt',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // α = β = 0.3；初始化 level=series[0], trend=series[1]-series[0]
        var alpha = 0.3, beta = 0.3;
        var level = series[0];
        var trend = series[1] - series[0];
        for (var t = 1; t < series.length; t++) {
          var prevLevel = level;
          // levelₜ = α·yₜ + (1-α)·(levelₜ₋₁ + trendₜ₋₁)
          level = alpha * series[t] + (1 - alpha) * (level + trend);
          // trendₜ = β·(levelₜ - levelₜ₋₁) + (1-β)·trendₜ₋₁
          trend = beta * (level - prevLevel) + (1 - beta) * trend;
        }
        // 预测 = level + trend
        var forecast = level + trend;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'holt_winters',
      name: '三次指数平滑 Holt-Winters',
      nameKey: 'predictor_method_holt_winters',
      category: 'smoothing',
      minLen: 4,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 加法模型，周期 p = 2，α = β = γ = 0.3
        // Additive model, period=2
        var p = 2;
        var alpha = 0.3, beta = 0.3, gamma = 0.3;
        var n = series.length;

        // 初始化：使用第一个周期 / Initialize using first period
        var level = (series[0] + series[1]) / 2;
        var trend = series[1] - series[0];
        var season = [series[0] - level, series[1] - level];

        // 迭代更新 / Iterative update
        for (var t = p; t < n; t++) {
          var prevLevel = level;
          var sIdx = t % p;
          var oldSeason = season[sIdx];
          // levelₜ = α·(yₜ - Sₜ₋ₚ) + (1-α)·(levelₜ₋₁ + trendₜ₋₁)
          var newLevel = alpha * (series[t] - oldSeason) + (1 - alpha) * (level + trend);
          // trendₜ = β·(levelₜ - levelₜ₋₁) + (1-β)·trendₜ₋₁
          var newTrend = beta * (newLevel - prevLevel) + (1 - beta) * trend;
          // Sₜ = γ·(yₜ - levelₜ) + (1-γ)·Sₜ₋ₚ
          season[sIdx] = gamma * (series[t] - newLevel) + (1 - gamma) * oldSeason;
          level = newLevel;
          trend = newTrend;
        }
        // 一步预测：level + trend + S_{n-p}（循环索引）/ one-step forecast
        var forecast = level + trend + season[n % p];
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },

    // ------------------------------------------------------------
    // 回归方法 / Regression Methods
    // ------------------------------------------------------------
    {
      id: 'linear',
      name: '线性回归 Linear',
      nameKey: 'predictor_method_linear',
      category: 'regression',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 最小二乘闭式解：y = intercept + slope·x，预测 x = n
        // Least squares closed form, predict at x=n
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var i = 0; i < n; i++) {
          sumX += i;
          sumY += series[i];
          sumXY += i * series[i];
          sumX2 += i * i;
        }
        var denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-12) return null;
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        var forecast = intercept + slope * n;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'poly2',
      name: '二次多项式回归 Poly2',
      nameKey: 'predictor_method_poly2',
      category: 'regression',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var xs = [], ys = [];
        for (var i = 0; i < n; i++) { xs.push(i); ys.push(series[i]); }
        var coef = polyFit(xs, ys, 2);
        if (!coef) return null;
        // 预测 x = n：c0 + c1·n + c2·n²
        var x = n;
        var forecast = coef[0] + coef[1] * x + coef[2] * x * x;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'poly3',
      name: '三次多项式回归 Poly3',
      nameKey: 'predictor_method_poly3',
      category: 'regression',
      minLen: 4,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var xs = [], ys = [];
        for (var i = 0; i < n; i++) { xs.push(i); ys.push(series[i]); }
        var coef = polyFit(xs, ys, 3);
        if (!coef) return null;
        // 预测 x = n：c0 + c1·n + c2·n² + c3·n³
        var x = n;
        var forecast = coef[0] + coef[1] * x + coef[2] * x * x + coef[3] * x * x * x;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },

    // ------------------------------------------------------------
    // 自回归方法 / Autoregressive Methods
    // ------------------------------------------------------------
    {
      id: 'ar1',
      name: '自回归 AR(1)',
      nameKey: 'predictor_method_ar1',
      category: 'autoregressive',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 模型：y[t] = c + φ·y[t-1]，最小二乘求解 [c, φ]
        // Model: y[t] = c + φ·y[t-1], solve via normal equations
        var n = series.length;
        var X = [[0, 0], [0, 0]];
        var Y = [0, 0];
        for (var t = 1; t < n; t++) {
          var x1 = 1, x2 = series[t - 1], yv = series[t];
          X[0][0] += x1 * x1; X[0][1] += x1 * x2;
          X[1][0] += x2 * x1; X[1][1] += x2 * x2;
          Y[0] += x1 * yv;
          Y[1] += x2 * yv;
        }
        var sol = gaussianSolve(X, Y);
        if (!sol) return null;
        var c = sol[0], phi = sol[1];
        // 预测 = c + φ·series[n-1]
        var forecast = c + phi * series[n - 1];
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'ar2',
      name: '自回归 AR(2)',
      nameKey: 'predictor_method_ar2',
      category: 'autoregressive',
      minLen: 4,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 模型：y[t] = c + φ1·y[t-1] + φ2·y[t-2]，最小二乘求解 [c, φ1, φ2]
        // Model: y[t] = c + φ1·y[t-1] + φ2·y[t-2], solve via normal equations
        var n = series.length;
        var X = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        var Y = [0, 0, 0];
        for (var t = 2; t < n; t++) {
          var x1 = 1, x2 = series[t - 1], x3 = series[t - 2], yv = series[t];
          X[0][0] += x1 * x1; X[0][1] += x1 * x2; X[0][2] += x1 * x3;
          X[1][0] += x2 * x1; X[1][1] += x2 * x2; X[1][2] += x2 * x3;
          X[2][0] += x3 * x1; X[2][1] += x3 * x2; X[2][2] += x3 * x3;
          Y[0] += x1 * yv; Y[1] += x2 * yv; Y[2] += x3 * yv;
        }
        var sol = gaussianSolve(X, Y);
        if (!sol) return null;
        var c = sol[0], phi1 = sol[1], phi2 = sol[2];
        // 预测 = c + φ1·series[n-1] + φ2·series[n-2]
        var forecast = c + phi1 * series[n - 1] + phi2 * series[n - 2];
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },

    // ------------------------------------------------------------
    // 其他方法 / Other Methods
    // ------------------------------------------------------------
    {
      id: 'geometric',
      name: '几何增长 Geometric',
      nameKey: 'predictor_method_geometric',
      category: 'other',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 检查零值 / Reject zeros
        for (var i = 0; i < n; i++) {
          if (series[i] === 0) return null;
        }
        // 检查符号变化 / Reject sign changes
        var prevSign = series[0] > 0 ? 1 : -1;
        for (var j = 1; j < n; j++) {
          var curSign = series[j] > 0 ? 1 : -1;
          if (curSign !== prevSign) return null;
        }
        // 平均比率 = mean(series[i]/series[i-1])
        var sumRatio = 0;
        for (var k = 1; k < n; k++) {
          sumRatio += series[k] / series[k - 1];
        }
        var avgRatio = sumRatio / (n - 1);
        // 预测 = series[n-1] * avg_ratio
        var forecast = series[n - 1] * avgRatio;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'diff1',
      name: '一阶差分外推 Diff1',
      nameKey: 'predictor_method_diff1',
      category: 'other',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 最后差分 d = series[n-1] - series[n-2]
        var d = series[n - 1] - series[n - 2];
        // 预测 = series[n-1] + d
        var forecast = series[n - 1] + d;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'diff2',
      name: '二阶差分外推 Diff2',
      nameKey: 'predictor_method_diff2',
      category: 'other',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 一阶差分序列：d1[t] = series[t] - series[t-1]
        var d1Last = series[n - 1] - series[n - 2];
        var d1Prev = series[n - 2] - series[n - 3];
        // 二阶差分：d2 = d1_last - d1_prev
        var d2 = d1Last - d1Prev;
        // 预测 = series[n-1] + d1_last + d2
        var forecast = series[n - 1] + d1Last + d2;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'fibonacci',
      name: 'Fibonacci 黄金比率',
      nameKey: 'predictor_method_fibonacci',
      category: 'other',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var PHI = 1.618; // 黄金比例 / Golden ratio
        // 计算相邻项比值 / Compute consecutive ratios
        var sumRatio = 0;
        var count = 0;
        for (var i = 1; i < n; i++) {
          if (series[i - 1] === 0) return null; // 避免除零 / avoid divide-by-zero
          sumRatio += series[i] / series[i - 1];
          count++;
        }
        var avgRatio = sumRatio / count;
        if (!isFiniteNumber(avgRatio)) return null;
        var forecast;
        // 若平均比率接近 φ（误差 ≤ 0.1），使用 φ；否则使用平均比率
        if (Math.abs(avgRatio - PHI) <= 0.1) {
          forecast = series[n - 1] * PHI;
        } else {
          forecast = series[n - 1] * avgRatio;
        }
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'fourier',
      name: '傅里叶外推 Fourier',
      nameKey: 'predictor_method_fourier',
      category: 'other',
      minLen: 6,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var k = 3; // 谐波数 / number of harmonics
        var TWO_PI = Math.PI * 2;

        // 离散傅里叶变换 (DFT) 系数 / DFT coefficients
        // a_m = (2/n) · Σ yₜ·cos(2π·m·t/n)
        // b_m = (2/n) · Σ yₜ·sin(2π·m·t/n)
        var a = [], b = [];
        for (var m = 0; m <= k; m++) {
          var sumA = 0, sumB = 0;
          for (var t = 0; t < n; t++) {
            var angle = TWO_PI * m * t / n;
            sumA += series[t] * Math.cos(angle);
            sumB += series[t] * Math.sin(angle);
          }
          a[m] = (2 / n) * sumA;
          b[m] = (2 / n) * sumB;
        }

        // 预测 t = n：a₀/2 + Σ_{m=1}^{k} [a_m·cos(2π·m·n/n) + b_m·sin(2π·m·n/n)]
        // 注意：cos(2π·m·n/n) = cos(2π·m) = 1, sin(2π·m) = 0
        var forecast = a[0] / 2;
        for (var m2 = 1; m2 <= k; m2++) {
          var angle2 = TWO_PI * m2 * n / n; // = 2π·m2
          forecast += a[m2] * Math.cos(angle2) + b[m2] * Math.sin(angle2);
        }
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },

    // ------------------------------------------------------------
    // 新增方法 21-30 / Additional Methods
    // ------------------------------------------------------------
    {
      id: 'seasonal_naive3',
      name: '季节朴素3 Seasonal Naive(3)',
      nameKey: 'predictor_method_seasonal_naive3',
      category: 'basic',
      minLen: 4,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 周期 = 3，取前3个位置的值 / period=3
        return series[series.length - 3];
      }
    },
    {
      id: 'exp_smooth_03',
      name: '指数平滑(α=0.3) SES-0.3',
      nameKey: 'predictor_method_exp_smooth_03',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var alpha = 0.3;
        var s = series[0];
        for (var i = 1; i < series.length; i++) {
          s = alpha * series[i] + (1 - alpha) * s;
        }
        return isFiniteNumber(s) ? s : null;
      }
    },
    {
      id: 'exp_smooth_07',
      name: '指数平滑(α=0.7) SES-0.7',
      nameKey: 'predictor_method_exp_smooth_07',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var alpha = 0.7;
        var s = series[0];
        for (var i = 1; i < series.length; i++) {
          s = alpha * series[i] + (1 - alpha) * s;
        }
        return isFiniteNumber(s) ? s : null;
      }
    },
    {
      id: 'sma5',
      name: '5点移动平均 SMA-5',
      nameKey: 'predictor_method_sma5',
      category: 'smoothing',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var window = Math.min(5, n);
        var sum = 0;
        for (var i = n - window; i < n; i++) sum += series[i];
        var forecast = sum / window;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'poly4',
      name: '四次多项式回归 Poly4',
      nameKey: 'predictor_method_poly4',
      category: 'regression',
      minLen: 5,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var xs = [], ys = [];
        for (var i = 0; i < n; i++) { xs.push(i); ys.push(series[i]); }
        var coef = polyFit(xs, ys, 4);
        if (!coef) return null;
        // 预测 x = n
        var x = n;
        var forecast = coef[0] + coef[1] * x + coef[2] * x * x +
                       coef[3] * x * x * x + coef[4] * x * x * x * x;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'ar3',
      name: '自回归 AR(3)',
      nameKey: 'predictor_method_ar3',
      category: 'autoregressive',
      minLen: 5,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 模型：y[t] = c + φ1·y[t-1] + φ2·y[t-2] + φ3·y[t-3]
        var n = series.length;
        var X = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
        var Y = [0,0,0,0];
        for (var t = 3; t < n; t++) {
          var x1 = 1, x2 = series[t-1], x3 = series[t-2], x4 = series[t-3], yv = series[t];
          X[0][0] += x1*x1; X[0][1] += x1*x2; X[0][2] += x1*x3; X[0][3] += x1*x4;
          X[1][0] += x2*x1; X[1][1] += x2*x2; X[1][2] += x2*x3; X[1][3] += x2*x4;
          X[2][0] += x3*x1; X[2][1] += x3*x2; X[2][2] += x3*x3; X[2][3] += x3*x4;
          X[3][0] += x4*x1; X[3][1] += x4*x2; X[3][2] += x4*x3; X[3][3] += x4*x4;
          Y[0] += x1*yv; Y[1] += x2*yv; Y[2] += x3*yv; Y[3] += x4*yv;
        }
        var sol = gaussianSolve(X, Y);
        if (!sol) return null;
        var c = sol[0], phi1 = sol[1], phi2 = sol[2], phi3 = sol[3];
        var forecast = c + phi1 * series[n-1] + phi2 * series[n-2] + phi3 * series[n-3];
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'harmonic_mean',
      name: '调和平均 Harmonic Mean',
      nameKey: 'predictor_method_harmonic_mean',
      category: 'basic',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        // 检查零值和符号 / check zeros and signs
        var sumInv = 0;
        for (var i = 0; i < series.length; i++) {
          if (series[i] === 0) return null;
          sumInv += 1 / series[i];
        }
        var forecast = series.length / sumInv;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'cagr',
      name: '复合增长率 CAGR',
      nameKey: 'predictor_method_cagr',
      category: 'other',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 检查首尾值 / check first and last
        if (series[0] === 0 || series[n-1] === 0) return null;
        if (series[0] < 0 || series[n-1] < 0) return null;
        // CAGR = (last/first)^(1/(n-1)) - 1
        var ratio = series[n-1] / series[0];
        if (ratio <= 0) return null;
        var cagr = Math.pow(ratio, 1 / (n - 1)) - 1;
        var forecast = series[n-1] * (1 + cagr);
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'log_linear',
      name: '对数线性回归 Log-Linear',
      nameKey: 'predictor_method_log_linear',
      category: 'regression',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 所有值必须为正 / all values must be positive
        for (var i = 0; i < n; i++) {
          if (series[i] <= 0) return null;
        }
        // 对 y 取对数后线性回归 / linear regression on log(y)
        var logY = [];
        for (var j = 0; j < n; j++) logY.push(Math.log(series[j]));
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var k = 0; k < n; k++) {
          sumX += k; sumY += logY[k]; sumXY += k * logY[k]; sumX2 += k * k;
        }
        var denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-12) return null;
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        var logForecast = intercept + slope * n;
        var forecast = Math.exp(logForecast);
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'weighted_last',
      name: '末尾加权平均 Weighted-Last',
      nameKey: 'predictor_method_weighted_last',
      category: 'smoothing',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        // 对最后 n 个值加权，越近权重越大（指数递增）
        var weightedSum = 0, weightSum = 0;
        for (var i = 0; i < n; i++) {
          var w = Math.pow(2, i); // 1, 2, 4, 8, ...
          weightedSum += w * series[i];
          weightSum += w;
        }
        var forecast = weightedSum / weightSum;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },

    // ------------------------------------------------------------
    // 新增方法 31-40 / Additional Methods (Negative-Safe)
    // ------------------------------------------------------------
    {
      id: 'diff_extrap',
      name: '差分外推 Diff Extrap',
      nameKey: 'predictor_method_diff_extrap',
      category: 'autoregressive',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var lastDiffs = [];
        var current = series.slice();
        while (current.length > 1) {
          var allEqual = true;
          var first = current[1] - current[0];
          for (var i = 2; i < current.length; i++) {
            if (current[i] - current[i - 1] !== first) { allEqual = false; break; }
          }
          var nextDiffs = [];
          for (var j = 1; j < current.length; j++) {
            nextDiffs.push(current[j] - current[j - 1]);
          }
          lastDiffs.push(nextDiffs[nextDiffs.length - 1]);
          current = nextDiffs;
          if (allEqual) break;
        }
        var forecast = series[n - 1];
        for (var k = 0; k < lastDiffs.length; k++) {
          forecast += lastDiffs[k];
        }
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'weighted_median',
      name: '加权中位数 Weighted Median',
      nameKey: 'predictor_method_weighted_median',
      category: 'basic',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var indexed = [];
        for (var i = 0; i < n; i++) {
          indexed.push({ value: series[i], weight: i + 1 });
        }
        indexed.sort(function (a, b) { return a.value - b.value; });
        var totalWeight = 0;
        for (var j = 0; j < n; j++) totalWeight += indexed[j].weight;
        var half = totalWeight / 2;
        var cumWeight = 0;
        var median = null;
        for (var k = 0; k < n; k++) {
          cumWeight += indexed[k].weight;
          if (cumWeight >= half) {
            if (cumWeight === half && k < n - 1) {
              median = (indexed[k].value + indexed[k + 1].value) / 2;
            } else {
              median = indexed[k].value;
            }
            break;
          }
        }
        return isFiniteNumber(median) ? median : null;
      }
    },
    {
      id: 'recursive_avg',
      name: '递推平均 Recursive Avg',
      nameKey: 'predictor_method_recursive_avg',
      category: 'smoothing',
      minLen: 2,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var s = series[0];
        for (var i = 1; i < series.length; i++) {
          s = (s * i + series[i]) / (i + 1);
        }
        return isFiniteNumber(s) ? s : null;
      }
    },
    {
      id: 'sign_preserving',
      name: '符号守恒 Sign-Preserving',
      nameKey: 'predictor_method_sign_preserving',
      category: 'other',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var absSeries = [];
        for (var i = 0; i < n; i++) absSeries.push(Math.abs(series[i]));
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var j = 0; j < n; j++) {
          sumX += j;
          sumY += absSeries[j];
          sumXY += j * absSeries[j];
          sumX2 += j * j;
        }
        var denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-12) return null;
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        var absForecast = intercept + slope * n;
        if (!isFiniteNumber(absForecast)) return null;
        var sign = series[n - 1] >= 0 ? 1 : -1;
        var forecast = sign * Math.abs(absForecast);
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'second_order',
      name: '二阶趋势 Second Order',
      nameKey: 'predictor_method_second_order',
      category: 'regression',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var d1 = [];
        for (var i = 1; i < n; i++) d1.push(series[i] - series[i - 1]);
        var m = d1.length;
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var j = 0; j < m; j++) {
          sumX += j;
          sumY += d1[j];
          sumXY += j * d1[j];
          sumX2 += j * j;
        }
        var denom = m * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-12) return null;
        var slope = (m * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / m;
        var nextDiff = intercept + slope * m;
        var forecast = series[n - 1] + nextDiff;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'moving_median',
      name: '移动中位数 Moving Median',
      nameKey: 'predictor_method_moving_median',
      category: 'smoothing',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var window = Math.min(5, n);
        var recent = [];
        for (var i = n - window; i < n; i++) recent.push(series[i]);
        var sorted = recent.sort(function (a, b) { return a - b; });
        var median;
        if (window % 2 === 1) {
          median = sorted[(window - 1) / 2];
        } else {
          median = (sorted[window / 2 - 1] + sorted[window / 2]) / 2;
        }
        return isFiniteNumber(median) ? median : null;
      }
    },
    {
      id: 'triple_smooth',
      name: '三次平滑 Triple Smooth',
      nameKey: 'predictor_method_triple_smooth',
      category: 'smoothing',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var current = series.slice();
        for (var pass = 0; pass < 3; pass++) {
          var smoothed = [];
          var n = current.length;
          var window = Math.min(3, n);
          for (var i = 0; i < n; i++) {
            var start = Math.max(0, i - Math.floor(window / 2));
            var end = Math.min(n, start + window);
            start = end - window;
            if (start < 0) start = 0;
            var sum = 0;
            var count = 0;
            for (var j = start; j < end; j++) {
              sum += current[j];
              count++;
            }
            smoothed.push(sum / count);
          }
          current = smoothed;
        }
        var forecast = current[current.length - 1];
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'symmetric_proj',
      name: '对称投影 Symmetric Proj',
      nameKey: 'predictor_method_symmetric_proj',
      category: 'other',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var forecast = 2 * series[n - 1] - series[0];
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'ratio_diff',
      name: '比值差分 Ratio Diff',
      nameKey: 'predictor_method_ratio_diff',
      category: 'autoregressive',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var ratios = [];
        for (var i = 1; i < n; i++) {
          if (series[i - 1] !== 0) {
            ratios.push(series[i] / series[i - 1]);
          }
        }
        if (ratios.length < 2) return null;
        var ratioDiffs = [];
        for (var j = 1; j < ratios.length; j++) {
          ratioDiffs.push(ratios[j] - ratios[j - 1]);
        }
        var lastRatioDiff = ratioDiffs.length > 0 ? ratioDiffs[ratioDiffs.length - 1] : 0;
        var nextRatio = ratios[ratios.length - 1] + lastRatioDiff;
        var forecast = series[n - 1] * nextRatio;
        return isFiniteNumber(forecast) ? forecast : null;
      }
    },
    {
      id: 'abs_log_linear',
      name: '绝对值对数线性 Abs Log-Lin',
      nameKey: 'predictor_method_abs_log_linear',
      category: 'regression',
      minLen: 3,
      predict: function (series) {
        if (!validateSeries(series, this.minLen)) return null;
        var n = series.length;
        var allZero = true;
        for (var i = 0; i < n; i++) {
          if (series[i] !== 0) { allZero = false; break; }
        }
        if (allZero) return null;
        var logAbs = [];
        for (var j = 0; j < n; j++) {
          logAbs.push(Math.log(Math.abs(series[j]) + 1));
        }
        var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (var k = 0; k < n; k++) {
          sumX += k;
          sumY += logAbs[k];
          sumXY += k * logAbs[k];
          sumX2 += k * k;
        }
        var denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) < 1e-12) return null;
        var slope = (n * sumXY - sumX * sumY) / denom;
        var intercept = (sumY - slope * sumX) / n;
        var logForecast = intercept + slope * n;
        var absForecast = Math.exp(logForecast) - 1;
        if (!isFiniteNumber(absForecast)) return null;
        var sign = series[n - 1] >= 0 ? 1 : -1;
        var forecast = sign * Math.max(0, absForecast);
        return isFiniteNumber(forecast) ? forecast : null;
      }
    }
  ];
})();

// ============================================================
// 自检 / Self-test
// ============================================================
console.log('[predictors] loaded ' + predictors.length + ' methods');
// Sanity checks (run these and log results):
if (typeof window !== 'undefined') {
  const testSeries = [1, 2, 3, 4, 5];
  const linearMethod = predictors.find(p => p.id === 'linear');
  if (linearMethod) {
    const result = linearMethod.predict(testSeries);
    console.log('[predictors] sanity check: linear([1,2,3,4,5]) =', result, '(expected ~6)');
  }
}
