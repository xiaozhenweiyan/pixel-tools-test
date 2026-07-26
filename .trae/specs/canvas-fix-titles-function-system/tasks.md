# Tasks

- [x] Task 1: 像素艺术画布填满显示区域 (pixel.css + pixel-art.js)
  - [x] SubTask 1.1: pixel.css 修改 `#pixel-art-canvas-container` 移除 `max-width: 600px`，改为 `width: 100%; max-width: none;`
  - [x] SubTask 1.2: pixel.css 调整 `.pixel-art-canvas-wrap` 让 canvas 充分填充（padding 从 16px 减为 8px，或保持但确保 canvas 撑满）
  - [x] SubTask 1.3: pixel-art.js 把默认 `resolution` 从 32 改为 48
  - [x] SubTask 1.4: pixel-art.js 把 `art-resolution` input 的 min 从 16 改为 24，max 从 64 改为 96，value 从 32 改为 48
  - [x] SubTask 1.5: 验证画布显示填满容器，无大量留白

- [x] Task 2: 设置齿轮按钮移到头像右侧 (pixel.css)
  - [x] SubTask 2.1: pixel.css 修改 `.floating-settings-btn`：移除 `right: 60px`，改为 `left: 60px`
  - [x] SubTask 2.2: 验证齿轮按钮在头像（left:16px width:36px）右侧紧邻（left:60px 留 8px 间隙）
  - [x] SubTask 2.3: 验证齿轮按钮不挡住右上角 floating-back-btn（right:16px）

- [x] Task 3: 标题统一为卡片名称 (index.html)
  - [x] SubTask 3.1: index.html 把 `<h1 class="landing-title">数学学习网站</h1>` 改为 `像素数学`
  - [x] SubTask 3.2: index.html 把 `<p class="landing-subtitle">MATH LEARNING SITE</p>` 改为 `PIXEL MATH`
  - [x] SubTask 3.3: index.html 把 predictor-page 的 `<h1 class="pixel-title">像素预测器 PIXEL PREDICTOR</h1>` 改为 `预测系统 PIXEL PREDICTOR`
  - [x] SubTask 3.4: index.html 把 calculator-page 的 `<h1 class="pixel-title">像素计算器 PIXEL CALCULATOR</h1>` 改为 `计算机系统 PIXEL CALCULATOR`
  - [x] SubTask 3.5: index.html 把 pixel-art-page 的标题（如适用）保持"像素艺术生成器"不变
  - [x] SubTask 3.6: 验证三个页面标题显示正确

- [x] Task 4: 计算器运算过程合并动画 (app.js + pixel.css)
  - [x] SubTask 4.1: 验证 computeStepsWithTrace 对 `2*3*4` 输出 3 步（`2*3*4 → 6*4 → 24`），不跳步
  - [x] SubTask 4.2: 验证 computeStepsWithTrace 对 `2*3+4*5` 输出 4 步（`2*3+4*5 → 6+4*5 → 6+20 → 26`）
  - [x] SubTask 4.3: pixel.css 新增 `.calc-step-line` transition 样式：opacity, transform 0.3s ease
  - [x] SubTask 4.4: pixel.css 新增 `.calc-step-highlight` 样式：高亮色（#ffd700 背景）+ 轻微下移（translateY）
  - [x] SubTask 4.5: app.js 修改 showCalcStepsAnimated：每步添加新行时，先以高亮 + 透明 + 上方位移出现，然后用 setTimeout 200ms 后切换为正常样式（模拟合并动画）
  - [x] SubTask 4.6: app.js 确保每步之间 400ms 延迟（200ms 高亮 + 200ms 合并），多个乘法逐步显示
  - [x] SubTask 4.7: 验证 `1+2*3` 显示 3 步带合并动画
  - [x] SubTask 4.8: 验证 `2*3+4*5` 显示 4 步，每个乘法单独一步

- [x] Task 5: 新增函数系统卡片 (index.html + app.js)
  - [x] SubTask 5.1: index.html 在 landing-page 的 landing-cards 中，在"预测系统"卡片之后、"计算机系统"卡片之前新增"函数系统"卡片（id="btn-enter-function"）
  - [x] SubTask 5.2: 卡片含 SVG 图标（坐标系图案：x/y 轴 + 曲线）、标题"函数系统"、描述"输入函数表达式 · 绘制平面直角坐标系图像"
  - [x] SubTask 5.3: app.js 新增 showFunction() 函数（隐藏其他页面，显示 function-page）
  - [x] SubTask 5.4: app.js 在 initPageSwitching 中绑定 btn-enter-function → showFunction
  - [x] SubTask 5.5: app.js 更新所有 show* 函数以处理 function-page 的 active 状态

- [x] Task 6: 函数系统页面 HTML 结构 (index.html)
  - [x] SubTask 6.1: index.html 在 calculator-page 之前新增 `<div id="function-page" class="function-page">`
  - [x] SubTask 6.2: 页面含浮动返回按钮（id="btn-back-home-function"）
  - [x] SubTask 6.3: 页面含标题 `<h1 class="pixel-title">函数系统 PIXEL FUNCTION</h1>`
  - [x] SubTask 6.4: 页面含 Canvas 容器（class="function-canvas-wrap"），内含 `<canvas id="function-canvas">`
  - [x] SubTask 6.5: Canvas 右下角浮动 +/− 缩放按钮（id="btn-function-zoom-in" / id="btn-function-zoom-out"）
  - [x] SubTask 6.6: Canvas 下方函数输入框（id="function-input"）+ 添加按钮（id="btn-function-add"）+ 清除按钮（id="btn-function-clear"）
  - [x] SubTask 6.7: 函数列表显示区（id="function-list"）显示已添加的函数
  - [x] SubTask 6.8: app.js 绑定 btn-back-home-function → showLanding（返回像素数学首页）

