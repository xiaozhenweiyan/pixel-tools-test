"""
Pixel Tools MCP Server
把 pixel-tools 网站的计算器和预测器封装为 MCP tools

依赖：mcp (FastMCP)，通过 stdio 传输。
计算器逻辑复用自 js/app.js 的 calculateExpr / trigEval / formatCalcResult；
预测器是简化版（4 种基础方法），权重计算参考 js/weights.js。
"""
import math
import re
from typing import List, Union

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("pixel-tools")


# ============================================================
# 计算器 / Calculator
# ============================================================

# 特殊角度精确值表（DEG 模式，键为度数整数）
# Exact value table for special angles (DEG mode, key is integer degree)
_SQRT2 = math.sqrt(2)
_SQRT3 = math.sqrt(3)
_DEG_TABLE = {
    0:   {"sin": 0.0,           "cos": 1.0,            "tan": 0.0},
    30:  {"sin": 0.5,           "cos": _SQRT3 / 2,     "tan": _SQRT3 / 3},
    45:  {"sin": _SQRT2 / 2,    "cos": _SQRT2 / 2,     "tan": 1.0},
    60:  {"sin": _SQRT3 / 2,    "cos": 0.5,            "tan": _SQRT3},
    90:  {"sin": 1.0,           "cos": 0.0,            "tan": math.inf},
    120: {"sin": _SQRT3 / 2,    "cos": -0.5,           "tan": -_SQRT3},
    135: {"sin": _SQRT2 / 2,    "cos": -_SQRT2 / 2,    "tan": -1.0},
    150: {"sin": 0.5,           "cos": -_SQRT3 / 2,    "tan": -_SQRT3 / 3},
    180: {"sin": 0.0,           "cos": -1.0,           "tan": 0.0},
    270: {"sin": -1.0,          "cos": 0.0,            "tan": math.inf},
    360: {"sin": 0.0,           "cos": 1.0,            "tan": 0.0},
}

# RAD 模式特殊角度（弧度 → 度数） / RAD mode special angles (radian → degree)
_RAD_SPECIAL = [
    (0.0,                0),
    (math.pi / 6,        30),
    (math.pi / 4,        45),
    (math.pi / 3,        60),
    (math.pi / 2,        90),
    (math.pi,            180),
    (3 * math.pi / 2,    270),
    (2 * math.pi,        360),
]


def _get_exact_trig(func: str, angle: float, mode: str):
    """特殊角度精确值查表（DEG/RAD），未命中返回 None

    Look up exact value for special angle; None if not in table.
    """
    if not isinstance(angle, (int, float)) or math.isnan(angle) or math.isinf(angle):
        return None
    if mode == "DEG":
        deg = round(angle)
        if abs(angle - deg) > 1e-9:
            return None
        entry = _DEG_TABLE.get(deg)
        return entry[func] if entry else None
    for rad, deg in _RAD_SPECIAL:
        if abs(angle - rad) < 1e-9:
            return _DEG_TABLE[deg][func]
    return None


def _trig_eval(func: str, x: float, mode: str) -> float:
    """三角函数求值：先查表（特殊角度精确值），未命中按模式计算 + 浮点吸附

    Trig eval: exact table first, then mode-aware compute with float snap.
    DEG 模式经 x * pi / 180（等价 math.radians）转换为弧度。
    """
    if not isinstance(x, (int, float)) or math.isnan(x) or math.isinf(x):
        return math.nan
    exact = _get_exact_trig(func, x, mode)
    if exact is not None:
        return exact
    rad = x * math.pi / 180 if mode == "DEG" else x
    if func == "sin":
        result = math.sin(rad)
    elif func == "cos":
        result = math.cos(rad)
    elif func == "tan":
        result = math.tan(rad)
    else:
        return math.nan
    # 浮点吸附 / floating point snap
    if abs(result) < 1e-15:
        result = 0.0
    if abs(result - round(result)) < 1e-10:
        result = float(round(result))
    return result


