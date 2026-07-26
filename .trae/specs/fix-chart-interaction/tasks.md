# Tasks

- [x] Task 1: 修复 chart.js 中 hover 导致虚线消失的 bug
  - [x] SubTask 1.1: 在 `drawLineChart` 开头添加 `ctx.setLineDash([])` 确保干净状态
  - [x] SubTask 1.2: 为 `drawLineChartEnsemble` 添加 `ctx.save()`/`ctx.restore()` 包裹，确保虚线状态不泄漏
  - [x] SubTask 1.3: 将 Y 视口重算逻辑改为仅在 `isNewData` 时执行，hover/zoom/pan 重绘时不重算 Y 视口

- [x] Task 2: 修复滚动条 totalX 计算错误 + 新增画布拖拽平移
  - [x] SubTask 2.1: 修复 `onScrollbarDragMove` 中 `var totalX = Math.max(n + 1, 2)` → 使用 `n + Math.max(predCount, 1)`
  - [x] SubTask 2.2: 修复 `jumpHorizontalTo` 中同样的 `totalX` 计算 bug
  - [x] SubTask 2.3: 新增 `panLineChart(deltaX, deltaY)` 函数，同时平移 X 和 Y 视口
  - [x] SubTask 2.4: 在 `ensureLineChartHandlers` 中添加 mousedown/mousemove/mouseup 拖拽平移事件（区分拖拽和 hover：拖拽时不显示 tooltip）

- [x] Task 3: 验证多步预测列表格式和 30 种方法显示
  - [x] SubTask 3.1: 确认 `renderEnsemble` 和 `renderNNResult` 使用 `[v1, v2, v3]` 列表格式（已在代码中实现）
  - [x] SubTask 3.2: 确认 `predictors.length === 30` 且 `computeMethodStats` 返回 30 项
  - [x] SubTask 3.3: 确认权重条形图 `drawWeightBars` 接收 30 项并正确渲染（canvas 高度自适应）

- [x] Task 4: 验证 GitHub 仓库分支并推送修复
  - [x] SubTask 4.1: 检查 `github-remote`（pixel-predictor）和 `origin`（predicted_value）哪个有 GitHub Pages — pixel-predictor 同时有 main + gh-pages 分支，是真正的部署仓库；origin（predicted_value）停留在 Initial commit，未启用 Pages
  - [x] SubTask 4.2: 确保代码推送到正确的 main 和 gh-pages 分支 — 两者均已推送到 `1506820`
  - [x] SubTask 4.3: 如果两个仓库都需要更新，同时推送 — 仅 pixel-predictor 需要更新（已推送），origin 不需要

# Task Dependencies
- [Task 2] depends on [Task 1]（共享 chart.js 交互代码）
- [Task 4] depends on [Task 1], [Task 2], [Task 3]
