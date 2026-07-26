# Tasks

- [x] Task 1: 重命名 GitHub 仓库 math-pixel-site → pixel-tools
  - [x] SubTask 1.1: 用 GitHub API PATCH /repos/xiaozhenweiyan/math-pixel-site 把 name 改为 pixel-tools（用 token 认证）
  - [x] SubTask 1.2: 验证 https://github.com/xiaozhenweiyan/pixel-tools 可访问（HTTP 200）
  - [x] SubTask 1.3: /workspace 的 origin 已配置为 https://github.com/xiaozhenweiyan/pixel-tools.git（无需修改）

- [x] Task 2: 新增外层"像素风格工具网站"落地页 (index.html + pixel.css)
  - [x] SubTask 2.1: index.html 在 `<body>` 之后、`register-modal` 之后新增 `<div id="app-landing-page" class="app-landing-page">`
  - [x] SubTask 2.2: 在 app-landing-page 内顶部新增用户信息区：头像 div（id="app-avatar"）、昵称 span（id="app-nickname"）、"设置"按钮（id="btn-app-settings"）、"退出"按钮（id="btn-app-logout"）
  - [x] SubTask 2.3: 在 app-landing-page 内中部新增标题 `<h1 class="app-landing-title">像素风格工具网站</h1>` 和副标题 `<p class="app-landing-subtitle">PIXEL TOOLS</p>`
  - [x] SubTask 2.4: 在 app-landing-page 内新增"像素数学"卡片按钮（id="btn-enter-math"），SVG 图标用像素风数学符号（如 π 或 ∑）
  - [x] SubTask 2.5: pixel.css 添加 `.app-landing-page`、`.app-landing-content`、`.app-landing-title`、`.app-landing-subtitle`、`.app-landing-cards`、`.app-landing-card`、`.app-user-bar` 等样式（与现有像素风一致，参考现有 .landing-page 样式）

- [x] Task 3: 移除顶栏 + 移除 body padding-top (index.html + pixel.css + app.js)
  - [x] SubTask 3.1: index.html 移除整个 `<div class="topbar" id="topbar">...</div>` 块
  - [x] SubTask 3.2: pixel.css 移除 `.topbar`、`.topbar-left`、`.topbar-right`、`.topbar-avatar`、`.topbar-nickname`、`.topbar-btn`、`.topbar.visible` 等所有 topbar 相关样式
  - [x] SubTask 3.3: pixel.css 移除 `body { padding-top: 48px; }` 规则（或改为 0）
  - [x] SubTask 3.4: app.js 移除 `updateTopbar`、`initTopbar`、`initTopbarAutoHide` 函数定义
  - [x] SubTask 3.5: app.js 移除 init 中对 initTopbar()、initTopbarAutoHide()、updateTopbar() 的调用
  - [x] SubTask 3.6: app.js 新增 `updateAppUserBar` 函数：根据 profile 更新 #app-avatar 和 #app-nickname（无头像时显示首字）
  - [x] SubTask 3.7: app.js init 中调用 updateAppUserBar()（替代 updateTopbar）
  - [x] SubTask 3.8: app.js 注册成功、退出、保存昵称、上传头像后调用 updateAppUserBar()（替代 updateTopbar）

