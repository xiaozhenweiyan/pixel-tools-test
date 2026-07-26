# 修复 +/- 缩放按钮（乘法缩放）+ SW 缓存强刷 Spec

## Why

上一轮 spec `fix-function-params-and-axis-zoom` 的代码已全部落地（drawGrid/drawAxes 使用 niceUnit、scale 钳制放宽到 [1e-9, 1e9]、参数面板 UX 改造、customParams 手动添加等均已在 `function-plotter.js` / `app.js` / `chart.js` 中实现），但用户反馈"还是无法无限放大缩小、坐标轴数字密集"。复核代码后发现一个**真实的代码 bug** 和一个**缓存问题**：

1. **`zoomByButton(delta)` 使用加法 `this.scale + delta`（致命 bug）**：
   - `app.js` 调用 `zoomByButton(10)`（放大）和 `zoomByButton(-10)`（缩小）。
   - **缩小方向**：从默认 `scale=40` 开始，点击 − 按钮：40 → 30 → 20 → 10 → 0 → 被钳制为 `1e-9`。**仅需 4 次点击整个坐标系就完全消失**。用户感觉"缩小就崩溃了"。
   - **放大方向**：当 `scale` 增大到 1000 时，`+10` 仅 1% 增量，肉眼几乎看不见变化；到 `scale=1e6` 时 `+10` 是 0.001% 变化，完全无效。用户感觉"放大也没用"。
   - 这与 Desmos/GeoGebra 等专业软件的**乘法缩放**（每次缩放 ×1.2 或 ÷1.2）行为完全不同，是用户认为"无限缩放不工作"的根本原因。
   - 注意：滚轮和触摸捏合事件已经使用乘法 `scale * factor`，只有 +/- 按钮是加法。所以滚轮缩放正常，按钮缩放异常。

2. **Service Worker 缓存版本仍是 v13**：上轮 spec 改了 SW 策略但版本号未再升级。用户浏览器可能仍持有 v13 之前的旧 SW（v12 及更早使用 SWR），未触达新代码。升级到 v14 + 强制 `skipWaiting` + `clients.claim` + `SW_UPDATED` 消息（均已存在）后，下次访问会自动获取最新代码。

3. **其他 spec 项已正确实现**（无需重做）：
   - 参数自动识别：`extractParams(ast)` 正确遍历 AST 收集 `Param` 节点，输入 `y=a*x^2+b` 会自动出现 a、b 滑动条（验证通过）。
   - 无参数时显示提示文本 + "添加参数"按钮：`renderParamSliders` 已实现，`param-empty-hint` / `param-add-btn` 元素已在 `index.html` 中存在。
   - 手动添加自定义参数：`addCustomParam` 校验链完整，`customParams` 注入 `applyParamsToActive` 求值上下文。
   - min/max/step 调节：`param-settings-panel` 含三个 number input + 应用按钮，校验逻辑完整。
   - 动画播放/暂停：`toggleAnimation` / `startAnimation` / `stopAnimation` + 播放按钮 SVG 切换完整。
   - function-plotter.js 坐标系：`drawGrid` / `drawAxes` 使用 `getUnitLength()` 返回的 1-2-5 niceUnit；`formatTickNumber` 处理整数/小数/科学计数法；30px 防重叠；scale 钳制 [1e-9, 1e9]。
   - chart.js 预测系统：`findNiceUnit` / `formatTickNumber` / `drawLineChartGrid` / `drawLineChartTicks` 均使用 1-2-5 序列；`zoomLineChart` 钳制 [1e-6, 1e9]；`panLineChart` 移除视口钳制。

## What Changes

### 修复 +/- 按钮缩放为乘法
- **`js/function-plotter.js`** 的 `zoomByButton(factor)`：把 `this.scale = Math.max(1e-9, Math.min(1e9, this.scale + delta))` 改为 `this.scale = Math.max(1e-9, Math.min(1e9, this.scale * factor))`。参数语义从"像素 delta"改为"乘数因子"。
- **`js/app.js`** 中 +/- 按钮的事件处理器：
  - `btn-function-zoom-in` 的 click 处理器：`zoomByButton(10)` → `zoomByButton(1.2)`
  - `btn-function-zoom-out` 的 click 处理器：`zoomByButton(-10)` → `zoomByButton(1 / 1.2)`
  - 选择 1.2 因子的理由：与滚轮事件的 1.1 因子接近但略大，按钮单击需要更明显的缩放效果；与 chart.js 的 0.7/1.4 因子也接近。

