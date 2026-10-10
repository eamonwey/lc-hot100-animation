/* ============================================================
 * tools/data_scan.js —— 帧数据探针
 * 用录制代理捕获每帧 viz 调用的数据参数,
 * 标记 undefined/null/NaN 数据(会画出空图或坏数字)。
 * 用法: node tools/data_scan.js [pXXX ...]
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const only = process.argv.slice(2).map(s => s.replace(/\.html$/,''));
let files = fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)).sort();
if(only.length) files = files.filter(f => only.some(o => f.startsWith(o)) );

function extractInline(html){
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, last = null;
  while((m = re.exec(html))) last = m[1];
  return last;
}
function stubViz(){
  const p = function(){ return p; };
  return new Proxy(p, {get: () => p, apply: () => p, construct: () => p});
}

/* 数据型方法的第几个参数是数据 */
const DATA_ARG = {grid: 1, arr: 1, bars: 1, list: 1, stack: 1, set: 1, map: 1, graph: 1, tree: -1};

let totalIssues = 0;
for(const f of files){
  const html = fs.readFileSync(path.join(PAGES, f), 'utf8');
  const sb = {
    console,
    document: {readyState: 'loading', addEventListener(){}},
    requestAnimationFrame(){}, setTimeout(){ return 0; }, clearTimeout(){},
    setInterval(){ return 0; }, clearInterval(){},
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  for(const f2 of ['assets/problems.js', 'assets/viz.js', 'assets/engine.js'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, f2), 'utf8'), sb, {filename: f2});
  vm.runInContext(extractInline(html), sb, {filename: f});
  const cfg = sb.LC._cfgs[sb.LC._cfgs.length - 1];
  const defs = {};
  (cfg.form || []).forEach(fd => defs[fd.key] = fd.def);
  const solCfgs = [cfg];
  if(cfg.alt) solCfgs.push(Object.assign({method: cfg.method, form: cfg.form, presets: cfg.presets}, cfg.alt));

  const issues = [];
  solCfgs.forEach((sc, si) => {
    const tag = si ? '[alt] ' : '';
    const inputs = [JSON.parse(JSON.stringify(defs))];
    (sc.presets || cfg.presets || []).forEach(p => {
      const base = {}; (cfg.form || []).forEach(fd => base[fd.key] = fd.def);
      inputs.push(Object.assign(base, JSON.parse(JSON.stringify(p.values || {}))));
    });
    inputs.forEach((input, ii) => {
      let frames = [];
      try{ frames = sc.steps(JSON.parse(JSON.stringify(input))) || []; }catch(e){ return; }
      frames.forEach((fr, fi) => {
        if(!fr.do) return;
        const calls = [];
        const rec = () => new Proxy(function(){}, {
          get(t, prop){
            if(prop === Symbol.toPrimitive || prop === 'toString') return () => 'viz';
            return (...a) => { calls.push([String(prop), a]); return rec(); };
          },
          apply(){ return rec(); }
        });
        try{ fr.do(rec()); }catch(e){ return; }
        calls.forEach(([m, a]) => {
          if(!(m in DATA_ARG)) return;
          const di = DATA_ARG[m] === -1 ? a.length - 1 : DATA_ARG[m];
          const data = a[di];
          if(data === undefined) issues.push(tag + '输入#' + ii + ' 第' + (fi+1) + ' 步 ' + m + '(\'' + a[0] + '\') 数据是 undefined(会画出空图)');
          else if(data === null) issues.push(tag + '输入#' + ii + ' 第' + (fi+1) + ' 步 ' + m + '(\'' + a[0] + '\') 数据是 null');
          else if(Array.isArray(data) && data.some(x => typeof x === 'number' && Number.isNaN(x)))
            issues.push(tag + '输入#' + ii + ' 第' + (fi+1) + ' 步 ' + m + '(\'' + a[0] + '\') 数据含 NaN');
        });
      });
    });
  });
  if(issues.length){
    totalIssues += issues.length;
    console.log('[FAIL] ' + f);
    issues.slice(0, 8).forEach(x => console.log('         ' + x));
    if(issues.length > 8) console.log('         …另有 ' + (issues.length - 8) + ' 条');
  } else console.log('[ ok ] ' + f);
}
console.log('\n===== data_scan: ' + files.length + ' 页, ' + totalIssues + ' 处坏数据 =====');
if(totalIssues) process.exit(1);
