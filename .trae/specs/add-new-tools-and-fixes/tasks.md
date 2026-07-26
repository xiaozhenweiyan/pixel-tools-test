# Tasks

## 阶段一：Bug 修复（优先）
- [ ] Task 1: 修复函数系统参数检测 - 支持隐式乘法
  - [ ] SubTask 1.1: 修改 expression-parser.js tokenizer，支持隐式乘法（`ax` = `a*x`）
  - [ ] SubTask 1.2: 扩展 PARAM_CHARS 支持所有单字母 a-z
  - [ ] SubTask 1.3: 测试 `ax`, `2x`, `a*x`, `sin(ax)` 等表达式
- [ ] Task 2: 重构学习卡片为纯学习模式
  - [ ] SubTask 2.1: 移除 math-cards.js 中的关卡/训练/得分机制
  - [ ] SubTask 2.2: 实现四则运算动画演示（加法/减法/乘法/除法）
  - [ ] SubTask 2.3: 更新 arithmetic-page UI，去掉关卡显示
  - [ ] SubTask 2.4: 更新 i18n 翻译条目

## 阶段二：新增学习类工具
- [ ] Task 3: 像素迷宫生成器
  - [ ] SubTask 3.1: 创建 js/maze-generator.js，实现递归回溯/Prim/Kruskal/Eller 算法
  - [ ] SubTask 3.2: 实现自动求解（BFS/A*）+ 路径动画
  - [ ] SubTask 3.3: 创建 maze-page HTML 结构
  - [ ] SubTask 3.4: 添加 CSS 样式
  - [ ] SubTask 3.5: 添加到首页卡片和页面切换逻辑
- [ ] Task 4: 函数系统 3D 扩展
  - [ ] SubTask 4.1: 创建 js/function-3d.js，实现 z=f(x,y) 三维渲染
  - [ ] SubTask 4.2: 实现鼠标拖拽旋转 + 滚轮缩放
  - [ ] SubTask 4.3: 伪 3D 像素风体素渲染 + 等高线颜色
  - [ ] SubTask 4.4: 创建 function-3d-page HTML 结构
  - [ ] SubTask 4.5: 添加 CSS 样式和首页卡片
- [ ] Task 5: 神经网络可视化器
  - [ ] SubTask 5.1: 创建 js/nn-visualizer.js，与现有 nn.js 联动
  - [ ] SubTask 5.2: 可调网络结构（层数/每层神经元数）
  - [ ] SubTask 5.3: 实时显示权重变化 + 损失曲线
  - [ ] SubTask 5.4: 使用 XOR/正弦拟合数据集演示
  - [ ] SubTask 5.5: 创建 nn-visualizer-page HTML + CSS + 首页卡片
- [ ] Task 6: 数学学习卡片扩展
  - [ ] SubTask 6.1: 分数学习卡片（加减乘除/约分/通分）
  - [ ] SubTask 6.2: 小数学习卡片（运算/与分数互转）
  - [ ] SubTask 6.3: 方程学习卡片（一元一次/二次）
  - [ ] SubTask 6.4: 几何学习卡片（面积/周长/体积 + 互动图形）
  - [ ] SubTask 6.5: 速算挑战卡片（限时答题 + 本地排行榜）
  - [ ] SubTask 6.6: 添加到学习系统首页

## 阶段三：新增艺术类工具
- [ ] Task 7: 物理模拟器
  - [ ] SubTask 7.1: 创建 js/physics-sandbox.js，实现元素系统（沙子/水/石头/火/植物/金属）
  - [ ] SubTask 7.2: 实现元素交互规则（水流/火燃烧/植物生长等）
  - [ ] SubTask 7.3: 鼠标绘制 + 实时模拟
  - [ ] SubTask 7.4: 创建 physics-page HTML + CSS + 首页卡片
- [ ] Task 8: AI 图像像素化工具
  - [ ] SubTask 8.1: 创建 js/image-pixelizer.js，纯前端 Canvas 实现
  - [ ] SubTask 8.2: 实现图片上传 + 像素大小/调色板/颜色数量调节
  - [ ] SubTask 8.3: 实时预览 + 导入绘图编辑器
  - [ ] SubTask 8.4: 创建 pixelizer-page HTML + CSS + 首页卡片

## 阶段四：新增工具类
- [ ] Task 9: 像素时钟 + 日历
  - [ ] SubTask 9.1: 创建 js/pixel-clock.js，实现数字时钟
  - [ ] SubTask 9.2: 实现像素日历（可标记事件）
  - [ ] SubTask 9.3: 实现番茄钟（25分钟工作 + 5分钟休息）
  - [ ] SubTask 9.4: 多种像素字体风格切换
  - [ ] SubTask 9.5: 创建 clock-page HTML + CSS + 首页卡片

## 阶段五：新增娱乐类
- [ ] Task 10: 像素 RPG 小游戏
  - [ ] SubTask 10.1: 创建 js/pixel-rpg.js，实现角色移动/战斗/升级
  - [ ] SubTask 10.2: 用音乐合成器生成 BGM 和音效
  - [ ] SubTask 10.3: 用绘图编辑器资源做素材
  - [ ] SubTask 10.4: 创建 rpg-page HTML + CSS + 首页卡片

## 阶段六：收尾
- [ ] Task 11: 升级 Service Worker 缓存版本，提交并推送

# Task Dependencies
- Task 2 依赖 Task 1（学习卡片重构不依赖函数修复，但同阶段）
- Task 6 依赖 Task 2（数学卡片扩展依赖学习卡片重构完成）
- Task 11 依赖所有其他 Task
- Task 3, 4, 5, 7, 8, 9, 10 互相独立，可并行