- [x] Task 7: 函数系统页面样式 (pixel.css)
  - [x] SubTask 7.1: pixel.css 新增 `.function-page` 样式（与 .predictor-page 类似的页面容器）
  - [x] SubTask 7.2: 新增 `.function-canvas-wrap`：相对定位容器，深空背景，3px 白边框，4px 圆角
  - [x] SubTask 7.3: 新增 `#function-canvas`：width 100%, height 500px，image-rendering crisp-edges
  - [x] SubTask 7.4: 新增 `.function-zoom-controls`：absolute，bottom 16px，right 16px，flex column gap 4px
  - [x] SubTask 7.5: 新增 `.function-input-row`：flex row gap 8px
  - [x] SubTask 7.6: 新增 `.function-list`：显示已添加函数列表，每个函数一项（颜色块 + 表达式文本 + 删除按钮）

- [x] Task 8: 创建 function-plotter.js (js/function-plotter.js)
  - [x] SubTask 8.1: 创建 /workspace/js/function-plotter.js 模块
  - [x] SubTask 8.2: 实现 FunctionPlotter 类，构造函数接收 canvas 元素
  - [x] SubTask 8.3: 实现坐标系状态：originX, originY（原点像素坐标）, scale（单位长度像素数，默认 40）
  - [x] SubTask 8.4: 实现 drawGrid()：绘制网格线（每单位一条，淡色）+ 坐标轴（x/y 轴白色加粗）+ 刻度数字
  - [x] SubTask 8.5: 实现 drawAxes()：x 轴 y 轴用白色 2px 线，原点标记 "O"，刻度数字用 textContent 风格绘制
  - [x] SubTask 8.6: 实现 plotFunction(expr, color)：解析表达式，遍历 x 像素绘制曲线
  - [x] SubTask 8.7: 实现 parseFunction(input)：支持 `y=表达式` 和 `f(x)=表达式` 格式，返回可求值的 JS 函数
  - [x] SubTask 8.8: 表达式预处理：`^` → `**`，`sin/cos/tan/log/sqrt` → `Math.sin/...`，`x` 为变量
  - [x] SubTask 8.9: 安全求值：用 Function 构造器 + 字符白名单（只允许数字、x、运算符、Math 函数）
  - [x] SubTask 8.10: 实现鼠标拖拽平移：mousedown/mousemove/mouseup 事件，更新 originX/originY
  - [x] SubTask 8.11: 实现滚轮缩放：wheel 事件，向上放大（scale 增加），向下缩小（scale 减少），以鼠标位置为中心
  - [x] SubTask 8.12: 实现 +/− 按钮缩放：scale 增加/减少 10px（限制 10-200）
  - [x] SubTask 8.13: 实现重绘 redraw()：清空 canvas + drawGrid + drawAxes + 重绘所有函数
  - [x] SubTask 8.14: 实现 addFunction(input) / clearFunctions() 公共方法
  - [x] SubTask 8.15: 验证 y=x^2 显示抛物线，f(x)=sin(x) 显示正弦曲线
  - [x] SubTask 8.16: 验证缩放和平移时刻度数字对齐网格，基准长度不混乱

- [x] Task 9: index.html 加载 function-plotter.js
  - [x] SubTask 9.1: index.html 在 `<script src="js/pixel-art.js"></script>` 之后新增 `<script src="js/function-plotter.js"></script>`
  - [x] SubTask 9.2: app.js 在 DOMContentLoaded 后初始化 FunctionPlotter（传入 #function-canvas）

- [x] Task 10: 更新 README.md
  - [x] SubTask 10.1: README.md 在功能列表中新增"函数系统"说明（输入 y=/f(x)= 表达式绘制图像，支持平移缩放）
  - [x] SubTask 10.2: README.md 更新像素艺术生成器说明（分辨率默认 48，画布填满显示区域）
  - [x] SubTask 10.3: README.md 更新各页面标题说明（像素数学/预测系统/计算机系统/函数系统）
  - [x] SubTask 10.4: README.md 在项目结构中新增 js/function-plotter.js
  - [x] SubTask 10.5: README.md 更新使用说明（齿轮按钮位置改为头像右侧）

- [x] Task 11: 推送 GitHub
  - [x] SubTask 11.1: 提交并推送到 origin main 和 gh-pages
  - [x] SubTask 11.2: 验证 https://xiaozhenweiyan.github.io/pixel-tools/ 可访问
  - [x] SubTask 11.3: 验证 GitHub 仓库 README.md 显示新功能
  - [x] SubTask 11.4: 验证所有 5 项改动生效（画布填满、齿轮位置、标题、动画、函数系统）

# Task Dependencies
- [Task 1] 独立
- [Task 2] 独立
- [Task 3] 独立
- [Task 4] 独立（修改 showCalcStepsAnimated）
- [Task 5] 独立（新增卡片）
- [Task 6] depends on [Task 5]（卡片点击进入页面）
- [Task 7] depends on [Task 6]（HTML 结构存在后加样式）
- [Task 8] depends on [Task 6]（HTML 的 canvas 存在后写 JS）
- [Task 9] depends on [Task 8]
- [Task 10] depends on [Task 5, Task 8]（README 反映新功能）
- [Task 11] depends on all
