# Hot 100 动画题解 —— 页面生产规范（SPEC）

目标：为每道题生成一个**独立 HTML 页面** `pages/p{order三位}.html`（如 P1 → `p001.html`）。
用户是刷 LeetCode 的中文学习者：**中文大白话、视觉直觉优先、每一步都能对上代码行**。

质量基准 = 仓库里的三个示范页（先完整读它们再动笔）：
- `pages/p001.html` 两数之和（数组 + 哈希表 + 变量）
- `pages/p023.html` 反转链表（链表 + 指针名牌 + 自定义箭头）
- `pages/p036.html` 二叉树的最大深度（树布局 + 递归栈）

---

## 1. 页面骨架（照抄，只换配置内容）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>P023 · 反转链表 · 动画题解</title>
<link rel="stylesheet" href="../assets/style.css">
</head>
<body>
<div class="wrap" id="app"></div>
<script src="../assets/problems.js"></script>
<script src="../assets/viz.js"></script>
<script src="../assets/engine.js"></script>
<script>
LC.register({
  order: 23, num: 206, title: '反转链表', diff: '简单', cat: '链表',
  method: 'reverseList',
  /* ↓ 各字段含义见第 2 节 */
});
</script>
</body>
</html>
```

**铁律**
1. 只允许写自己 order 的那一个文件；**绝不修改** `assets/`、`index.html`、`SPEC.md`、`tools/` 或别人的页面。引擎缺能力时用 `viz.text(..., {html:true})` 兜底，并在报告里说明。
2. 页面内联脚本顶层**只调用 `LC.register`**，不碰 DOM（校验器在 Node vm 里运行它）。
3. 每一步 `do(viz)` 必须**完整重绘全部画面状态**（幂等）——回退/跳步才正确。状态数据在 `steps(input)` 生成帧时用闭包捕获。
4. Python 代码用模板字符串 `` `...` `` 保存，内部不得出现反引号和 `${`。
5. **快照原则（最高频错误，务必读完）**：`do(v)` 真正执行时 `steps()` 早已跑完，外层任何 `let` 变量都是**最终值**。所以指针/箭头/变量值等动态状态必须在 `F.push` 那一刻求值：要么内联进对象字面量（`states:{[cur]:'active'}`、`vars:{prev:nv(prev)}`），要么用快照函数（`pointers: ptr()`、`edges: edges.slice()`）。**反例（bug）**：`const draw = o => v => { const ps = []; if(prev != null) ps.push({key: prev, …}); … }` —— 这里的 `prev` 是渲染时的最终值，所有帧的名牌全画在同一处。check.js 会对「pointers/edges/markers 全帧相同」报 live-closure 警告，出现即按本条修复。

---

## 2. LC.register 配置字段

| 字段 | 必填 | 说明 |
|---|---|---|
| order/num/title/diff/cat | ✓ | 与 `assets/problems.js` 中该题条目完全一致（直接复制） |
| method | ✓ | Python 代码里被测的方法名（如 `'twoSum'`），校验器用它调用 |
| lede | ✓ | 题面 + 引导语（HTML）。1~3 句大白话讲清"输入什么、求什么、动画怎么演"，并用 `<span class="var i">i</span>` 等标注关键变量 |
| roles | 建议 | 图例数组 `[{c:'orange', code:'i', text:'左指针：…'}]`，c ∈ blue/orange/green/red/violet |
| codeTitle | 建议 | 代码卡片顶部一句话导读（含颜色语义说明） |
| legend | 建议 | 舞台下方色块图例 `[{c:'blue', text:'窗口内'}, {swatch:'#xxx', text:…}]` |
| idea | ✓ | 一句话核心思想（放"记住这一句"金框里） |
| qa | 建议 | 2~4 个 `details` 自问自答 `{q, a}`：最容易懵的点、不变式、复杂度为什么 |
| complexity | ✓ | 如 `时间 O(n)　·　空间 O(1)` |
| form | ✓ | 测试用例表单 `[{key,label,type,def}]`；type ∈ `arr`(数字数组)/`num`/`str`/`strlist`(字符串数组)/`grid`(二维，textarea 逐行)/`list`/`tree`(层序，可含 null)/`randlist`(JSON)/`json` |
| presets | 建议 | ≥2 个预设按钮 `[{label:'1→2→3→4→5', values:{head:[1,2,3,4,5]}}]`，第一个为默认；要覆盖"常规/边界/易错" |
| code | ✓ | Python 题解代码（class Solution 风格；155/208/295 类题直接给类实现） |
| sol | ✓ | **JS 参考实现**：与 Python 完全同逻辑，输入 form 解析后的对象，返回与 `expected` 同构的结果。树/链表题用普通对象/数组模拟即可 |
| expected | ✓ | 默认输入下的期望输出（与 sol 返回同构；114 这类原地修改题给 `null`） |
| pyCheck | 特例 | 155/208/295 这类"操作序列"题设 `pyCheck:false`（Python 无法单方法调用），但 sol 仍需写 |
| steps | ✓ | `steps(input) → [frame, …]`，见第 3 节 |

form 的 def 会原样作为 `steps(input)` 的输入（arr → number[]，list/tree → (number|null)[]，grid → 二维数组）。

---

## 3. frame（一步）与 steps 生成

```js
steps(input){
  const F = [];
  // 1) 先跑一遍算法，边跑边 push 帧（闭包捕获当时的状态快照）
  // 2) 每个 frame：
  {
    hl: [4],          // 本步执行的代码行号数组（1 起）；循环体每轮重复出现
    ok: 6,            // 可选：条件成立的行（绿色）
    no: 6,            // 可选：条件失败的行（红色）
    tag: '右移',      // 阶段标签（短语）
    cls: 't-blue',    // 标签色 t-grey/t-ink/t-orange/t-blue/t-green/t-red/t-violet/t-dark
    msg: '…HTML 解说…',   // 大白话，1~3 句；关键变量用 <b> 或 <span class="code">x</span>
    do(viz){ … }      // 完整重绘画面
  }
  return F;
}
```

**硬性要求**
- 步数 15~90 步。循环的**每一轮**都要重复出现对应代码行（hl 重复出现），这才有"逐行执行"的感觉。
- `msg` 里出现的数字/下标/值必须是**真实计算结果**（从闭包变量拼出来），不许写死。
- 用户输入的数据会被转义后再展示：拼接 HTML 时用 `LCesc()`（viz.js 里已暴露）。
- 首帧通常是初始化（hl 覆盖初始化行），末帧是 `return` + `viz.result(...)` + 总结。
- 输入规模限制：steps 生成必须轻量；指数级题（回溯/子集）输入 ≤ 3~4 元素；网格 ≤ 4×4。

---

## 4. viz API（舞台画什么）

每个方法都是**区块**（带小标题，跨步骤持久，按 key 做 diff 动画）。**某一步没画的区块会自动淡出隐藏**（数据保留，下一步画了就自动回来）——所以「只在最后一步画结果」是安全的，不必手动清除。要彻底退场用 `viz.drop(id)`。

```js
viz.arr('nums', [2,7,11,15], {
  label:'数组 <code>nums</code>',
  states:{0:'in', 1:'just'},          // 下标→状态
  idxCls:{2:'on-i'},                   // 下标数字染色 on-i橙/on-r蓝
  markers:[{name:'i', idx:2, cls:'mi', text:'▲ i'}],   // 指针名牌(可多个,同格自动摞)
  labels:{2:'基准'},                   // 格下小注
  quotes:true                          // 字符串加引号(用于字符数组)
});
// 状态: in窗口/active当前/peek待入/just刚动/block被挡/stale将出/gone已出/done完成/target目标/pivot基准/muted灰
// 名牌 cls: mi橙 mr蓝 mg绿 mv紫

viz.bars('h', [1,8,6], {label:'', states:{}, markers:[…], water:[0,0,1],
  fill:{from:1,to:8,h:7}, chartH:150});                 // 柱状图(盛水/面积)

viz.map('seen', [['2',0],['7',1]], {label:'哈希表 <code>seen</code>', hlK:'2'});   // 键值对表, hlK 高亮某键
viz.set('occ', ['a','b'], {label:'<code>occ</code> 集合', color:'b'});             // chips, color: b/o/g/v
viz.vars('v', {i:2, y:7, ans:3}, {label:'变量', hl:['y']});                        // 变量面板(值变化闪蓝)
viz.list('L', [{key:'n0',val:1},{key:'n1',val:2}], {label:'链表',
  states:{n0:'active'}, pointers:[{key:'n1',text:'▼ cur',cls:'mi'}],
  headTag:{key:'n0',text:'head',cls:'mr'},
  edges:[['n0','n2']],               // 自定义箭头(反转题); 缺省按顺序连
  cycleFrom:'n1',                    // 尾→环入口弧线(环题)
  dummy:true, edgeStates:{0:'e-done'}});
const T = Viz.parseTree([1,null,2,3]);   // 层序数组→{root, nodes:[{key,val,left,right}]}
                                         // key = 非空节点按出现顺序的编号(0 起)；孩子用 left/right 取
const t = Viz.treeLayout([3,9,20,null,null,15,7]);   // 层序数组→{nodes,edges,w,h}；key 同 parseTree
viz.tree('T', t, {label:'二叉树', states:{1:'active'}, tags:{3:'当前根'},
  edgeStates:{'0-2':'e-done'}});                      // edgeStates 键 = '父key-子key'
// 递归遍历时用 T.nodes 里的 left/right，不要用 2i+1 堆下标公式（那是错的）！
viz.grid('G', [[1,0],[0,1]], {label:'网格', wallVal:0,          // wallVal=实心墙样式
  states:{'0,1':'active'}, texts:{'1,1':'🏝'}, hideIndex:false});
viz.stack('S', [{key:0,val:'('},{key:1,val:'['}], {label:'栈', states:{1:'just'}, topTag:'栈顶'});
viz.text('p', '路径: 1 → 2', {label:''});            // 文本行; {html:true} 时内容为 HTML
viz.graph('G2', Viz.circle(['A','B','C']), [['A','B']], {label:'图', states:{A:'active'}});
viz.result([0,1], {label:'返回结果'});                // 金色输出徽章(末帧用)
viz.drop('seen');                                     // 让某区块淡出
```

**视觉规范**
- 指针名牌统一放下方（arr/bars）或上方（list/tree），命名与代码变量一致：`▲ i`、`▼ cur`。
- 颜色语义全程一致：蓝=窗口/比较、橙=当前焦点、绿=完成/成立、红=冲突/失败、紫=特殊标记。
- 一次画面 ≤ 6 个区块，避免拥挤；哈希表 ≤ 8 行、数组 ≤ 10 格（输入超长时截断展示但 msg 说明）。

---

## 5. Python 代码风格

- 与 JS `sol` 完全同逻辑；**简洁、不绕**：优先官方标准解法里最直白的一种。
- 行数 8~24 行；关键行右侧写短中文注释（`# …`），不写废话注释。
- 用 `class Solution:` 包方法（def 缩进 4 空格）；变量名与动画名牌一致。
- 不要用魔法单行（如 `return heapq.nlargest(k, nums)[-1]`）；允许 `from collections import deque`、`import heapq` 等常规导入。

## 6. 解说文风

- 大白话 + 比喻（如旧页的"左手捏住起点、右手往后伸"），口语但准确。
- msg 每步 1~3 句；先说"这步在干什么"，再说"为什么/发生了什么"。
- 数字用真实值：`'第 ' + i + ' 格（字符 ' + LCesc(s[i]) + '）'`。
- 禁止：命令式标题堆砌、逐字翻译代码、"如图所示"这类没信息量的话。

## 7. 自检（写完必做，全绿才算完）

```bash
node tools/check.js p023        # 校验单页（steps/sol/py 全过）
node tools/check.js             # 校验全部
```

自查清单：
- [ ] 题号/标题/难度/分类与 problems.js 一致；文件名 p{order三位}.html
- [ ] 默认输入下动画 ≥ 15 步、能完整讲完算法；presets ≥ 2 且含边界例
- [ ] 代码每行（除空行/纯注释）都至少被 hl 一次
- [ ] sol 与 expected 对拍通过；Python 真实运行对拍通过（155/208/295 除外）
- [ ] 浏览器打开：无 console 报错、画面不溢出、名牌不重叠

---

## 8. 双解法(alt):给「引入外部类」的题加官方解法

适用:`code` 里 import 了 deque/heapq 等外部类的页面。为它再加一个**力扣官方解法**,
带完整独立动画,用户用页面顶部的「解法一/解法二」标签切换(引擎已支持,记忆用户选择)。

在 `LC.register({...})` 里加 `alt: {...}` 字段:

```js
alt: {
  label: '官方 · 优先队列(堆)',      // 必填:标签页上显示(解法二 · xxx)
  method: 'maxSlidingWindow',        // 必填:Python 被测方法名(不复用主解法时)
  lede: '…(可选,替换顶部导语;不填沿用主解法的)',
  codeTitle: '…', idea: '…',        // 必填 idea(金句)
  complexity: '时间 O(n log n) · 空间 O(n)',
  qa: [{q:'…',a:'…'}, …],           // ≥2 条,讲与主解法的取舍
  roles: […], legend: […],          // 可选,切换时整体替换
  code: `…`,                        // 官方解法 Python(8~24 行,短中文注释)
  sol(input){…}, expected: …,       // 与主解法同规则;pyCheck 也可用
  steps(input){…}                   // 完整独立动画,规则与主解法相同
}
```

要求:
- alt 与主解法共用 form 和 presets(同一测试用例,切换时保留用户当前用例);
- alt 的 steps 同样遵守铁律 3/5(完整重绘、快照原则)、步数 15~90、每行代码被高亮;
- 官方解法选型:优先取力扣官方题解里与主解法**不同**的那个方法(如主解法是单调队列,
  alt 取官方优先队列);若官方只有一种方法,则做「不用外部类的透明实现」(如手写队列),
  label 里写清楚,如 `'官方思路 · 手写队列(不用 deque)'`;
- 示范页:`pages/p040.html`(解法二 = 官方思路 · 手写队列)。

---

## 9. 解说详细度 v2(2026-10 用户反馈:难题的每步解说看不懂)

每一步的 msg 必须让「第一次见这个算法的人」**只看这一条就能懂**,五要素按需取舍(①②③必备):
① **动作白话**:这一步的代码在干什么(说人话,不是逐字翻译代码);
② **状态读数**:把此刻关键变量的值逐个读出来(i=?、cur=?、堆里现在是…),数字必须来自闭包真实拼接;
③ **为什么**:这一步的目的/不变式/直觉——为什么这么做,不这么做会怎样(死循环?算错?给反例);
④ **画面导览**:这一步画面哪里变了、新颜色/名牌代表什么;
⑤ **难点步骤**:再加类比或"踩坑提醒"。
长度 2~6 句,信息密度优先,禁止凑字;循环每轮重复的帧也要带当轮真实值。
**样板页**:`pages/p066.html`(困难题详细度基准)、`pages/p089.html`。
反例(旧版,太薄):`'栈顶 j = 3,高 6 ≤ 新柱 2,弹出结算。'`
正例:`'新柱 2 号位(高 2)比栈顶(3 号位,高 6)矮——说明 3 号位高柱的左右边界都定了:左到新栈顶(1 号位),右到当前 i。它能撑的最大矩形 = 高 6 × 宽 2 = 12,记入 ans。一句话:遇到矮柱,就把所有比它高的柱子逐一清账。'`
