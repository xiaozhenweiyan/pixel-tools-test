# Tasks

- [x] Task 1: 浮动返回按钮 (index.html + pixel.css + app.js)
  - [x] SubTask 1.1: index.html 在 predictor-page 和 calculator-page 内顶部各加一个 `<button class="floating-back-btn" id="btn-back-home-predict">← 返回首页</button>` 和 `id="btn-back-home-calc"`
  - [x] SubTask 1.2: 移除原 header 内的 `btn-back-home-predict` 和 footer 内的 `btn-back-home-calc`（避免重复）
  - [x] SubTask 1.3: pixel.css 添加 `.floating-back-btn` 样式：position:fixed，top:12px，right:12px，z-index:9999，像素风（3px 白边框、4px 圆角、金色文字、深空背景）
  - [x] SubTask 1.4: app.js 的 initPageSwitching 已绑定这两个 id，无需重复绑定（确认 id 名称一致即可）

- [x] Task 2: 临时账号注册弹窗 (index.html + pixel.css + app.js)
  - [x] SubTask 2.1: index.html 新增注册弹窗 div（id="register-modal"），含输入框（id="register-nickname"）、"确定"按钮（id="register-confirm"）、"跳过"按钮（id="register-skip"）
  - [x] SubTask 2.2: pixel.css 添加弹窗样式（`.register-modal`、`.register-modal-content`、遮罩层），像素风
  - [x] SubTask 2.3: app.js 新增 `profile` 模块：loadProfile/saveProfile/clearProfile（sessionStorage key=`pixel_user_profile`，结构 {nickname, avatar, bgType, bgValue}）
  - [x] SubTask 2.4: app.js 新增 `showRegisterModal`/`hideRegisterModal` 函数
  - [x] SubTask 2.5: app.js init 中检测：若 sessionStorage 无 profile，则弹窗；用户输入昵称或跳过后存入 sessionStorage 并关闭弹窗
  - [x] SubTask 2.6: 输入框预填"访客"，确定时若输入为空则用"访客"

- [x] Task 3: 顶栏用户信息条 (index.html + pixel.css + app.js)
  - [x] SubTask 3.1: index.html 在 body 顶部（landing-page 之前）新增 `<div class="topbar" id="topbar">`，含：头像 img（id="topbar-avatar"）、昵称 span（id="topbar-nickname"）、"设置"按钮（id="btn-settings"）、"退出"按钮（id="btn-logout"）
  - [x] SubTask 3.2: pixel.css 添加 `.topbar` 样式：固定顶部、flex 布局、像素风、深空背景、3px 白边框、4px 圆角
  - [x] SubTask 3.3: pixel.css 添加 `.topbar-avatar` 样式：32x32 方形（像素风，非圆角）、3px 白边框
  - [x] SubTask 3.4: app.js 新增 `updateTopbar` 函数：根据 profile 更新头像（无头像时显示昵称首字占位 div）和昵称
  - [x] SubTask 3.5: app.js 绑定"退出"按钮：clearProfile + 重新弹注册窗 + updateTopbar
  - [x] SubTask 3.6: app.js 绑定"设置"按钮：showSettings()
  - [x] SubTask 3.7: 由于 topbar 固定顶部，body 需要 padding-top 避免遮挡内容

- [x] Task 4: 设置页面 (index.html + pixel.css + app.js)
  - [x] SubTask 4.1: index.html 落地页新增第三张"个人系统"卡片（id="btn-enter-settings"），SVG 图标用齿轮
  - [x] SubTask 4.2: index.html 新增设置页面 div（id="settings-page"），含：昵称输入框、头像上传 input file、头像预览、背景图片上传 input file、背景颜色 color picker、恢复默认背景按钮、保存按钮、返回首页按钮
  - [x] SubTask 4.3: pixel.css 添加 `.settings-page`、`.settings-form`、`.settings-section`、`.settings-avatar-preview` 等样式
  - [x] SubTask 4.4: app.js 新增 `showSettings`/`hideSettings` 函数（页面切换）
  - [x] SubTask 4.5: app.js 实现头像上传：FileReader 读取 → 校验格式（jpg/jpeg/png/gif/webp/svg）和大小（≤200KB）→ base64 存 profile.avatar → 更新预览和顶栏
  - [x] SubTask 4.6: app.js 实现背景图片上传：同头像逻辑，大小限制 1MB，存 profile.bgType='image', bgValue=base64
  - [x] SubTask 4.7: app.js 实现背景颜色选择：color picker change 事件 → profile.bgType='color', bgValue=color → applyBackground()
  - [x] SubTask 4.8: app.js 实现 applyBackground()：根据 profile.bgType 设置 document.body.style.background
  - [x] SubTask 4.9: app.js 实现恢复默认背景：清除 profile.bgType/bgValue → document.body.style.background = '' → saveProfile
  - [x] SubTask 4.10: app.js 实现保存昵称：input change → profile.nickname → saveProfile → updateTopbar
  - [x] SubTask 4.11: app.js init 中调用 applyBackground() 和 updateTopbar() 恢复状态
  - [x] SubTask 4.12: app.js initPageSwitching 中添加"个人系统"卡片和设置页返回按钮的事件绑定

- [x] Task 5: 推送 GitHub
  - [x] SubTask 5.1: 提交并推送到 origin main + gh-pages
  - [x] SubTask 5.2: 验证 https://xiaozhenweiyan.github.io/math-pixel-site/ 可访问

# Task Dependencies
- [Task 2] 独立，可先做
- [Task 3] depends on [Task 2]（顶栏显示需要 profile 数据）
- [Task 4] depends on [Task 2]（设置页修改 profile）和 [Task 3]（修改后更新顶栏）
- [Task 1] 独立，可并行
- [Task 5] depends on all
