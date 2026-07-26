# Tasks

- [x] Task 1: 修复 function-plotter.js 的 zoomByButton 为乘法缩放（function-plotter.js）
  - [x] SubTask 1.1: 修改 `zoomByButton(delta)` 方法签名和实现：参数名从 `delta` 改为 `factor`；核心表达式从 `this.scale = Math.max(1e-9, Math.min(1e9, this.scale + delta))` 改为 `this.scale = Math.max(1e-9, Math.min(1e9, this.scale * factor))`
  - [x] SubTask 1.2: 保留原点位置同步逻辑（`originX = cx - mathX * scale` / `originY = cy + mathY * scale`），确保以 canvas 中心为缩放中心
  - [x] SubTask 1.3: 更新方法顶部注释，从"以 canvas 中心为缩放中心"补充说明"factor > 1 放大，factor < 1 缩小"
  - [x] SubTask 1.4: 用 `node -c js/function-plotter.js` 验证语法通过
  - [x] SubTask 1.5: 验证从 scale=40 连续调用 `zoomByButton(1/1.2)` 10 次后 scale ≈ 6.4，仍为正值，不会塌缩到 1e-9

- [x] Task 2: 更新 app.js 的 +/- 按钮事件调用（app.js）
  - [x] SubTask 2.1: 找到 `btn-function-zoom-in` 的 click 事件处理器（约第 4195-4197 行），把 `window.functionPlotterInstance.zoomByButton(10)` 改为 `window.functionPlotterInstance.zoomByButton(1.2)`
  - [x] SubTask 2.2: 找到 `btn-function-zoom-out` 的 click 事件处理器（约第 4198-4200 行），把 `window.functionPlotterInstance.zoomByButton(-10)` 改为 `window.functionPlotterInstance.zoomByButton(1 / 1.2)`
  - [x] SubTask 2.3: 用 `node -c js/app.js` 验证语法通过
  - [x] SubTask 2.4: 验证 + 按钮单击 scale 从 40 → 48，再单击 → 57.6（20% 增量可见）
  - [x] SubTask 2.5: 验证 − 按钮单击 scale 从 40 → 33.33，再单击 → 27.78（约 17% 减量可见，不会塌缩）

- [x] Task 3: 升级 Service Worker 缓存版本 v13 → v14（service-worker.js）
  - [x] SubTask 3.1: 修改 `service-worker.js` 第 13 行的 `const CACHE_VERSION = 'v13';` 改为 `const CACHE_VERSION = 'v14';`
  - [x] SubTask 3.2: 验证其他 SW 逻辑（skipWaiting、clients.claim、SW_UPDATED 消息、Network-First 策略）保持不变
  - [x] SubTask 3.3: 用 `node -c service-worker.js` 验证语法通过
  - [x] SubTask 3.4: 验证 v14 SW 激活后会清除 v13 及更早的缓存（`cacheNames.filter(cacheName => cacheName !== CACHE_NAME)` 逻辑正确）

- [ ] Task 4: 端到端验证
  - [x] SubTask 4.1: 验证函数系统：输入 `y=a*x^2+b*x+c` 后参数面板立即显示 a、b、c 三个滑动条（参数自动识别已工作）
  - [x] SubTask 4.2: 验证函数系统：输入 `y=x^2`（无参数）后参数面板显示提示文本 + "添加参数"按钮；点击按钮输入 `k` 后出现 k 滑动条
  - [x] SubTask 4.3: 验证函数系统：点击参数右侧齿轮 → 弹出 min/max/step 三个输入框 → 修改后点"应用" → 滑动条范围/步长更新
  - [x] SubTask 4.4: 验证函数系统：点击动画栏播放按钮 → 参数值在 [min, max] 范围内正弦波动，滑动条跟随移动；再次点击暂停
  - [x] SubTask 4.5: 验证函数系统坐标系：滚轮缩放时刻度间距按 1-2-5 序列自适应（缩小→间距变大数字变大，放大→间距变小数字变小）
  - [x] SubTask 4.6: 验证函数系统坐标系：连续点击 − 按钮 10 次，坐标系始终可见，刻度数字按 1-2-5 序列增大（不会 4 次点击就空白）
  - [x] SubTask 4.7: 验证函数系统坐标系：连续点击 + 按钮 10 次，scale 显著增大，刻度数字按 1-2-5 序列减小
  - [x] SubTask 4.8: 验证函数系统坐标系：极端缩放（scale=1e6 / scale=1e-6）时刻度数字用科学计数法显示，坐标系不崩溃
  - [x] SubTask 4.9: 验证预测系统折线图：缩放时 X 轴和 Y 轴刻度均按 1-2-5 序列自适应，数字不密集重叠
  - [ ] SubTask 4.10: 验证所有改动不影响其他功能（计算器、像素艺术、学习卡片、神经网络等）

# Task Dependencies

- [Task 1] 独立（修改 function-plotter.js）
- [Task 2] depends on [Task 1]（app.js 调用 zoomByButton 的新签名）
- [Task 3] 独立（修改 service-worker.js，可与 Task 1-2 并行）
- [Task 4] depends on [Task 1, Task 2, Task 3]
