# 修复页面滚轮滚动 Spec

## Why
用户报告页面无法滚轮滚动。原因是 `body` 元素使用了 `min-height: 100vh` + `display: flex`，但没有 `overflow-y: auto`，导致内容超出视窗时无法滚动。

## What Changes
- 给 `body` 元素添加 `overflow-y: auto`
- 升级 Service Worker 缓存版本 v5 → v6

## Impact
- Affected specs: 无
- Affected code: `styles/pixel.css`, `service-worker.js`

## MODIFIED Requirements
### Requirement: 页面滚动
系统 SHALL 允许所有页面使用鼠标滚轮滚动。

#### Scenario: 页面内容超出视窗
- **WHEN** 页面内容高度超过视窗高度
- **THEN** 用户可以在 `body` 容器内使用鼠标滚轮滚动页面