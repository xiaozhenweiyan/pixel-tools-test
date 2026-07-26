# Tasks

- [x] Task 1: 删除顶部用户栏 + 浮动头像 (index.html + pixel.css + app.js)
  - [x] SubTask 1.1: index.html 移除整个 `<div class="app-user-bar pixel-panel">...</div>` 块
  - [x] SubTask 1.2: index.html 在 toast 之前新增 `<button class="floating-avatar" id="floating-avatar" title="访客">` 含头像 div
  - [x] SubTask 1.3: pixel.css 新增 `.floating-avatar` 样式：position:fixed，top:12px，left:16px，z-index:9999，36x36 方形像素风（3px 白边框、4px 圆角、深空背景），background-image 显示头像
  - [x] SubTask 1.4: pixel.css 修改 `.floating-settings-btn` 的 right 从 120px 改为 60px
  - [x] SubTask 1.5: app.js 修改 updateAppUserBar → 改名/新增 updateFloatingAvatar：更新 floating-avatar 的 background-image（有头像时）或首字（无头像时）和 title 属性（昵称）
  - [x] SubTask 1.6: app.js 绑定 floating-avatar 的 click 事件到 showSettings
  - [x] SubTask 1.7: app.js 移除 initAppUserBar 中对 btn-app-settings 和 btn-app-logout 的绑定（这两个按钮已删除）
  - [x] SubTask 1.8: app.js 所有调用 updateAppUserBar() 的地方改为调用 updateFloatingAvatar()（或保留 updateAppUserBar 函数名但内部更新 floating-avatar）

- [x] Task 2: 运算过程框位置调整 (index.html + pixel.css)
  - [x] SubTask 2.1: index.html 把 `<div class="calc-steps-wrap">...</div>` 从 `<div class="calc-bottom-row">` 内移出
  - [x] SubTask 2.2: index.html 把 calc-steps-wrap 放到 `<input id="calc-input">` 之后（输入框下方）
  - [x] SubTask 2.3: index.html 移除 calc-bottom-row div（现在只剩 calc-keys，可直接去掉包裹层）
  - [x] SubTask 2.4: pixel.css 移除 `.calc-bottom-row` 相关样式（flex 布局不再需要）
  - [x] SubTask 2.5: pixel.css 调整 calc-steps-wrap 宽度为 100%（独占输入框下方一行）
  - [x] SubTask 2.6: 验证按键网格不再被挤压，独占一行

- [x] Task 3: 计算器三角函数按键 (index.html + app.js)
  - [x] SubTask 3.1: index.html 在计算器按键网格中新增 sin、cos、tan 三个按键（data-key 分别为 sin/cos/tan）
  - [x] SubTask 3.2: index.html 新增 DEG/RAD 切换按键（id="calc-angle-mode"），显示当前模式（默认 RAD）
  - [x] SubTask 3.3: app.js 新增 calcAngleMode 变量（'RAD' 或 'DEG'），绑定切换按键事件
  - [x] SubTask 3.4: app.js 修改 calcAppendKey：当 key === 'sin'/'cos'/'tan' 时追加 `sin(`/`cos(`/`tan(`
  - [x] SubTask 3.5: app.js 修改 calculateExpr：
    - 白名单允许 sin/cos/tan/Math. 字符
    - DEG 模式下把 `sin(`/`cos(`/`tan(` 替换为 `Math.sin(x*Math.PI/180)` 等
    - RAD 模式下替换为 `Math.sin(x)` 等
  - [x] SubTask 3.6: app.js 新增特殊角度查表函数 getExactTrig(func, angle, mode)：
    - DEG 模式：0/30/45/60/90/120/135/150/180/270/360 度返回精确值
    - RAD 模式：0/π/6/π/4/π/3/π/2 等返回精确值
    - 非特殊角度返回 null（用 Math 计算）
  - [x] SubTask 3.7: app.js 修改 calcEvaluate：三角函数调用时先查表，查表命中用精确值，否则用 Math 计算 + 浮点吸附
  - [x] SubTask 3.8: app.js 修改 computeStepsWithTrace：支持 sin/cos/tan 化简（类似 sqrt）
  - [x] SubTask 3.9: 验证 sin(π/2)=1（RAD）、sin(90)=1（DEG）、sin(30)=0.5（DEG）、cos(60)=0.5（DEG）、tan(45)=1（DEG）

- [x] Task 4: 运算过程动态化显示 (app.js)
  - [x] SubTask 4.1: app.js 修改 calcEvaluate：求值成功后立即显示 finalValue 到 calc-current
  - [x] SubTask 4.2: app.js 新增 showCalcStepsAnimated(steps, finalValue, error) 函数：
    - 先清空 calc-steps
    - 用 setTimeout 逐步添加步骤行，每步 200ms 延迟
    - 最后添加 = 结果行
  - [x] SubTask 4.3: 错误时立即显示错误，不延迟
  - [x] SubTask 4.4: app.js calcEvaluate 调用 showCalcStepsAnimated 替代 showCalcSteps

- [x] Task 5: 大数和多小数显示 (app.js)
  - [x] SubTask 5.1: app.js 修改 formatCalcResult：
    - 整数直接 String(value)
    - 检测 String(value) 是否含 'e' 或 'E'
    - 若含科学计数法，手动展开：分离尾数和指数，移动小数点
    - 小数最多保留 20 位（用 toFixed(20) 然后 trim 末尾 0）
  - [x] SubTask 5.2: 验证 999999999999*999999999999 = 999999999998000000000001（无 e，注：因 JS Number 精度限制实际末位可能为 0）
  - [x] SubTask 5.3: 验证 1/3 = 0.33333333333333333333（20 位内）
  - [x] SubTask 5.4: 验证超大数（>1e308）显示 Infinity

- [x] Task 6: 设置页新增退出按钮 (index.html + app.js)
  - [x] SubTask 6.1: index.html 在 settings-page 的 settings-panel 内新增"退出登录"按钮（id="btn-settings-logout"）
  - [x] SubTask 6.2: app.js 在 initSettings 中绑定 btn-settings-logout：clearProfile + applyBackground + updateFloatingAvatar + showAppLanding + showRegisterModal

- [x] Task 7: 仓库地址展示 (index.html + README.md)
  - [x] SubTask 7.1: index.html 在 app-landing-page 底部新增 footer，显示仓库地址链接 https://github.com/xiaozhenweiyan/pixel-tools
  - [x] SubTask 7.2: README.md 确认仓库地址和网页地址正确
  - [x] SubTask 7.3: 向用户说明自定义域名 https://pixel-tools 不可行（不是合法域名），要去 github 短网址需购买自己的域名（如 pixeltools.com）

- [x] Task 8: 推送 GitHub
  - [x] SubTask 8.1: 提交并推送到 origin main + gh-pages
  - [x] SubTask 8.2: 验证 https://xiaozhenweiyan.github.io/pixel-tools/ 可访问

# Task Dependencies
- [Task 1] 独立
- [Task 2] 独立
- [Task 3] 独立（修改 calculateExpr）
- [Task 4] depends on [Task 3]（共享 calcEvaluate 修改）
- [Task 5] 独立（修改 formatCalcResult）
- [Task 6] depends on [Task 1]（退出逻辑迁移）
- [Task 7] 独立
- [Task 8] depends on all
