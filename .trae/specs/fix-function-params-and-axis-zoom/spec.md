# 函数系统参数增强 + 坐标系无限缩放 Spec

## Why

用户报告两个问题：
1. **函数系统的参数功能"还是"无法使用**：不能自动识别参数、不能自动添加滑动条、不能调节最大最小值、不能修改步长、不能开始/关闭动画。经调研，这些功能其实**代码层面都已实现**（`expression-parser.js` 的 `extractParams`、`function-plotter.js` 的 `getAllParams`、`app.js` 的 `renderParamSliders`、`param-settings-panel`、`toggleAnimation` 均存在且事件绑定正确）。问题可能在于：(a) 用户输入了无参数表达式（如 `y=x^2`），导致 `getAllParams()` 返回空数组，参数面板按设计保持隐藏；(b) 某些边界情况下参数识别失败；(c) 用户没有手动添加参数的入口。需要增强 UX：当无参数时给出明确提示，并允许用户手动添加自定义参数。
2. **坐标系缩放行为不符合专业软件标准**：`function-plotter.js` 中 `drawGrid()` 和 `drawAxes()` 的网格线和刻度数字**固定按整数步长 1 绘制**，与缩放级别无关。缩小时（scale 变小）数字会密集重叠；放大时（scale 变大）数字会过于稀疏。虽然 `getUnitLength()` 算出了 nice unit（1-2-5 序列），但**仅用于右下角指示条标签，未被应用到网格和刻度间距**。同时 `scale` 被钳制在 `[10, 200]`，无法无限放大/缩小。需要像 Desmos / GeoGebra 那样：缩放时刻度间距自适应，目标刻度间距约 60-100 像素，并支持无限缩放。`chart.js` 中预测系统折线图也有类似问题（虽然已实现自适应 xStep，但未用 1-2-5 nice unit，且范围也受钳制）。

## What Changes

### 函数系统参数增强
- **无参数时显示提示**：当用户输入的函数表达式不含参数（如 `y=x^2`）时，参数面板不再完全隐藏，而是显示一行提示文本："当前函数无参数。输入含参数的表达式（如 `y=a*x^2+b`）可启用参数滑动条，或点击下方按钮手动添加参数。"
- **手动添加自定义参数**：参数面板新增"添加参数"按钮，点击后弹出一个输入框，用户可输入参数名（如 `k`、`m`、`t`），系统将该参数添加到参数列表，自动创建滑动条（默认范围 -10~10、步长 0.1），并将该参数注入到所有函数的求值上下文中（即使表达式中未使用，也不会报错）。
- **修复潜在 bug**：重新检查 `addFunction()` → `renderParamSliders()` 的调用链，确保添加含参数函数后参数面板**立即显示**并正确渲染所有滑动条；检查 `extractParams()` 是否正确处理多字符参数名（当前仅支持单字符 a-z 除 x，需确认是否够用）；检查表达式 `y=a*x^2` 中的 `a` 是否被正确识别为 PARAM 而非 CONSTANT。
- **隐藏的 3D 模式参数面板**：检查 3D 模式下参数面板是否正常工作（当前 3D 模式走 `window.Function3D.getParams()`，需确认逻辑一致）。

