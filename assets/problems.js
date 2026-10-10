/* ============================================================
 * problems.js —— LeetCode 热题 100 · 题目清单（按官方学习计划顺序）
 * order = 目录序号(1~100)，num = LeetCode 题号
 * approach = 推荐解法（题解页按此实现），input = 默认测试用例
 * ============================================================ */
window.LC_PROBLEMS = [
  /* ---------- 哈希 ---------- */
  {order:1,  num:1,   slug:'two-sum', title:'两数之和', diff:'简单', cat:'哈希', approach:'一次遍历 + 哈希表（值→下标）', input:{nums:[2,7,11,15], target:9}},
  {order:2,  num:49,  slug:'group-anagrams', title:'字母异位词分组', diff:'中等', cat:'哈希', approach:'排序作 key + 哈希分组', input:{strs:['eat','tea','tan','ate','nat','bat']}},
  {order:3,  num:128, slug:'longest-consecutive-sequence', title:'最长连续序列', diff:'中等', cat:'哈希', approach:'哈希集合，只从序列起点向右数', input:{nums:[100,4,200,1,3,2]}},

  /* ---------- 双指针 ---------- */
  {order:4,  num:283, slug:'move-zeroes', title:'移动零', diff:'简单', cat:'双指针', approach:'快慢指针，非零数前移', input:{nums:[0,1,0,3,12]}},
  {order:5,  num:11,  slug:'container-with-most-water', title:'盛最多水的容器', diff:'中等', cat:'双指针', approach:'两端夹逼，每次移动矮的一侧', input:{height:[1,8,6,2,5,4,8,3,7]}},
  {order:6,  num:15,  slug:'3sum', title:'三数之和', diff:'中等', cat:'双指针', approach:'排序 + 固定一个 + 左右双指针', input:{nums:[-1,0,1,2,-1,-4]}},
  {order:7,  num:42,  slug:'trapping-rain-water', title:'接雨水', diff:'困难', cat:'双指针', approach:'双指针 + 两侧最大值，水往矮处流', input:{height:[0,1,0,2,1,0,1,3,2,1,2,1]}},

  /* ---------- 滑动窗口 ---------- */
  {order:8,  num:3,   slug:'longest-substring-without-repeating-characters', title:'无重复字符的最长子串', diff:'中等', cat:'滑动窗口', approach:'右针扩张 + 左针收缩，集合查重', input:{s:'abcabcbb'}},
  {order:9,  num:438, slug:'find-all-anagrams-in-a-string', title:'找到字符串中所有字母异位词', diff:'中等', cat:'滑动窗口', approach:'定长窗口 + 计数差', input:{s:'cbaebabacd', p:'abc'}},

  /* ---------- 子串 ---------- */
  {order:10, num:560, slug:'subarray-sum-equals-k', title:'和为 K 的子数组', diff:'中等', cat:'子串', approach:'前缀和 + 哈希表', input:{nums:[1,1,1], k:2}},
  {order:11, num:239, slug:'sliding-window-maximum', title:'滑动窗口最大值', diff:'困难', cat:'子串', approach:'单调递减队列', input:{nums:[1,3,-1,-3,5,3,6,7], k:3}},
  {order:12, num:76,  slug:'minimum-window-substring', title:'最小覆盖子串', diff:'困难', cat:'子串', approach:'滑动窗口 + 需求计数', input:{s:'ADOBECODEBANC', t:'ABC'}},

  /* ---------- 普通数组 ---------- */
  {order:13, num:53,  slug:'maximum-subarray', title:'最大子数组和', diff:'中等', cat:'普通数组', approach:'DP：前缀为负就丢掉', input:{nums:[-2,1,-3,4,-1,2,1,-5,4]}},
  {order:14, num:56,  slug:'merge-intervals', title:'合并区间', diff:'中等', cat:'普通数组', approach:'按左端排序 + 依次合并', input:{intervals:[[1,3],[2,6],[8,10],[15,18]]}},
  {order:15, num:189, slug:'rotate-array', title:'轮转数组', diff:'中等', cat:'普通数组', approach:'整体翻转 + 两段各自翻转', input:{nums:[1,2,3,4,5,6,7], k:3}},
  {order:16, num:238, slug:'product-of-array-except-self', title:'除自身以外数组的乘积', diff:'中等', cat:'普通数组', approach:'前缀乘 × 后缀乘', input:{nums:[1,2,3,4]}},
  {order:17, num:41,  slug:'first-missing-positive', title:'缺失的第一个正数', diff:'困难', cat:'普通数组', approach:'原地哈希：把 x 换到下标 x-1', input:{nums:[3,4,-1,1]}},

  /* ---------- 矩阵 ---------- */
  {order:18, num:73,  slug:'set-matrix-zeroes', title:'矩阵置零', diff:'中等', cat:'矩阵', approach:'首行首列当标记位', input:{matrix:[[1,1,1],[1,0,1],[1,1,1]]}},
  {order:19, num:54,  slug:'spiral-matrix', title:'螺旋矩阵', diff:'中等', cat:'矩阵', approach:'四条边界逐层收缩', input:{matrix:[[1,2,3],[4,5,6],[7,8,9]]}},
  {order:20, num:48,  slug:'rotate-image', title:'旋转图像', diff:'中等', cat:'矩阵', approach:'先转置，再左右翻转', input:{matrix:[[1,2,3],[4,5,6],[7,8,9]]}},
  {order:21, num:240, slug:'search-a-2d-matrix-ii', title:'搜索二维矩阵 II', diff:'中等', cat:'矩阵', approach:'从右上角出发，走 BST 式搜索', input:{matrix:[[1,4,7],[2,5,8],[3,6,9]], target:6}},

  /* ---------- 链表 ---------- */
  {order:22, num:160, slug:'intersection-of-two-linked-lists', title:'相交链表', diff:'简单', cat:'链表', approach:'双指针互换轨道，相遇即交点', input:{a:[4,1,8,4,5], b:[5,6,1,8,4,5], skipA:2, skipB:3}},
  {order:23, num:206, slug:'reverse-linked-list', title:'反转链表', diff:'简单', cat:'链表', approach:'迭代：prev/cur/next 三指针', input:{head:[1,2,3,4,5]}},
  {order:24, num:234, slug:'palindrome-linked-list', title:'回文链表', diff:'简单', cat:'链表', approach:'快慢找中点 + 反转后半 + 比对', input:{head:[1,2,2,1]}},
  {order:25, num:141, slug:'linked-list-cycle', title:'环形链表', diff:'简单', cat:'链表', approach:'快慢指针，追上即有环', input:{head:[3,2,0,4], pos:2}},
  {order:26, num:142, slug:'linked-list-cycle-ii', title:'环形链表 II', diff:'中等', cat:'链表', approach:'相遇后一个回到头，同步走再相遇', input:{head:[3,2,0,4], pos:2}},
  {order:27, num:21,  slug:'merge-two-sorted-lists', title:'合并两个有序链表', diff:'简单', cat:'链表', approach:'哑节点 + 逐个摘取较小值', input:{l1:[1,2,4], l2:[1,3,4]}},
  {order:28, num:2,   slug:'add-two-numbers', title:'两数相加', diff:'中等', cat:'链表', approach:'逐位相加 + 进位', input:{l1:[2,4,3], l2:[5,6,4]}},
  {order:29, num:19,  slug:'remove-nth-node-from-end-of-list', title:'删除链表的倒数第 N 个结点', diff:'中等', cat:'链表', approach:'哑节点 + 快指针先走 N 步', input:{head:[1,2,3,4,5], n:2}},
  {order:30, num:24,  slug:'swap-nodes-in-pairs', title:'两两交换链表中的节点', diff:'中等', cat:'链表', approach:'哑节点 + 每次换一对', input:{head:[1,2,3,4]}},
  {order:31, num:25,  slug:'reverse-nodes-in-k-group', title:'K 个一组翻转链表', diff:'困难', cat:'链表', approach:'先数够 K 个，组内反转再接回', input:{head:[1,2,3,4,5], k:3}},
  {order:32, num:138, slug:'copy-list-with-random-pointer', title:'随机链表的复制', diff:'中等', cat:'链表', approach:'三步法：穿插复制 / 补随机 / 拆分', input:{head:[[7,null],[13,0],[11,4],[10,2],[1,0]]}},
  {order:33, num:148, slug:'sort-list', title:'排序链表', diff:'中等', cat:'链表', approach:'快慢找中点 + 归并排序', input:{head:[4,2,1,3]}},
  {order:34, num:23,  slug:'merge-k-sorted-lists', title:'合并 K 个升序链表', diff:'困难', cat:'链表', approach:'分治：两两合并（归并）', input:{lists:[[1,4,5],[1,3,4],[2,6]]}},

  /* ---------- 二叉树 ---------- */
  {order:35, num:94,  slug:'binary-tree-inorder-traversal', title:'二叉树的中序遍历', diff:'简单', cat:'二叉树', approach:'递归：左 → 根 → 右', input:{root:[1,null,2,3]}},
  {order:36, num:104, slug:'maximum-depth-of-binary-tree', title:'二叉树的最大深度', diff:'简单', cat:'二叉树', approach:'递归：max(左深,右深)+1', input:{root:[3,9,20,null,null,15,7]}},
  {order:37, num:226, slug:'invert-binary-tree', title:'翻转二叉树', diff:'简单', cat:'二叉树', approach:'递归交换左右子树', input:{root:[4,2,7,1,3,6,9]}},
  {order:38, num:101, slug:'symmetric-tree', title:'对称二叉树', diff:'简单', cat:'二叉树', approach:'双指针递归：镜像位置互比', input:{root:[1,2,2,3,4,4,3]}},
  {order:39, num:543, slug:'diameter-of-binary-tree', title:'二叉树的直径', diff:'简单', cat:'二叉树', approach:'递归深度，顺便更新左+右', input:{root:[1,2,3,4,5]}},
  {order:40, num:102, slug:'binary-tree-level-order-traversal', title:'二叉树的层序遍历', diff:'中等', cat:'二叉树', approach:'队列 BFS，按层出队', input:{root:[3,9,20,null,null,15,7]}},
  {order:41, num:108, slug:'convert-sorted-array-to-bst', title:'将有序数组转换为二叉搜索树', diff:'简单', cat:'二叉树', approach:'取中点做根，左右递归', input:{nums:[-10,-3,0,5,9]}},
  {order:42, num:98,  slug:'validate-binary-search-tree', title:'验证二叉搜索树', diff:'中等', cat:'二叉树', approach:'递归携带上下界', input:{root:[5,1,4,null,null,3,6]}},
  {order:43, num:230, slug:'kth-smallest-element-in-a-bst', title:'二叉搜索树中第 K 小的元素', diff:'中等', cat:'二叉树', approach:'中序遍历数到第 k 个', input:{root:[5,3,6,2,4,null,null,1], k:3}},
  {order:44, num:199, slug:'binary-tree-right-side-view', title:'二叉树的右视图', diff:'中等', cat:'二叉树', approach:'层序取每层最后一个', input:{root:[1,2,3,null,5,null,4]}},
  {order:45, num:114, slug:'flatten-binary-tree-to-linked-list', title:'二叉树展开为链表', diff:'中等', cat:'二叉树', approach:'逆前序：右→左→根 依次接上', input:{root:[1,2,5,3,4,null,6]}},
  {order:46, num:105, slug:'construct-binary-tree-from-preorder-and-inorder-traversal', title:'从前序与中序遍历序列构造二叉树', diff:'中等', cat:'二叉树', approach:'前序定根，中序分左右', input:{preorder:[3,9,20,15,7], inorder:[9,3,15,20,7]}},
  {order:47, num:437, slug:'path-sum-iii', title:'路径总和 III', diff:'中等', cat:'二叉树', approach:'前缀和 + 回溯（哈希计数）', input:{root:[10,5,-3,3,2,null,11,3,-2,null,1], targetSum:8}},
  {order:48, num:236, slug:'lowest-common-ancestor-of-a-binary-tree', title:'二叉树的最近公共祖先', diff:'中等', cat:'二叉树', approach:'递归：左右各找，两边都有即为答案', input:{root:[3,5,1,6,2,0,8,null,null,7,4], p:5, q:1}},
  {order:49, num:124, slug:'binary-tree-maximum-path-sum', title:'二叉树中的最大路径和', diff:'困难', cat:'二叉树', approach:'递归单边贡献，弯路在节点处更新', input:{root:[-10,9,20,null,null,15,7]}},

  /* ---------- 图论 ---------- */
  {order:50, num:200, slug:'number-of-islands', title:'岛屿数量', diff:'中等', cat:'图论', approach:'DFS 淹岛：遇 1 就沉没整座岛', input:{grid:[[1,1,0],[1,0,0],[0,0,1]]}},
  {order:51, num:994, slug:'rotting-oranges', title:'腐烂的橘子', diff:'中等', cat:'图论', approach:'多源 BFS，按分钟扩散', input:{grid:[[2,1,1],[1,1,0],[0,1,1]]}},
  {order:52, num:207, slug:'course-schedule', title:'课程表', diff:'中等', cat:'图论', approach:'拓扑排序（Kahn 入度法）', input:{numCourses:4, prerequisites:[[1,0],[2,1],[3,2]]}},
  {order:53, num:208, slug:'implement-trie-prefix-tree', title:'实现 Trie (前缀树)', diff:'中等', cat:'图论', approach:'字典树：逐字符挂节点', input:{ops:['Trie','insert','search','startsWith','insert','search'], args:[[],['apple'],['apple'],['app'],['app'],['app']]}},

  /* ---------- 回溯 ---------- */
  {order:54, num:46,  slug:'permutations', title:'全排列', diff:'中等', cat:'回溯', approach:'used 标记 + 回溯', input:{nums:[1,2,3]}},
  {order:55, num:78,  slug:'subsets', title:'子集', diff:'中等', cat:'回溯', approach:'每个元素选/不选，位置推进', input:{nums:[1,2,3]}},
  {order:56, num:17,  slug:'letter-combinations-of-a-phone-number', title:'电话号码的字母组合', diff:'中等', cat:'回溯', approach:'数字→字母映射 + 回溯', input:{digits:'23'}},
  {order:57, num:39,  slug:'combination-sum', title:'组合总和', diff:'中等', cat:'回溯', approach:'可重复选取 + 剪枝回溯', input:{candidates:[2,3,6,7], target:7}},
  {order:58, num:22,  slug:'generate-parentheses', title:'括号生成', diff:'中等', cat:'回溯', approach:'回溯：左括号有余量就放，右括号多于左就能收', input:{n:3}},
  {order:59, num:79,  slug:'word-search', title:'单词搜索', diff:'中等', cat:'回溯', approach:'网格四方向回溯 + 现场标记', input:{board:[['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word:'ABCCED'}},
  {order:60, num:131, slug:'palindrome-partitioning', title:'分割回文串', diff:'中等', cat:'回溯', approach:'枚举切割点 + 回文判断回溯', input:{s:'aab'}},
  {order:61, num:51,  slug:'n-queens', title:'N 皇后', diff:'困难', cat:'回溯', approach:'逐行放置 + 列/对角线集合剪枝', input:{n:4}},

  /* ---------- 二分查找 ---------- */
  {order:62, num:35,  slug:'search-insert-position', title:'搜索插入位置', diff:'简单', cat:'二分查找', approach:'左闭右闭二分，找不到就插 left', input:{nums:[1,3,5,6], target:5}},
  {order:63, num:74,  slug:'search-a-2d-matrix', title:'搜索二维矩阵', diff:'中等', cat:'二分查找', approach:'拉直成一维数组二分', input:{matrix:[[1,3,5,7],[10,11,16,20],[23,30,34,60]], target:3}},
  {order:64, num:34,  slug:'find-first-and-last-position-of-element-in-sorted-array', title:'在排序数组中查找元素的第一个和最后一个位置', diff:'中等', cat:'二分查找', approach:'两次二分：找左边界 + 右边界', input:{nums:[5,7,7,8,8,10], target:8}},
  {order:65, num:33,  slug:'search-in-rotated-sorted-array', title:'搜索旋转排序数组', diff:'中等', cat:'二分查找', approach:'判断哪半有序，再决定去哪边', input:{nums:[4,5,6,7,0,1,2], target:0}},
  {order:66, num:153, slug:'find-minimum-in-rotated-sorted-array', title:'寻找旋转排序数组中的最小值', diff:'中等', cat:'二分查找', approach:'mid 与右端点比较', input:{nums:[4,5,6,7,0,1,2]}},
  {order:67, num:4,   slug:'median-of-two-sorted-arrays', title:'寻找两个正序数组的中位数', diff:'困难', cat:'二分查找', approach:'第 k 小：每次淘汰 k/2 个', input:{nums1:[1,3], nums2:[2]}},

  /* ---------- 栈 ---------- */
  {order:68, num:20,  slug:'valid-parentheses', title:'有效的括号', diff:'简单', cat:'栈', approach:'左括号进栈，右括号找对象', input:{s:'()[]{}'}},
  {order:69, num:155, slug:'min-stack', title:'最小栈', diff:'中等', cat:'栈', approach:'辅助栈同步记录当前最小', input:{ops:['MinStack','push','push','push','getMin','pop','top','getMin'], args:[[],[-2],[0],[-3],[],[],[],[]]}},
  {order:70, num:394, slug:'decode-string', title:'字符串解码', diff:'中等', cat:'栈', approach:'双栈：数字栈 + 字符串栈', input:{s:'3[a2[c]]'}},
  {order:71, num:739, slug:'daily-temperatures', title:'每日温度', diff:'中等', cat:'栈', approach:'单调栈存下标，等更热的来收割', input:{temperatures:[73,74,75,71,69,72,76,73]}},
  {order:72, num:84,  slug:'largest-rectangle-in-histogram', title:'柱状图中最大的矩形', diff:'困难', cat:'栈', approach:'单调递增栈 + 哨兵收尾', input:{heights:[2,1,5,6,2,3]}},

  /* ---------- 堆 ---------- */
  {order:73, num:215, slug:'kth-largest-element-in-an-array', title:'数组中的第K个最大元素', diff:'中等', cat:'堆', approach:'快速选择（partition 缩小范围）', input:{nums:[3,2,1,5,6,4], k:2}},
  {order:74, num:347, slug:'top-k-frequent-elements', title:'前 K 个高频元素', diff:'中等', cat:'堆', approach:'哈希计数 + 桶排序', input:{nums:[1,1,1,2,2,3], k:2}},
  {order:75, num:295, slug:'find-median-from-data-stream', title:'数据流的中位数', diff:'困难', cat:'堆', approach:'对顶堆：大顶堆 + 小顶堆', input:{ops:['MedianFinder','addNum','addNum','findMedian','addNum','findMedian'], args:[[],[1],[2],[],[3],[]]}},

  /* ---------- 贪心算法 ---------- */
  {order:76, num:121, slug:'best-time-to-buy-and-sell-stock', title:'买卖股票的最佳时机', diff:'简单', cat:'贪心算法', approach:'一次遍历：记最低价，算最大差', input:{prices:[7,1,5,3,6,4]}},
  {order:77, num:55,  slug:'jump-game', title:'跳跃游戏', diff:'中等', cat:'贪心算法', approach:'维护最远可达 far', input:{nums:[2,3,1,1,4]}},
  {order:78, num:45,  slug:'jump-game-ii', title:'跳跃游戏 II', diff:'中等', cat:'贪心算法', approach:'层序贪心：当前层尽头/下一层尽头', input:{nums:[2,3,1,1,4]}},
  {order:79, num:763, slug:'partition-labels', title:'划分字母区间', diff:'中等', cat:'贪心算法', approach:'记每个字母最后出现位置，扩展窗口', input:{s:'ababcbacadefegdehijhklij'}},

  /* ---------- 动态规划 ---------- */
  {order:80, num:70,  slug:'climbing-stairs', title:'爬楼梯', diff:'简单', cat:'动态规划', approach:'滚动变量：f(n)=f(n-1)+f(n-2)', input:{n:5}},
  {order:81, num:118, slug:'pascals-triangle', title:'杨辉三角', diff:'简单', cat:'动态规划', approach:'逐行构造，两端为 1', input:{numRows:5}},
  {order:82, num:198, slug:'house-robber', title:'打家劫舍', diff:'中等', cat:'动态规划', approach:'滚动 dp：偷或不偷相邻两家', input:{nums:[2,7,9,3,1]}},
  {order:83, num:279, slug:'perfect-squares', title:'完全平方数', diff:'中等', cat:'动态规划', approach:'完全背包：f(i)=min(f(i-j²))+1', input:{n:12}},
  {order:84, num:322, slug:'coin-change', title:'零钱兑换', diff:'中等', cat:'动态规划', approach:'完全背包求最少硬币数', input:{coins:[1,2,5], amount:11}},
  {order:85, num:139, slug:'word-break', title:'单词拆分', diff:'中等', cat:'动态规划', approach:'dp[i] 前缀可拆分 + 词集合', input:{s:'applepenapple', wordDict:['apple','pen']}},
  {order:86, num:300, slug:'longest-increasing-subsequence', title:'最长递增子序列', diff:'中等', cat:'动态规划', approach:'O(n²) DP：以 i 结尾的最长上升', input:{nums:[10,9,2,5,3,7,101,18]}},
  {order:87, num:152, slug:'maximum-product-subarray', title:'乘积最大子数组', diff:'中等', cat:'动态规划', approach:'同时维护最大积和最小积', input:{nums:[2,3,-2,4]}},
  {order:88, num:416, slug:'partition-equal-subset-sum', title:'分割等和子集', diff:'中等', cat:'动态规划', approach:'0-1 背包：能否凑出 sum/2', input:{nums:[1,5,11,5]}},
  {order:89, num:32,  slug:'longest-valid-parentheses', title:'最长有效括号', diff:'困难', cat:'动态规划', approach:'dp：以 i 结尾的最长有效长度', input:{s:')()())'}},

  /* ---------- 多维动态规划 ---------- */
  {order:90, num:62,  slug:'unique-paths', title:'不同路径', diff:'中等', cat:'多维动态规划', approach:'网格 DP：上+左 之和', input:{m:3, n:4}},
  {order:91, num:64,  slug:'minimum-path-sum', title:'最小路径和', diff:'中等', cat:'多维动态规划', approach:'网格 DP：上/左 取小', input:{grid:[[1,3,1],[1,5,1],[4,2,1]]}},
  {order:92, num:1143, slug:'longest-common-subsequence', title:'最长公共子序列', diff:'中等', cat:'多维动态规划', approach:'二维 DP：相同取左上+1，否则取大', input:{text1:'abcde', text2:'ace'}},
  {order:93, num:72,  slug:'edit-distance', title:'编辑距离', diff:'中等', cat:'多维动态规划', approach:'二维 DP：增/删/改 取最小', input:{word1:'horse', word2:'ros'}},
  {order:94, num:5,   slug:'longest-palindromic-substring', title:'最长回文子串', diff:'中等', cat:'多维动态规划', approach:'中心扩展：奇偶两种中心', input:{s:'babad'}},

  /* ---------- 技巧 ---------- */
  {order:95, num:136, slug:'single-number', title:'只出现一次的数字', diff:'简单', cat:'技巧', approach:'异或：成对抵消', input:{nums:[4,1,2,1,2]}},
  {order:96, num:169, slug:'majority-element', title:'多数元素', diff:'简单', cat:'技巧', approach:'Boyer-Moore 投票', input:{nums:[2,2,1,1,1,2,2]}},
  {order:97, num:75,  slug:'sort-colors', title:'颜色分类', diff:'中等', cat:'技巧', approach:'荷兰国旗：三指针一次扫描', input:{nums:[2,0,2,1,1,0]}},
  {order:98, num:31,  slug:'next-permutation', title:'下一个排列', diff:'中等', cat:'技巧', approach:'找降序后缀 → 交换 → 反转尾巴', input:{nums:[1,5,8,4,7,6,5,3,1]}},
  {order:99, num:287, slug:'find-the-duplicate-number', title:'寻找重复数', diff:'中等', cat:'技巧', approach:'下标当指针 → Floyd 判圈找入口', input:{nums:[1,3,4,2,2]}},
  {order:100, num:289, slug:'game-of-life', title:'生命游戏', diff:'中等', cat:'技巧', approach:'原位标记：二进制次位存下一代', input:{board:[[0,1,0],[0,0,1],[1,1,1],[0,0,0]]}}
];

/* 相似题分组: 页脚「🔗 相似题」导航用(一组内的题目互为相似) */
window.LC_SIMILAR = [
  [1, 10],            // 哈希: 两数之和 ↔ 和为K子数组
  [5, 7],             // 双指针: 盛最多水 ↔ 接雨水
  [8, 9, 12],         // 滑动窗口家族
  [10, 47],           // 前缀和: 和为K ↔ 路径总和III
  [23, 24],           // 反转链表 ↔ 回文链表
  [25, 26],           // 环形链表 I ↔ II
  [25, 99],           // Floyd 判圈 ↔ 寻找重复数
  [33, 34],           // 排序链表 ↔ 合并K个链表
  [35, 43],           // 中序遍历 ↔ BST第K小
  [36, 39],           // 最大深度 ↔ 直径
  [37, 38],           // 翻转 ↔ 对称
  [40, 44],           // 层序 ↔ 右视图
  [50, 51],           // 岛屿 ↔ 腐烂的橘子
  [54, 55, 57],       // 回溯: 全排列/子集/组合总和
  [60, 94],           // 分割回文 ↔ 最长回文子串
  [62, 63, 64],       // 二分: 插入位置/二维矩阵/首尾位置
  [65, 66],           // 旋转搜索 ↔ 旋转最小值
  [68, 70],           // 栈: 括号 ↔ 字符串解码
  [71, 72],           // 单调栈: 每日温度 ↔ 柱状图
  [73, 74, 75],       // 堆家族
  [76, 77, 78],       // 贪心: 股票/跳跃 I/II
  [80, 82, 84],       // 线性DP: 爬楼梯/打家劫舍/零钱兑换
  [90, 91],           // 网格DP: 不同路径 ↔ 最小路径和
  [92, 93],           // 双串DP: LCS ↔ 编辑距离
  [95, 96, 97]        // 技巧: 异或/投票/三指针
];

/* 相似题补全(2026-10-02): 覆盖此前没有相似题链接的页面 */
window.LC_SIMILAR.push(
  [2, 53],              // 字母异位词分组 ↔ Trie
  [3, 17],              // 哈希双技巧: 最长连续序列 ↔ 缺失的第一个正数
  [4, 6],               // 移动零 ↔ 三数之和(双指针)
  [11, 71, 72],         // 单调队列/栈家族
  [13, 14, 87],         // 子数组/区间三兄弟
  [13, 86],             // 最大子数组和 ↔ 最长递增子序列
  [15, 16],             // 轮转数组 ↔ 乘积除自身
  [18, 100],            // 矩阵原位操作
  [19, 20],             // 螺旋矩阵 ↔ 旋转图像
  [21, 63],             // 搜索二维矩阵 II ↔ I
  [22, 25],             // 相交链表 ↔ 环形链表
  [27, 33, 34],         // 合并有序链表 ↔ 排序链表 ↔ 合并K个
  [28, 29, 30, 32],     // 链表操作家族
  [41, 46],             // 有序数组建BST ↔ 前序中序构造
  [42, 43],             // 验证BST ↔ 第K小
  [45, 23],             // 展开为链表 ↔ 反转链表
  [48, 49],             // LCA ↔ 最大路径和(树递归)
  [52, 50],             // 课程表 ↔ 岛屿数量(图遍历)
  [56, 58],             // 电话号码 ↔ 括号生成(回溯生成)
  [59, 61],             // 单词搜索 ↔ N 皇后(网格回溯)
  [66, 67],             // 旋转最小值 ↔ 中位数(二分)
  [69, 70],             // 最小栈 ↔ 字符串解码(栈)
  [83, 84, 88],         // 背包家族
  [97, 98],             // 颜色分类 ↔ 下一个排列(技巧)
  [31, 32],             // K 个一组翻转 ↔ 随机链表复制(链表难题)
  [80, 81],             // 爬楼梯 ↔ 杨辉三角(递推家族: f(n) 由更小的 f 拼出)
  [60, 85],             // 分割回文串 ↔ 单词拆分(字符串分段家族)
  [78, 79],             // 跳跃游戏 II ↔ 划分字母区间(边界贪心)
  [68, 89]              // 有效的括号 ↔ 最长有效括号(括号家族)
);
