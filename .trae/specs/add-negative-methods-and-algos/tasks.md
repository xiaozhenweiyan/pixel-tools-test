# Tasks

- [ ] Task 1: 新增 10 种支持负数的预测方法
  - [ ] SubTask 1.1: 选定 10 种天然支持负数的算法（差分外推、加权中位数、递推平均、符号守恒法等）
  - [ ] SubTask 1.2: 在 predictors.js 中实现并 push 到 predictors 数组
  - [ ] SubTask 1.3: 验证 predictors.length === 40 且全部方法对负数序列返回有效结果

- [ ] Task 2: 方法列表数据不足提示优化
  - [ ] SubTask 2.1: 修改 computeMethodStats 或 app.js renderMethodList，显示「还差 X 个」
  - [ ] SubTask 2.2: 更新权重为 0 的方法也显示差几个（区分「数据不足」和「预测失败」）

- [ ] Task 3: 新增过拟合算法模块 overfit.js
  - [ ] SubTask 3.1: 实现最高次多项式插值（Lagrange / Newton 插值）
  - [ ] SubTask 3.2: 实现高次多项式平均（deg 5~8）
  - [ ] SubTask 3.3: 实现三次样条插值（自然边界）
  - [ ] SubTask 3.4: 三方法留一加权融合
  - [ ] SubTask 3.5: 导出 overfit.predict(series, steps) 和 overfit.fit(series)

- [ ] Task 4: 新增偏移算法模块 offsetfit.js
  - [ ] SubTask 4.1: 实现 11 种简单函数族（常数、线性、二次、三次、绝对值、倒数、指数、幂、正弦、平方根、tanh）
  - [ ] SubTask 4.2: 实现水平+垂直平移参数搜索（网格 + 细化）
  - [ ] SubTask 4.3: 选最优函数族并输出表达式、R²、预测值
  - [ ] SubTask 4.4: 导出 offsetFit.fit(series) → { formula, rSquared, prediction, functionName }

- [ ] Task 5: UI 集成 + 标题更新
  - [ ] SubTask 5.1: index.html 新增过拟合面板和偏移算法面板，更新标题为「40 种数学方法预测」
  - [ ] SubTask 5.2: pixel.css 添加新面板样式（与现有风格一致）
  - [ ] SubTask 5.3: app.js 集成两个新模块，在预测完成后渲染
  - [ ] SubTask 5.4: 方法权重条形图和详情列表确认支持 40 种（高度自适应）

- [ ] Task 6: 推送 GitHub
  - [ ] SubTask 6.1: 提交并推送到 github-remote main + gh-pages
  - [ ] SubTask 6.2: 验证部署

# Task Dependencies
- [Task 2] depends on [Task 1]（共享 predictors 数据）
- [Task 5] depends on [Task 1], [Task 3], [Task 4]
- [Task 6] depends on [Task 5]
