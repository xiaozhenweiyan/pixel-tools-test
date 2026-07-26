# 用户档案 + 设置系统 Spec

## Why
当前网站是纯匿名访问，无任何个性化；返回按钮藏在 header/footer 里不够显眼，用户反馈"打不开"或找不到。用户希望：(1) 两个系统的返回按钮更醒目；(2) 支持注册临时账号（关闭浏览器自动销毁，无需真实认证）；(3) 可上传自定义头像；(4) 新增设置页可改用户名/头像/自定义背景（支持多种图片格式）。

## What Changes
- **两个系统的返回按钮**改为 sticky 浮动样式（固定在右上角，始终可见，像素风）
- 新增**临时账号系统**：首次访问弹窗询问昵称（可跳过，默认"访客"），数据存 sessionStorage（关闭标签页即销毁）
- 顶栏新增**用户信息条**：显示头像 + 昵称 + 设置入口 + 退出按钮
- 新增**设置页面**（落地页第三张卡片"个人系统"）：
  - 修改昵称
  - 上传头像（支持 jpg/png/gif/webp/svg，限制 200KB）
  - 自定义背景图片（支持 jpg/png/gif/webp/svg，限制 1MB）
  - 自定义背景颜色（color picker，与图片二选一）
  - 一键清除背景恢复默认深空色
- 所有用户数据持久化策略：
  - **sessionStorage**：临时账号模式（退出/关闭标签页自动销毁）
  - 头像/背景图片用 base64 存 sessionStorage
- 设置入口：顶栏用户信息条 + 落地页"个人系统"卡片

## Impact
- Affected code: `index.html`（顶栏、设置页、返回按钮、个人系统卡片）、`styles/pixel.css`（浮动返回按钮、顶栏、设置页样式）、`js/app.js`（账号、头像、背景、设置逻辑）
- 不影响现有预测/计算器/长期训练功能
- 落地页从两张卡片扩展为三张（预测/计算机/个人系统）

## ADDED Requirements

### Requirement: 浮动返回按钮
系统 SHALL 在预测系统页面和计算器页面右上角显示**固定的浮动返回按钮**（sticky/fixed 定位，z-index 高于其他元素），像素风样式，按钮文字为"← 返回首页"，始终可见不随滚动消失。原有的 header/footer 内返回按钮可移除以避免重复。

#### Scenario: 预测系统返回按钮
- **WHEN** 用户在预测系统页面滚动
- **THEN** 右上角始终显示"← 返回首页"按钮
- **AND** 点击后回到落地页

#### Scenario: 计算器返回按钮
- **WHEN** 用户在计算器页面滚动
- **THEN** 右上角始终显示"← 返回首页"按钮
- **AND** 点击后回到落地页

### Requirement: 临时账号注册
系统 SHALL 在用户首次访问网站时弹出像素风对话框，提示输入昵称（可跳过）。昵称存入 sessionStorage（key=`pixel_user_profile`）。关闭标签页/浏览器后数据自动销毁。

#### Scenario: 首次访问
- **WHEN** 用户首次打开网站（sessionStorage 中无 profile）
- **THEN** 弹窗显示"欢迎来到数学学习网站，请输入你的昵称"
- **AND** 输入框预填"访客"
- **AND** 有"确定"和"跳过"按钮

#### Scenario: 跳过注册
- **WHEN** 用户点击"跳过"
- **THEN** 昵称设为"访客"
- **AND** 弹窗关闭，进入落地页

#### Scenario: 关闭浏览器销毁
- **WHEN** 用户关闭标签页或浏览器
- **THEN** sessionStorage 中的 profile 数据被浏览器自动清除
- **AND** 下次打开网站重新弹窗

### Requirement: 顶栏用户信息条
系统 SHALL 在所有页面顶部显示一个像素风用户信息条，包含：头像（无头像时显示昵称首字）、昵称、"设置"按钮、"退出"按钮。

#### Scenario: 显示用户信息
- **WHEN** 用户已注册（或跳过默认访客）
- **THEN** 顶栏左侧显示头像 + 昵称
- **AND** 顶栏右侧显示"设置"和"退出"按钮

#### Scenario: 退出登录
- **WHEN** 用户点击"退出"按钮
- **THEN** sessionStorage 中的 profile 数据被清除
- **AND** 重新弹出注册对话框

### Requirement: 设置页面
系统 SHALL 提供设置页面（可通过顶栏"设置"按钮或落地页"个人系统"卡片进入），包含：昵称修改、头像上传、背景图片上传、背景颜色选择、清除背景。

#### Scenario: 进入设置
- **WHEN** 用户点击顶栏"设置"按钮或落地页"个人系统"卡片
- **THEN** 显示设置页面

#### Scenario: 修改昵称
- **WHEN** 用户在设置页输入新昵称并点击"保存"
- **THEN** 顶栏立即更新显示新昵称
- **AND** sessionStorage 中的 profile.nickname 更新

### Requirement: 头像上传
系统 SHALL 允许用户上传头像图片，支持格式：jpg、jpeg、png、gif、webp、svg，限制大小 200KB。上传后转 base64 存 sessionStorage 并立即显示。

#### Scenario: 上传头像成功
- **WHEN** 用户选择小于 200KB 的 png 文件
- **THEN** 头像立即在顶栏和设置页预览显示
- **AND** base64 数据存入 sessionStorage

#### Scenario: 文件过大
- **WHEN** 用户选择大于 200KB 的文件
- **THEN** 显示错误提示"头像文件过大（>200KB），请压缩后上传"
- **AND** 不更新头像

#### Scenario: 格式不支持
- **WHEN** 用户选择 .bmp 文件
- **THEN** 显示错误提示"不支持的格式，请使用 jpg/png/gif/webp/svg"
- **AND** 不更新头像

### Requirement: 自定义背景
系统 SHALL 允许用户设置自定义背景（图片或颜色二选一）。图片支持 jpg/jpeg/png/gif/webp/svg，限制 1MB。背景应用到整个 body。

#### Scenario: 上传背景图片
- **WHEN** 用户上传小于 1MB 的 jpg 作为背景
- **THEN** 整个页面背景变为该图片（cover 模式）
- **AND** 数据存 sessionStorage

#### Scenario: 选择背景颜色
- **WHEN** 用户用 color picker 选择 #ff6600
- **THEN** 整个页面背景变为该颜色
- **AND** 清除之前的背景图片

#### Scenario: 清除背景
- **WHEN** 用户点击"恢复默认背景"
- **THEN** 背景恢复为 #1a1a2e 默认深空色
- **AND** sessionStorage 中的 background 字段清除

#### Scenario: 背景持久化
- **WHEN** 用户刷新页面（同一会话内）
- **THEN** 背景从 sessionStorage 恢复
- **AND** 关闭浏览器后下次打开恢复默认

## MODIFIED Requirements

### Requirement: 落地页卡片
落地页 SHALL 从两张卡片扩展为三张：预测系统、计算机系统、个人系统。

### Requirement: 顶栏
所有页面 SHALL 在顶部显示统一的用户信息条（头像+昵称+设置+退出），原有 header 不变。

## REMOVED Requirements
（无）
