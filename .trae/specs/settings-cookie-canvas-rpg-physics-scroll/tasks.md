# Tasks

- [ ] Task 1: 设置页返回按钮移到右上角浮动
  - [ ] SubTask 1.1: 编辑 `index.html`（约 1587-1589 行），移除 `<footer>` 内的 `#btn-back-home-settings`，在 `#settings-page` 顶部新增 `<button id="btn-back-home-settings" class="floating-back-btn">←</button>`（右上角 fixed）
  - [ ] SubTask 1.2: 确认 `styles/pixel.css` 的 `.floating-back-btn` 样式（`position: fixed; top:12px; right:16px; z-index:9000`）对设置页生效；如不存在则补样式
  - [ ] SubTask 1.3: 确认 `js/app.js`（约 3205-3206 行）`btnBackSettings` 绑定仍指向 `showAppLanding`，无需改 JS 逻辑

- [ ] Task 2: 启动不再强制昵称注册弹窗
  - [ ] SubTask 2.1: 编辑 `js/app.js`（约 4361-4364 行），移除 `if (!hasProfile) { showRegisterModal(); }` 块，启动直接 `showAppLanding()`
  - [ ] SubTask 2.2: 编辑 `js/app.js`（约 649-656 行）退出登录处理器，移除 `clearProfile()` 后的 `showRegisterModal()` 调用，改为 `showAppLanding()` + toast 提示已退出
  - [ ] SubTask 2.3: `initRegisterModal()`（约 140-170 行）保留（供设置页或手动触发），但不再被启动流程调用

- [ ] Task 3: 用户信息从 sessionStorage 改为 localStorage + cookie
  - [ ] SubTask 3.1: 编辑 `js/app.js`（约 84-121 行）`loadProfile`：`sessionStorage` → `localStorage`
  - [ ] SubTask 3.2: 编辑 `saveProfile`：写入 `localStorage`，并增加 `document.cookie = 'pixel_user_session=1; max-age=31536000; path=/; SameSite=Lax'`
  - [ ] SubTask 3.3: 编辑 `clearProfile`：`localStorage.removeItem` + 清除 cookie（设 `max-age=0`）
  - [ ] SubTask 3.4: 增加 `getCookie(name)` 辅助函数（若不存在），供启动流程判断是否已注册
  - [ ] SubTask 3.5: 验证头像/背景 base64 data URL 写入 localStorage 不会因配额报错（保留原有 QuotaExceededError 兜底 toast）

- [ ] Task 4: 像素绘画编辑器画布放大
  - [ ] SubTask 4.1: 编辑 `styles/pixel.css`（约 2753-2772 行 `#pixel-drawing-canvas`）：`max-width: 512px` → `max-width: 768px`
  - [ ] SubTask 4.2: 确认逻辑像素尺寸（16/32/64/128）与 `image-rendering: pixelated` 保持不变

- [ ] Task 5: RPG 点击地图自动导航（BFS 寻路 + 触屏）
  - [ ] SubTask 5.1: 在 `js/pixel-rpg.js` 新增 `findPathBFS(startGx, startGy, endGx, endGy)` 函数：BFS 遍历网格，墙壁不可通行，返回路径坐标数组（含起点终点）或 null
  - [ ] SubTask 5.2: 新增 `navigateTo(targetGx, targetGy)` 函数：调用 BFS，将路径存入 `state.player.pathQueue`，在 `update(dt)` 中逐格消费路径（每到达一格取下一格，调用 `tryMove` 的核心位移逻辑）
  - [ ] SubTask 5.3: 处理目标格为怪物/宝箱/出口的特殊情况：寻路到相邻格后触发 `combatRound()`/`openChest()`/`nextLevel()`
  - [ ] SubTask 5.4: 新增 `onCanvasPointerDown(e)` 事件处理：屏幕坐标 → 网格坐标（`getGridPosFromEvent`），调用 `navigateTo`；移动期间忽略新点击
  - [ ] SubTask 5.5: 在 `attachEvents`/初始化处绑定 `rpg-canvas` 的 `pointerdown` 事件（pointer 事件兼容鼠标+触屏）
  - [ ] SubTask 5.6: CSS 给 `#rpg-canvas` 增加 `cursor: pointer`（桌面提示可点击）
  - [ ] SubTask 5.7: 验证键盘操作（方向键/WASD）不受影响；寻路过程中按键盘可中断自动导航

