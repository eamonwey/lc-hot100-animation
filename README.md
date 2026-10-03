# LeetCode 热题 100 · 动画题解

按 [LeetCode 官方学习计划](https://leetcode.cn/studyplan/top-100-liked/) 顺序制作的 **100 页交互式 Python 动画题解**：代码逐行高亮 ↔ 画面同步演示 ↔ 中文大白话解说。

## 在线阅读

GitHub Pages 部署后直接访问：`https://eamonwey.github.io/lc-hot100-animation/`

## 本地使用

无需构建、无需联网：直接双击打开 `index.html` 即可。

## 每道题的页面包含

- Python 题解代码**逐行高亮**，循环每一轮都会重复演出；
- 专用可视化：数组 / 柱状图（积水）/ 哈希表 / 链表（箭头反转、回环弧线）/ 二叉树（递归调用栈）/ 网格 / 单调栈 / DP 表 / 函数图，全部平滑动画；
- 每步中文大白话解说 + 页尾"核心一句话" + 自问自答；
- 播放控制：⏮ ◀ ▶/⏸ ▶ ⏭、进度条、4 档速度、键盘（← → 空格 Home End）；
- **测试用例随手改**：输入框 + 预设按钮，应用后动画按新用例重新生成；
- 自动校验徽章：内置 JS 参考实现对拍期望输出。

## 目录结构

```
index.html          目录页（进度、搜索、难度筛选）
assets/             engine.js 播放引擎 · viz.js 可视化组件库 · style.css · problems.js 题目清单
pages/p001~100.html 每题一个独立页面
SPEC.md             页面生产规范
tools/              校验流水线（check.js 逻辑+Python真实运行对拍 · sweep.js 浏览器实测）
```

## 质量保证

每页都通过了 `tools/check.js` 的全量校验（步骤生成 / 逐帧执行 / 行号 / 元数据对表 / JS 对拍 / **Python 真实运行对拍** / 预设冒烟 / 高亮覆盖率），以及 `tools/sweep.js` + `tools/preset_sweep.js` 的无头浏览器实测（零 console 错误、逐预设点击）。
