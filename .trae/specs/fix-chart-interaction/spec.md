# 修复折线图交互与显示问题 Spec

## Why
用户报告多个持续存在的 bug：hover 时虚线消失、折线图无法缩放/平移/滚动、多步预测仍显示"第几步"格式、方法权重和详情仅显示 20 种而非 30 种。这些问题严重影响可用性。

## What Changes
- 修复 hover 时虚线（拟合曲线 + 融合预测连接线）消失的问题
- 修复折线图缩放按钮、滚轮缩放、滚动条拖拽不工作的问题
- 新增画布拖拽平移功能（鼠标按住拖动自由移动视图）
- 修复 `onScrollbarDragMove` 和 `jumpHorizontalTo` 中 `totalX` 计算错误（使用 `n+1` 而非 `n+max(predCount,1)`）
- 修复 `drawLineChart` 每次 redraw 时强制重算 Y 视口导致的状态不稳定
- 确认多步预测输出为列表格式 `[v1, v2, v3]`（已在代码中实现，需确认部署）
- 确认 30 种方法全部显示（已在代码中实现，需确认部署）
- 验证 GitHub 仓库分支正确性（存在两个 remote：`github-remote`→pixel-predictor 和 `origin`→predicted_value）

## Impact
- Affected code: `js/chart.js`（交互逻辑、绘制函数、滚动条计算）、`js/app.js`（渲染调用）、GitHub 部署验证

## ADDED Requirements

### Requirement: 画布拖拽平移
系统 SHALL 支持鼠标按住画布拖拽来自由平移视图（上下左右均可）。

#### Scenario: 拖拽平移
- **WHEN** 用户在折线图画布上按住鼠标左键并拖动
- **THEN** 视口跟随鼠标移动方向平移（X 和 Y 均可移动）
- **AND** 松开鼠标后停止平移
- **AND** 拖拽时禁用 hover tooltip

### Requirement: hover 不影响虚线渲染
系统 SHALL 在 hover 重绘时保持所有虚线（拟合曲线、融合预测连接线）正确显示。

#### Scenario: hover 折线图
- **WHEN** 鼠标移入折线图区域
- **THEN** 显示最近数据点的 tooltip
- **AND** 所有虚线（拟合曲线青色虚线、融合预测红色虚线）保持可见
- **AND** 虚线不会因 hover 重绘而消失或闪烁

## MODIFIED Requirements

### Requirement: 折线图缩放与滚动
系统 SHALL 支持以下交互方式：
- 鼠标滚轮缩放（上滚放大、下滚缩小）
- 右下角 +/- 按钮缩放
- 自制滚动条拖拽平移（水平 + 垂直）
- **新增**：画布鼠标拖拽平移

#### Scenario: 滚动条拖拽
- **WHEN** 用户拖拽水平滚动条 thumb
- **THEN** 视口水平移动
- **AND** `totalX` 正确计算为 `n + max(predCount, 1)`（含多步预测点）

#### Scenario: 缩放按钮
- **WHEN** 用户点击 + 按钮
- **THEN** 视口水平范围缩小（放大）
- **AND** 滚动条出现（如果内容超出视口）

### Requirement: 多步预测输出格式
系统 SHALL 以列表格式 `[v1, v2, v3]` 显示多步预测结果，不显示"第几步"。

### Requirement: 30 种方法完整显示
系统 SHALL 在方法权重条形图和方法详情列表中显示全部 30 种方法。
