# Tasks

- [x] Task 1: 修复折线图 hover 缩小 bug 与布局重构
  - [x] SubTask 1.1: 修改 `/workspace/index.html`，将折线图面板从主区移至页面底部全宽（layout 改为上下结构：上方双栏 + 下方全宽图表）
  - [x] SubTask 1.2: 修改 `/workspace/styles/pixel.css`，新增底部图表布局样式（.chart-panel-bottom 全宽、固定高度 420px、20px 外边距）
  - [x] SubTask 1.3: 修改 `/workspace/js/chart.js` 的 `setupCanvas`，改为仅在容器尺寸真正变化时重设画布尺寸（缓存上次尺寸对比），彻底修复 hover 递归缩小 bug

- [x] Task 2: 实现自制像素风滚动条平移
  - [x] SubTask 2.1: 在 `/workspace/index.html` 折线图面板内新增水平与垂直滚动条 DOM 元素（div.pixel-scrollbar-h 与 div.pixel-scrollbar-v）
  - [x] SubTask 2.2: 在 `/workspace/styles/pixel.css` 新增滚动条样式（深色轨道 + 白色 3px 边框 + 金色滑块 + 硬阴影 + 4px 圆角）
    - 注：实际实现轨道边框为 2px（非 3px），见 checklist 失败项 #8。
  - [x] SubTask 2.3: 在 `/workspace/js/chart.js` 引入视口状态对象 `lineChartViewport = { xMin, xMax, yMin, yMax }`，默认显示全部数据
  - [x] SubTask 2.4: 实现滚动条滑块大小计算（反映可见比例）与显示/隐藏逻辑（数据全可见时隐藏）
  - [x] SubTask 2.5: 实现滚动条拖动事件（mousedown + mousemove + mouseup），拖动时更新视口并重绘
  - [x] SubTask 2.6: 实现滑块外轨道点击跳跃平移

- [x] Task 3: 实现加减号缩放
  - [x] SubTask 3.1: 在 `/workspace/index.html` 折线图右下角新增 +/- 像素风按钮（button.pixel-zoom-btn）
  - [x] SubTask 3.2: 在 `/workspace/styles/pixel.css` 新增缩放按钮样式（绝对定位右下角、白边 3px、硬阴影、按压动画）
  - [x] SubTask 3.3: 在 `/workspace/js/chart.js` 实现缩放逻辑：`+` 缩小视口 X 范围（可见点减少），`-` 扩大视口 X 范围（可见点增多），以视口中心为基准
  - [x] SubTask 3.4: 限制缩放范围：最小显示 3 个数据点，最大显示全部数据点
  - [x] SubTask 3.5: 缩放后更新滚动条滑块大小与位置，重绘图表
  - [x] SubTask 3.6: （可选增强）支持鼠标滚轮缩放（wheel 事件）

- [x] Task 4: 重构 drawLineChart 为视口模式
  - [x] SubTask 4.1: 修改 `drawLineChart` 签名，接收视口参数，仅渲染视口范围内的数据点
    - 注：视口经 `lineChartState.viewport` 共享状态读取（非显式参数），视口过滤已实现。
  - [ ] SubTask 4.2: Y 轴自动缩放改为基于当前 X 视口内的可见数据点计算 Y 范围
    - 失败：`computeTotalYRange()` 基于全部数据计算，垂直视口设为全量范围，未按可见点缩放。见 checklist 失败项 #21。
  - [x] SubTask 4.3: 坐标轴刻度基于视口范围生成
  - [x] SubTask 4.4: 修复 hover tooltip，基于当前视口坐标计算最近点（不再触发画布尺寸重设）
  - [x] SubTask 4.5: 视口外的数据点不绘制（性能优化，仅渲染可见区域 + 少量缓冲）

- [x] Task 5: 实现渐进式回测训练核心逻辑
  - [x] SubTask 5.1: 在 `/workspace/js/weights.js` 新增 `computeIncrementalBacktest(methods, series)` 函数，返回每一步的回测结果数组：
    ```
    [{
      step,                  // step 编号 1..n-2
      trainSize,             // 训练数据长度 = step+1
      predictIndex,          // 预测位置 = step+2 (1-based)
      actual,                // 实际值 series[step+1]
      methodPredictions,     // 各方法预测值数组 (number|null)
      methodAPEs,            // 各方法本 step 的 APE (number|Infinity)
      cumulativeMAPEs,       // 累积 MAPE 数组 (含本 step 及之前所有)
      weights                // 基于累积 MAPE 计算的权重数组
    }]
    ```
  - [x] SubTask 5.2: 处理边界：n < 3 时返回空数组（无训练 step）；actual=0 时该 step 的 APE 跳过
  - [x] SubTask 5.3: 在 console 自测：`computeIncrementalBacktest(predictors, [1, 2, 3, 5, 8, 13])` 应返回 4 个 step 的结果

