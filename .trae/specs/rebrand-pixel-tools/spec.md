# 仓库重命名 + 外层工具落地页 Spec

## Why
用户希望把项目升级为"像素风格工具网站"（pixel-tools），把现有的"数学学习网站"作为其中一个工具卡片。同时希望注册/登录在外层工具首页进行，删除现有自动隐藏的顶栏，只保留浮动返回按钮。最终通过 GitHub Pages 直接访问。

## What Changes
- **重命名 GitHub 仓库**：`math-pixel-site` → `pixel-tools`（保留所有历史和 Pages 配置）
- **新增外层落地页**：在现有"数学学习网站"落地页之前加一个"像素风格工具网站"落地页，标题"像素风格工具网站 PIXEL TOOLS"，含一张"像素数学"卡片，点击进入内层"数学学习网站"落地页
- **三层页面结构**：
  - 第 1 层 `#app-landing-page`（像素风格工具网站首页）：标题 + "像素数学"卡片 + 用户信息区（头像+昵称+设置+退出）
  - 第 2 层 `#landing-page`（数学学习网站首页）：标题 + "预测系统"+"计算机系统"两张卡片 + "← 返回工具首页"按钮
  - 第 3 层 功能页（预测/计算器/设置）：保留现有，浮动返回按钮回到第 2 层
- **注册弹窗位置**：保持 body 顶部，但标题改为"欢迎来到像素风格工具网站"，首次访问自动弹出
- **移除顶栏**：删除 `#topbar` div、`.topbar` 相关 CSS、`initTopbar`/`updateTopbar`/`initTopbarAutoHide` 相关 JS（保留 profile 模块本身）
- **用户信息区移到外层落地页**：在 `#app-landing-page` 内顶部显示头像 + 昵称 + 设置按钮 + 退出按钮（不再浮动，是落地页一部分）
- **保留浮动齿轮按钮**：`#btn-floating-settings` 在所有页面可见，点击进入设置页（功能不变）
- **保留浮动返回按钮**：预测/计算器/设置页的浮动返回按钮逻辑调整
  - 预测/计算器浮动返回按钮 → 回到第 2 层"数学学习网站"落地页（不变）
  - 设置页浮动返回按钮 → 回到第 1 层"像素风格工具网站"落地页
- **更新 body padding**：移除 `body { padding-top: 48px }`（顶栏已删）
- **更新 README.md**：标题改为"像素风格工具网站 Pixel Tools"，描述工具集合性质，列出"像素数学"工具，说明部署地址将变为 `pixel-tools.pages.dev` 或 `xiaozhenweiyan.github.io/pixel-tools/`
- **GitHub Pages**：重命名仓库后 Pages 会自动迁移，URL 从 `math-pixel-site` 变为 `pixel-tools`

## Impact
- Affected code: `index.html`（新增外层落地页、移除顶栏、调整用户信息区位置）、`styles/pixel.css`（移除 topbar 样式、新增 app-landing-page 样式、移除 body padding-top）、`js/app.js`（移除 topbar 相关函数、修改 init 流程、修改 showLanding/showSettings 等页面切换函数支持三层结构）、`README.md`（全面更新）
- 不影响现有预测/计算器/长期训练/神经网络/设置/图片压缩等功能
- GitHub 仓库 URL 变化：`github.com/xiaozhenweiyan/math-pixel-site` → `github.com/xiaozhenweiyan/pixel-tools`
- Pages URL 变化：`xiaozhenweiyan.github.io/math-pixel-site/` → `xiaozhenweiyan.github.io/pixel-tools/`

## ADDED Requirements

### Requirement: 外层"像素风格工具网站"落地页
系统 SHALL 在 body 顶部新增 `<div id="app-landing-page">`，标题"像素风格工具网站"，副标题"PIXEL TOOLS"，含一张"像素数学"卡片，点击进入内层"数学学习网站"落地页。该页面顶部显示用户信息区（头像+昵称+设置按钮+退出按钮）。

#### Scenario: 首次访问
- **WHEN** 用户打开网站
- **THEN** 显示注册弹窗（标题"欢迎来到像素风格工具网站"）
- **AND** 注册完成后显示外层"像素风格工具网站"落地页
- **AND** 落地页顶部显示用户头像和昵称

#### Scenario: 点击像素数学卡片
- **WHEN** 用户点击"像素数学"卡片
- **THEN** 显示内层"数学学习网站"落地页
- **AND** 内层落地页有"← 返回工具首页"按钮

#### Scenario: 从数学首页返回工具首页
- **WHEN** 用户点击"← 返回工具首页"按钮
- **THEN** 回到外层"像素风格工具网站"落地页

### Requirement: 三层页面切换
系统 SHALL 维护三层页面状态，每层都有对应的显示/隐藏函数。

#### Scenario: 显示工具首页
- **WHEN** 调用 showAppLanding()
- **THEN** 显示 #app-landing-page，隐藏其他所有页面

#### Scenario: 显示数学首页
- **WHEN** 调用 showMathLanding()
- **THEN** 显示 #landing-page，隐藏其他所有页面

#### Scenario: 显示预测页
- **WHEN** 调用 showPredictor()
- **THEN** 显示 #predictor-page，隐藏其他所有页面

### Requirement: 用户信息区在外层落地页
系统 SHALL 在 `#app-landing-page` 内顶部显示用户头像 + 昵称 + "设置"按钮 + "退出"按钮。该区域是落地页一部分（非浮动），随落地页显示/隐藏。

#### Scenario: 显示用户信息
- **WHEN** 用户已注册
- **THEN** 外层落地页顶部显示头像 + 昵称 + 设置 + 退出按钮

#### Scenario: 点击设置
- **WHEN** 用户点击"设置"按钮
- **THEN** 进入设置页

#### Scenario: 点击退出
- **WHEN** 用户点击"退出"按钮
- **THEN** 清除 sessionStorage
- **AND** 重新弹出注册对话框

## MODIFIED Requirements

### Requirement: 注册弹窗标题
注册弹窗 SHALL 把"欢迎来到数学学习网站"改为"欢迎来到像素风格工具网站"。

### Requirement: 设置页返回按钮
设置页 SHALL 的"返回首页"按钮改为返回外层"像素风格工具网站"落地页（而非内层数学首页）。

### Requirement: 浮动齿轮按钮
浮动齿轮按钮 SHALL 在所有页面保持可见，点击进入设置页（功能不变）。

## REMOVED Requirements

### Requirement: 顶栏自动隐藏
**Reason**: 用户要求删除顶栏，只保留浮动返回按钮
**Migration**: 用户信息移到外层落地页顶部，浮动齿轮按钮保留作为快捷设置入口

### Requirement: 顶栏用户信息条
**Reason**: 与外层落地页用户信息区重复
**Migration**: 用户信息区移到外层落地页
