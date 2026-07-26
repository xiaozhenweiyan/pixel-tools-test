# 设置页/昵称/持久化/画布/RPG触屏/物理/滚动 修复 Spec

## Why
用户反馈 7 处体验问题：设置页返回键位置不佳、启动强制写昵称、关闭浏览器需重复注册、像素绘画画布太小、RPG 手机无法操作、物理沙盒无物理效果、返回上一页滚动位置丢失。需统一修复以提升可用性与移动端体验。

## What Changes
- 设置页"返回首页"按钮从底部 `<footer>` 移到右上角浮动按钮（与其它工具页 `floating-back-btn` 风格统一）
- 启动时不再强制弹出昵称注册弹窗；改为静默使用默认昵称"访客"，用户可随时在设置页修改
- 用户信息持久化从 `sessionStorage` 改为 `localStorage`，并增加 cookie 标记位，关闭浏览器后仍保留昵称/头像/背景等全部信息，不再重复注册
- 像素绘画编辑器画布显示尺寸放大（`max-width: 512px` → `768px`）
- RPG 增加点击地图自动导航（BFS 寻路），手机触屏与电脑鼠标均适用；保留键盘操作
- **物理沙盒大改（单独 sub-agent）**：删除沙/石头/火/植物/金属/油/酸共 7 种物质，只保留水及其物理性质；新增氢气物质（上升、不可见）；新增"气体"按钮切换气体可见性
- 页面切换时保存上一页面滚动位置，返回时恢复（不再回到顶层）
- 更新 README.md，记录本次 7 项修复与新增功能（设置页返回键、昵称、持久化、画布、RPG 触屏、物理沙盒、滚动位置）

## Impact
- 受影响代码：
  - `index.html`（设置页 footer、注册弹窗、像素画布、RPG 页面、物理 UI 按钮）
  - `js/app.js`（`showPage`、`loadProfile/saveProfile/clearProfile`、启动流程 `initRegisterModal`、`initPhysicsTool`、RPG 触屏绑定入口）
  - `js/pixel-rpg.js`（新增 BFS 寻路 + 触屏点击导航）
  - `js/pixel-drawing-editor.js`（画布尺寸，如需联动）
  - `js/physics-sandbox.js`（物质列表大改 + 氢气 + 气体可见性）
  - `styles/pixel.css`（设置页返回按钮浮动样式、画布尺寸、RPG 触屏光标）
  - `service-worker.js`（缓存版本升级）

## ADDED Requirements

### Requirement: 设置页返回按钮浮动至右上角
设置页的"返回首页"按钮 SHALL 显示在页面右上角，采用 `position: fixed` 浮动样式，与其它工具页的 `floating-back-btn` 风格一致；不再放在页面底部 `<footer>` 内。

#### Scenario: 进入设置页看到返回按钮
- **WHEN** 用户从首页齿轮或浮动头像进入设置页
- **THEN** 右上角出现浮动"← 返回"按钮（`position: fixed; top: 12px; right: 16px; z-index: 9000`）
- **AND** 页面底部 `<footer>` 不再有返回按钮

#### Scenario: 点击返回回首页
- **WHEN** 用户点击右上角浮动返回按钮
- **THEN** 调用 `showAppLanding()` 返回首页

### Requirement: 启动不强制昵称注册
应用启动时 SHALL NOT 强制弹出昵称注册弹窗。若无已保存 profile，SHALL 静默使用默认昵称"访客"并直接进入首页。

#### Scenario: 首次访问无 profile
- **WHEN** 用户首次访问且 `localStorage` 无 `pixel_user_profile`
- **THEN** 不弹出注册弹窗
- **AND** 直接进入首页（`showAppLanding()`）
- **AND** 浮动头像标题显示"访客"

#### Scenario: 设置页修改昵称
- **WHEN** 用户在设置页输入昵称并点击保存
- **THEN** 昵称保存到 `localStorage`
- **AND** 浮动头像标题更新

### Requirement: 用户信息 localStorage + cookie 持久化
用户信息（昵称、头像、背景类型与值）SHALL 持久化到 `localStorage`（键名 `pixel_user_profile`），关闭浏览器后仍保留。同时 SHALL 设置一个 cookie `pixel_user_session=1`（max-age 一年）作为"已注册"标记，避免重复触发注册流程。

#### Scenario: 关闭浏览器后重开
- **WHEN** 用户关闭浏览器后重新打开应用
- **THEN** 从 `localStorage` 读取 `pixel_user_profile` 恢复昵称/头像/背景
- **AND** 不弹出注册弹窗
- **AND** 应用之前设置的背景

#### Scenario: 退出登录
- **WHEN** 用户在设置页点击"退出登录"
- **THEN** 清除 `localStorage` 的 `pixel_user_profile` 和 cookie `pixel_user_session`
- **AND** 重置 profile 为默认值
- **AND** 不强制弹出注册弹窗（静默使用默认昵称"访客"）

### Requirement: 像素绘画编辑器画布放大
像素绘画编辑器画布的 CSS 显示尺寸 SHALL 从 `max-width: 512px` 增大到 `max-width: 768px`，逻辑像素尺寸（16/32/64/128 档位）保持不变。

#### Scenario: 打开绘画编辑器
- **WHEN** 用户进入像素绘画编辑器
- **THEN** 画布显示尺寸最大为 768×768px
- **AND** 像素化渲染（`image-rendering: pixelated`）保持

