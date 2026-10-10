/* ============================================================
 * tools/check.js —— 题解页面无头校验器
 * 用法:  node tools/check.js            校验 pages/ 全部页面
 *        node tools/check.js p001 p023  校验指定页
 *
 * 每页检查（主解法 + 可选的 alt 官方解法各跑一遍）：
 *  1. 页面结构：必需的 <script>/<link> 引用
 *  2. JS 语法：内联脚本可解析
 *  3. 配置完整 + 元数据与 problems.js 对表
 *  4. 动画步骤：steps() 可生成、逐步 do() 可执行（stub viz）、
 *     hl/ok/no 行号不越界、msg 非空、每行代码被高亮（默认∪预设）
 *  5. 预设冒烟：每个预设跑 steps+do+sol 不抛错
 *  6. JS sol(input) 与 expected 对拍
 *  7. Python code 真实运行（构造 ListNode/TreeNode）与 expected 对拍
 *  8. live-closure 启发式（pointers/edges/markers 全帧相同 → 嫌疑）
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {execFileSync} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const TMP = path.join(__dirname, '.tmp');
if(!fs.existsSync(TMP)) fs.mkdirSync(TMP, {recursive:true});

const only = process.argv.slice(2).map(s => s.replace(/\.html$/,''));
let files = fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)).sort();
if(only.length) files = files.filter(f => only.some(o => f.startsWith(o)));
if(!files.length){ console.log('没有找到任何页面文件'); process.exit(1); }

function deepEq(a, b){
  if(a === b) return true;
  if(typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6;
  if(a == null || b == null) return a == b;
  if(Array.isArray(a) && Array.isArray(b)){
    if(a.length !== b.length) return false;
    return a.every((x, i) => deepEq(x, b[i]));
  }
  if(typeof a === 'object' && typeof b === 'object'){
    const ka = Object.keys(a), kb = Object.keys(b);
    if(ka.length !== kb.length) return false;
    return ka.every(k => deepEq(a[k], b[k]));
  }
  return false;
}
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

/* ---------- Python 侧 ---------- */
const PY_PREAMBLE = `# -*- coding: utf-8 -*-
import sys, json
from typing import List, Optional, Dict, Tuple

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val; self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

class Node:
    def __init__(self, val=0, next=None, random=None):
        self.val = val; self.next = next; self.random = random

def _build_list(a):
    dummy = ListNode(0); cur = dummy
    for v in a:
        cur.next = ListNode(v); cur = cur.next
    return dummy.next

def _build_tree(a):
    if not a: return None
    root = TreeNode(a[0]); q = [root]; i = 1
    while q and i < len(a):
        p = q.pop(0)
        if i < len(a):
            v = a[i]; i += 1
            if v is not None: p.left = TreeNode(v); q.append(p.left)
        if i < len(a):
            v = a[i]; i += 1
            if v is not None: p.right = TreeNode(v); q.append(p.right)
    return root

def _build_rand(a):
    nodes = [Node(v[0]) for v in a]
    for i, v in enumerate(a):
        if i+1 < len(a): nodes[i].next = nodes[i+1]
        if v[1] is not None: nodes[i].random = nodes[v[1]]
    return nodes[0] if a else None

def _ser(x):
    if x is None: return None
    if isinstance(x, ListNode):
        out = []
        while x: out.append(x.val); x = x.next
        return out
    if isinstance(x, TreeNode):
        out = []; q = [x]
        while q:
            n = q.pop(0)
            if n is None: out.append(None); continue
            out.append(n.val); q.append(n.left); q.append(n.right)
        while out and out[-1] is None: out.pop()
        return out
    if isinstance(x, Node):
        m = {}; i = 0; c = x
        while c: m[id(c)] = i; i += 1; c = c.next
        out = []; c = x
        while c:
            out.append([c.val, m[id(c.random)] if c.random is not None else None]); c = c.next
        return out
    if isinstance(x, (list, tuple)): return [_ser(v) for v in x]
    if isinstance(x, bool): return x
    if isinstance(x, float) and abs(x - round(x)) < 1e-9: return int(round(x))
    return x
`;

