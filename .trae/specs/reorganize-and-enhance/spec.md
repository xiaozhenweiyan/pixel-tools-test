# 重构工具分类 + 增强功能 Spec

## Why
用户要求重新组织工具分类结构，并增强多个功能。当前 8 个新工具是平铺在首页的，需要按用户要求重新归类到合适的分类下。同时需要增强神经网络可视化的训练集功能、添加背景粒子交互菜单。

## What Changes

### 1. 新增"像素编程"分类（学习类下）
- **BREAKING**: 把"像素迷宫"和"神经网络可视化"从首页独立卡片移到新的"像素编程"子系统中
- 创建 pixel-programming-landing-page（类似 learning-landing-page 的子首页）
- 首页学习类下"像素编程"卡片入口 → 进入子系统 → 显示迷宫和神经网络两张卡片

### 2. 把"函数3D"移到函数系统中
- **BREAKING**: 移除首页"函数3D"独立卡片
- 在函数系统页面（function-page）添加"3D 模式"切换按钮
- 点击切换显示 3D 曲面渲染（复用现有 function-3d.js）
- 2D/3D 模式切换，共享表达式输入

### 3. 数学卡片扩展拆分为独立卡片
- **BREAKING**: 移除 math-ext-page 单一页面（含5个tab）
- 拆分为 5 个独立的学习卡片，放到学习系统（learning-landing-page）中：
  - 分数学习卡片（fraction-page）
  - 小数学习卡片（decimal-page）
  - 方程学习卡片（equation-page）
  - 几何学习卡片（geometry-page）
  - 速算挑战卡片（speed-page）
- 每个卡片都是独立的页面，与四则运算、混合运算卡片同级
- 使用像素风格教学（Canvas 动画）

### 4. 神经网络可视化增强训练集
- 添加标准训练集选择：XOR、正弦、圆形分类、螺旋分类
- 添加训练集编辑器：用户可自定义输入/输出样本
- 编辑器支持添加/删除/修改样本点
- 可视化显示训练集（散点图）

### 5. 背景粒子交互菜单
- 在背景的 `.landing-pixels` 装饰方块上添加交互
- 按住彩色方块可拖动
- 鼠标移动时产生粒子拖拽效果（粒子跟随鼠标）
- 添加菜单控制：开关粒子效果、粒子数量、粒子颜色

### 6. 我的建议（附加改进）
- **a) 工具卡片图标统一优化**：新工具的 SVG 图标风格统一（目前有些不一致）
- **b) 首页分类折叠**：首页 4 大分类（学习/艺术/工具/娱乐）支持折叠展开，避免页面过长
- **c) 最近使用**：首页顶部添加"最近使用"区域，显示用户最近访问的 3 个工具
- **d) 键盘快捷键**：添加 ESC 键统一返回上一级
- **e) 移动端优化**：新工具页面在移动端的响应式布局优化
- **f) README.md 更新**：更新 README 反映新的工具分类和功能

## Impact
- Affected specs: add-new-tools-and-fixes
- Affected code: `index.html`, `js/app.js`, `styles/pixel.css`, `js/i18n.js`, `js/nn-visualizer.js`, `js/function-plotter.js`, `js/math-cards-ext.js`, 新增 `js/background-particles.js`, `README.md`

## ADDED Requirements

### Requirement: 像素编程子系统
系统 SHALL 提供像素编程子系统，包含像素迷宫和神经网络可视化两个工具卡片。

#### Scenario: 进入像素编程
- **WHEN** 用户在首页点击"像素编程"卡片
- **THEN** 进入像素编程子系统页面，显示迷宫和神经网络两张卡片

### Requirement: 函数系统 3D 模式
系统 SHALL 在函数系统页面提供 2D/3D 模式切换。

#### Scenario: 切换到 3D 模式
- **WHEN** 用户在函数系统页面点击"3D 模式"按钮
- **THEN** 画布切换为 3D 曲面渲染，支持拖拽旋转和滚轮缩放

### Requirement: 独立数学学习卡片
系统 SHALL 提供分数、小数、方程、几何、速算挑战 5 个独立的学习卡片，与四则运算卡片同级。

#### Scenario: 学习分数
- **WHEN** 用户在学习系统点击"分数"卡片
- **THEN** 进入分数学习页面，用像素动画演示分数运算

### Requirement: 神经网络训练集编辑
系统 SHALL 提供标准训练集和自定义训练集编辑功能。

#### Scenario: 编辑训练集
- **WHEN** 用户点击"编辑训练集"按钮
- **THEN** 显示训练集编辑器，可添加/删除/修改样本

### Requirement: 背景粒子交互
系统 SHALL 在背景装饰方块上提供拖拽和粒子拖拽交互。

#### Scenario: 拖拽背景方块
- **WHEN** 用户按住背景彩色方块拖动
- **THEN** 方块跟随鼠标移动，鼠标移动时产生粒子拖拽效果

## MODIFIED Requirements

### Requirement: 首页工具分类
首页学习类 SHALL 包含：像素数学、像素编程、学习系统（含四则运算/混合运算/分数/小数/方程/几何/速算挑战）。
首页艺术类 SHALL 包含：像素图画、像素音乐、像素沙盒（物理模拟器/AI图像像素化）。
首页工具类 SHALL 包含：像素时钟。
首页娱乐类 SHALL 包含：像素RPG。