### 坐标系自适应刻度（function-plotter.js）
- **重构 `drawGrid()`**：网格线步长从固定 1 改为使用 `getUnitLength()` 返回的 nice unit。绘制主网格线（按 nice unit 步长）和次网格线（按 nice unit / 5 步长，更淡的颜色）。
- **重构 `drawAxes()` 中的刻度数字**：刻度数字步长从固定 1 改为使用 `getUnitLength()` 返回的 nice unit。数字格式化：整数显示原值，小数显示 1-3 位小数，过大/过小的数用科学计数法（如 `1e4`、`1e-3`）。
- **扩展 `getUnitLength()` 的 magnitudes 列表**：从 `[0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]` 扩展到 `[1e-9, 5e-9, 1e-8, 5e-8, 1e-7, 5e-7, 1e-6, 5e-6, 1e-5, 5e-5, 1e-4, 5e-4, 1e-3, 2e-3, 5e-3, 1e-2, 2e-2, 5e-2, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 5e5, 1e6, 5e6, 1e7]`，支持无限缩放。
- **取消 `scale` 钳制**：将 `Math.max(10, Math.min(200, ...))` 改为 `Math.max(1e-9, Math.min(1e9, ...))`，三处（wheel 事件第 432 行、touchmove 第 488 行、zoomByButton 第 538 行）同步修改。
- **刻度数字防重叠**：在 `drawAxes()` 中增加间距检查，如果两个相邻刻度数字的像素间距小于某个阈值（如 30px），则跳过后者。作为 `getUnitLength()` 自适应的兜底保障。
- **缩放时刻度数字对齐**：确保缩放时刻度数字始终对齐网格线（两者使用同一个 nice unit）。

### 坐标系自适应刻度（chart.js 预测系统折线图）
- **重构 `drawLineChartGrid()` 和 `drawLineChartTicks()`**：将现有的 `xStep = Math.max(1, Math.round((L.xMax - L.xMin) / 6))` 替换为基于 1-2-5 nice unit 的步长计算（复用 `drawLineChartUnitLength` 中的 `findBestUnit` 逻辑）。
- **扩展 magnitudes 列表**：同 function-plotter.js，支持大范围缩放。
- **放宽视口范围钳制**：将 `Math.max(3, Math.min(totalX, newRange))` 改为 `Math.max(0.001, Math.min(1e9, newRange))`，允许无限缩放（不再受数据点总数限制，缩放到数据范围外时显示空白区域）。
- **Y 轴也使用 nice unit**：当前 Y 轴刻度可能也固定步长，需同步改为自适应 nice unit。
- **数字格式化**：同 function-plotter.js，过大/过小的数用科学计数法。

### 单位长度指示条
- **function-plotter.js `drawUnitLength()`**：保留右下角的单位长度指示条，但标签文本改为显示当前 nice unit（如 "1 unit = 50px" 或 "0.5 unit = 25px"）。
- **chart.js `drawLineChartUnitLength()`**：同上。

## Impact

- **Affected code**：
  - `js/function-plotter.js`：重构 `drawGrid()`、`drawAxes()`、`getUnitLength()`、`drawUnitLength()`；取消 `scale` 钳制；新增 `formatTickNumber()` 数字格式化函数。
  - `js/chart.js`：重构 `drawLineChartGrid()`、`drawLineChartTicks()`；扩展 `magnitudes` 列表；放宽视口钳制；Y 轴自适应 nice unit。
  - `js/app.js`：修改 `renderParamSliders()` 在无参数时显示提示文本和"添加参数"按钮；新增 `addCustomParam()` 函数；检查 `addFunction()` → `renderParamSliders()` 调用链；3D 模式参数面板检查。
  - `js/expression-parser.js`：检查 `extractParams()` 是否正确处理边界情况（如表达式 `y=a*x^2` 中 `a` 的识别）；可能需要支持多字符参数名（可选增强）。
  - `js/function-3d.js`：检查 3D 模式参数识别逻辑（如已实现则不动）。
  - `index.html`：在 `param-panel` 内新增"添加参数"按钮和提示文本容器（或纯 JS 动态创建）。
  - `styles/pixel.css`：新增 `.param-empty-hint`（无参数提示样式）、`.param-add-btn`（添加参数按钮样式）、`.param-add-dialog`（参数名输入弹窗样式）。
- **不影响**：预测算法、神经网络、像素艺术、物理沙盒、像素时钟、像素 RPG 等其他工具。
- **不影响**：函数系统的表达式解析、求值、绘图核心逻辑（只改刻度间距和缩放范围）。
- **不影响**：参数滑动条的现有交互（拖动、设置 min/max/step、动画播放/停止）。

## ADDED Requirements