- [ ] Task 6: 物理沙盒大改（**单独 sub-agent 完成**）
  - [ ] SubTask 6.1: 编辑 `js/physics-sandbox.js`（约 29-37 行常量、42-52 行颜色、54 行名称、518-520 行 ELEMENTS 导出）：删除 SAND/STONE/FIRE/PLANT/METAL/OIL/ACID 共 7 种物质，只保留 EMPTY 和 WATER
  - [ ] SubTask 6.2: 删除 `updateSand/trySink/updateOil/updateAcid/updateFire/tryRise/updatePlant` 函数及 `updateCell` 的 switch 对应分支；保留 `flowLiquid/tryFlow/updateWater`
  - [ ] SubTask 6.3: 新增 `HYDROGEN` 物质常量（id=2）+ 颜色（半透明淡蓝 `rgba(180,220,255,0.4)`，不可见时用背景色）+ 名称"氢气"
  - [ ] SubTask 6.4: 新增 `updateHydrogen(x, y, idx)`：向上移动（`(x, y-1)`），上方阻塞时横向飘动（类似 `flowLiquid` 但方向反转）；不可见
  - [ ] SubTask 6.5: `render()` 增加可见性判断：新增模块状态 `gasVisible = false`；当 `gasVisible === false` 时氢气格子渲染为背景色（透明），`gasVisible === true` 时渲染半透明淡蓝
  - [ ] SubTask 6.6: 新增 `setGasVisible(bool)` 公共 API + `toggleGas()` 便捷方法
  - [ ] SubTask 6.7: 编辑 `index.html`（约 1380 行物理按钮区）新增"气体"按钮 `#btn-physics-gas`
  - [ ] SubTask 6.8: 编辑 `js/app.js` `initPhysicsTool`（约 2981-3037 行）：绑定"气体"按钮点击 → `PhysicsSandbox.toggleGas()`；元素按钮自动遍历会自动显示新的 3 个按钮（橡皮/水/氢气）
  - [ ] SubTask 6.9: 验证水的下落+流动正常；氢气上升正常；气体按钮切换可见性正常

- [ ] Task 7: 页面切换保存/恢复滚动位置
  - [ ] SubTask 7.1: 在 `js/app.js`（约 2438 行 `pageHistoryStack` 附近）新增 `pageScrollPositions = {}` 存储对象
  - [ ] SubTask 7.2: 编辑 `showPage(pageId)`（约 2509-2537 行）：在 `hideAllPages()` 前，遍历 `ACTIVE_PAGES`/`HIDDEN_PAGES` 找到当前可见页面，保存 `pageScrollPositions[currentPageId] = window.scrollY`；在显示新页面后，`window.scrollTo(0, pageScrollPositions[pageId] || 0)`
  - [ ] SubTask 7.3: 验证首页滚动 → 进入工具页 → 返回首页，滚动位置恢复；ESC 返回同样恢复

- [ ] Task 8: 更新 README.md
  - [ ] SubTask 8.1: 在 README.md 新增"更新日志"或扩充"功能特性"章节，记录本次 7 项修复：设置页返回键浮动、启动不强制昵称、localStorage+cookie 持久化、像素画布 768px、RPG 点击 BFS 导航、物理沙盒精简（水+氢气+气体按钮）、滚动位置保存
  - [ ] SubTask 8.2: 同步更新 README 中"项目结构"/"物理沙盒"章节，反映物质列表从 9 种精简为 3 种（橡皮/水/氢气）
  - [ ] SubTask 8.3: 同步更新 RPG 相关说明，补充"点击地图自动导航（BFS 寻路，支持触屏）"

- [ ] Task 9: Service Worker 缓存版本升级 + 提交推送
  - [ ] SubTask 9.1: 编辑 `service-worker.js`：`CACHE_VERSION` 当前值 → 下一版本（如 v17 → v18）
  - [ ] SubTask 9.2: `node -c` 语法检查所有改动的 JS 文件
  - [ ] SubTask 9.3: git add 改动文件 + commit（描述 7 项修复 + README 更新）+ push origin main

# Task Dependencies
- Task 1、Task 2、Task 3、Task 4、Task 5、Task 7 互相独立，可并行
- Task 6（物理沙盒）独立，由单独 sub-agent 完成，与其它任务并行
- Task 8（README）依赖 Task 1-7 完成后再写最终文案
- Task 9 依赖所有前序任务完成
