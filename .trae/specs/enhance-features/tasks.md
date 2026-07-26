# Pixel Tools 功能增强 - 实现计划

## [x] Task 1: 实现鼠标拖拽粒子特效

## [x] Task 2: 添加页面教程按钮和模态框

## [x] Task 3: 修复学习系统演示按钮文字不可见问题

## [x] Task 4: 函数系统参数支持（参数识别、滑动条、范围调节、步长、动画）

## [x] Task 5: 坐标系单位长度显示和缩放适配

## [x] Task 6: Service Worker 缓存版本升级

## [x] Task 7: 代码提交并推送到 GitHub
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 创建新的 `mouse-trails.js` 模块，实现鼠标跟随粒子效果
  - 使用 Canvas 2D 渲染，position: fixed; z-index: 99999; pointer-events: none
  - 粒子拖尾效果，自动衰减消失
  - 在 index.html 添加 canvas 和 script 引用
  - 在 app.js 初始化时启动特效
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `human-judgment` TR-1.1: 鼠标移动时显示粒子拖尾，点击页面元素正常响应
  - `human-judgment` TR-1.2: 切换页面时粒子特效继续运行，不遮挡内容

## [ ] Task 2: 添加页面教程按钮和模态框
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 index.html 每个工具页面底部添加"教程"按钮
  - 创建通用的教程模态框组件（遮罩层 + 内容区域 + 关闭按钮）
  - 在 i18n.js 中添加各页面的教程内容
  - 在 app.js 中绑定教程按钮点击事件和模态框关闭事件
  - 添加教程模态框的 CSS 样式
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgment` TR-2.1: 每个页面底部有"教程"按钮，点击弹出模态框
  - `human-judgment` TR-2.2: 模态框显示对应页面的使用说明，可正常关闭

## [ ] Task 3: 修复学习系统演示按钮文字不可见
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 检查 `.arithmetic-demo-btn` 的 CSS 样式，找出文字不可见的原因
  - 修改文字颜色、背景色、边框样式，确保对比度足够
  - 修复悬停和点击状态的文字显示
  - 测试四则运算、混合运算、分数、小数、方程、几何、速算所有卡片的演示按钮
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `human-judgment` TR-3.1: 所有学习卡片的"演示"按钮文字清晰可见
  - `human-judgment` TR-3.2: 按钮悬停和点击状态文字仍然清晰

## [ ] Task 4: 函数系统参数支持增强
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 增强 ExpressionParser 支持隐式乘法（ax = a*x）
  - 在 function-plotter.js 中完善参数提取和解析
  - 在 app.js 的 initFunctionPlotter 中实现完整的参数控制面板：
    - 参数滑动条（控制当前值）
    - 最小值/最大值输入框
    - 步长输入框
    - 动画播放/暂停按钮
    - 动画速度选择
  - 确保 2D 和 3D 模式都支持参数
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgment` TR-4.1: 输入 y=a*x+b 能识别参数 a, b，显示滑动条
  - `human-judgment` TR-4.2: 调节最小值/最大值/步长后滑动条正常工作
  - `human-judgment` TR-4.3: 播放动画时参数自动变化，函数图像实时更新
  - `human-judgment` TR-4.4: 2D 和 3D 模式都支持参数功能

## [ ] Task 5: 坐标系标准长度显示
- **Priority**: high
- **Depends On**: None
- **Description**: 
  - 在 function-plotter.js 中添加单位长度显示功能
  - 根据 scale 值计算当前单位长度，缩放时自动调整
  - 在 chart.js 的折线图中添加单位长度显示
  - 修复预测系统坐标系缩放时单位长度错乱问题
  - 添加单位长度显示的 CSS 样式
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `human-judgment` TR-5.1: 函数系统坐标系显示当前单位长度，缩放时数值合理变化
  - `human-judgment` TR-5.2: 预测系统折线图显示单位长度，缩放时数值合理变化
  - `human-judgment` TR-5.3: 单位长度始终显示简洁（如 1, 0.5, 2, 0.25）

## [ ] Task 6: Service Worker 缓存更新
- **Priority**: medium
- **Depends On**: Tasks 1-5
- **Description**: 
  - 更新 service-worker.js 的 CACHE_VERSION（v10 → v11）
  - 添加新增的 mouse-trails.js 到 PRECACHE_URLS
- **Acceptance Criteria Addressed**: 所有 AC
- **Test Requirements**:
  - `programmatic` TR-6.1: service-worker.js 缓存版本正确升级
  - `programmatic` TR-6.2: mouse-trails.js 包含在 PRECACHE_URLS 中

## [ ] Task 7: 提交并推送到 GitHub
- **Priority**: high
- **Depends On**: Tasks 1-6
- **Description**: 
  - 提交所有修改到 main 分支
  - 推送到 GitHub main 和 gh-pages 分支
- **Acceptance Criteria Addressed**: 所有 AC
- **Test Requirements**:
  - `programmatic` TR-7.1: 代码成功提交到 main 分支
  - `programmatic` TR-7.2: 代码成功推送到 gh-pages 分支