function runPyCheck(pageId, solCfg, defs, inPlaceFallback){
  const codeFile = path.join(TMP, pageId + '_sol.py');
  const drvFile = path.join(TMP, pageId + '_drv.py');
  const types = {};
  (solCfg.form || []).forEach(f => types[f.key] = f.type);
  const conv = {};
  for(const k in defs){
    const t = types[k] || 'arr';
    const v = defs[k];
    if(t === 'list') conv[k] = {_py: 'list', v};
    else if(t === 'tree') conv[k] = {_py: 'tree', v};
    else if(t === 'randlist') conv[k] = {_py: 'rand', v};
    else conv[k] = {_py: 'plain', v};
  }
  const method = solCfg.method || 'solve';
  fs.writeFileSync(codeFile, PY_PREAMBLE + '\n' + solCfg.code + '\n', 'utf8');
  const drv =
    PY_PREAMBLE + '\n' +
    'import json, importlib.util, sys\n' +
    'spec = importlib.util.spec_from_file_location("sol", ' + JSON.stringify(codeFile.replace(/\\/g,'/')) + ')\n' +
    'mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)\n' +
    // Match LeetCode: inputs and solution allocations share the same node types.
    'mod.ListNode, mod.TreeNode, mod.Node = ListNode, TreeNode, Node\n' +
    'inst = mod.Solution()\n' +
    'kw = {}\n' +
    'for k, v in json.loads(sys.argv[1]).items():\n' +
    '    if isinstance(v, dict) and "_py" in v:\n' +
    '        if v["_py"] == "list": kw[k] = _build_list(v["v"])\n' +
    '        elif v["_py"] == "tree": kw[k] = _build_tree(v["v"])\n' +
    '        elif v["_py"] == "rand": kw[k] = _build_rand(v["v"])\n' +
    '        else: kw[k] = v["v"]\n' +
    '    else: kw[k] = v\n' +
    'res = getattr(inst, ' + JSON.stringify(method) + ')(**kw)\n' +
    (inPlaceFallback ? 'if res is None and kw:\n    res = next(iter(kw.values()))   # 原地修改题: 返回 None 时校验被改的实参\n' : '') +
    'print(json.dumps(_ser(res), ensure_ascii=False))\n';
  fs.writeFileSync(drvFile, drv, 'utf8');
  const out = execFileSync('python', [drvFile, JSON.stringify(conv)], {timeout: 25000, encoding: 'utf8'});
  return JSON.parse(out.trim().split('\n').pop());
}

/* ---------- 主流程 ---------- */
let pass = 0, fail = 0;
const failures = [];

