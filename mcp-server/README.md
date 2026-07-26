# Pixel Tools MCP Server

把 pixel-tools 网站的计算器和预测器封装为 MCP tools，可供 TRAE、Claude 等 MCP 客户端直接调用。

- 传输：stdio（标准输入输出）
- 框架：[FastMCP](https://github.com/modelcontextprotocol/python-sdk) (`from mcp.server.fastmcp import FastMCP`)
- Python：3.10+

## 安装

```bash
cd mcp-server
pip install -r requirements.txt
```

## 运行

```bash
python server.py
```

服务以 stdio 传输方式运行，需要 MCP 客户端通过子进程方式启动（不会主动监听端口）。

## 在 TRAE / Claude 中配置

在 MCP 客户端配置文件中添加（注意 `args` 里要用 `server.py` 的绝对路径）：

```json
{
  "mcpServers": {
    "pixel-tools": {
      "command": "python",
      "args": ["/absolute/path/to/mcp-server/server.py"]
    }
  }
}
```

## 暴露的 Tools

### calculate

计算数学表达式（白名单 + 受限 `eval`，仅暴露 `math` 模块与三角函数包装）。

支持四则运算、括号、`sqrt` / `sin` / `cos` / `tan` 函数；支持 `× ÷ −` 显示符号；大数自动展开（无科学计数法）。

参数：
- `expression` (str)：数学表达式，如 `1+2*3`、`sqrt(9)`、`sin(30)`
- `angle_mode` (str, 可选)：角度模式，`"RAD"`（弧度，默认）或 `"DEG"`（角度）

返回：计算结果字符串；出错时返回 `错误：<原因>`。

示例：
- `calculate("1+2*3")` → `"7"`
- `calculate("sqrt(9)")` → `"3"`
- `calculate("sin(30)", "DEG")` → `"0.5"`（特殊角度查表得精确值）
- `calculate("sin(30)", "RAD")` → `"-0.9880316240928618"`（30 弧度的 sin）
- `calculate("tan(90)", "DEG")` → `"Infinity"`

### predict_sequence

预测数字序列的后续值（简化版，4 种基础方法：平均值、线性回归、差分、移动平均），按权重融合。

参数：
- `series` (list[float])：数字序列，如 `[1, 2, 3, 5, 8, 13]`
- `count` (int, 可选)：预测数量，1-50，默认 1
- `weight_mode` (str, 可选)：权重模式
  - `"backtest"`（默认）：留一回测 MAPE 反归一化权重（参考 `js/weights.js`）
  - `"uniform"`：均匀权重

返回：

```json
{
  "ensemble": [21.0],
  "methods": [
    {"name": "mean",       "value": [8.666666666666666], "weight": 0.05},
    {"name": "linear",     "value": [13.335],            "weight": 0.40},
    {"name": "diff",       "value": [18.0],              "weight": 0.50},
    {"name": "moving_avg", "value": [11.333333333333334],"weight": 0.05}
  ]
}
```

> 权重数值会随序列与 `weight_mode` 变化，以上仅为示例。序列为空或含非有限值时返回 `{"error": "<原因>"}`。

### list_predictors

列出所有可用的预测方法。

参数：无

返回：`[{"name": "mean", "description": "平均值预测：..."}, ...]`

## 安全说明

- 表达式求值使用受限 `eval`，全局命名空间 `__builtins__` 为空，仅暴露 `math` 模块与三角函数包装 `__sin` / `__cos` / `__tan`。
- 输入字符白名单：数字、`+ - * / ( ) .` 空白、函数名 `sqrt` / `sin` / `cos` / `tan`，其余字符直接拒绝。
- 三角函数 DEG 模式经 `x * π / 180`（等价 `math.radians`）转换为弧度，并内置特殊角度精确值查表（0/30/45/60/90/120/135/150/180/270/360 度）。
- 三角函数用包装器注入 `eval` 局部作用域，自然支持嵌套调用（如 `sin(cos(tan(30)))`），无需正则替换补括号。

## 实现说明

- 计算器逻辑复用自 `js/app.js` 的 `calculateExpr` / `trigEval` / `formatCalcResult` / `expandScientific`。
- 预测器是简化版（4 种基础方法），未实现 `js/predictors.js` 的全部 40 种方法。
- 权重计算（backtest 模式）参考 `js/weights.js` 的 `backtest` / `computeWeights` / `ensemblePredict`。