### Requirement: RPG 点击地图自动导航（BFS 寻路）
RPG SHALL 支持点击/触摸地图任意可移动格子，玩家自动沿最短路径（BFS）逐格移动到目标点。手机触屏与电脑鼠标均适用。键盘操作（方向键/WASD）保留不变。

#### Scenario: 手机点击空地导航
- **WHEN** 用户在手机上点击地图中一个可移动空地格子（非墙、非怪物、非宝箱、非出口）
- **THEN** 系统计算从玩家当前格到目标格的 BFS 最短路径
- **AND** 玩家沿路径逐格自动移动（每格使用现有 `tryMove` 逻辑与 `MOVE_SPEED`）
- **AND** 移动期间忽略新点击，直到到达或被中断

#### Scenario: 点击怪物
- **WHEN** 用户点击怪物所在格子
- **THEN** 玩家先 BFS 寻路到怪物相邻格，再触发 `combatRound()`

#### Scenario: 点击墙壁
- **WHEN** 用户点击墙壁格子
- **THEN** 无反应（路径不可达）

#### Scenario: 点击出口
- **WHEN** 用户点击出口格子
- **THEN** 玩家 BFS 寻路到出口，到达后触发 `nextLevel()`

#### Scenario: 键盘操作保留
- **WHEN** 用户按方向键或 WASD
- **THEN** 仍按原有 `tryMove(dx, dy)` 逐格移动

### Requirement: 物理沙盒只保留水并新增氢气（单独 sub-agent）
物理沙盒 SHALL 删除沙/石头/火/植物/金属/油/酸共 7 种物质，只保留水（EMPTY 橡皮保留为擦除工具）。水的下落 + 横向流动物理性质 SHALL 保留。SHALL 新增"氢气"物质：向上飘（与重力相反）、默认不可见。SHALL 新增"气体"按钮：点击切换气体的可见/不可见状态。

#### Scenario: 物质列表精简
- **WHEN** 用户打开物理沙盒
- **THEN** 元素按钮区只显示：橡皮、水、氢气（共 3 个）
- **AND** 沙子/石头/火/植物/金属/油/酸的按钮消失

#### Scenario: 水的物理性质保留
- **WHEN** 用户画水并开始模拟
- **THEN** 水向下流动 + 横向铺开（原有 `flowLiquid` 逻辑）

#### Scenario: 氢气上升且默认不可见
- **WHEN** 用户画氢气并开始模拟
- **THEN** 氢气向上移动（与水相反方向）
- **AND** 氢气默认不可见（渲染为透明/背景色）

#### Scenario: 气体按钮切换可见性
- **WHEN** 用户点击"气体"按钮
- **THEN** 氢气变为可见（用半透明淡蓝色显示）
- **WHEN** 用户再次点击"气体"按钮
- **THEN** 氢气恢复不可见

### Requirement: 页面切换保存滚动位置
页面切换时 SHALL 保存当前页面（滚动容器）的 `scrollTop`，返回该页面时恢复到上次离开的滚动位置。

#### Scenario: 滚动后返回
- **WHEN** 用户在首页向下滚动后进入某个工具页，再返回首页
- **THEN** 首页滚动位置恢复到离开时的位置（非顶层）

#### Scenario: ESC 返回
- **WHEN** 用户按 ESC 返回上一页
- **THEN** 上一页滚动位置恢复

### Requirement: 更新 README.md
README.md SHALL 新增本次 7 项修复与新增功能的说明，包括：设置页返回键位置、启动不强制昵称、localStorage+cookie 持久化、像素画布放大、RPG 点击导航（BFS）、物理沙盒精简（水+氢气+气体按钮）、滚动位置保存。

#### Scenario: README 内容更新
- **WHEN** 开发者阅读 README.md
- **THEN** 能看到本次更新的功能列表与对应说明
- **AND** README 中的"项目结构"/"功能特性"章节同步反映物理沙盒物质精简、RPG 触屏导航等变化

## MODIFIED Requirements

### Requirement: loadProfile / saveProfile / clearProfile 持久化升级
`loadProfile()` SHALL 从 `localStorage`（而非 `sessionStorage`）读取 `pixel_user_profile`。`saveProfile()` SHALL 写入 `localStorage` 并同时设置 cookie `pixel_user_session=1`（max-age 一年）。`clearProfile()` SHALL 清除 `localStorage` 条目和 cookie。注册弹窗的强制弹出逻辑（启动时 `if (!hasProfile) showRegisterModal()`）SHALL 被移除。

### Requirement: showPage 保存/恢复滚动位置
`showPage(pageId)` 在切换前 SHALL 保存当前可见页面的 `scrollTop` 到 `pageScrollPositions[oldPageId]`，在显示新页面后 SHALL 恢复 `pageScrollPositions[newPageId]`（若有记录）。滚动容器为 `window`（页面级滚动）。

### Requirement: 设置页 footer 移除返回按钮
`index.html` 设置页的 `<footer>` 内的 `#btn-back-home-settings` SHALL 移除，改为在 `#settings-page` 内新增一个 `floating-back-btn` 样式的浮动按钮（右上角）。

## REMOVED Requirements

### Requirement: 启动强制注册弹窗
**Reason**: 用户反馈"开始不要强制用户写昵称"。
**Migration**: 启动时不再调用 `showRegisterModal()`。注册弹窗的 HTML 与 `initRegisterModal` 函数可保留（供未来手动触发），但启动流程不再自动弹窗。退出登录后也不再自动弹窗。