def _calculate_expr(expression: str, angle_mode: str = "RAD") -> Union[int, float]:
    """安全表达式求值（白名单 + 三角函数包装），复用 app.js calculateExpr 逻辑

    Safe expression evaluation (whitelist + trig wrappers), porting app.js calculateExpr.
    安全要点 / security:
      - 字符白名单：数字、+ - * / ( ) . 空白、sqrt/sin/cos/tan 函数名
      - eval 全局命名空间 __builtins__ 为空，仅暴露 math 与三角函数包装
      - 三角函数用包装器（注入 eval 局部作用域），DEG 模式经 math.radians 等价转换
        这样可自然支持嵌套调用（如 sin(cos(tan(30)))），无需正则替换补括号
    """
    if not isinstance(expression, str) or expression.strip() == "":
        raise ValueError("空表达式")
    mode = "DEG" if (isinstance(angle_mode, str) and angle_mode.upper() == "DEG") else "RAD"

    # 替换显示符号为代码符号 / normalize display symbols
    cleaned = expression.replace("×", "*").replace("÷", "/").replace("−", "-")
    # 移除所有空白 / strip all whitespace
    cleaned = re.sub(r"\s+", "", cleaned)

    # 校验：移除已知函数名后，剩余应只含数字 / 运算符 / 括号 / 小数点
    # validate: after removing known function names, only digits/operators/parens/decimal
    check_str = cleaned
    for fn in ("sqrt", "sin", "cos", "tan"):
        check_str = check_str.replace(fn, "")
    if not re.match(r"^[-+*/().0-9]+$", check_str):
        raise ValueError("包含非法字符")

    # 替换函数名为内部符号 / replace function names with safe internal symbols
    # sqrt( → math.sqrt(；sin/cos/tan( → __sin(/__cos(/__tan(
    cleaned = (
        cleaned.replace("sqrt(", "math.sqrt(")
        .replace("sin(", "__sin(")
        .replace("cos(", "__cos(")
        .replace("tan(", "__tan(")
    )

    # 不允许连续运算符结尾 / disallow trailing operator
    if cleaned and cleaned != "-" and re.search(r"[+\-*/]$", cleaned):
        raise ValueError("表达式不完整")

    # 三角函数包装（注入到 eval 局部作用域）/ inject trig wrappers as eval locals
    def __sin(x):
        return _trig_eval("sin", x, mode)

    def __cos(x):
        return _trig_eval("cos", x, mode)

    def __tan(x):
        return _trig_eval("tan", x, mode)

    # 用 eval 但限制全局命名空间为空（__builtins__={}），仅暴露 math 与三角包装
    # eval with empty __builtins__, only math + trig wrappers exposed
    result = eval(
        cleaned,
        {"__builtins__": {}},
        {"math": math, "__sin": __sin, "__cos": __cos, "__tan": __tan},
    )

    if isinstance(result, bool) or not isinstance(result, (int, float)):
        raise ValueError("结果无效")
    if isinstance(result, float) and math.isnan(result):
        raise ValueError("结果无效")
    return result


def _expand_scientific(s: str) -> str:
    """把科学计数法字符串展开为完整数字字符串（参考 app.js expandScientific）

    Expand scientific notation string to full digits (port of app.js expandScientific).
    用字符串处理避免浮点精度限制。
    """
    m = re.match(r"^(-?\d+\.?\d*)[eE]([+-]?\d+)$", s)
    if not m:
        return s
    mantissa = m.group(1)
    exp = int(m.group(2))
    is_neg = mantissa.startswith("-")
    if is_neg:
        mantissa = mantissa[1:]
    dot_idx = mantissa.find(".")
    if dot_idx < 0:
        # 整数尾数 / integer mantissa
        if exp >= 0:
            out = mantissa + "0" * exp
        else:
            abs_exp = -exp
            if abs_exp >= len(mantissa):
                out = "0." + "0" * (abs_exp - len(mantissa)) + mantissa
            else:
                out = mantissa[:-abs_exp] + "." + mantissa[-abs_exp:]
    else:
        # 小数尾数 / decimal mantissa
        int_part = mantissa[:dot_idx]
        frac_part = mantissa[dot_idx + 1:]
        all_digits = int_part + frac_part
        new_dot_pos = len(int_part) + exp
        if new_dot_pos <= 0:
            out = "0." + "0" * (-new_dot_pos) + all_digits
        elif new_dot_pos >= len(all_digits):
            out = all_digits + "0" * (new_dot_pos - len(all_digits))
        else:
            out = all_digits[:new_dot_pos] + "." + all_digits[new_dot_pos:]
    return ("-" + out) if is_neg else out


