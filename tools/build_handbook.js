/* ============================================================
 * tools/build_handbook.js —— 从 100 个题解页抽取配置,
 * 生成一页式「速查手册.html」(全 100 卡: 核心一句话+代码+复杂度)。
 * 用法: node tools/build_handbook.js
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');

function loadCfg(file){
  const html = fs.readFileSync(path.join(PAGES, file), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/gi);
  const inline = m.map(x => x.replace(/<\/?script>/g, '')).pop();
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
  vm.runInContext(inline, sb, {filename: file});
  return sb.LC._cfgs[sb.LC._cfgs.length - 1];
}

const probs = (() => {
  const sb = {window: {}};
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'problems.js'), 'utf8'), sb);
  return sb.window.LC_PROBLEMS;
})();

const cfgs = files => files.map(f => loadCfg(f)).sort((a, b) => a.order - b.order);
const all = cfgs(fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)));

const CATS = ['哈希','双指针','滑动窗口','子串','普通数组','矩阵','链表','二叉树','图论','回溯','二分查找','栈','堆','贪心算法','动态规划','多维动态规划','技巧'];
const CAT_ICON = {'哈希':'🗂','双指针':'👉','滑动窗口':'🪟','子串':'🧵','普通数组':'🔢','矩阵':'⬜','链表':'🔗','二叉树':'🌳','图论':'🗺','回溯':'🧭','二分查找':'🔍','栈':'🥞','堆':'⛰','贪心算法':'💰','动态规划':'📈','多维动态规划':'🧮','技巧':'🎩'};
const DIFF_CLS = {'简单':'d1','中等':'d2','困难':'d3'};

let toc = '', body = '';
CATS.forEach(cat => {
  const items = all.filter(c => c.cat === cat);
  if(!items.length) return;
  toc += '<a class="toc" href="#cat-' + cat + '">' + (CAT_ICON[cat] || '') + cat + ' · ' + items.length + '</a>';
  body += '<h2 id="cat-' + cat + '">' + (CAT_ICON[cat] || '') + ' ' + cat + '</h2>';
  items.forEach(c => {
    const meta = probs.find(p => p.order === c.order) || {};
    body +=
      '<section class="card ' + DIFF_CLS[c.diff] + '">' +
      '<h3><span class="pn">P' + String(c.order).padStart(3, '0') + ' · LC' + c.num + '</span> ' + c.title +
      ' <span class="df ' + DIFF_CLS[c.diff] + '">' + c.diff + '</span></h3>' +
      '<p class="ap">解法: ' + (c.label || c.approach || meta.approach || '') + '</p>' +
      '<p class="idea">💡 ' + (c.idea || '') + '</p>' +
      '<pre class="code">' + c.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>' +
      '<p class="cx">' + (c.complexity || '') + '</p>' +
      (c.alt ? '<div class="altblock"><p class="altlab">📘 解法二 · ' + (c.alt.label || '官方解法') + '</p>' +
        (c.alt.idea ? '<p class="idea alt-idea">💡 ' + c.alt.idea + '</p>' : '') +
        '<pre class="code">' + c.alt.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre>' +
        (c.alt.complexity ? '<p class="cx">' + c.alt.complexity + '</p>' : '') + '</div>' : '') +
      '<p class="lnk"><a href="pages/p' + String(c.order).padStart(3, '0') + '.html">🎬 动画题解</a> · ' +
      '<a href="https://leetcode.cn/problems/' + (meta.slug || '') + '/" target="_blank">力扣原题 ↗</a></p>' +
      '</section>';
  });
});

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>LeetCode 热题 100 · 速查手册</title>
<style>
  :root{--paper:#f7f6f1;--card:#fffdf9;--ink:#262a33;--muted:#7a7f8c;--line:#e6e2d7;
    --blue:#3355c8;--green:#1e7a4e;--orange:#c9541f;--red:#c23a33;--mono:Consolas,monospace}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI","Microsoft YaHei",sans-serif;background:var(--paper);color:var(--ink);
    padding:26px 16px 60px;line-height:1.65;font-size:14px}
  .head{max-width:960px;margin:0 auto 18px}
  .head h1{font-size:26px}
  .head p{color:var(--muted);margin-top:6px}
  .toc{display:inline-block;font-size:12.5px;color:var(--blue);text-decoration:none;
    background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px;margin:3px 3px 0 0}
  main{max-width:960px;margin:0 auto}
  h2{font-size:20px;margin:30px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--line)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;
    padding:14px 18px;margin-bottom:14px;break-inside:avoid;page-break-inside:avoid}
  h3{font-size:16px;margin-bottom:6px}
  .pn{font-family:var(--mono);font-size:12px;color:var(--muted);font-weight:500}
  .df{font-size:11px;border-radius:999px;padding:1px 9px;vertical-align:2px}
  .d1{background:#e4f3ea;color:var(--green)} .d2{background:#fbeee4;color:var(--orange)} .d3{background:#fbe9e7;color:var(--red)}
  .ap{font-size:12.5px;color:var(--muted);margin-bottom:6px}
  .idea{background:#faf3dd;border:1px solid #ecd9a8;border-radius:8px;padding:6px 12px;margin-bottom:8px;font-size:13px}
  .code{font-family:var(--mono);font-size:12px;line-height:1.7;white-space:pre-wrap;
    background:#fbfaf5;border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:6px}
  .cx{font-family:var(--mono);font-size:12px;color:var(--muted)}
  .lnk{font-size:12px;margin-top:4px}
  .altblock{margin-top:10px;border-top:1px dashed var(--line);padding-top:10px}
  .altlab{font-size:13px;font-weight:650;color:var(--blue);margin-bottom:6px}
  .alt-idea{background:#eef2fb;border-color:#c3cff3}
  .lnk a{color:var(--blue)}
  @media print{
    body{background:#fff;padding:0}
    .card{border-color:#ddd}
    h2{page-break-after:avoid}
    a{color:inherit;text-decoration:none}
  }
</style>
</head>
<body>
<div class="head">
  <h1>📖 LeetCode 热题 100 · 速查手册</h1>
  <p>100 张复习卡: 核心一句话 + 完整 Python 代码 + 复杂度。由 <a href="index.html">动画题解</a> 自动生成,
     打印(Ctrl+P)可当纸质复习册。生成时间: ${new Date().toLocaleString('zh-CN')}</p>
  <div>${toc}</div>
</div>
<main>
${body}
</main>
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, '手册.html'), html, 'utf8');
console.log('手册.html 生成完成:', all.length, '张卡片,', Math.round(html.length / 1024), 'KB');
