# Tasks

- [x] Task 1: 升级神经网络核心算法 (nn.js)
  - [x] SubTask 1.1: 增大隐藏层到 16 神经元
  - [x] SubTask 1.2: 实现整数检测函数 isIntegerSeries(series)
  - [x] SubTask 1.3: 实现小数精度检测函数 getDecimalPrecision(series)
  - [x] SubTask 1.4: 实现自适应容差函数 computeAdaptiveTolerance(series)
  - [x] SubTask 1.5: 在 predict() 中添加输出后处理：整数序列吸附到最近整数，小数序列按精度四舍五入
  - [x] SubTask 1.6: 改进归一化策略：大数序列使用 min-max 归一化替代 z-score
  - [x] SubTask 1.7: 实现自适应学习率：初始 0.1，损失停滞时衰减
  - [x] SubTask 1.8: 增加 MAX_EPOCHS_PER_STEP 到 5000
  - [x] SubTask 1.9: 验证整数等差数列 [1,2,3,4] → 整数（后处理吸附）

- [x] Task 2: 新增网站落地页
  - [x] SubTask 2.1: 在 index.html 中添加落地页叠加层（标题"数学像素网站" + "预测系统"按钮）
  - [x] SubTask 2.2: 在 pixel.css 中添加落地页样式（全屏覆盖、像素风、淡入淡出动画）
  - [x] SubTask 2.3: 在 app.js 中添加落地页交互逻辑（点击按钮隐藏落地页、显示预测页）
  - [x] SubTask 2.4: 确保落地页在页面加载时默认显示，预测页隐藏

- [x] Task 3: 推送 GitHub
  - [x] SubTask 3.1: 本地提交完成（commit d9275f5），推送需要用户认证
  - [ ] SubTask 3.2: 验证部署（待推送后验证）

# Task Dependencies
- [Task 2] 独立于 [Task 1]，可并行
- [Task 3] depends on [Task 1], [Task 2]
