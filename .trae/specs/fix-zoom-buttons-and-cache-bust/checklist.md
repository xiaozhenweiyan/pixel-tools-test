# Checklist

## function-plotter.js zoomByButton 改为乘法
- [x] `js/function-plotter.js` 的 `zoomByButton` 方法参数名从 `delta` 改为 `factor`
- [x] 核心表达式从 `this.scale + delta` 改为 `this.scale * factor`
- [x] scale 仍被钳制在 `Math.max(1e-9, Math.min(1e9, ...))` 范围
- [x] 保留 `originX = cx - mathX * this.scale` 和 `originY = cy + mathY * this.scale`（以 canvas 中心为缩放中心）
- [x] 保留 `this.redraw()` 调用
- [x] `node -c js/function-plotter.js` 语法通过
- [x] 从 scale=40 连续 10 次 `zoomByButton(1/1.2)` 后 scale ≈ 6.4（正值，未塌缩）

## app.js +/- 按钮事件调用更新
- [x] `btn-function-zoom-in` click 处理器调用 `zoomByButton(1.2)`（不再是 `10`）
- [x] `btn-function-zoom-out` click 处理器调用 `zoomByButton(1 / 1.2)`（不再是 `-10`）
- [x] `node -c js/app.js` 语法通过
- [x] + 按钮单击：scale 40 → 48 → 57.6 → 69.12（每次 +20%）
- [x] − 按钮单击：scale 40 → 33.33 → 27.78 → 23.15（每次 −17%）
- [x] 连续 10 次 − 不会空白，连续 10 次 + 显著放大

## service-worker.js 缓存版本升级
- [x] `CACHE_VERSION` 从 `'v13'` 改为 `'v14'`
- [x] `CACHE_NAME` 自动变为 `'pixel-tools-v14'`
- [x] `install` 事件中 `skipWaiting()` 保留
- [x] `activate` 事件中 `clients.claim()` 保留
- [x] `activate` 事件中清除非 v14 缓存的逻辑保留
- [x] `activate` 事件中向客户端 postMessage `SW_UPDATED` 保留
- [x] Network-First 策略（HTML / JS / CSS）保留
- [x] Cache-First 策略（跨域 CDN）保留
- [x] `node -c service-worker.js` 语法通过

## 参数系统验证（已实现，本次仅验证未回归）
- [x] 输入 `y=a*x^2+b*x+c` 后参数面板立即显示 a、b、c 三个滑动条
- [x] 输入 `y=x^2`（无参数）后参数面板显示 `.param-empty-hint` 提示文本 + `.param-add-btn` 按钮
- [x] 点击"添加参数"按钮 → prompt 弹出 → 输入 `k` → 出现 k 滑动条
- [x] 输入已存在的参数名（如 `a`）→ alert "参数 a 已存在"
- [x] 输入保留字（如 `x`、`pi`、`e`）→ alert 提示保留字
- [x] 点击参数右侧齿轮按钮 → 展开 `.param-settings-panel` 含 min/max/step 三个输入框
- [x] 修改 min/max/step 后点"应用" → 滑动条范围和步长更新
- [x] 校验：min >= max → 显示"最小值必须小于最大值"
- [x] 校验：step <= 0 → 显示"步长必须大于 0"
- [x] 点击动画栏播放按钮 → 参数值在 [min, max] 内正弦波动，滑动条跟随
- [x] 再次点击播放按钮 → 暂停动画，图标从暂停切回播放

## 坐标系验证（function-plotter.js）
- [x] 滚轮向上滚动 → 放大（scale 增大）
- [x] 滚轮向下滚动 → 缩小（scale 减小）
- [x] 滚轮缩放以鼠标位置为中心
- [x] scale=40 时刻度间距为 1 或 2（niceUnit 自适应），数字不密集
- [x] scale=10（缩小）时刻度间距为 5 或 10，数字变大（如 -50, -40, ..., 50）
- [x] scale=200（放大）时刻度间距为 0.2 或 0.5，数字变小（如 -0.4, -0.2, 0, 0.2, 0.4）
- [x] scale=1e6 时刻度用科学计数法（如 1e-6, 2e-6, 3e-6）
- [x] scale=1e-6 时刻度用科学计数法（如 1e6, 2e6, 3e6）
- [x] 主网格线与刻度数字位置对齐
- [x] 次网格线（更淡）按 niceUnit/5 步长绘制
- [x] 30px 防重叠：相邻刻度数字像素间距 < 30px 时跳过后者
- [x] 右下角单位长度指示条显示 `formatTickNumber(unitLen) + ' unit = ' + formatTickNumber(pxLen) + 'px'`

## 坐标系验证（chart.js 预测系统折线图）
- [x] `findNiceUnit` 函数存在于全局作用域
- [x] `formatTickNumber` 函数存在于全局作用域
- [x] `CHART_NICE_MAGNITUDES` 数组覆盖 [1e-9, 1e9] 全 1-2-5 序列
- [x] `drawLineChartGrid` 中 X 轴步长 = `findNiceUnit(80 / xScale)`
- [x] `drawLineChartGrid` 中 Y 轴步长 = `findNiceUnit(60 / yScale)`
- [x] `drawLineChartTicks` 中刻度数字与网格线使用同一 niceUnit
- [x] `drawLineChartTicks` 中刻度数字用 `formatTickNumber` 格式化
- [x] 缩小折线图（zoomLineChart 1.4）时刻度间距按 1-2-5 序列增大
- [x] 放大折线图（zoomLineChart 0.7）时刻度间距按 1-2-5 序列减小
- [x] 视口范围钳制为 `Math.max(1e-6, Math.min(1e9, newRange))`（支持无限缩放）
- [x] `panLineChart` 允许视口移出数据范围（显示空白区域不崩溃）

## Service Worker 行为验证
- [ ] v14 SW 注册成功（浏览器 DevTools Application → Service Workers 显示 v14）
- [ ] v14 SW 激活后 `caches.keys()` 不再包含 `pixel-tools-v13` 等旧版本
- [ ] 客户端收到 `SW_UPDATED` 消息后自动 `window.location.reload()`
- [ ] 普通刷新（非强制刷新）能拿到最新代码（Network-First 策略生效）
- [ ] 离线模式下仍能从缓存加载（Network-First 回退到 cache.match）

## 回归验证（不影响其他功能）
- [ ] 像素艺术生成器画布填满容器
- [ ] 计算器运算过程合并动画正常
- [ ] 神经网络可视化正常
- [ ] 长期训练面板正常
- [ ] 物理沙盒、像素时钟、像素 RPG 等工具正常
- [ ] 教程模态框（每页专属教程）正常
- [ ] i18n 中英文切换正常