- [x] Task 4: 三层页面切换逻辑 (app.js)
  - [x] SubTask 4.1: app.js 新增 `showAppLanding()` 函数：显示 #app-landing-page，隐藏 #landing-page、#predictor-page、#calculator-page、#settings-page
  - [x] SubTask 4.2: app.js 把现有 `showLanding()` 重命名为 `showMathLanding()`（显示内层数学首页），或保留 showLanding 名称但修改逻辑为显示数学首页
  - [x] SubTask 4.3: app.js 修改 initPageSwitching：
    - 新增 `btn-enter-math` 绑定 → showMathLanding
    - 新增 `btn-back-to-tools` 绑定 → showAppLanding（在内层数学首页添加"← 返回工具首页"按钮）
    - 修改 `btn-floating-settings` 仍绑定 showSettings
    - 修改 `btn-back-home-settings` 改为绑定 showAppLanding（设置页返回到工具首页而非数学首页）
  - [x] SubTask 4.4: app.js 在 showSettings() 中：隐藏 #app-landing-page、#landing-page、#predictor-page、#calculator-page，显示 #settings-page
  - [x] SubTask 4.5: app.js 在 showPredictor/showCalculator 中：隐藏 #app-landing-page（原 showLanding 改为 showMathLanding 时已处理）
  - [x] SubTask 4.6: app.js 修改 init 末尾的默认页面显示：调用 showAppLanding() 而非 showLanding()

- [x] Task 5: 内层数学首页加"返回工具首页"按钮 (index.html + pixel.css)
  - [x] SubTask 5.1: index.html 在 `#landing-page` 内顶部新增 `<button class="floating-back-btn" id="btn-back-to-tools">← 返回工具首页</button>`
  - [x] SubTask 5.2: pixel.css 确认 `.floating-back-btn` 样式（已存在，top:12px right:16px）
  - [x] SubTask 5.3: 由于 #app-landing-page 也有用户信息区在顶部，浮动返回按钮 top 可能需要调整为 12px（保持现状即可）
  - [x] SubTask 5.4: index.html 把 `<title>数学学习网站</title>` 改为 `<title>像素风格工具网站 Pixel Tools</title>`

- [x] Task 6: 修改注册弹窗文案 (index.html)
  - [x] SubTask 6.1: index.html 修改 `<h2>欢迎来到数学学习网站</h2>` 为 `<h2>欢迎来到像素风格工具网站</h2>`

- [x] Task 7: 用户信息区事件绑定 (app.js)
  - [x] SubTask 7.1: app.js 新增 `initAppUserBar` 函数：绑定 `btn-app-settings` → showSettings，绑定 `btn-app-logout` → clearProfile + applyBackground + showRegisterModal + updateAppUserBar
  - [x] SubTask 7.2: app.js init 中调用 initAppUserBar()

- [x] Task 8: 更新 README.md
  - [x] SubTask 8.1: 标题改为"像素风格工具网站 / Pixel Tools"
  - [x] SubTask 8.2: 描述更新为"像素复古风工具集合网站，目前包含像素数学工具（含预测系统、计算器），后续会扩展更多工具"
  - [x] SubTask 8.3: 部署地址更新为 https://xiaozhenweiyan.github.io/pixel-tools/
  - [x] SubTask 8.4: 仓库地址更新为 https://github.com/xiaozhenweiyan/pixel-tools
  - [x] SubTask 8.5: 功能列表新增"外层工具首页 + 像素数学卡片"结构说明
  - [x] SubTask 8.6: 用户系统说明更新（注册在工具首页，无顶栏）

- [x] Task 9: 推送 GitHub + Pages 部署
  - [x] SubTask 9.1: git add 所有改动，提交，推送到 origin main
  - [x] SubTask 9.2: 推送 main 到 gh-pages 分支
  - [x] SubTask 9.3: 验证 https://xiaozhenweiyan.github.io/pixel-tools/ 可访问（HTTP 200）
  - [x] SubTask 9.4: 向用户报告最终网页地址

# Task Dependencies
- [Task 1] 独立（GitHub API 操作）
- [Task 2] 独立（新增外层落地页 DOM 和 CSS）
- [Task 3] 独立（移除顶栏）
- [Task 4] depends on [Task 2]（需要外层落地页 DOM）和 [Task 3]（需要移除顶栏后的状态）
- [Task 5] depends on [Task 2]（内层落地页结构）
- [Task 6] 独立
- [Task 7] depends on [Task 2]（需要用户信息区 DOM）和 [Task 3]（需要移除顶栏）
- [Task 8] 独立
- [Task 9] depends on all