### Requirement: 无参数时显示提示文本
系统 SHALL 在参数面板中，当当前所有函数均不含参数时，显示一行提示文本，告知用户如何使用参数功能，并提供"添加参数"按钮入口。

#### Scenario: 输入无参数表达式
- **WHEN** 用户输入 `y=x^2` 并添加
- **THEN** 参数面板可见（不再隐藏）
- **AND** 显示提示文本："当前函数无参数。输入含参数的表达式（如 y=a*x^2+b）可启用参数滑动条，或点击'添加参数'按钮手动添加。"
- **AND** 显示"添加参数"按钮

#### Scenario: 输入含参数表达式
- **WHEN** 用户输入 `y=a*x^2+b` 并添加
- **THEN** 参数面板显示参数 `a` 和 `b` 的滑动条
- **AND** 不显示提示文本和"添加参数"按钮（或"添加参数"按钮仍显示，允许追加更多参数）

### Requirement: 手动添加自定义参数
系统 SHALL 允许用户通过"添加参数"按钮手动添加任意名称的参数（单个或多个字母），该参数会被注入到所有函数的求值上下文中。

#### Scenario: 手动添加参数
- **WHEN** 用户点击"添加参数"按钮
- **THEN** 弹出输入框，提示"请输入参数名（如 k, m, t）"
- **WHEN** 用户输入 `k` 并确认
- **THEN** 参数列表新增 `k` 滑动条（默认 min=-10, max=10, step=0.1, value=1）
- **AND** `k` 被注入到所有函数的求值上下文（即使表达式中未使用 `k`，也不报错）
- **AND** 如果表达式中使用了 `k`（如 `y=k*x`），拖动滑动条实时更新图像

#### Scenario: 参数名冲突
- **WHEN** 用户尝试添加已存在的参数名（如 `a` 已存在）
- **THEN** 显示错误提示"参数 a 已存在"
- **AND** 不重复添加

#### Scenario: 非法参数名
- **WHEN** 用户输入 `x` 或 `pi` 或 `e`（保留字）
- **THEN** 显示错误提示"x / pi / e 是保留字，不能作为参数名"

### Requirement: 自适应刻度间距（function-plotter.js）
系统 SHALL 在函数系统坐标系中，根据当前缩放级别自动选择合适的刻度间距（nice unit），使刻度数字在视觉上保持约 60-100 像素间距，不密集重叠也不过于稀疏。

#### Scenario: 缩小时刻度间距变大
- **WHEN** 用户缩小坐标系（scale 从 40 变为 10）
- **THEN** 刻度间距从 1 变为 10（或更大的 nice unit）
- **AND** 刻度数字显示 -100, -90, -80, ..., 90, 100（而非 -80, -79, -78, ..., 79, 80）
- **AND** 刻度数字不重叠

#### Scenario: 放大时刻度间距变小
- **WHEN** 用户放大坐标系（scale 从 40 变为 200）
- **THEN** 刻度间距从 1 变为 0.1（或更小的 nice unit）
- **AND** 刻度数字显示 -2.0, -1.9, -1.8, ..., 1.9, 2.0（而非 -2, -1, 0, 1, 2）

#### Scenario: 极端缩放
- **WHEN** 用户极端放大（scale = 1e6）
- **THEN** 刻度间距变为 1e-6 或更小
- **AND** 刻度数字用科学计数法显示（如 1e-6, 2e-6, 3e-6）
- **WHEN** 用户极端缩小（scale = 1e-6）
- **THEN** 刻度间距变为 1e6 或更大
- **AND** 刻度数字用科学计数法显示（如 1e6, 2e6, 3e6）

#### Scenario: 网格线对齐刻度
- **WHEN** 任何缩放级别
- **THEN** 主网格线与刻度数字位置完全对齐
- **AND** 次网格线（更淡）按 nice unit / 5 步长绘制

### Requirement: 无限缩放（function-plotter.js）
系统 SHALL 允许用户无限放大和缩小坐标系，scale 范围至少为 [1e-9, 1e9]。

