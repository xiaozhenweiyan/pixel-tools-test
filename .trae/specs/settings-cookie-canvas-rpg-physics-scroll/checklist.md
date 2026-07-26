# Checklist

## Task 1: 设置页返回按钮浮动
- [ ] `index.html` 设置页 `<footer>` 内不再有 `#btn-back-home-settings`
- [ ] `#settings-page` 内新增右上角浮动返回按钮，class 含 `floating-back-btn`
- [ ] CSS `.floating-back-btn` 样式为 `position: fixed; top:12px; right:16px; z-index:9000`
- [ ] 点击浮动返回按钮调用 `showAppLanding()` 返回首页

## Task 2: 启动不强制昵称
- [ ] `app.js` 启动流程（约 4361-4364 行）不再调用 `showRegisterModal()`
- [ ] 首次访问（无 profile）直接进入首页，浮动头像标题显示"访客"
- [ ] 退出登录（约 649-656 行）后不再弹注册弹窗，改为回首页 + toast

## Task 3: localStorage + cookie 持久化
- [ ] `loadProfile()` 从 `localStorage` 读取（非 sessionStorage）
- [ ] `saveProfile()` 写入 `localStorage` + 设置 cookie `pixel_user_session=1; max-age=31536000`
- [ ] `clearProfile()` 清除 `localStorage` 条目 + 清除 cookie（max-age=0）
- [ ] 关闭浏览器后重开，昵称/头像/背景恢复，不弹注册窗
- [ ] 退出登录后 localStorage 和 cookie 均被清除
- [ ] 头像/背景 base64 写入 localStorage 配额不足时有兜底 toast

## Task 4: 像素画布放大
- [ ] `pixel.css` 中 `#pixel-drawing-canvas` 的 `max-width` 为 `768px`
- [ ] 逻辑像素档位（16/32/64/128）保持不变
- [ ] `image-rendering: pixelated` 保留

## Task 5: RPG 点击导航
- [ ] `pixel-rpg.js` 新增 `findPathBFS` 函数，墙壁不可通行
- [ ] 新增 `navigateTo` 函数，路径存入队列，`update` 逐格消费
- [ ] 点击空地：玩家沿 BFS 最短路径自动移动到目标
- [ ] 点击怪物：寻路到相邻格后触发 `combatRound()`
- [ ] 点击出口：寻路到出口后触发 `nextLevel()`
- [ ] 点击墙壁：无反应
- [ ] 绑定 `pointerdown` 事件（兼容鼠标+触屏）
- [ ] 移动期间忽略新点击
- [ ] 键盘操作（方向键/WASD）保留不变
- [ ] 寻路中按键盘可中断自动导航
- [ ] `#rpg-canvas` 有 `cursor: pointer`（桌面提示）

## Task 6: 物理沙盒（单独 sub-agent）
- [ ] `physics-sandbox.js` 删除 SAND/STONE/FIRE/PLANT/METAL/OIL/ACID 共 7 种物质
- [ ] 只保留 EMPTY（橡皮）和 WATER（水）
- [ ] 删除对应的 update 函数（updateSand/updateOil/updateAcid/updateFire/updatePlant/trySink/tryRise）
- [ ] 保留 `flowLiquid/tryFlow/updateWater`，水的下落+横向流动正常
- [ ] 新增 HYDROGEN（氢气）物质常量 + 颜色 + 名称
- [ ] 新增 `updateHydrogen`：向上移动，上方阻塞时横向飘动
- [ ] 氢气默认不可见（渲染为背景色/透明）
- [ ] 新增模块状态 `gasVisible` + `setGasVisible`/`toggleGas` 公共 API
- [ ] `render()` 根据 `gasVisible` 切换氢气可见性（可见时半透明淡蓝）
- [ ] `index.html` 新增"气体"按钮 `#btn-physics-gas`
- [ ] `app.js` `initPhysicsTool` 绑定"气体"按钮点击 → `toggleGas()`
- [ ] 元素按钮区显示 3 个按钮：橡皮、水、氢气
- [ ] 沙子/石头/火/植物/金属/油/酸的按钮消失

## Task 7: 滚动位置保存
- [ ] `app.js` 新增 `pageScrollPositions` 存储对象
- [ ] `showPage` 切换前保存当前可见页 `window.scrollY` 到 `pageScrollPositions[oldPageId]`
- [ ] `showPage` 显示新页面后恢复 `pageScrollPositions[newPageId]`（无记录则 0）
- [ ] 首页滚动 → 进工具页 → 返回首页，滚动位置恢复
- [ ] ESC 返回上一页，滚动位置恢复

## Task 8: 更新 README.md
- [ ] README.md 新增本次 7 项修复说明
- [ ] "项目结构"/"物理沙盒"章节反映物质精简为 3 种（橡皮/水/氢气）
- [ ] RPG 章节补充"点击地图自动导航（BFS，支持触屏）"
- [ ] 持久化章节说明 localStorage + cookie
- [ ] 设置页/昵称/画布/滚动相关说明同步更新

## Task 9: SW 版本 + 提交
- [ ] `service-worker.js` 的 `CACHE_VERSION` 已升级
- [ ] 所有改动 JS 文件 `node -c` 语法检查通过
- [ ] git commit 信息描述 7 项修复 + README 更新
- [ ] git push origin main 成功
