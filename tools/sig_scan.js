/* ============================================================
 * tools/sig_scan.js —— 展示代码签名审计
 * 把每页 def 行的方法名/参数名与力扣官方 Python3 签名逐一比对。
 * 用法: node tools/sig_scan.js
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');

/* 力扣官方 Python3 签名(方法名 + self 之后的参数名列表) */
const OFFICIAL = {
  1: ['twoSum', ['nums', 'target']],
  49: ['groupAnagrams', ['strs']],
  128: ['longestConsecutive', ['nums']],
  283: ['moveZeroes', ['nums']],
  11: ['maxArea', ['height']],
  15: ['threeSum', ['nums']],
  42: ['trap', ['height']],
  3: ['lengthOfLongestSubstring', ['s']],
  438: ['findAnagrams', ['s', 'p']],
  560: ['subarraySum', ['nums', 'k']],
  239: ['maxSlidingWindow', ['nums', 'k']],
  76: ['minWindow', ['s', 't']],
  53: ['maxSubArray', ['nums']],
  56: ['merge', ['intervals']],
  189: ['rotate', ['nums', 'k']],
  238: ['productExceptSelf', ['nums']],
  41: ['firstMissingPositive', ['nums']],
  73: ['setZeroes', ['matrix']],
  54: ['spiralOrder', ['matrix']],
  48: ['rotate', ['matrix']],
  240: ['searchMatrix', ['matrix', 'target']],
  160: ['getIntersectionNode', ['headA', 'headB']],
  206: ['reverseList', ['head']],
  234: ['isPalindrome', ['head']],
  141: ['hasCycle', ['head']],
  142: ['detectCycle', ['head']],
  21: ['mergeTwoLists', ['list1', 'list2']],
  2: ['addTwoNumbers', ['l1', 'l2']],
  19: ['removeNthFromEnd', ['head', 'n']],
  24: ['swapPairs', ['head']],
  25: ['reverseKGroup', ['head', 'k']],
  138: ['copyRandomList', ['head']],
  148: ['sortList', ['head']],
  23: ['mergeKLists', ['lists']],
  94: ['inorderTraversal', ['root']],
  104: ['maxDepth', ['root']],
  226: ['invertTree', ['root']],
  101: ['isSymmetric', ['root']],
  543: ['diameterOfBinaryTree', ['root']],
  102: ['levelOrder', ['root']],
  108: ['sortedArrayToBST', ['nums']],
  98: ['isValidBST', ['root']],
  230: ['kthSmallest', ['root', 'k']],
  199: ['rightSideView', ['root']],
  114: ['flatten', ['root']],
  105: ['buildTree', ['preorder', 'inorder']],
  437: ['pathSum', ['root', 'targetSum']],
  236: ['lowestCommonAncestor', ['root', 'p', 'q']],
  124: ['maxPathSum', ['root']],
  200: ['numIslands', ['grid']],
  994: ['orangesRotting', ['grid']],
  207: ['canFinish', ['numCourses', 'prerequisites']],
  46: ['permute', ['nums']],
  78: ['subsets', ['nums']],
  17: ['letterCombinations', ['digits']],
  39: ['combinationSum', ['candidates', 'target']],
  22: ['generateParenthesis', ['n']],
  79: ['exist', ['board', 'word']],
  131: ['partition', ['s']],
  51: ['solveNQueens', ['n']],
  35: ['searchInsert', ['nums', 'target']],
  74: ['searchMatrix', ['matrix', 'target']],
  34: ['searchRange', ['nums', 'target']],
  33: ['search', ['nums', 'target']],
  153: ['findMin', ['nums']],
  4: ['findMedianSortedArrays', ['nums1', 'nums2']],
  20: ['isValid', ['s']],
  394: ['decodeString', ['s']],
  739: ['dailyTemperatures', ['temperatures']],
  84: ['largestRectangleArea', ['heights']],
  215: ['findKthLargest', ['nums', 'k']],
  347: ['topKFrequent', ['nums', 'k']],
  121: ['maxProfit', ['prices']],
  55: ['canJump', ['nums']],
  45: ['jump', ['nums']],
  763: ['partitionLabels', ['s']],
  70: ['climbStairs', ['n']],
  118: ['generate', ['numRows']],
  198: ['rob', ['nums']],
  279: ['numSquares', ['n']],
  322: ['coinChange', ['coins', 'amount']],
  139: ['wordBreak', ['s', 'wordDict']],
  300: ['lengthOfLIS', ['nums']],
  152: ['maxProduct', ['nums']],
  416: ['canPartition', ['nums']],
  32: ['longestValidParentheses', ['s']],
  62: ['uniquePaths', ['m', 'n']],
  64: ['minPathSum', ['grid']],
  1143: ['longestCommonSubsequence', ['text1', 'text2']],
  72: ['minDistance', ['word1', 'word2']],
  5: ['longestPalindrome', ['s']],
  136: ['singleNumber', ['nums']],
  169: ['majorityElement', ['nums']],
  75: ['sortColors', ['nums']],
  31: ['nextPermutation', ['nums']],
  287: ['findDuplicate', ['nums']],
  289: ['gameOfLife', ['board']],
};