#### Scenario: 无限放大
- **WHEN** 用户持续点击 + 按钮或向上滚动滚轮
- **THEN** scale 持续增大，无上限（或上限为 1e9）
- **AND** 刻度间距相应变小
- **AND** 坐标系不崩溃

#### Scenario: 无限缩小
- **WHEN** 用户持续点击 − 按钮或向下滚动滚轮
- **THEN** scale 持续减小，无下限（或下限为 1e-9）
- **AND** 刻度间距相应变大
- **AND** 坐标系不崩溃

### Requirement: 自适应刻度间距（chart.js 预测系统折线图）
系统 SHALL 在预测系统折线图中，X 轴和 Y 轴均使用 1-2-5 nice unit 自适应刻度间距，缩放时刻度数字不密集重叠。

#### Scenario: X 轴缩放
- **WHEN** 用户缩小折线图（视口范围变大）
- **THEN** X 轴刻度间距按 1-2-5 序列增大（如从 1 变为 5、10、50、100...）
- **AND** 刻度数字不重叠

#### Scenario: Y 轴自适应
- **WHEN** 数据 Y 值范围很大（如 0 ~ 1000000）
- **THEN** Y 轴刻度间距按 1-2-5 序列选择（如 200000）
- **AND** 刻度数字用科学计数法或 K/M 缩写显示

### Requirement: 刻度数字格式化
系统 SHALL 对刻度数字进行格式化显示：整数显示原值，小数显示 1-3 位小数，过大（≥10000）或过小（<0.001）的数用科学计数法显示。

#### Scenario: 整数
- **WHEN** 刻度值为 5
- **THEN** 显示 "5"

#### Scenario: 小数
- **WHEN** 刻度值为 0.1
- **THEN** 显示 "0.1"
- **WHEN** 刻度值为 0.25
- **THEN** 显示 "0.25"

#### Scenario: 大数
- **WHEN** 刻度值为 10000
- **THEN** 显示 "1e4" 或 "10000"（取决于间距，优先科学计数法）

#### Scenario: 极小数
- **WHEN** 刻度值为 0.0001
- **THEN** 显示 "1e-4"

## MODIFIED Requirements

### Requirement: drawGrid（function-plotter.js）
`drawGrid()` SHALL 使用 `getUnitLength()` 返回的 nice unit 作为主网格线步长，并绘制次网格线（nice unit / 5 步长，更淡颜色）。网格线范围覆盖整个 canvas，但不超出可视区域。

### Requirement: drawAxes（function-plotter.js）
`drawAxes()` 中的刻度数字 SHALL 使用 `getUnitLength()` 返回的 nice unit 作为步长，并应用 `formatTickNumber()` 格式化。同时增加防重叠检查：相邻刻度数字像素间距 < 30px 时跳过后者。

### Requirement: getUnitLength（function-plotter.js）
`getUnitLength()` SHALL 扩展 magnitudes 列表至 [1e-9, 1e9] 全范围，确保任何缩放级别都能找到合适的 nice unit。返回值应用于网格线和刻度数字（而非仅指示条标签）。

### Requirement: drawLineChartGrid / drawLineChartTicks（chart.js）
`drawLineChartGrid()` 和 `drawLineChartTicks()` SHALL 使用 1-2-5 nice unit 作为步长（替换现有的 `Math.round((L.xMax - L.xMin) / 6)` 逻辑），Y 轴同步改造。magnitudes 列表扩展至 [1e-9, 1e9]。

### Requirement: zoomLineChart（chart.js）
`zoomLineChart()` SHALL 放宽视口范围钳制，从 `Math.max(3, Math.min(totalX, newRange))` 改为 `Math.max(1e-6, Math.min(1e9, newRange))`，允许无限缩放。

### Requirement: renderParamSliders（app.js）
`renderParamSliders()` SHALL 在无参数时显示提示文本和"添加参数"按钮，而非完全隐藏参数面板。

## REMOVED Requirements

（无）