def _format_result(value) -> str:
    """格式化结果（展开科学计数法，参考 app.js formatCalcResult）

    Format result (expand scientific notation, port of app.js formatCalcResult).
    """
    if value is None:
        return "—"
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value):
            return "错误"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        if value.is_integer():
            return str(int(value))
        # 浮点数：用定点格式展开科学计数法，保留最多 20 位小数并去尾零
        # float: use fixed-point format to expand sci notation, keep ≤20 decimals, strip zeros
        return f"{value:.20f}".rstrip("0").rstrip(".")
    # int：直接字符串化（Python int 任意精度，无科学计数法）
    # int: direct str (Python int is arbitrary precision, no scientific notation)
    return str(value)


@mcp.tool()
def calculate(expression: str, angle_mode: str = "RAD") -> str:
    """计算数学表达式 / Evaluate a math expression

    支持四则运算、括号、sqrt / sin / cos / tan 函数。
    例如 "1+2*3"、"sqrt(9)"、"sin(30)"。

    Args:
        expression: 数学表达式，如 "1+2*3"、"sqrt(9)"、"sin(30)"
            / Math expression, e.g. "1+2*3", "sqrt(9)", "sin(30)"
        angle_mode: 角度模式，"RAD"（弧度，默认）或 "DEG"（角度）
            / Angle mode, "RAD" (radian, default) or "DEG" (degree)

    Returns:
        计算结果字符串（大数展开，无科学计数法）；出错时返回 "错误：<原因>"
        / Result string (large numbers expanded, no scientific notation);
        on error returns "错误：<reason>"
    """
    try:
        result = _calculate_expr(expression, angle_mode)
        return _format_result(result)
    except Exception as e:
        return f"错误：{e}"


# ============================================================
# 预测器 / Predictors
# ============================================================

def _predictor_mean(series: List[float], count: int) -> List[float]:
    """平均值预测：以序列均值作为后续值 / Mean predictor"""
    if not series:
        return []
    avg = sum(series) / len(series)
    return [avg] * count


def _predictor_linear(series: List[float], count: int) -> List[float]:
    """线性回归预测：最小二乘拟合直线外推 / Linear regression predictor"""
    if len(series) < 2:
        return _predictor_mean(series, count)
    n = len(series)
    x_mean = (n - 1) / 2
    y_mean = sum(series) / n
    num = sum((i - x_mean) * (y - y_mean) for i, y in enumerate(series))
    den = sum((i - x_mean) ** 2 for i in range(n))
    if den == 0:
        return _predictor_mean(series, count)
    slope = num / den
    intercept = y_mean - slope * x_mean
    return [slope * (n + i) + intercept for i in range(count)]


def _predictor_diff(series: List[float], count: int) -> List[float]:
    """差分预测：以最后一阶差分外推 / Difference predictor"""
    if len(series) < 2:
        return _predictor_mean(series, count)
    diff = series[-1] - series[-2]
    return [series[-1] + diff * (i + 1) for i in range(count)]


def _predictor_moving_avg(series: List[float], count: int, window: int = 3) -> List[float]:
    """移动平均预测：以末尾窗口均值外推 / Moving average predictor"""
    if not series:
        return []
    w = min(window, len(series))
    avg = sum(series[-w:]) / w
    return [avg] * count


PREDICTORS = [
    {"name": "mean",       "desc": "平均值预测：以序列均值作为后续值",          "fn": _predictor_mean},
    {"name": "linear",     "desc": "线性回归预测：最小二乘拟合直线外推",      "fn": _predictor_linear},
    {"name": "diff",       "desc": "差分预测：以最后一阶差分外推",            "fn": _predictor_diff},
    {"name": "moving_avg", "desc": "移动平均预测：以末尾窗口均值外推",        "fn": _predictor_moving_avg},
]


def _backtest_mape(predict_fn, series: List[float], min_len: int = 2) -> float:
    """留一回测 MAPE（参考 weights.js backtest）；Infinity 表示无法回测

    Leave-one-out backtest MAPE (port of weights.js backtest);
    returns Infinity if unable to backtest.
    """
    n = len(series)
    if n < min_len + 1:
        return math.inf
    sum_ape = 0.0
    count = 0
    for i in range(min_len, n):
        prefix = series[:i]
        try:
            preds = predict_fn(prefix, 1)
            pred = preds[0] if preds else None
        except Exception:
            pred = None
        if pred is None or not math.isfinite(pred):
            continue
        actual = series[i]
        if actual == 0 or not math.isfinite(actual):
            continue
        ape = abs(actual - pred) / abs(actual)
        if not math.isfinite(ape):
            continue
        sum_ape += ape
        count += 1
    if count == 0:
        return math.inf
    return sum_ape / count


