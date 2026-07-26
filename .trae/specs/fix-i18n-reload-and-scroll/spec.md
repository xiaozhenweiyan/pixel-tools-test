# 修复刷新按钮国际化与页面滚动 Spec

## Why
两个 bug：1) 设置页语言下拉框右侧的"刷新"按钮，其文字和 title 提示在切换语言后不会变化；2) 页面内容超出视窗时鼠标滚轮无法滚动。

## What Changes
- 给刷新按钮添加 `data-i18n-title` 属性，在 `applyToDOM()` 中同步更新 `title`
- 补充中英文 `btn_reload_title` 翻译条目
- 给 `html` 元素添加 `overflow-y: auto` 和 `-webkit-overflow-scrolling: touch`
- 升级 Service Worker 缓存版本号 v4 → v5

## Impact
- Affected specs: 无
- Affected code: `index.html`, `js/i18n.js`, `styles/pixel.css`, `service-worker.js`

## MODIFIED Requirements
### Requirement: 刷新按钮国际化
系统 SHALL 在语言切换时同步更新刷新按钮的 `textContent` 和 `title` 属性。

#### Scenario: 切换到英文
- **WHEN** 用户在设置页切换语言为英文
- **THEN** 刷新按钮文字变为 "Reload"，title 变为 "Click to reload page if language switch fails"

### Requirement: 页面滚轮滚动
系统 SHALL 允许所有页面使用鼠标滚轮滚动。

#### Scenario: 页面内容超出视窗
- **WHEN** 页面内容高度超过视窗高度
- **THEN** 用户可以使用鼠标滚轮滚动页面