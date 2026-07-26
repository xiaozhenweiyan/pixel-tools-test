# Tasks

- [x] Task 1: 修复函数系统参数面板无参数时的 UX（app.js + index.html + pixel.css）
  - [x] SubTask 1.1: 修改 `app.js` 的 `renderParamSliders()`，当 `getActiveParamNames()` 返回空数组时，不再完全隐藏 `param-panel`，而是显示提示文本（.param-empty-hint）和"添加参数"按钮（.param-add-btn）
  - [x] SubTask 1.2: `index.html` 的 `param-panel` 内新增（或由 JS 动态创建）`.param-empty-hint` 提示文本容器和 `.param-add-btn` 按钮
  - [x] SubTask 1.3: `pixel.css` 新增 `.param-empty-hint` 样式（淡灰色文本、居中、padding）和 `.param-add-btn` 样式（像素风按钮）
  - [x] SubTask 1.4: 验证输入 `y=x^2` 时参数面板显示提示文本和按钮，而非隐藏

- [x] Task 2: 实现手动添加自定义参数功能（app.js + function-plotter.js）
  - [x] SubTask 2.1: `app.js` 新增 `addCustomParam()` 函数：弹出输入框（用 `prompt()` 或自定义弹窗），获取参数名
  - [x] SubTask 2.2: 校验参数名：非空、单字符（或允许多字符）、不与保留字（x, pi, e）冲突、不与已有参数重复
  - [x] SubTask 2.3: 将新参数添加到 `customParams` 数组（持久化到 `functionPlotterInstance.customParams`），默认值 1、min -10、max 10、step 0.1
  - [x] SubTask 2.4: 修改 `getActiveParamNames()` 合并 `getAllParams()` 返回值和 `customParams`，去重排序
  - [x] SubTask 2.5: 修改 `applyParamsToActive()` 和函数求值逻辑，将 `customParams` 注入求值上下文（即使表达式中未使用也不报错）
  - [x] SubTask 2.6: 绑定 `.param-add-btn` 点击事件 → `addCustomParam()`
  - [x] SubTask 2.7: 验证输入 `y=x^2` 后点击"添加参数"→ 输入 `k` → 出现 `k` 滑动条；再输入 `y=k*x+1` → 拖动 `k` 滑动条图像实时变化

- [x] Task 3: 排查并修复参数识别潜在 bug（expression-parser.js + function-plotter.js + app.js）
  - [x] SubTask 3.1: 检查 `extractParams()` 是否正确处理 `y=a*x^2`（`a` 应识别为 PARAM，不是 CONSTANT）
  - [x] SubTask 3.2: 检查 `addFunction()` 调用链：`addFunction()` → `redraw()` → `renderFunctionList()` → `renderParamSliders()`，确认 `renderParamSliders()` 被调用
  - [x] SubTask 3.3: 检查 `expression-parser.js` 的 `splitIdentifier()` 对多字符标识符（如 `abc`）的处理，确认是否需要支持多字符参数名
  - [x] SubTask 3.4: 检查 3D 模式下参数面板是否正常工作（`window.Function3D.getParams()`）
  - [x] SubTask 3.5: 验证输入 `y=a*x^2+b*x+c` 后参数面板立即显示 a, b, c 三个滑动条

- [x] Task 4: 重构 function-plotter.js 的 drawGrid 使用 nice unit（function-plotter.js）
  - [x] SubTask 4.1: 修改 `drawGrid()`，主网格线步长从固定 1 改为 `this.getUnitLength()`
  - [x] SubTask 4.2: 新增次网格线绘制：按 `niceUnit / 5` 步长绘制更淡的网格线
  - [x] SubTask 4.3: 确保网格线范围覆盖整个 canvas 但不超出可视区域（基于 `toMathX(0)` 和 `toMathX(w)`）
  - [x] SubTask 4.4: 验证 scale=10（缩小）时网格线不密集，scale=200（放大）时网格线不稀疏

- [x] Task 5: 重构 function-plotter.js 的 drawAxes 刻度数字使用 nice unit（function-plotter.js）
  - [x] SubTask 5.1: 修改 `drawAxes()` 中刻度数字循环步长，从固定 1 改为 `this.getUnitLength()`
  - [x] SubTask 5.2: 新增 `formatTickNumber(value)` 函数：整数显示原值，小数显示 1-3 位，过大/过小用科学计数法
  - [x] SubTask 5.3: 增加防重叠检查：相邻刻度数字像素间距 < 30px 时跳过后者
  - [x] SubTask 5.4: 确保刻度数字与主网格线位置完全对齐
  - [x] SubTask 5.5: 验证 scale=10 时刻度数字显示 -100, -90, ..., 100（间距 10）；scale=200 时显示 -0.2, -0.1, 0, 0.1, 0.2（间距 0.1）