def _compute_weights(predict_fns, series: List[float], mode: str) -> List[float]:
    """根据 weight_mode 计算各预测器权重（和为 1）

    Compute per-predictor weights (sum to 1) according to weight_mode.
      - uniform: 均匀 1/N（仅可产出预测的方法参与）
      - backtest: 反 MAPE 归一化（参考 weights.js computeWeights）
    """
    n = len(predict_fns)
    if n == 0:
        return []

    def can_predict(fn):
        try:
            preds = fn(series, 1)
            return bool(preds) and all(math.isfinite(p) for p in preds)
        except Exception:
            return False

    if mode == "uniform":
        raw = [1.0 if can_predict(fn) else 0.0 for fn in predict_fns]
    else:  # backtest
        epsilon = 1e-10
        raw = []
        for fn in predict_fns:
            mape = _backtest_mape(fn, series, min_len=2)
            ok = math.isfinite(mape) and can_predict(fn)
            raw.append(1.0 / (mape + epsilon) if ok else 0.0)

    total = sum(raw)
    if total == 0:
        # 优雅降级为均匀权重 / graceful degradation to uniform
        return [1.0 / n] * n
    return [r / total for r in raw]


@mcp.tool()
def predict_sequence(series: List[float], count: int = 1, weight_mode: str = "backtest") -> dict:
    """预测数字序列的后续值 / Predict subsequent values of a numeric series

    使用 4 种基础方法（平均值、线性回归、差分、移动平均）并按权重融合。
    Simplified predictor with 4 basic methods (mean, linear, diff, moving_avg)
    combined via weighted ensemble.

    Args:
        series: 数字序列，如 [1, 2, 3, 5, 8, 13]
            / Numeric series, e.g. [1, 2, 3, 5, 8, 13]
        count: 预测数量（1-50，默认 1）
            / Number of predictions (1-50, default 1)
        weight_mode: 权重模式，"backtest"（回测权重，默认）或 "uniform"（均匀权重）
            / Weight mode, "backtest" (default) or "uniform"

    Returns:
        dict: {
            "ensemble": list[float],   # 融合预测结果 / ensemble predictions
            "methods": list[{"name": str, "value": list[float], "weight": float}]
        }
        出错时返回 {"error": "<原因>"} / On error returns {"error": "<reason>"}
    """
    if not series:
        return {"error": "序列不能为空"}
    # 数值校验 / numeric validation
    cleaned_series = []
    for v in series:
        try:
            fv = float(v)
        except (TypeError, ValueError):
            return {"error": f"序列包含非数值：{v}"}
        if not math.isfinite(fv):
            return {"error": f"序列包含非有限值：{v}"}
        cleaned_series.append(fv)

    try:
        count = int(count)
    except (TypeError, ValueError):
        count = 1
    count = max(1, min(50, count))

    mode = "uniform" if (isinstance(weight_mode, str) and weight_mode.lower() == "uniform") else "backtest"

    weights = _compute_weights([p["fn"] for p in PREDICTORS], cleaned_series, mode)

    results = []
    for p, w in zip(PREDICTORS, weights):
        try:
            pred = p["fn"](cleaned_series, count)
        except Exception:
            pred = []
        results.append({"name": p["name"], "value": pred, "weight": w})

    # 加权融合（参考 weights.js ensemblePredict）/ weighted ensemble
    ensemble = []
    for i in range(count):
        weighted_sum = 0.0
        weight_sum = 0.0
        for r in results:
            if (i < len(r["value"])
                    and isinstance(r["value"][i], (int, float))
                    and math.isfinite(r["value"][i])):
                weighted_sum += r["value"][i] * r["weight"]
                weight_sum += r["weight"]
        if weight_sum > 0:
            ensemble.append(weighted_sum / weight_sum)
        else:
            ensemble.append(None)

    return {"ensemble": ensemble, "methods": results}


@mcp.tool()
def list_predictors() -> list:
    """列出所有可用的预测方法 / List available prediction methods

    Returns:
        list: 预测方法列表 [{"name": str, "description": str}]
            / List of methods with name and description
    """
    return [{"name": p["name"], "description": p["desc"]} for p in PREDICTORS]


if __name__ == "__main__":
    mcp.run()
