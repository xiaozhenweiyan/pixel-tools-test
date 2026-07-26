# 新增工具与修复 Spec

## Why
用户反馈函数系统参数检测有问题（`ax` 报错），学习卡片需要重构（去掉关卡改为纯学习+动画），并要求新增 8 个工具/卡片扩展系统功能。

## What Changes

### Bug 修复
- 修复函数系统参数检测：支持隐式乘法（`ax` = `a*x`），扩展 PARAM_CHARS 支持所有单字母
- 重构学习卡片：去掉关卡/训练机制，改为纯学习模式，用动画解释四则运算

### 新增工具（艺术类）
- 物理模拟器：像素风 2D 物理沙盒（沙子/水/石头/火/植物/金属）
- AI 图像像素化工具：上传图片转像素风，可调参数

### 新增工具（学习类）
- 像素迷宫生成器：多种算法生成迷宫 + 自动求解 + 路径动画
- 函数系统 3D 扩展：z = f(x,y) 三维函数图像，伪 3D 像素风体素渲染
- 神经网络可视化器：可视化训练过程，可调网络结构
- 数学学习卡片扩展：分数/小数/方程/几何学习卡片 + 速算挑战

### 新增工具（工具类）
- 像素时钟 + 日历：复古像素风时钟、日历、番茄钟

### 新增工具（娱乐类）
- 像素 RPG 小游戏：简单 RPG，角色移动/战斗/升级

## Impact
- Affected specs: expand-art-learning-pwa, canvas-fix-titles-function-system
- Affected code: `js/expression-parser.js`, `js/function-plotter.js`, `js/math-cards.js`, `index.html`, `styles/pixel.css`, 新增多个 JS 文件

## ADDED Requirements

### Requirement: 函数系统隐式乘法
系统 SHALL 支持隐式乘法语法，如 `ax` = `a*x`，`2x` = `2*x`，`2(x+1)` = `2*(x+1)`。

#### Scenario: 输入 ax
- **WHEN** 用户输入 `ax`
- **THEN** 系统识别为 `a * x`，自动检测出参数 `a` 和变量 `x`

### Requirement: 学习卡片纯学习模式
系统 SHALL 移除学习卡片的关卡/训练机制，改为纯学习模式，用动画解释四则运算过程。

#### Scenario: 学习加法
- **WHEN** 用户进入加法学习卡片
- **THEN** 系统用动画演示加法运算过程，无关卡限制，无得分

### Requirement: 物理模拟器
系统 SHALL 提供像素风 2D 物理沙盒，支持沙子/水/石头/火/植物/金属等元素，鼠标绘制实时模拟。

### Requirement: 像素迷宫生成器
系统 SHALL 提供多种算法（递归回溯/Prim/Kruskal/Eller）生成迷宫，支持自动求解和路径动画。

### Requirement: 函数系统 3D 扩展
系统 SHALL 提供 z = f(x,y) 三维函数图像，支持鼠标拖拽旋转和滚轮缩放，伪 3D 像素风体素渲染。

### Requirement: AI 图像像素化工具
系统 SHALL 支持上传图片自动转换为像素风，可调像素大小/调色板/颜色数量，纯前端实现。

### Requirement: 数学学习卡片扩展
系统 SHALL 新增分数/小数/方程/几何学习卡片（纯学习）+ 速算挑战卡片（限时答题+排行榜）。

### Requirement: 像素时钟日历
系统 SHALL 提供复古像素风时钟、日历、番茄钟功能。

### Requirement: 像素 RPG 小游戏
系统 SHALL 提供简单像素风 RPG，角色移动/战斗/升级，用音乐合成器生成 BGM。

### Requirement: 神经网络可视化器
系统 SHALL 可视化神经网络训练过程，可调网络结构，实时显示权重变化和损失曲线。

## MODIFIED Requirements

### Requirement: 学习卡片
学习卡片 SHALL 为纯学习模式，无关卡/训练/得分机制，用动画解释四则运算。