- [x] Task 6: 扩展 getUnitLength 的 magnitudes 列表并应用到网格和刻度（function-plotter.js）
  - [x] SubTask 6.1: 扩展 `getUnitLength()` 的 magnitudes 列表至 [1e-9, 1e9] 全范围（包含 1-2-5 序列的所有量级）
  - [x] SubTask 6.2: 确认 `getUnitLength()` 返回值被 `drawGrid()` 和 `drawAxes()` 使用（而非仅 `drawUnitLength()` 指示条）
  - [x] SubTask 6.3: 更新 `drawUnitLength()` 指示条标签文本，显示当前 nice unit（如 "1 unit = 50px" 或 "0.5 unit = 25px"）
  - [x] SubTask 6.4: 验证极端缩放（scale=1e6 和 scale=1e-6）时 nice unit 正确选择

- [x] Task 7: 取消 function-plotter.js 的 scale 钳制，支持无限缩放（function-plotter.js）
  - [x] SubTask 7.1: 修改 wheel 事件（约第 432 行）的 `Math.max(10, Math.min(200, ...))` 为 `Math.max(1e-9, Math.min(1e9, ...))`
  - [x] SubTask 7.2: 修改 touchmove 事件（约第 488 行）同步
  - [x] SubTask 7.3: 修改 `zoomByButton`（约第 538 行）同步
  - [x] SubTask 7.4: 验证持续点击 + 按钮可放大到 scale=1e6，持续点击 − 按钮可缩小到 scale=1e-6
  - [x] SubTask 7.5: 验证极端缩放时刻度数字用科学计数法显示，坐标系不崩溃

- [x] Task 8: 重构 chart.js 的 drawLineChartGrid 和 drawLineChartTicks 使用 nice unit（chart.js）
  - [x] SubTask 8.1: 提取 `drawLineChartUnitLength` 中的 `findBestUnit` 逻辑为独立函数 `findNiceUnit(rawUnits)`
  - [x] SubTask 8.2: 修改 `drawLineChartGrid()`，X 轴步长从 `Math.round((L.xMax - L.xMin) / 6)` 改为 `findNiceUnit(targetPixels / xScale)`
  - [x] SubTask 8.3: 修改 `drawLineChartTicks()`，X 轴刻度数字步长同步使用 nice unit
  - [x] SubTask 8.4: 新增 Y 轴网格线和刻度数字的自适应 nice unit 逻辑（如果当前 Y 轴是固定步长）
  - [x] SubTask 8.5: 应用 `formatTickNumber()`（与 function-plotter.js 共享或独立实现）格式化刻度数字
  - [x] SubTask 8.6: 扩展 magnitudes 列表至 [1e-9, 1e9]
  - [x] SubTask 8.7: 验证预测系统折线图缩放时刻度数字不密集重叠

- [x] Task 9: 放宽 chart.js 的视口范围钳制，支持无限缩放（chart.js）
  - [x] SubTask 9.1: 修改 `zoomLineChart()`（约第 984 行）的 `Math.max(3, Math.min(totalX, newRange))` 为 `Math.max(1e-6, Math.min(1e9, newRange))`
  - [x] SubTask 9.2: 检查其他涉及视口范围钳制的代码（如 panLineChart），同步放宽
  - [x] SubTask 9.3: 验证缩放到数据范围外时显示空白区域（不崩溃），缩放到极小范围时刻度数字用科学计数法

- [ ] Task 10: 端到端验证
  - [ ] SubTask 10.1: 验证函数系统：输入 `y=a*x^2+b*x+c` 显示 a, b, c 滑动条；调节 min/max/step 生效；播放动画按钮工作
  - [ ] SubTask 10.2: 验证函数系统：输入 `y=x^2` 显示提示文本和"添加参数"按钮；手动添加参数 `k` 后滑动条出现
  - [ ] SubTask 10.3: 验证函数系统坐标系：缩小时刻度间距变大（数字不密集），放大时刻度间距变小
  - [ ] SubTask 10.4: 验证函数系统坐标系：极端缩放（1e6 / 1e-6）时刻度数字用科学计数法，坐标系不崩溃
  - [ ] SubTask 10.5: 验证预测系统折线图：缩放时刻度数字不密集重叠，X 轴和 Y 轴均自适应 nice unit
  - [ ] SubTask 10.6: 验证所有改动不影响其他功能（计算器、像素艺术、学习卡片等）

# Task Dependencies

- [Task 1] 独立（修改参数面板 UX）
- [Task 2] depends on [Task 1]（"添加参数"按钮在提示文本中）
- [Task 3] 独立（排查 bug，可与 Task 1-2 并行）
- [Task 4] 独立（重构 drawGrid）
- [Task 5] depends on [Task 4]（drawAxes 与 drawGrid 使用同一 nice unit）
- [Task 6] depends on [Task 4, Task 5]（getUnitLength 被两者使用）
- [Task 7] depends on [Task 6]（无限缩放需要扩大的 magnitudes 支持）
- [Task 8] 独立（重构 chart.js，可与 Task 4-7 并行）
- [Task 9] depends on [Task 8]（无限缩放需要扩大的 magnitudes 支持）
- [Task 10] depends on all
