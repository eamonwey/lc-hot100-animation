/* ============================================================
 * tools/msg_scan.js —— 解说文案内容扫描
 * 对每页(主解法 + alt)的默认输入与全部预设, 生成全部帧的 msg 字符串,
 * 扫描: undefined/NaN/[object]/Infinity 泄漏、HTML 标签不配对、
 *       疑似占位/重复标点、超短 msg。并输出每页 msg 平均长度。
 * 用法: node tools/msg_scan.js [p001 ...]
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const only = process.argv.slice(2).map(s => s.replace(/\.html$/,''));
let files = fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)).sort();
if(only.length) files = files.filter(f => only.some(o => f.startsWith(o)));

function stubViz(){
  const p = function(){ return p; };
  return new Proxy(p, {get: () => p, apply: () => p, construct: () => p});
}
function extractInline(html){
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, last = null;
  while((m = re.exec(html))) last = m[1];
  return last;
}
function stripTags(s){ return s.replace(/<[^>]+>/g, ''); }
function tagBalance(s){
  const bad = [];
  for(const t of ['b','code','span']){
    const open = (s.match(new RegExp('<' + t + '(\\s[^>]*)?>', 'g')) || []).length;
    const close = (s.match(new RegExp('</' + t + '>', 'g')) || []).length;
    if(open !== close) bad.push('<' + t + '> ' + open + ' vs </' + t + '> ' + close);
  }
  return bad;
}
const BAD_RES = [
  [/undefined/i, 'undefined 泄漏'],
  [/\bNaN\b/, 'NaN 泄漏'],
  [/\[object/, '[object Object 泄漏'],
  [/\bInfinity\b/, 'Infinity 泄漏(应显示 ∞)'],
  [/。。|，，|；；|！！{2}/, '重复标点'],
  [/TODO|FIXME/, '疑似占位标记'],
  [/\?\?/, '疑似 ?? 残留'],
];

let issues = 0;
let totalMsgs = 0, totalLen = 0;
for(const f of files){
  try{
    const html = fs.readFileSync(path.join(PAGES, f), 'utf8');
    const script = extractInline(html);
    const sandbox = {
      console,
      document: {readyState: 'loading', addEventListener(){}},
      requestAnimationFrame(){},
      setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    };
    sandbox.window = sandbox; sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'problems.js'), 'utf8'), sandbox, {filename:'problems.js'});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'viz.js'), 'utf8'), sandbox, {filename:'viz.js'});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'engine.js'), 'utf8'), sandbox, {filename:'engine.js'});
    vm.runInContext(script, sandbox, {filename: f});
    const cfg = sandbox.LC._cfgs[sandbox.LC._cfgs.length - 1];
    const defs = {};
    (cfg.form || []).forEach(fd => defs[fd.key] = fd.def);
    const solCfgs = [cfg];
    if(cfg.alt) solCfgs.push(Object.assign({method: cfg.method, form: cfg.form, presets: cfg.presets}, cfg.alt));

    const problems = [];
    let pageMsgs = 0, pageLen = 0;
    solCfgs.forEach((sc, si) => {
      const tag = si ? '[alt] ' : '';
      const inputs = [JSON.parse(JSON.stringify(defs))];
      (sc.presets || cfg.presets || []).forEach(p => {
        const base = {}; (cfg.form || []).forEach(fd => base[fd.key] = fd.def);
        inputs.push(Object.assign(base, JSON.parse(JSON.stringify(p.values || {}))));
      });
      inputs.forEach((input, ii) => {
        let frames = [];
        try{ frames = sc.steps(input) || []; }catch(e){ problems.push(tag + '输入#' + ii + ' steps 抛错: ' + e.message); return; }
        frames.forEach((fr, fi) => {
          const m = typeof fr.msg === 'string' ? fr.msg : '';
          totalMsgs++; pageMsgs++;
          const plain = stripTags(m);
          totalLen += plain.length; pageLen += plain.length;
          if(!plain.trim()) problems.push(tag + '输入#' + ii + ' 第' + (fi+1) + ' 步 msg 为空');
          for(const [re, name] of BAD_RES){
            if(re.test(m)) problems.push(tag + '输入#' + ii + ' 第' + (fi+1) + ' 步: ' + name + ' → 「' + stripTags(m).slice(0, 60) + '」');
          }
          const tb = tagBalance(m);
          if(tb.length) problems.push(tag + '输入#' + ii + ' 第' + (fi+1) + ' 步 HTML 不配对: ' + tb.join('; '));
        });
      });
    });
    const avg = pageMsgs ? Math.round(pageLen / pageMsgs) : 0;
    if(problems.length){
      issues += problems.length;
      console.log('[FAIL] ' + f + '  msg=' + pageMsgs + ' 均长=' + avg);
      problems.slice(0, 12).forEach(x => console.log('         ' + x));
      if(problems.length > 12) console.log('         …另有 ' + (problems.length - 12) + ' 条');
    } else {
      console.log('[ ok ] ' + f + '  msg=' + pageMsgs + ' 均长=' + avg);
    }
  }catch(e){
    issues++;
    console.log('[FAIL] ' + f + '  ' + e.message);
  }
}
console.log('\n===== msg_scan: ' + (files.length) + ' 页, ' + totalMsgs + ' 条 msg, 总平均长度 ' + Math.round(totalLen / Math.max(1, totalMsgs)) + ' 字, ' + issues + ' 处问题 =====');
if(issues) process.exit(1);
