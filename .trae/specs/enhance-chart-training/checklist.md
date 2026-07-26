# Checklist

## 折线图布局与 hover 修复
- [x] 折线图面板移至页面底部，左右充满屏幕宽度（20px 外边距）
- [x] 折线图面板固定高度 420px
- [x] 桌面端：上方双栏（输入+结果 | 方法列表+权重条形图），下方全宽折线图
- [x] 移动端：纵向堆叠，折线图在最底部
- [x] hover 时画布尺寸保持不变，不再缩小
- [x] `setupCanvas` 不在每次重绘时基于 `clientWidth` 重设尺寸（仅在容器尺寸真正变化时重设）

## 自制滚动条平移
- [x] 水平滚动条在图表底部内侧，垂直滚动条在图表右侧内侧
- [ ] 滚动条样式：深色轨道 `#1a1a2e` + 白色 3px 边框 + 金色 `#ffd700` 滑块 + 硬阴影 + 4px 圆角
  - 失败：`pixel.css:460` 与 `pixel.css:483` 滚动条轨道边框为 `2px solid var(--border)`，非 3px；其余属性（深色轨道/金色滑块/硬阴影/4px 圆角）均符合。
- [x] 滑块大小反映可见区域占总数据区域的比例
- [x] 数据完全可见时隐藏滚动条
- [x] 拖动滑块平移视口并重绘
- [x] 滑块外轨道点击可跳跃平移

## 加减号缩放
- [x] 折线图右下角有 +/- 像素风按钮
- [x] 按钮样式：白边 3px + 硬阴影 + 按压动画
- [x] `+` 放大（可见点减少），`-` 缩小（可见点增多）
- [x] 缩放以视口中心为基准
- [x] 最小显示 3 个数据点，最大显示全部数据点
- [x] 缩放后滚动条滑块大小与位置更新
- [x] （可选）鼠标滚轮支持缩放

## 视口模式渲染
- [x] `drawLineChart` 接收视口参数，仅渲染视口范围内的数据点
  - 注：视口经 `lineChartState.viewport` 共享状态读取（非显式参数），但视口过滤逻辑已实现（`chart.js:389-391` 等）。
- [ ] Y 轴自动缩放基于当前 X 视口内可见数据点
  - 失败：`chart.js:216-249` `computeTotalYRange()` 基于全部数据（序列+融合+各方法+训练点）计算 Y 范围，`chart.js:296-297` 将垂直视口设为全量范围，未按 X 视口内可见点缩放。
- [x] 坐标轴刻度基于视口范围生成
- [x] hover tooltip 基于当前视口坐标计算，不触发画布尺寸重设
- [x] 视口外数据点不绘制（性能优化）

## 渐进式回测训练核心
- [x] `computeIncrementalBacktest(methods, series)` 函数已实现
- [x] 返回每一步的回测结果（含 methodPredictions、methodAPEs、cumulativeMAPEs、weights）
- [x] n < 3 时返回空数组
- [x] actual=0 时该 step 的 APE 跳过
- [x] console 自测通过：`computeIncrementalBacktest(predictors, [1,2,3,5,8,13])` 返回 4 个 step

## 训练动画编排
- [x] 训练进度 UI（像素风进度条 + 状态文本）
- [x] 进度条样式：深色轨道 + 金色填充 + 像素风边框 + 硬阴影
- [x] `runTrainingAnimation(series)` 异步函数已实现
- [x] 训练中禁用「预测」按钮，显示「训练中...」
- [ ] 每个 step 间隔约 750ms
  - 失败：`app.js:287` await `animateLineChartStep`（300ms）+ `app.js:302` `await sleep(150)` ≈ 450ms/step；权重条动画 400ms 并发未 await。实际约 450ms，低于可接受范围 550-750ms。
- [x] 每个 step 触发权重条形图与折线图动画
- [x] 训练完成后执行最终预测，恢复按钮

## 权重条形图排序动画
- [x] `animateWeightBarsUpdate(newWeights)` 函数已实现
- [x] 条形位置使用 `requestAnimationFrame` 在 400ms 内平滑过渡
- [x] 条形长度（权重比例）也平滑过渡
- [x] 排序变化时无闪烁
- [x] 动画期间防重入

## 折线图渐进绘制动画
- [x] `animateLineChartStep(stepData)` 函数已实现
- [x] 预测点入场动画：缩放 0→1 + 透明度 0→1，300ms
- [x] 连接线 dash offset 动画展开，300ms
- [x] 已绘制点保持显示
- [x] 每帧重绘全部已绘制点 + 当前入场点

## 整合与交互
- [x] `runPrediction` 改为调用 `runTrainingAnimation`
- [x] 训练完成后渲染最终预测（ensemble + method list + line chart + weight bars）
- [x] 权重模式切换在训练中禁用
- [x] 重置按钮可中断训练动画

## 像素风一致性（不破坏原规范）
- [x] 所有新增 UI 元素使用 CSS 变量（--bg-deep、--bg-panel、--border、--accent、--shadow）
- [ ] 滚动条、缩放按钮、进度条均使用 3px 白边 + 4px 圆角 + 硬阴影
  - 失败：缩放按钮（`.pixel-btn`）为 3px ✓；但滚动条（`pixel.css:460/483`）与进度条（`pixel.css:535`）边框为 2px，非 3px。圆角与硬阴影均符合。
- [x] 无渐变模糊阴影、非等宽字体出现
- [x] 字体保持 `"Courier New", Courier, monospace` + bold

## 安全与质量
- [x] 不使用 innerHTML 拼接用户输入
- [x] 所有数值计算无 NaN / Infinity 泄漏到 UI
- [x] JS 语法检查通过（node --check）
- [x] 4 个 JS 文件无语法错误

## GitHub 上传
- [x] git commit 成功
- [x] 推送到 github-remote main 分支成功
- [x] GitHub Pages 自动重新构建
- [x] 访问 https://xiaozhenweiyan.github.io/pixel-predictor/ 确认更新生效