for(const f of files){
  const pageId = f.replace(/\.html$/,'');
  const errs = [], warns = [];
  try{
    const html = fs.readFileSync(path.join(PAGES, f), 'utf8');
    // 1. 结构
    for(const need of ['../assets/style.css','../assets/problems.js','../assets/progress.js','../assets/viz.js','../assets/engine.js']){
      if(!html.includes(need)) errs.push('缺少引用: ' + need);
    }
    const script = extractInline(html);
    if(!script) throw new Error('找不到内联 <script> 配置');
    // 2-4. vm 执行
    const sandbox = {
      console,
      document: {readyState: 'loading', addEventListener(){}},
      requestAnimationFrame(){},
      setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'problems.js'), 'utf8'), sandbox, {filename:'problems.js'});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'progress.js'), 'utf8'), sandbox, {filename:'progress.js'});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'viz.js'), 'utf8'), sandbox, {filename:'viz.js'});
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'engine.js'), 'utf8'), sandbox, {filename:'engine.js'});
    vm.runInContext(script, sandbox, {filename: f});
    const cfg = sandbox.LC._cfgs[sandbox.LC._cfgs.length - 1];
    if(!cfg) throw new Error('LC.register 未调用');
    if(cfg.order == null || cfg.title == null) errs.push('order/title 缺失');
    if(!cfg.lede) errs.push('lede 缺失');
    if(!cfg.idea) warns.push('idea 缺失');
    if(!cfg.complexity) warns.push('complexity 缺失');
    if(!cfg.qa || !cfg.qa.length) warns.push('qa 缺失');
    if(!cfg.form || !cfg.form.length) errs.push('form 缺失');
    if(!cfg.presets || cfg.presets.length < 2) warns.push('presets 少于 2 个');
    if(cfg.alt && !cfg.alt.label) errs.push('alt 缺少 label（切换标签上要显示）');
    if(cfg.alt && !cfg.alt.idea) warns.push('alt.idea 缺失');
    // 原地修改题(LC 官方签名为 void): 展示代码不得出现带值的 return
    const VOID_LC = new Set([283, 189, 73, 48, 114, 75, 31, 289]);
    if(VOID_LC.has(cfg.num) && cfg.code){
      const retLines = String(cfg.code).split('\n')
        .map((l, i) => ({l: l.trim(), i: i + 1}))
        .filter(x => x.l.startsWith('return') && x.l !== 'return');
      if(retLines.length) errs.push('该题为原地修改题(LC 官方不返回值), 展示代码不得出现 return 值: 行 ' + retLines.map(x => x.i).join(','));
    }
    // 随堂小测校验
    (cfg.quiz || []).forEach((q, qi) => {
      if(!q.q || !String(q.q).trim()) errs.push('quiz[' + qi + '] 题干为空');
      if(!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) errs.push('quiz[' + qi + '] 选项数须 2~6');
      else if(!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)) errs.push('quiz[' + qi + '] answer 越界');
      if(!q.explain || !String(q.explain).trim()) errs.push('quiz[' + qi + '] 缺 explain(答完要讲明白)');
      if(q.jumpTo != null && !(Number.isInteger(q.jumpTo) && q.jumpTo >= 1)) errs.push('quiz[' + qi + '] jumpTo 须为 ≥1 的步号');
    });
    // 0. 元数据与 problems.js 对表（防 order/题号错位）
    const meta = (sandbox.window.LC_PROBLEMS || sandbox.LC_PROBLEMS || []).find(p => p.order === cfg.order);
    if(meta){
      if(meta.num !== cfg.num) errs.push('num 与 problems.js 不符: 页面 ' + cfg.num + ' vs 目录 ' + meta.num);
      if(meta.title !== cfg.title) errs.push('title 与 problems.js 不符: 页面「' + cfg.title + '」 vs 目录「' + meta.title + '」');
      if(meta.diff !== cfg.diff) errs.push('diff 不符: ' + cfg.diff + ' vs ' + meta.diff);
      if(meta.cat !== cfg.cat) errs.push('cat 不符: ' + cfg.cat + ' vs ' + meta.cat);
    } else {
      errs.push('order=' + cfg.order + ' 在 problems.js 中不存在');
    }

    /* ---------- 逐解法校验（主解法 + alt） ---------- */
    const defs = {};
    (cfg.form || []).forEach(fd => defs[fd.key] = fd.def);
    const solCfgs = [cfg];
    if(cfg.alt) solCfgs.push(Object.assign({method: cfg.method, form: cfg.form, presets: cfg.presets}, cfg.alt));

    for(let si = 0; si < solCfgs.length; si++){
      const sc = solCfgs[si];
      const tag = si === 0 ? '' : '[alt] ';
      sandbox.LC.validateInput(cfg, defs);
      // steps
      let frames = [];
      try{
        frames = sc.steps(JSON.parse(JSON.stringify(defs)));
        if(!Array.isArray(frames) || !frames.length) throw new Error('steps() 未返回步骤');
        const nLines = (sc.code || '').split('\n').length;
        frames.forEach((fr, i) => {
          if(typeof fr.msg !== 'string' || !fr.msg.trim()) throw new Error('第 ' + (i+1) + ' 步 msg 为空');
          if(fr.do){
            try{ fr.do(stubViz()); }
            catch(e){ throw new Error('第 ' + (i+1) + ' 步 do() 抛错: ' + e.message); }
          }
          (fr.hl || []).forEach(ln => {
            if(!(ln >= 1 && ln <= nLines)) throw new Error('第 ' + (i+1) + ' 步 hl 行号越界: ' + ln + ' (共 ' + nLines + ' 行)');
          });
          if(fr.ok != null && !(fr.ok >= 1 && fr.ok <= nLines)) throw new Error('第 ' + (i+1) + ' 步 ok 行号越界');
          if(fr.no != null && !(fr.no >= 1 && fr.no <= nLines)) throw new Error('第 ' + (i+1) + ' 步 no 行号越界');
        });
        // 小测 jumpTo 须落在该解法的步数范围内
        if(si === 0 && Array.isArray(cfg.quiz)){
          cfg.quiz.forEach((q, qi) => {
            if(q.jumpTo != null && (!Number.isInteger(q.jumpTo) || q.jumpTo < 1 || q.jumpTo > frames.length))
              errs.push('quiz[' + qi + '] jumpTo=' + q.jumpTo + ' 超出范围(1~' + frames.length + ')');
          });
        }
        // live-closure 启发式
        if(frames.length >= 10){
          const MUT = ['pointers', 'edges', 'markers'];
          const recDo = fr => {
            const calls = [];
            const mk = () => new Proxy(function(){}, {
              get(t, p){
                if(p === Symbol.toPrimitive || p === 'toString') return () => 'viz';
                return (...a) => {
                  try{ calls.push([String(p), JSON.stringify(a)]); }catch(e){ calls.push([String(p), '?']); }
                  return mk();
                };
              },
              apply(){ return mk(); }
            });
            try{ if(fr.do) fr.do(mk()); }catch(e){ /* 上面已报 */ }
            return calls;
          };
          const groups = new Map();
          frames.map(recDo).forEach(calls => calls.forEach(([m, js]) => {
            let a; try{ a = JSON.parse(js); }catch(e){ return; }
            if(!a.length || typeof a[0] !== 'string') return;
            const gk = m + ':' + a[0];
            if(!groups.has(gk)) groups.set(gk, []);
            groups.get(gk).push(a);
          }));
          for(const [gk, list] of groups){
            if(list.length < frames.length * 0.8) continue;
            const fp = a => {
              let opt = null;
              for(let i = a.length - 1; i >= 1; i--){
                if(a[i] && typeof a[i] === 'object' && !Array.isArray(a[i])){ opt = a[i]; break; }
              }
              return JSON.stringify(MUT.map(k => opt && opt[k] !== undefined ? opt[k] : null));
            };
            const fps = list.map(fp);
            if(new Set(fps).size === 1 && fps[0] !== JSON.stringify([null, null, null])){
              warns.push(tag + 'live-closure 嫌疑: ' + gk + ' 的 pointers/edges/markers 在所有帧完全相同——do() 疑似渲染时才读外层可变变量，应在帧生成时快照（见 SPEC 铁律 5）');
              break;
            }
          }
        }
      }catch(e){
        errs.push(tag + 'steps: ' + e.message);
      }
      // hl 覆盖率：非空、非纯注释的代码行在「默认动画 ∪ 全部预设」里都应至少被高亮一次
      const hlSet = new Set();
      frames.forEach(fr => (fr.hl || []).forEach(l => hlSet.add(l)));
      // preset 冒烟
      (sc.presets || cfg.presets || []).forEach((p, pi) => {
        try{
          const base = {};
          (cfg.form || []).forEach(fd => base[fd.key] = fd.def);
          const pin = Object.assign(base, JSON.parse(JSON.stringify(p.values || {})));
          sandbox.LC.validateInput(cfg, pin);
          const pfr = sc.steps(pin) || [];
          pfr.forEach(fr => {
            (fr.hl || []).forEach(l => hlSet.add(l));
            if(fr.do) fr.do(stubViz());
          });
          if(sc.sol) sc.sol(JSON.parse(JSON.stringify(pin)));
        }catch(e){ errs.push(tag + 'preset#' + (pi+1) + '「' + (p.label || '') + '」: ' + e.message); }
      });
      (sc.code || '').split('\n').forEach((line, i) => {
        const t = line.trim();
        if(t && !t.startsWith('#') && !hlSet.has(i + 1)) warns.push(tag + '第 ' + (i+1) + ' 行代码从未被高亮: ' + t.slice(0, 40));
      });
      if(frames.length && frames.length < 8) warns.push(tag + '步骤数偏少 (' + frames.length + ')');
      // JS sol
      let solOk = null;
      if(sc.sol){
        try{
          const out = sc.sol(JSON.parse(JSON.stringify(defs)));
          solOk = deepEq(out, sc.expected);
          if(!solOk) errs.push(tag + 'sol 输出 ' + JSON.stringify(out) + ' ≠ expected ' + JSON.stringify(sc.expected));
        }catch(e){ solOk = false; errs.push(tag + 'sol 抛错: ' + e.message); }
      } else {
        errs.push(tag + 'sol 缺失（无法自动校验）');
      }
      // Python
      let pyOk = null;
      if(sc.code && sc.pyCheck !== false){
        try{
          const inPlace = sc.expected != null && !deepEq(sc.expected, null);
          const out = runPyCheck(pageId + (si === 0 ? '' : '_alt'), sc, defs, inPlace);
          pyOk = deepEq(out, sc.expected);
          if(!pyOk) errs.push(tag + 'py 输出 ' + JSON.stringify(out) + ' ≠ expected ' + JSON.stringify(sc.expected));
        }catch(e){ pyOk = false; errs.push(tag + 'py: ' + (e.message || e).toString().split('\n').slice(-3).join(' | ')); }
      }
    }

    if(errs.length){ fail++; failures.push(pageId + ': ' + errs.join(' ;; ')); }
    else pass++;
    console.log('[ ' + (errs.length ? 'FAIL' : 'ok') + ' ] ' + pageId +
      (errs.length ? '\n         ' + errs.join('\n         ') : '') +
      (warns.length ? '\n         (警告) ' + warns.join('; ') : ''));
  }catch(e){
    fail++; failures.push(pageId + ': ' + e.message);
    console.log('[FAIL] ' + pageId + '  ' + e.message);
  }
}

console.log('\n===== 结果: ' + pass + ' 通过, ' + fail + ' 失败 / 共 ' + files.length + ' 页 =====');
if(failures.length){
  console.log('\n失败清单:');
  failures.forEach(x => console.log('  - ' + x));
  process.exit(1);
}
