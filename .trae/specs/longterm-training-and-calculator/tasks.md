# Tasks

- [x] Task 1: 长期训练模式开关 + 数据累积 (index.html + pixel.css + app.js)
  - [x] SubTask 1.1: 在 index.html 导出 CSV 按钮右侧添加**像素风开关**（class="pixel-switch"），含"长期训练"标签
  - [x] SubTask 1.2: pixel.css 添加像素风开关样式（方形滑块、3px 白边框、4px 圆角、灰色关/金色开，与 .pixel-btn 风格一致，不用 iOS 圆角）
  - [x] SubTask 1.3: app.js 添加开关状态切换逻辑，开启时"预测"按钮文字变为"预测+训练"
  - [x] SubTask 1.4: app.js 实现长期累积序列（localStorage 持久化，key="longterm_series"）
  - [x] SubTask 1.5: app.js 修改预测按钮点击逻辑：长期模式开启时，把当前输入追加到累积序列，清空输入框，用累积序列做预测+训练
  - [x] SubTask 1.6: app.js 页面加载时从 localStorage 恢复开关状态和累积序列
  - [x] SubTask 2.3: app.js 长期训练模式调用 incrementalTrain 而非 progressiveTrain

- [x] Task 2: 神经网络增量训练接口 (nn.js)
  - [x] SubTask 2.1: 在 nn.js 新增 `incrementalTrain(canvas, fullSeries, steps, onProgress)` 方法，复用 progressiveTrain 但不重置权重（不调用 initWeights，保留当前 params）
  - [x] SubTask 2.2: 导出 incrementalTrain 到 neuralNet 对象
  - [x] SubTask 2.3: app.js 长期训练模式调用 incrementalTrain 而非 progressiveTrain（在 Task 1 中实现）

- [x] Task 3: 计算机系统卡片 + 计算器界面 (index.html + pixel.css)
  - [x] SubTask 3.1: index.html 落地页新增"计算机系统"卡片（含 SVG 图标、标题、描述），id="btn-enter-calculator"
  - [x] SubTask 3.2: index.html 新增计算器页面 div（id="calculator-page"），默认 display:none
  - [x] SubTask 3.3: 计算器页面含：顶部输出区（id="calc-output"）、中间按键网格、底部输入框（id="calc-input"）、返回首页按钮（id="btn-back-home"）
  - [x] SubTask 3.4: 按键网格含：数字 0-9、+ - × ÷ ( ) . = C ⌫（退格）
  - [x] SubTask 3.5: pixel.css 添加计算器样式（像素风按键、网格布局、输出区样式）
  - [x] SubTask 3.6: 预测系统页面也加一个"返回首页"按钮（id="btn-back-home-predict"）

- [x] Task 4: 计算器逻辑 + 页面切换 (app.js)
  - [x] SubTask 4.1: app.js 实现 calculateExpr(expr) 表达式求值（支持 + - × ÷ 括号 小数 负数，用 Function 构造器或手写 tokenizer）
  - [x] SubTask 4.2: app.js 实现按键事件：每个按键点击追加对应字符到 calc-input 末尾
  - [x] SubTask 4.3: app.js 实现等号：读取 calc-input，求值，结果写入 calc-output（含历史记录）
  - [x] SubTask 4.4: app.js 实现 C 清空、⌫ 退格
  - [x] SubTask 4.5: app.js 实现 calc-input 键盘输入（input 事件同步）+ 回车触发等号
  - [x] SubTask 4.6: app.js 实现页面切换：点击"预测系统"卡片显示预测页、点击"计算机系统"卡片显示计算器页、点击返回首页回到落地页
  - [x] SubTask 4.7: 安全：表达式求值不能用 eval，用受限的 tokenizer + shunting-yard 或 Function 构造器 + 字符白名单校验

- [x] Task 5: 更新仓库 README.md
  - [x] SubTask 5.1: 全面重写 README.md，反映当前所有功能（40 种方法、过拟合、偏移、NN 升级、长期训练、计算器、落地页）
  - [x] SubTask 5.2: 移除过时介绍（如"30 种方法"等旧描述）
  - [x] SubTask 5.3: 包含功能列表、使用说明、技术栈、部署地址

- [x] Task 6: 推送 GitHub
  - [x] SubTask 6.1: 提交并推送到 origin main + gh-pages
  - [x] SubTask 6.2: 验证 https://xiaozhenweiyan.github.io/math-pixel-site/ 可访问

# Task Dependencies
- [Task 2] 独立于 [Task 1] 的 UI 部分，可并行
- [Task 3] 独立于 [Task 1]，可并行
- [Task 4] depends on [Task 3]（需要 DOM 结构）
- [Task 5] 独立，可并行
- [Task 6] depends on [Task 1], [Task 2], [Task 3], [Task 4], [Task 5]
