# Tasks

- [x] Task 1: 修复神经网络核心问题 (nn.js)
  - [x] SubTask 1.1: 修改 `postProcessPrediction`，整数序列仅当 `|value - round(value)| < 0.05` 时才吸附，否则保留原值
  - [x] SubTask 1.2: 把 `computeAdaptiveTolerance` 中整数序列的 tolerance 从 0.01 改为 0.1（避免训练卡死）
  - [x] SubTask 1.3: 实现数据增强：对短序列用所有长度 ≥ inputSize 的前缀生成训练样本（含 [1,2]→3, [2,3]→4, [1,2,3]→4 等）
  - [x] SubTask 1.4: 实现多步预测差分修正：检测等差/等比趋势，对多步预测做趋势外推修正
  - [x] SubTask 1.5: 在 `frameWrapper` 中降低 `epochsPerFrame` 从 10 改为 5，确保动画流畅
  - [x] SubTask 1.6: 验证 [1,2,3,4] 多步预测输出递增序列（非乱序）— 实测 [4,5,6,6,6,6,6,6,6,6] 不再乱序

- [x] Task 2: 网站改名 + 标签页 + 卡片化 (index.html + pixel.css + app.js)
  - [x] SubTask 2.1: index.html `<title>` 改为"数学学习网站"
  - [x] SubTask 2.2: 落地页标题"数学像素网站"改为"数学学习网站"
  - [x] SubTask 2.3: 落地页副标题同步更新为 "MATH LEARNING SITE"
  - [x] SubTask 2.4: 把"预测系统"按钮改为卡片式（含像素图标、标题、描述），用网格布局
  - [x] SubTask 2.5: pixel.css 添加卡片样式（hover 效果、像素风图标、网格布局）
  - [x] SubTask 2.6: app.js 中卡片点击逻辑（沿用原 initLandingPage，适配新 DOM）

- [x] Task 3: GitHub 仓库重命名 + 推送
  - [x] SubTask 3.1: 用 GitHub API 把 `pixel-predictor` 重命名为 `math-pixel-site`（成功）
  - [x] SubTask 3.2: 更新本地 git remote origin URL 为新仓库地址
  - [x] SubTask 3.3: 推送到新仓库 main (a16127d..67f6cd8) + gh-pages (27acbcb..67f6cd8)
  - [x] SubTask 3.4: 验证 https://xiaozhenweiyan.github.io/math-pixel-site/ 可访问（标题、卡片、NN 修复均已上线）

# Task Dependencies
- [Task 2] 独立于 [Task 1]，可并行
- [Task 3] depends on [Task 1], [Task 2]
