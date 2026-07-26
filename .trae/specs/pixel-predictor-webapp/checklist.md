# Checklist

## 项目结构与部署
- [x] 项目根目录存在 `index.html`，可直接在浏览器打开运行
- [x] 所有代码为纯静态文件（HTML/CSS/JS），无构建步骤、无后端依赖
- [x] 无任何第三方运行时库（不引入 p5.js / Chart.js / D3 等）
- [x] 可直接部署到 GitHub Pages：推送 main 分支 → Settings → Pages → 选 main 根目录

## 像素风视觉规范
- [x] body 背景为 `#1a1a2e`（深空紫黑）
- [x] 面板背景为 `#2d2d44`（灰紫）
- [x] 所有边框 3px 纯白 `#ffffff`，圆角 4px
- [x] 所有阴影为 `4px 4px 0 rgba(0,0,0,0.4)`（硬阴影，无模糊）
- [x] 全局字体 `"Courier New", Courier, monospace`，bold，letter-spacing 1-2px
- [x] 输入框聚焦时金色（#ffd700）边框
- [x] 按钮按下时 `transform: translate(2px, 2px)` + 阴影变 `2px 2px 0`
- [x] 无任何渐变模糊阴影、非等宽字体或非 4px 圆角元素出现

## 输入与校验
- [x] 输入框支持空格、逗号、换行、分号分隔
- [x] 支持粘贴 CSV / 纯文本
- [x] 输入校验：少于 2 个数字时显示提示，不执行预测
- [x] 含非法字符时忽略并显示轻量提示「已忽略 N 个非法值」

## 20 种预测方法
- [x] 实现了 20 种独立的预测方法，每种方法 id / name / category / minLen / predict 函数清晰
- [x] 包含：朴素法、季节朴素、漂移法、简单平均、中位数、SMA、WMA、SES、Holt's、Holt-Winters、线性回归、二次多项式、三次多项式、AR(1)、AR(2)、几何增长、一阶差分、二阶差分、Fibonacci、傅里叶外推
- [x] 数据不足的方法返回 null 并在 UI 标记为「数据不足」
- [x] 算法确定性：相同输入两次预测结果完全一致
- [x] 无 NaN / Infinity 泄漏到 UI

## 权重与回测
- [x] 权重基于留一法回测的 MAPE 计算，权重之和为 1
- [x] 数据不足或回测失败的方法权重为 0
- [x] 支持「均匀权重」与「回测权重」两种模式切换
- [x] 切换权重模式时融合预测、权重条形图、折线图实时更新
- [x] 融合预测 = Σ(method_prediction × weight)，忽略 null 预测后重新归一化

## 可视化
- [x] 折线图使用原生 Canvas API 绘制（不引入第三方图表库）
- [x] 输入序列以金色（#ffd700）实线 + 像素方块节点呈现
- [x] 融合预测点在第 n+1 位置以红色（#ff4500）方块醒目显示
- [x] 各方法预测点以半透明小方块叠加在第 n+1 位置
- [x] 坐标轴使用白色 3px 边框 + 等宽字体刻度
- [x] Y 轴自动缩放
- [x] 折线图支持 hover tooltip 显示数值
- [x] 权重条形图按权重降序排列，按方法类别配色
- [x] 图表在窗口 resize 时自适应重绘

## UI 与交互
- [x] 侧栏显示 20 个方法的列表：名称、类别色块、预测值、权重百分比、MAPE
- [x] 桌面（≥900px）：左侧主区（输入 + 图表）+ 右侧侧栏
- [x] 移动端（<900px）：单栏纵向堆叠，无横向滚动
- [x] 融合预测值在结果区醒目显示

## 数据导出
- [x] 支持导出 JSON，包含输入序列、各方法预测值、权重、MAPE、融合预测、时间戳
- [x] 支持导出 CSV，包含方法名、预测值、权重、MAPE
- [x] 文件名带时间戳 `prediction_<timestamp>.json/.csv`

## 安全与质量
- [x] 不使用 innerHTML 拼接用户输入（防 XSS），改用 textContent / createElement
- [x] 输入数值边界处理（极大、极小、负数、小数）
- [x] 在 Chrome、Firefox、Safari 中均能正常运行
- [x] 移动端触摸操作正常

## README
- [x] README 包含项目介绍与特性列表
- [x] README 包含本地运行方式（直接打开 index.html 或 `python -m http.server`）
- [x] README 列出 20 种预测方法及其原理简述
- [x] README 包含 GitHub Pages 部署步骤
