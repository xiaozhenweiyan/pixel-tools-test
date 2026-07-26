# 彻底修复页面滚动 Spec

## Why
用户多次反馈页面无法滚轮滚动。之前给 html 和 body 添加 `overflow-y: auto` 未能解决。根本原因是：
1. body 使用 `display: flex` + `min-height: 100vh` + `overflow-y: auto`，但 body 高度会根据内容自动扩展，`overflow-y: auto` 永远不会触发滚动
2. html 和 body 同时设置 `overflow-y: auto`，导致滚动容器冲突
3. `html, body { overflow-x: hidden }` 会让 `overflow-y` 被计算为 `auto`，创建多个滚动容器
4. `body { overscroll-behavior-y: none }` 可能影响滚动行为

## What Changes
- 移除 html 的 `overflow-y: auto`（让 viewport 使用默认滚动行为）
- 移除 body 的 `display: flex`、`flex-direction: column`、`overflow-y: auto`、`-webkit-overflow-scrolling: touch`
- 保留 body 的 `min-height: 100vh`（确保背景覆盖整个视窗）
- 移除 `main.layout { flex: 1 0 auto; }`（body 不再是 flex 容器，该规则无效）
- 将 `html, body { overflow-x: hidden }` 改为只给 body 设置 `overflow-x: hidden`
- 移除 `body { overscroll-behavior-y: none }`
- 升级 Service Worker 缓存版本 v6 → v7

## Impact
- Affected specs: 无
- Affected code: `styles/pixel.css`, `service-worker.js`

## MODIFIED Requirements
### Requirement: 页面滚动
系统 SHALL 允许所有页面使用鼠标滚轮和触摸滚动。

#### Scenario: 页面内容超出视窗
- **WHEN** 页面内容高度超过视窗高度
- **THEN** 用户可以使用鼠标滚轮或触摸手势滚动页面

#### Scenario: 防止水平滚动
- **WHEN** 页面内容宽度超过视窗宽度
- **THEN** 页面不显示水平滚动条，超出内容被裁剪