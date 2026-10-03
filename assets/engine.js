/* ============================================================
 * engine.js —— 动画题解页面引擎
 * 职责：读取 LC.register(config) → 搭建整页 UI（题面/舞台/代码/解说/
 * 控件/自问自答/导航），驱动播放器（单步/连播/跳步/换用例）。
 * 约定：每一步 step.do(viz) 都完整重绘画面 → 回退、跳步天然正确。
 * ============================================================ */
(function(){
'use strict';

const DONE_KEY = 'lc100.done.v2';
const CFGS = [];

function esc(t){
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ---------- 解析工具 ---------- */
function parseNums(str){
  const s = String(str).trim().replace(/^\[|\]$/g,'').trim();
  if(!s) return [];
  return s.split(/[,\s，]+/).filter(x => x !== '').map(Number);
}
function parseListStr(str){
  const s = String(str).trim().replace(/^\[|\]$/g,'').trim();
  if(!s) return [];
  return s.split(/[,\s，]+/).filter(x => x !== '').map(x => (x === 'null' || x === 'None') ? null : (isNaN(Number(x)) ? x : Number(x)));
}
function parseGridStr(str){
  return String(str).trim().split(/\n|;/).map(line =>
    line.replace(/^\[|\]$/g,'').split(/[,\s，]+/).filter(x => x !== '')
        .map(x => (x === 'null' || x === 'None') ? null : (isNaN(Number(x)) ? x.trim() : Number(x)))
  ).filter(r => r.length);
}
function parseArrStr(str){
  const s = String(str).trim().replace(/^\[|\]$/g,'').trim();
  if(!s) return [];
  return s.split(',').map(x => x.trim().replace(/^["']|["']$/g,'')).filter(x => x !== '');
}

window.LC = {
  register(cfg){ CFGS.push(cfg); },
  esc, parseNums, parseListStr, parseGridStr, parseArrStr,
  problems: window.LC_PROBLEMS || [],
  _cfgs: CFGS,

  _done(){ try{ return JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); }catch(e){ return []; } },
  _setDone(arr){ try{ localStorage.setItem(DONE_KEY, JSON.stringify(arr)); }catch(e){} }
};

/* ---------- 简易 Python 语法着色（单遍 tokenizer，绝不互相污染） ---------- */
const PY_KW = new Set(['False','None','True','and','as','assert','async','await','break','class','continue',
  'def','del','elif','else','except','finally','for','from','global','if','import','in','is','lambda',
  'nonlocal','not','or','pass','raise','return','try','while','with','yield','self']);
function pyColor(lineRaw){
  // 找不在字符串里的 # 注释起点
  let ci = -1, inS = null;
  for(let i = 0; i < lineRaw.length; i++){
    const ch = lineRaw[i];
    if(inS){ if(ch === inS) inS = null; }
    else if(ch === '\'' || ch === '"') inS = ch;
    else if(ch === '#'){ ci = i; break; }
  }
  let code = lineRaw, comment = '';
  if(ci >= 0){ comment = '<span class="c">' + esc(lineRaw.slice(ci)) + '</span>'; code = lineRaw.slice(0, ci); }
  const re = /('[^']*'|"[^"]*")|([A-Za-z_][A-Za-z0-9_]*)|(\d+\.?\d*)|(\s+)|(.)/g;
  let out = '', m;
  while((m = re.exec(code))){
    const [tok, str, word, num] = m;
    if(str) out += '<span class="s">' + esc(str) + '</span>';
    else if(word){
      if(PY_KW.has(word)) out += '<span class="k">' + esc(word) + '</span>';
      else if(code[m.index + word.length] === '(') out += '<span class="f">' + esc(word) + '</span>';
      else out += esc(word);
    }
    else if(num !== undefined && num !== '' && /^\d/.test(num)) out += '<span class="n">' + esc(num) + '</span>';
    else out += esc(tok);
  }
  return out + comment;
}

/* ---------- 深比较 ---------- */
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

/* ============================================================ */
function boot(){
  const cfg = CFGS[CFGS.length - 1];
  if(!cfg){ console.error('LC.register 未调用'); return; }
  const app = document.getElementById('app') || document.body;
  const probs = window.LC_PROBLEMS || [];
  const me = probs.find(p => p.order === cfg.order);
  const prev = probs.find(p => p.order === cfg.order - 1);
  const next = probs.find(p => p.order === cfg.order + 1);

  window.PAGE_STATE = {order: cfg.order, stepsOk: false, verify: null, stepsCount: 0};

  /* ---------- 多解法 ---------- */
  const SOLS = [cfg];
  if(cfg.alt) SOLS.push(Object.assign({method: cfg.method}, cfg.alt));
  let curIdx = 0;
  try{ const s = +(localStorage.getItem('lc100.sol.' + cfg.order) || 0); if(s > 0 && s < SOLS.length) curIdx = s; }catch(e){}
  let cur = SOLS[curIdx];

  /* ---------- 静态骨架 ---------- */
  const diffCls = 'd-' + (cfg.diff || '中等');
  let html = '';
  html += '<div class="topbar">';
  html += '  <a class="toplink" href="../index.html">← 返回目录</a>';
  html += '  <a class="toplink" href="https://leetcode.cn/problems/' + (me ? me.slug : '') + '/" target="_blank" rel="noopener">力扣原题 ↗</a>';
  html += '  <button class="mastered" id="btnPrintCard">🖨 速查卡</button>';
  html += '  <button class="mastered" id="btnMaster">☆ 标记已掌握</button>';
  html += '</div>';
  html += '<header>';
  html += '  <h1>' + esc(cfg.title) +
          '<span class="diffchip ' + diffCls + '">' + esc(cfg.diff) + '</span>' +
          '  <span class="l3">LeetCode ' + cfg.num + ' · ' + esc(cfg.cat) + ' · P' + String(cfg.order).padStart(3, '0') + '</span></h1>';
  html += '  <p class="lede" id="ledeBox"></p>';
  html += '  <div class="roles" id="rolesBox"></div>';
  html += '</header>';
  html += '<div class="soltabs" id="solTabs"></div>';
  html += '<div class="main">';
  /* 舞台列 */
  html += '<section class="card stagecol">';
  html += '  <div id="stage"></div>';
  html += '  <div class="legend" id="legendBox" style="display:none"></div>';
  html += '  <div id="guessPanel" style="display:none"></div>';
  html += '  <div class="msg">';
  html += '    <div class="msg-top"><span class="tag t-grey" id="msgTag">初始化</span><span class="counter" id="stepCounter"></span></div>';
  html += '    <div id="msgText"></div>';
  html += '  </div>';
  html += '  <div class="controls">';
  html += '    <div class="btn-row">';
  html += '      <button class="btn" id="btnPredict" title="每一步先让你预测, 再揭晓">🎯 先猜后看:关</button>';
  html += '      <button class="btn" id="btnStart" title="回到第一步">⏮ 开头</button>';
  html += '      <button class="btn" id="btnPrev" title="上一步（←）">◀ 上一步</button>';
  html += '      <button class="btn primary" id="btnPlay">▶ 播放</button>';
  html += '      <button class="btn" id="btnNext" title="下一步（→）">下一步 ▶</button>';
  html += '      <button class="btn" id="btnEnd" title="跳到最后一步">⏭ 结尾</button>';
  html += '      <label class="speed">速度<select id="speedSel">' +
            '<option value="1500">0.5×</option><option value="800" selected>1×</option>' +
            '<option value="430">2×</option><option value="220">4×</option></select></label>';
  html += '    </div>';
  html += '    <input type="range" id="scrub" min="0" max="0" value="0" aria-label="进度条">';
  html += '    <div class="custom-row" id="customRow"></div>';
  html += '  </div>';
  html += '</section>';
  /* 代码列 */
  html += '<aside class="card codecard">';
  html += '  <div class="code-head"><div class="code-title" id="codeTitle"></div><button class="btn btn-mini" id="btnCopyCode" title="复制当前解法的 Python 代码">📋 复制</button></div>';
  html += '  <div class="codebox" id="codeBox"></div>';
  html += '</aside>';
  html += '</div>';
  /* 自问自答 */
  html += '<section class="card quiz" id="quizCard" style="display:none"><h2>📝 随堂小测</h2><div id="quizBox"></div></section>';
  html += '<section class="card qa">';
  html += '  <h2>看完动画，记住这一句</h2>';
  html += '  <div id="ideaBox"></div><div id="qaBox"></div>';
  html += '  <p class="cx" id="cxBox"></p>';
  html += '</section>';
  /* 导航 */
  html += '<div class="navrow">';
  html += prev ? '<a class="navlink" href="p' + String(prev.order).padStart(3,'0') + '.html"><small>上一篇 · P' + String(prev.order).padStart(3,'0') + ' LeetCode ' + prev.num + '</small><span class="nt">' + esc(prev.title) + '</span></a>' : '<span class="navlink" style="opacity:.45"><small>上一篇</small><span class="nt">已经是第一题啦</span></span>';
  html += next ? '<a class="navlink next" href="p' + String(next.order).padStart(3,'0') + '.html"><small>下一篇 · P' + String(next.order).padStart(3,'0') + ' LeetCode ' + next.num + '</small><span class="nt">' + esc(next.title) + '</span></a>' : '<span class="navlink next" style="opacity:.45"><small>下一篇</small><span class="nt">已经是最后一题啦 🎉</span></span>';
  html += '</div>';
  html += '<footer>键盘：← → 逐步 · 空格 播放/暂停 · Home/End 跳转。<br>LeetCode 热题 100 · 动画题解 —— 用眼睛看懂每一行 Python。</footer>';
  app.innerHTML = html;

  /* ---------- DOM 引用 ---------- */
  const $ = id => document.getElementById(id);
  const stage = $('stage'), codeBox = $('codeBox'), msgTag = $('msgTag'), msgText = $('msgText');
  const stepCounter = $('stepCounter'), scrub = $('scrub'), customRow = $('customRow');
  const btnStart = $('btnStart'), btnPrev = $('btnPrev'), btnPlay = $('btnPlay'),
        btnNext = $('btnNext'), btnEnd = $('btnEnd'), speedSel = $('speedSel'),
        btnMaster = $('btnMaster'), btnCopyCode = $('btnCopyCode'),
        btnPredict = $('btnPredict'), btnPrintCard = $('btnPrintCard');

  /* 宽屏自适应：舞台内容按可用宽度放大（最高 1.45×），别让两侧留白浪费 */
  const stageBox = stage.parentElement;
  function fitStage(){
    const w = stageBox.clientWidth - 8;
    if(w > 760) stage.style.zoom = Math.min(1.45, w / 700).toFixed(3);
    else stage.style.zoom = '';
  }
  fitStage();
  window.addEventListener('resize', fitStage);

  /* ---------- 代码面板 / 解法相关 UI（随解法切换重建） ---------- */
  const codeLines = [];
  function fillSolUI(){
    // 导语
    $('ledeBox').innerHTML = cur.lede || cfg.lede;
    // 代码面板
    codeBox.innerHTML = '';
    codeLines.length = 0;
    (cur.code || '').split('\n').forEach((line, i) => {
      const d = document.createElement('div');
      d.className = 'cl';
      d.innerHTML = '<span class="ln">' + (i + 1) + '</span><span class="ct">' + pyColor(line) + '</span>';
      codeBox.appendChild(d);
      codeLines.push(d);
    });
    $('codeTitle').innerHTML = cur.codeTitle || '跟着高亮读代码：当前执行到哪行，哪行就变蓝；条件成立变<span style="color:var(--green)">绿</span>、失败变<span style="color:var(--red)">红</span>。';
    // 角色图例
    const rb = $('rolesBox');
    rb.innerHTML = (cur.roles && cur.roles.length)
      ? cur.roles.map(r => '<span><span class="dot" style="background:var(--' + (r.c || 'blue') + ')"></span><code>' + r.code + '</code> ' + r.text + '</span>').join('')
      : '';
    // 舞台图例
    const lb = $('legendBox');
    if(cur.legend && cur.legend.length){
      lb.style.display = '';
      lb.innerHTML = cur.legend.map(l =>
        l.swatch
          ? '<span><span class="swatch" style="background:' + l.swatch + '"></span>' + l.text + '</span>'
          : '<span><span class="dot" style="background:var(--' + (l.c || 'blue') + ')"></span>' + l.text + '</span>'
      ).join('');
    } else { lb.style.display = 'none'; lb.innerHTML = ''; }
    // 记住这一句 / 自问自答 / 复杂度
    $('ideaBox').innerHTML = cur.idea ? '<div class="idea">💡 ' + cur.idea + '</div>' : '';
    $('qaBox').innerHTML = (cur.qa || []).map(q =>
      '<details' + (q.open ? ' open' : '') + '><summary>' + q.q + '</summary><p>' + q.a + '</p></details>'
    ).join('');
    $('cxBox').textContent = cur.complexity || '';
  }

  function renderTabs(){
    const bar = $('solTabs');
    if(SOLS.length < 2){ bar.style.display = 'none'; return; }
    bar.style.display = '';
    bar.innerHTML = '';
    SOLS.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'soltab' + (i === curIdx ? ' on' : '');
      b.innerHTML = (i === 0 ? '解法一 · ' : '解法二 · ') + esc(s.label || s.approach || (i === 0 && me && me.approach) || ('方案' + (i + 1)));
      b.addEventListener('click', () => switchSol(i));
      bar.appendChild(b);
    });
  }

  function switchSol(i){
    if(i === curIdx || i < 0 || i >= SOLS.length) return;
    stopPlay();
    curIdx = i; cur = SOLS[i];
    try{ localStorage.setItem('lc100.sol.' + cfg.order, String(i)); }catch(e){}
    renderTabs();
    fillSolUI();
    try{ readForm(); }catch(e){ resetToDefaults(); }   // 表单已被改坏 → 先恢复默认再切
    apply();          // 重新校验 + 重建帧（保留用户当前的测试用例）
  }

  /* ---------- 测试用例表单 ---------- */
  const form = cfg.form || [];
  const inputEls = {};
  form.forEach(f => {
    const lab = document.createElement('span');
    lab.className = 'fin-lab'; lab.textContent = f.label || f.key;
    customRow.appendChild(lab);
    let el;
    if(f.type === 'grid'){
      el = document.createElement('textarea');
      el.className = 'fin-area';
      el.rows = Math.min(6, (f.def || []).length + 1);
      el.value = (f.def || []).map(row => row.join(',')).join('\n');
      el.style.maxWidth = '320px';
    } else {
      el = document.createElement('input');
      el.className = 'fin';
      el.spellcheck = false;
      if(f.type === 'num'){ el.type = 'number'; el.style.width = '90px'; el.value = f.def; }
      else if(f.type === 'str'){ el.style.width = '150px'; el.value = f.def; }
      else if(f.type === 'strlist'){ el.style.width = '200px'; el.value = (f.def || []).join(', '); }
      else if(f.type === 'json' || f.type === 'randlist'){ el.style.width = '230px'; el.value = JSON.stringify(f.def); }
      else { el.style.width = '170px'; el.value = joinVal(f.def); } // arr / list / tree(null 写成字面量)
      if(f.ph) el.placeholder = f.ph;
    }
    inputEls[f.key] = el;
    customRow.appendChild(el);
  });
  const btnApply = document.createElement('button');
  btnApply.className = 'btn'; btnApply.textContent = '应用并重播';
  customRow.appendChild(btnApply);
  const btnReset = document.createElement('button');
  btnReset.className = 'btn'; btnReset.textContent = '恢复默认';
  customRow.appendChild(btnReset);
  const verifyChip = document.createElement('span');
  verifyChip.className = 'verify na';
  customRow.appendChild(verifyChip);
  const errSpan = document.createElement('span');
  errSpan.className = 'err';
  customRow.appendChild(errSpan);

  (cfg.presets || []).forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'preset' + (i === 0 ? ' active' : '');
    b.textContent = p.label;
    b.addEventListener('click', () => {
      customRow.querySelectorAll('.preset').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      for(const k in p.values){
        const f = form.find(x => x.key === k);
        const el = inputEls[k];
        if(!el) continue;
        if(f.type === 'grid') el.value = p.values[k].map(r => r.join(',')).join('\n');
        else if(f.type === 'num') el.value = p.values[k];
        else if(f.type === 'json' || f.type === 'randlist') el.value = JSON.stringify(p.values[k]);
        else if(f.type === 'str') el.value = p.values[k];
        else el.value = joinVal(p.values[k]);
      }
      apply();
    });
    customRow.insertBefore(b, inputEls[form[0] && form[0].key]);
  });

  function joinVal(a){ return (a || []).map(x => (x == null ? 'null' : x)).join(','); }
  function readForm(){
    const input = {};
    for(const f of form){
      const el = inputEls[f.key];
      if(f.type === 'num') input[f.key] = Number(el.value);
      else if(f.type === 'str') input[f.key] = el.value;
      else if(f.type === 'grid') input[f.key] = LC.parseGridStr(el.value);
      else if(f.type === 'strlist') input[f.key] = LC.parseArrStr(el.value);
      else if(f.type === 'json') input[f.key] = JSON.parse(el.value);
      else if(f.type === 'list' || f.type === 'tree') input[f.key] = LC.parseListStr(el.value);
      else if(f.type === 'randlist') input[f.key] = JSON.parse(el.value);
      else input[f.key] = LC.parseNums(el.value); // arr
    }
    return input;
  }
  function defaultInput(){
    const input = {};
    for(const f of form) input[f.key] = f.def;
    return input;
  }

  /* ---------- 播放器 ---------- */
  const viz = new Viz(stage);
  let frames = [], k = 0, playing = false, timer = null, lastRenderOk = true;

  function fatal(msg){
    const d = document.createElement('div');
    d.className = 'fatal';
    d.textContent = '⚠ ' + msg;
    stage.insertBefore(d, stage.firstChild);
    window.PAGE_STATE.error = msg;
  }
  function buildFrames(input){
    viz.clear();
    stage.querySelectorAll('.fatal').forEach(e => e.remove());
    try{
      frames = cur.steps(input) || [];
      window.PAGE_STATE.stepsOk = frames.length > 0;
      window.PAGE_STATE.stepsCount = frames.length;
      // 逐步预检：do 与 hl 行号
      frames.forEach((f, i) => {
        if(f.do) f.do(viz);
        if(f.hl) f.hl.forEach(ln => {
          if(ln < 1 || ln > codeLines.length) throw new Error('第 ' + (i + 1) + ' 步高亮了不存在的代码行 ' + ln);
        });
      });
      k = 0;
      lastRenderOk = true;
    }catch(e){
      frames = [];
      window.PAGE_STATE.stepsOk = false;
      window.PAGE_STATE.error = e.message;
      fatal('生成动画失败：' + e.message);
      console.error(e);
    }
    scrub.max = Math.max(0, frames.length - 1);
  }
  function render(){
    if(!frames.length || !lastRenderOk) return;
    const f = frames[k];
    codeLines.forEach((el, i) => {
      const ln = i + 1;
      el.classList.toggle('hl', !!(f.hl && f.hl.includes(ln)));
      el.classList.toggle('ok', f.ok === ln);
      el.classList.toggle('no', f.no === ln);
    });
    msgTag.textContent = f.tag || '';
    msgTag.className = 'tag ' + (f.cls || 't-grey');
    msgText.innerHTML = f.msg || '';
    stepCounter.textContent = '第 ' + (k + 1) + ' / ' + frames.length + ' 步';
    scrub.value = k;
    btnStart.disabled = btnPrev.disabled = (k === 0);
    btnEnd.disabled = btnNext.disabled = (k >= frames.length - 1);
    try{ history.replaceState(null, '', '#step=' + (k + 1)); }catch(e){}
    viz.beginFrame();
    try{ if(f.do) f.do(viz); }
    catch(e){ lastRenderOk = false; stopPlay(); fatal('渲染第 ' + (k + 1) + ' 步出错：' + e.message); console.error(e); }
    viz.endFrame();
  }
  function stopPlay(){
    playing = false;
    if(timer){ clearInterval(timer); timer = null; }
    btnPlay.textContent = '▶ 播放';
  }
  function startPlay(){
    if(!frames.length) return;
    playing = true;
    btnPlay.textContent = '⏸ 暂停';
    timer = setInterval(() => {
      if(k >= frames.length - 1){ stopPlay(); finish(); return; }
      k += 1; render();
    }, +speedSel.value);
  }
  function finish(){
    toast('🎉 播放完成！这题拿下 ✔');
    markDone(cfg.order, true);
  }
  function togglePlay(){
    if(playing){ stopPlay(); return; }
    if(k >= frames.length - 1){ k = 0; render(); }
    startPlay();
  }
  function goTo(nk){
    stopPlay();
    nk = Math.min(frames.length - 1, Math.max(0, nk));
    pendingGuess = null;
    const gp = $('guessPanel'); if(gp){ gp.style.display = 'none'; gp.innerHTML = ''; }
    if(nk !== k){ k = nk; render(); }
  }

  btnPlay.addEventListener('click', togglePlay);
  btnPrev.addEventListener('click', () => goTo(k - 1));
  btnNext.addEventListener('click', stepNext);
  btnStart.addEventListener('click', () => goTo(0));
  btnEnd.addEventListener('click', () => goTo(frames.length - 1));
  scrub.addEventListener('input', () => goTo(+scrub.value));
  speedSel.addEventListener('change', () => { if(playing){ stopPlay(); startPlay(); } });

  document.addEventListener('keydown', e => {
    const t = e.target;
    if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if(e.key === 'ArrowRight'){ e.preventDefault(); stepNext(); }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); goTo(k - 1); }
    else if(e.key === ' '){ e.preventDefault(); togglePlay(); }
    else if(e.key === 'Home'){ e.preventDefault(); goTo(0); }
    else if(e.key === 'End'){ e.preventDefault(); goTo(frames.length - 1); }
  });

  /* ---------- 应用 / 校验 ---------- */
  function apply(){
    stopPlay();
    errSpan.textContent = '';
    let input;
    try{ input = readForm(); }
    catch(e){ errSpan.textContent = '输入格式有误：' + e.message; return; }
    try{
      // 输出校验
      if(cur.sol){
        const out = cur.sol(JSON.parse(JSON.stringify(input)));
        const isDefault = deepEq(input, defaultInput());
        if(isDefault && cur.expected !== undefined){
          const ok = deepEq(out, cur.expected);
          verifyChip.className = 'verify ' + (ok ? 'ok' : 'no');
          verifyChip.textContent = (ok ? '✓ 程序输出正确：' : '✗ 输出应为 ' + JSON.stringify(cur.expected) + '，实际：') + JSON.stringify(out);
          window.PAGE_STATE.verify = ok;
        } else {
          verifyChip.className = 'verify na';
          verifyChip.textContent = '程序输出：' + JSON.stringify(out);
        }
      }
    }catch(e){
      verifyChip.className = 'verify no';
      verifyChip.textContent = '程序运行出错：' + e.message;
      window.PAGE_STATE.verify = false;
    }
    buildFrames(input);
    render();
  }
  btnApply.addEventListener('click', apply);
  function resetToDefaults(){
    for(const f of form){
      const el = inputEls[f.key];
      if(f.type === 'grid') el.value = (f.def || []).map(r => r.map(x => (x == null ? 'null' : x)).join(',')).join('\n');
      else if(f.type === 'num' || f.type === 'str') el.value = f.def;
      else if(f.type === 'json' || f.type === 'randlist') el.value = JSON.stringify(f.def);
      else el.value = joinVal(f.def);
    }
    customRow.querySelectorAll('.preset').forEach((x, i) => x.classList.toggle('active', i === 0));
  }
  btnReset.addEventListener('click', () => { resetToDefaults(); apply(); });

  /* ---------- 已掌握 ---------- */
  function syncMaster(){
    const on = LC._done().includes(cfg.order);
    btnMaster.classList.toggle('on', on);
    btnMaster.textContent = on ? '✓ 已掌握' : '☆ 标记已掌握';
  }
  function markDone(order, flag){
    const arr = LC._done();
    const has = arr.includes(order);
    if(flag && !has){ arr.push(order); LC._setDone(arr); }
    try{
      const at = JSON.parse(localStorage.getItem('lc100.doneAt') || '{}');
      const rv = JSON.parse(localStorage.getItem('lc100.reviews') || '{}');
      if(flag && !has) at[order] = Date.now();
      if(!flag){ delete at[order]; delete rv[order]; }
      localStorage.setItem('lc100.doneAt', JSON.stringify(at));
      localStorage.setItem('lc100.reviews', JSON.stringify(rv));
    }catch(e){}
    syncMaster();
  }
  btnMaster.addEventListener('click', () => {
    const arr = LC._done();
    const has = arr.includes(cfg.order);
    if(has) LC._setDone(arr.filter(x => x !== cfg.order));
    else { LC._setDone(arr.concat(cfg.order)); toast('已标记为掌握 ✓'); }
    syncMaster();
  });

  /* ---------- toast ---------- */
  function toast(text){
    let t = document.getElementById('toast');
    if(!t){
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- 复制代码 ---------- */
  function fallbackCopy(text, done){
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); done(); }
    catch(e){ toast('复制失败, 请手动选择代码'); }
    ta.remove();
  }
  btnCopyCode.addEventListener('click', () => {
    const text = cur.code || '';
    const done = () => toast('📋 代码已复制, 去练手吧');
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  });

  /* ---------- 先猜后看 ---------- */
  let pendingGuess = null;
  function showGuess(target){
    pendingGuess = target;
    const gp = $('guessPanel');
    gp.style.display = '';
    gp.innerHTML = '<div class="guesscard">🎯 <b>先猜一猜</b>:第 ' + (k + 2) + ' 步会发生什么?' +
      '<br><small>提示: 盯着上一帧——哪个指针会动? 哪个格子会变色? 变量会变成几? 大胆在心里说一遍。</small>' +
      '<br><button class="btn primary" id="btnReveal">揭晓答案</button></div>';
    $('btnReveal').addEventListener('click', revealNow);
  }
  function revealNow(){
    if(pendingGuess == null) return;
    const t = pendingGuess; pendingGuess = null;
    const gp = $('guessPanel'); gp.style.display = 'none'; gp.innerHTML = '';
    goTo(t);
  }
  function stepNext(){
    if(predictMode && k < frames.length - 1 && pendingGuess == null){ showGuess(k + 1); return; }
    goTo(k + 1);
  }
  let predictMode = false;
  try{ predictMode = localStorage.getItem('lc100.predict') === '1'; }catch(e){}
  function syncPredict(){ btnPredict.classList.toggle('on', predictMode); btnPredict.textContent = predictMode ? '🎯 先猜后看:开' : '🎯 先猜后看:关'; }
  btnPredict.addEventListener('click', () => {
    predictMode = !predictMode; stopPlay();
    try{ localStorage.setItem('lc100.predict', predictMode ? '1' : '0'); }catch(e){}
    syncPredict();
    if(predictMode) toast('已开启: 按「下一步」会先让你猜, 再揭晓');
  });

  /* ---------- 速查卡 ---------- */
  btnPrintCard.addEventListener('click', () => {
    let pc = document.getElementById('printCard');
    if(!pc){ pc = document.createElement('div'); pc.id = 'printCard'; document.body.appendChild(pc); }
    pc.innerHTML = '<div class="pcard-print"><h1>' + esc(cfg.title) + ' · LeetCode ' + cfg.num + '</h1>' +
      '<p class="pc-sub">解法: ' + esc(cur.label || cur.approach || (me && me.approach) || '') + '</p>' +
      '<p class="pc-idea">💡 ' + (cur.idea || '') + '</p>' +
      '<pre class="pc-code">' + esc(cur.code || '') + '</pre>' +
      '<p class="pc-cx">' + esc(cur.complexity || '') + '</p>' +
      '<p class="pc-url">动画题解: ' + location.href.split('#')[0] + '　·　原题: https://leetcode.cn/problems/' + (me ? me.slug : '') + '/</p></div>';
    window.print();
  });

  /* ---------- 随堂小测 ---------- */
  function renderQuiz(){
    const card = $('quizCard'), box = $('quizBox');
    const qs = cfg.quiz || [];
    if(!qs.length){ card.style.display = 'none'; return; }
    card.style.display = '';
    box.innerHTML = '';
    let got = 0;
    qs.forEach((q, qi) => {
      const qcard = document.createElement('div');
      qcard.className = 'quizcard';
      qcard.innerHTML = '<div class="qq">' + (qi + 1) + '. ' + q.q + '</div>';
      const opts = document.createElement('div');
      opts.className = 'qopts';
      let answered = false;
      (q.options || []).forEach((op, oi) => {
        const b = document.createElement('button');
        b.className = 'qopt';
        b.innerHTML = String.fromCharCode(65 + oi) + '. ' + op;
        b.addEventListener('click', () => {
          if(answered) return;
          answered = true;
          const ok = oi === q.answer;
          opts.querySelectorAll('.qopt').forEach((x, xi) => {
            if(xi === q.answer) x.classList.add('ok');
            if(xi === oi && !ok) x.classList.add('no');
          });
          const ex = document.createElement('div');
          ex.className = 'qexplain ' + (ok ? 'ok' : 'no');
          ex.innerHTML = (ok ? '✅ 答对了! ' : '❌ 不对哦. ') + (q.explain || '') +
            (q.jumpTo && !ok ? ' <button class="btn btn-mini qjump">跳到第 ' + q.jumpTo + ' 步重看</button>' : '');
          qcard.appendChild(ex);
          if(ok){ got++; toast('小测 ' + got + '/' + qs.length + ' ✅'); }
          const jb = ex.querySelector('.qjump');
          if(jb) jb.addEventListener('click', () => {
            goTo(q.jumpTo - 1);
            document.querySelector('.stagecol').scrollIntoView({behavior: 'smooth'});
          });
        });
        opts.appendChild(b);
      });
      qcard.appendChild(opts);
      box.appendChild(qcard);
    });
  }

  /* ---------- 启动 ---------- */
  renderTabs();
  fillSolUI();
  apply();            // 读取表单默认值 → 自动校验徽章 → 生成并渲染第一步
  syncMaster();
  syncPredict();
  renderQuiz();
  const hashMatch = (location.hash || '').match(/step=(\d+)/);
  const hashStep = hashMatch ? +hashMatch[1] - 1 : null;
  if(hashStep != null && hashStep >= 0 && hashStep < frames.length) goTo(hashStep);
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}
})();