### 升级 Service Worker 缓存版本
- **`service-worker.js`** 的 `CACHE_VERSION` 从 `'v13'` 改为 `'v14'`。其他逻辑（Network-First、skipWaiting、clients.claim、SW_UPDATED 通知）保持不变。

## Impact

- **Affected code**：
  - `js/function-plotter.js`：`zoomByButton` 方法（约第 601-611 行），1 行核心改动。
  - `js/app.js`：`btn-function-zoom-in` / `btn-function-zoom-out` 事件处理器（约第 4195-4200 行），2 行改动。
  - `service-worker.js`：`CACHE_VERSION` 常量（第 13 行），1 行改动。
- **不影响**：滚轮缩放、触摸捏合缩放、坐标系刻度自适应、参数识别、参数面板 UX、动画、3D 模式、chart.js 预测系统等已正确实现的部分。
- **不影响**：其他工具（计算器、像素艺术、神经网络等）。

## ADDED Requirements

### Requirement: +/- 缩放按钮使用乘法缩放
系统 SHALL 让函数系统的 +/- 缩放按钮使用乘法缩放（每次 ×1.2 或 ÷1.2），与滚轮缩放行为一致，确保在任何缩放级别下都能可见地放大或缩小。

#### Scenario: 缩小不崩溃
- **WHEN** 用户从默认 scale=40 连续点击 − 按钮 10 次
- **THEN** scale 依次变为 40 → 33.3 → 27.8 → 23.1 → 19.3 → 16.1 → 13.4 → 11.2 → 9.3 → 7.7 → 6.4
- **AND** 坐标系始终可见，刻度间距按 1-2-5 序列自适应增大
- **AND** 不会出现 4 次点击就空白的情况

#### Scenario: 放大有效
- **WHEN** 用户从 scale=1000 点击 + 按钮
- **THEN** scale 变为 1200（20% 增量，肉眼可见）
- **AND** 不会出现 +10 仅 1% 增量看不见变化的情况

#### Scenario: 极端缩放
- **WHEN** 用户连续点击 + 按钮 100 次
- **THEN** scale 持续 ×1.2 增长，最终触达 1e9 上限
- **AND** 坐标系刻度用科学计数法显示，不崩溃
- **WHEN** 用户连续点击 − 按钮 100 次
- **THEN** scale 持续 ÷1.2 减小，最终触达 1e-9 下限
- **AND** 坐标系刻度用科学计数法显示，不崩溃

### Requirement: Service Worker 缓存版本升级到 v14
系统 SHALL 把 Service Worker 的 CACHE_VERSION 升级到 v14，确保上一轮 spec 的所有代码改动（坐标系自适应刻度、参数面板 UX、customParams 等）能被用户浏览器获取。

#### Scenario: 用户首次访问或刷新
- **WHEN** 用户访问站点
- **THEN** v14 SW 注册并激活（skipWaiting + clients.claim）
- **AND** 旧 v13 缓存被清除
- **AND** 客户端收到 SW_UPDATED 消息后自动 reload
- **AND** 用户看到最新的坐标系实现（自适应刻度 + 乘法缩放按钮）

## MODIFIED Requirements

### Requirement: zoomByButton（function-plotter.js）
`zoomByButton(factor)` SHALL 使用乘法 `this.scale * factor`（factor > 1 放大、factor < 1 缩小），而非加法 `this.scale + delta`。scale 仍被钳制在 [1e-9, 1e9] 范围。原点位置同步调整以保持 canvas 中心点的数学坐标不变（即"以 canvas 中心为缩放中心"）。

### Requirement: btn-function-zoom-in / btn-function-zoom-out 事件（app.js）
`btn-function-zoom-in` 的 click 事件 SHALL 调用 `zoomByButton(1.2)`（放大 20%）；`btn-function-zoom-out` 的 click 事件 SHALL 调用 `zoomByButton(1 / 1.2)`（缩小约 17%）。

## REMOVED Requirements

（无）