function extractInline(html){
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, last = null;
  while((m = re.exec(html))) last = m[1];
  return last;
}
function loadPage(file){
  const sb = {
    console,
    document: {readyState: 'loading', addEventListener(){}},
    requestAnimationFrame(){}, setTimeout(){ return 0; }, clearTimeout(){},
    setInterval(){ return 0; }, clearInterval(){},
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  for(const f of ['assets/problems.js', 'assets/viz.js', 'assets/engine.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sb, {filename: f});
  vm.runInContext(extractInline(fs.readFileSync(path.join(PAGES, file), 'utf8')), sb, {filename: file});
  return sb.LC._cfgs[sb.LC._cfgs.length - 1];
}
/* 从代码里抽 def 行(跳过嵌套的 def, 只看缩进 4 的顶层方法) */
function topDefs(code){
  const out = [];
  code.split('\n').forEach((l, i) => {
    const m = l.match(/^    def (\w+)\(self(?:, (.*))?\)/);
    if(m) out.push({name: m[1], params: (m[2] || '').split(',').map(x => x.trim().split(':')[0].trim()).filter(x => x), line: i + 1});
  });
  return out;
}

let totalIssues = 0;
const files = fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)).sort();
for(const f of files){
  const cfg = loadPage(f);
  const meta = (function(){
    const sb = {window: {}};
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'problems.js'), 'utf8'), sb);
    return sb.window.LC_PROBLEMS.find(p => p.order === cfg.order) || {};
  })();
  const off = OFFICIAL[meta.num];
  if(!off){ console.log('[skip] ' + f + ' (LC' + meta.num + ' 无官方对照)'); continue; }
  const issues = [];
  // 1. method 字段与官方方法名
  if(cfg.method !== off[0]) issues.push('method 名 ' + JSON.stringify(cfg.method) + ' ≠ 官方 ' + JSON.stringify(off[0]));
  // 2. 展示代码里的顶层 def
  const defs = topDefs(String(cfg.code || ''));
  const mainDef = defs.find(d => d.name === off[0]);
  if(!mainDef){
    issues.push('展示代码未找到官方方法 def ' + off[0] + '(现有: ' + defs.map(d => d.name).join(', ') + ')');
  } else {
    // 参数名逐一比对(顺序无关的集合比较 + 数量)
    const got = mainDef.params, want = off[1];
    const same = got.length === want.length && want.every(w => got.includes(w));
    if(!same) issues.push('def ' + off[0] + ' 参数 ' + JSON.stringify(got) + ' ≠ 官方 ' + JSON.stringify(want));
  }
  // 3. 所有 sol 引用的 method 名一致性由 check.js 覆盖, 这里只看展示代码
  if(issues.length){
    totalIssues += issues.length;
    console.log('[FAIL] ' + f + ' LC' + meta.num);
    issues.forEach(x => console.log('         ' + x));
  } else console.log('[ ok ] ' + f);
}
console.log('\n===== sig_scan: ' + files.length + ' 页, ' + totalIssues + ' 处签名问题 =====');
if(totalIssues) process.exit(1);