- [x] Task 6: 实现训练动画编排
  - [x] SubTask 6.1: 在 `/workspace/index.html` 新增训练进度 UI（div.pixel-progress-bar + span 训练状态文本）
  - [x] SubTask 6.2: 在 `/workspace/styles/pixel.css` 新增进度条样式（深色轨道 + 金色填充 + 像素风边框 + 硬阴影）
  - [x] SubTask 6.3: 在 `/workspace/js/app.js` 实现 `runTrainingAnimation(series)` 异步函数，编排完整流程：
    1. 禁用「预测」按钮，显示「训练中...」
    2. 调用 `computeIncrementalBacktest` 获取所有 step 数据
    3. 依次执行每个 step（await + setTimeout 控制 750ms 间隔）：
       - 更新进度条（step X / N）
       - 调用 `animateWeightBarsUpdate(stepData.weights)` 触发权重条形图排序动画
       - 调用 `animateLineChartStep(stepData)` 触发折线图渐进绘制动画
    4. 所有 step 完成后，执行最终预测（用全部 series）
    5. 显示最终融合预测，恢复按钮
    - 注：实际 step 间隔约 450ms（300ms 折线图动画 + 150ms sleep），低于 750ms 目标。见 checklist 失败项 #34。
  - [x] SubTask 6.4: 训练阶段「预测」按钮禁用，防止重复点击

- [x] Task 7: 实现权重条形图排序动画
  - [x] SubTask 7.1: 在 `/workspace/js/chart.js` 的 `drawWeightBars` 中维护方法到 Y 位置的映射缓存 `weightBarPositions`
  - [x] SubTask 7.2: 实现 `animateWeightBarsUpdate(newWeights)` 函数：对比新旧权重排序，使用 `requestAnimationFrame` 在 400ms 内插值移动条形位置
  - [x] SubTask 7.3: 条形长度（权重比例）也平滑过渡（插值权重值）
  - [x] SubTask 7.4: 动画期间防止重入（flag 锁）

- [x] Task 8: 实现折线图渐进绘制动画
  - [x] SubTask 8.1: 在 `/workspace/js/chart.js` 维护已绘制预测点列表 `drawnPredictionPoints`
  - [x] SubTask 8.2: 实现 `animateLineChartStep(stepData)` 函数：在位置 predictIndex 处以入场动画绘制本 step 的各方法预测点 + 融合预测点
  - [x] SubTask 8.3: 入场动画：缩放 0→1 + 透明度 0→1，300ms，使用 `requestAnimationFrame`
  - [x] SubTask 8.4: 连接线以 dash offset 动画展开（300ms）
  - [x] SubTask 8.5: 已绘制点保持显示，每帧重绘全部已绘制点 + 当前入场点

- [x] Task 9: 整合训练动画到主流程
  - [x] SubTask 9.1: 修改 `/workspace/js/app.js` 的 `runPrediction`，改为调用 `runTrainingAnimation(series)` 替代直接预测
  - [x] SubTask 9.2: 训练完成后调用最终预测渲染（renderEnsemble + renderMethodList + renderLineChart + renderWeightBars）
  - [x] SubTask 9.3: 权重模式切换在训练完成后才生效（训练中禁用切换）
  - [x] SubTask 9.4: 重置按钮在训练中可中断动画（清除 timeout + 恢复初始状态）

- [x] Task 10: 上传到 GitHub
  - [x] SubTask 10.1: 在 `/workspace` 执行 `git add -A && git commit -m "feat: 折线图重构与渐进式训练动画"`
  - [x] SubTask 10.2: 推送到 `github-remote main` 分支
  - [x] SubTask 10.3: 验证 GitHub Pages 自动重新构建，访问 https://xiaozhenweiyan.github.io/pixel-predictor/ 确认更新

# Task Dependencies
- Task 2、3 依赖 Task 1（需要布局与画布尺寸修复）
- Task 4 依赖 Task 1、2、3（视口模式依赖滚动条与缩放状态）
- Task 5 无依赖，可与 Task 1-4 并行
- Task 7、8 依赖 Task 4、5（动画依赖视口模式与回测数据）
- Task 6 依赖 Task 5、7、8（编排依赖回测逻辑与动画函数）
- Task 9 依赖 Task 6、7、8
- Task 10 依赖 Task 1-9 全部完成
