# Tasks

- [x] Task 1: 搭建项目骨架与像素风样式系统
  - [x] SubTask 1.1: 创建 `/workspace/index.html` 基础结构（header、输入区、结果区、图表区、侧栏、footer）
  - [x] SubTask 1.2: 创建 `/workspace/styles/pixel.css`，定义所有 CSS 变量（--bg-deep、--bg-panel、--border、--accent、--shadow、--font）与基础类（.pixel-panel、.pixel-btn、.pixel-input）
  - [x] SubTask 1.3: 实现按钮按压动画（transform + box-shadow 变化）
  - [x] SubTask 1.4: 实现响应式布局（桌面双栏 ≥900px、移动端单栏 <900px）

- [x] Task 2: 实现数字序列输入与校验
  - [x] SubTask 2.1: 在 index.html 添加 textarea 输入框，支持空格/逗号/换行/分号分隔
  - [x] SubTask 2.2: 在 `/workspace/js/app.js` 实现输入解析函数 `parseSequence(text)`，返回 {values, ignored} 数字数组
  - [x] SubTask 2.3: 实现输入校验（至少 2 个数字），失败时显示像素风提示框
  - [x] SubTask 2.4: 输入框聚焦时金色边框强调，失焦恢复

- [x] Task 3: 实现 20 种预测算法库
  - [x] SubTask 3.1: 创建 `/workspace/js/predictors.js`，定义 `predictors` 数组结构 `{id, name, category, minLen, predict(series) → number|null}`
  - [x] SubTask 3.2: 实现朴素法、季节朴素、漂移法、简单平均、中位数（5 个基础方法）
  - [x] SubTask 3.3: 实现 SMA、WMA、SES、Holt's Linear、Holt-Winters（5 个平滑方法）
  - [x] SubTask 3.4: 实现线性回归、二次多项式回归、三次多项式回归（3 个回归方法）
  - [x] SubTask 3.5: 实现 AR(1)、AR(2)（2 个自回归方法）
  - [x] SubTask 3.6: 实现几何增长、一阶差分外推、二阶差分外推、Fibonacci / 黄金比率、傅里叶外推（5 个其他方法）
  - [x] SubTask 3.7: 每个方法处理数据不足情况，返回 null；处理 NaN/Infinity
  - [x] SubTask 3.8: 在浏览器 console 提供简单自测：用已知序列验证（如 [1,2,3,4,5] 线性回归应预测 6）

- [x] Task 4: 实现权重计算与回测
  - [x] SubTask 4.1: 创建 `/workspace/js/weights.js`
  - [x] SubTask 4.2: 实现留一法回测函数 `backtest(method, series)`，返回 MAPE（数据不足返回 Infinity）
  - [x] SubTask 4.3: 实现权重计算 `computeWeights(methods, series)`，基于 (1/(MAPE+ε)) 归一化，权重和 = 1
  - [x] SubTask 4.4: 实现 `uniformWeights(methods)` 均匀权重
  - [x] SubTask 4.5: 实现 `ensemblePredict(predictions, weights)` 融合预测（忽略 null 预测对应权重，重新归一化）

- [x] Task 5: 实现可视化（折线图 + 权重条形图）
  - [x] SubTask 5.1: 创建 `/workspace/js/chart.js`，使用原生 Canvas API（不引入第三方库）
  - [x] SubTask 5.2: 实现 `drawLineChart(ctx, series, ensemblePrediction, methodPredictions)` 函数
  - [x] SubTask 5.3: 输入序列用金色（#ffd700）实线 + 像素方块节点
  - [x] SubTask 5.4: 融合预测点用红色（#ff4500）方块在第 n+1 位置，醒目
  - [x] SubTask 5.5: 各方法预测点用半透明小方块叠加在第 n+1 位置
  - [x] SubTask 5.6: 坐标轴白色 3px 边框 + 等宽字体刻度，Y 轴自动缩放
  - [x] SubTask 5.7: 实现 hover tooltip 显示数值（mousemove 事件 + 重绘）
  - [x] SubTask 5.8: 实现 `drawWeightBars(ctx, methods, weights)` 权重水平条形图，按权重降序排列，按类别配色

- [x] Task 6: 实现主应用逻辑与事件绑定
  - [x] SubTask 6.1: 创建 `/workspace/js/app.js`，整合输入、预测、权重、可视化
  - [x] SubTask 6.2: 绑定「预测」按钮事件，触发完整流程：解析 → 20 方法预测 → 回测权重 → 渲染
  - [x] SubTask 6.3: 绑定权重模式切换（均匀 ↔ 回测）事件，实时更新融合预测、权重条形图、折线图
  - [x] SubTask 6.4: 绑定窗口 resize 事件，节流重绘图表
  - [x] SubTask 6.5: 渲染侧栏方法列表（名称、类别色块、预测值、权重百分比、MAPE）

- [x] Task 7: 实现数据导出
  - [x] SubTask 7.1: 实现 `exportJSON(state)` 生成完整预测数据 JSON 并下载
  - [x] SubTask 7.2: 实现 `exportCSV(state)` 生成 CSV 并下载
  - [x] SubTask 7.3: 绑定导出按钮，文件名带时间戳 `prediction_<timestamp>.json/.csv`

- [x] Task 8: 更新 README 与 GitHub Pages 部署说明
  - [x] SubTask 8.1: 更新 `/workspace/README.md`，包含项目介绍、特性、本地运行方式（直接打开 index.html 或 `python -m http.server`）
  - [x] SubTask 8.2: 在 README 中列出 20 种预测方法及其原理简述
  - [x] SubTask 8.3: 在 README 中给出 GitHub Pages 部署步骤（推送到 main 分支 → Settings → Pages → 选 main 根目录）

- [x] Task 9: 安全与质量审查
  - [x] SubTask 9.1: 安全审查（参考 security-best-practices 思路）：输入校验、XSS 防护（不使用 innerHTML 拼接用户输入，改用 textContent / createElement）
  - [x] SubTask 9.2: 验证所有数值计算无 NaN / Infinity 泄漏到 UI
  - [x] SubTask 9.3: 跨浏览器测试（Chrome、Firefox、Safari）
  - [x] SubTask 9.4: 移动端响应式测试（< 900px 单栏，无横向滚动）

# Task Dependencies
- Task 2 依赖 Task 1（需要 HTML 结构与样式）
- Task 3 无依赖，可与 Task 1 并行
- Task 4 依赖 Task 3（需要 predictors 接口）
- Task 5 依赖 Task 1（需要 Canvas 容器与样式）
- Task 6 依赖 Task 2、3、4、5
- Task 7 依赖 Task 6
- Task 8 依赖 Task 6
- Task 9 依赖 Task 6、7、8
