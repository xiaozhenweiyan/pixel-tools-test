# Tasks

- [x] Task 1: 顶栏自动隐藏 + 浮动按钮位置调整 (pixel.css + app.js)
  - [x] SubTask 1.1: pixel.css 修改 `.topbar` 样式：默认 `top: -48px`，添加 `transition: top 0.3s ease`，添加 `.topbar.visible { top: 0; }`
  - [x] SubTask 1.2: pixel.css 修改 `.floating-back-btn` 的 top 从 56px 改为 12px
  - [x] SubTask 1.3: app.js 新增 `initTopbarAutoHide` 函数：监听 mousemove，鼠标 Y ≤ 6 时添加 .visible 类，鼠标 Y > 54 且不在 topbar 内时 300ms 后移除 .visible 类
  - [x] SubTask 1.4: app.js init 中调用 initTopbarAutoHide()

- [x] Task 2: 右上角个人系统齿轮按钮 (index.html + pixel.css + app.js)
  - [x] SubTask 2.1: index.html 移除落地页 `<button class="landing-card" id="btn-enter-settings">` 整块
  - [x] SubTask 2.2: index.html 在 body 内（toast 之前）新增 `<button class="floating-settings-btn" id="btn-floating-settings" title="个人系统">` 含齿轮 SVG 图标
  - [x] SubTask 2.3: pixel.css 添加 `.floating-settings-btn` 样式：position:fixed，top:12px，right:120px，z-index:9999，像素风（3px 白边框、4px 圆角、深空背景、金色图标），32x32 方形
  - [x] SubTask 2.4: app.js 绑定 `btn-floating-settings` 的 click 事件到 showSettings
  - [x] SubTask 2.5: app.js initPageSwitching 中移除原 `btn-enter-settings` 的绑定（若存在）

- [x] Task 3: 计算器根号按键 (index.html + app.js)
  - [x] SubTask 3.1: index.html 在计算器按键网格中新增 `√` 按钮，data-key="sqrt"，显示文字"√"
  - [x] SubTask 3.2: app.js 修改 calcAppendKey：当 key === 'sqrt' 时向输入框追加 `sqrt(`
  - [x] SubTask 3.3: app.js 修改 calculateExpr：白名单允许 `sqrt` 字符，把 `sqrt(` 替换为 `Math.sqrt(`，用 Function 构造器求值
  - [x] SubTask 3.4: 验证 sqrt(9)=3、sqrt(4)+sqrt(9)=5、sqrt(3*3+4*4)=5

- [x] Task 4: 运算过程动态显示 (index.html + pixel.css + app.js)
  - [x] SubTask 4.1: index.html 在 calc-panel 内、按键网格旁边新增 `<div class="calc-steps" id="calc-steps">`（运算过程显示框）
  - [x] SubTask 4.2: pixel.css 添加 `.calc-steps` 样式：像素风深空背景、3px 白边框、4px 圆角、最小高度 200px、可滚动、等宽字体
  - [x] SubTask 4.3: pixel.css 调整 calc-panel 布局：使用 flex 让按键区和过程框并排（桌面 ≥768px 时 grid 2 列，移动端纵向堆叠）
  - [x] SubTask 4.4: app.js 新增 `showCalcSteps(steps)` 函数：清空 calc-steps，逐行 createElement + textContent 显示步骤（防 XSS）
  - [x] SubTask 4.5: app.js 新增 `computeStepsWithTrace(expr)` 函数：生成化简步骤
  - [x] SubTask 4.6: app.js 修改 calcEvaluate：求值成功后调用 computeStepsWithTrace 生成步骤，调用 showCalcSteps 显示
  - [x] SubTask 4.7: 错误时 calc-steps 显示"错误"

- [x] Task 5: 图片上传自动压缩 (app.js)
  - [x] SubTask 5.1: app.js 新增 `compressImage(file, maxDim, isAvatar)` 函数：返回 Promise<base64>
  - [x] SubTask 5.2: app.js 修改 saveProfile：捕获 QuotaExceededError 时提示"图片过大，请用更小的图片"
  - [x] SubTask 5.3: app.js 修改头像上传：移除 200KB 硬限制，改为调用 compressImage(file, 256, true)
  - [x] SubTask 5.4: app.js 修改背景图片上传：移除 1MB 硬限制，改为调用 compressImage(file, 1920, false)
  - [x] SubTask 5.5: 移除原 readImageFile 中的 maxSize 硬校验（保留格式校验）
  - [x] SubTask 5.6: 压缩过程中显示 toast "正在压缩图片..."（大文件时）

- [x] Task 6: 推送 GitHub
  - [x] SubTask 6.1: 提交并推送到 origin main + gh-pages
  - [x] SubTask 6.2: 验证 https://xiaozhenweiyan.github.io/math-pixel-site/ 可访问

# Task Dependencies
- [Task 1] 独立
- [Task 2] 独立
- [Task 3] 独立
- [Task 4] depends on [Task 3]（共享 calculateExpr 修改）
- [Task 5] 独立
- [Task 6] depends on all
