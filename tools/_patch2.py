# -*- coding: utf-8 -*-
"""index.html 加「今日复习」(艾宾浩斯: 掌握后 1/3/7/14/30 天各提示重刷)"""
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

old = """    <div class="pbar">
      <div class="track"><div class="fillbar" id="pfill" style="width:0%"></div></div>
      <span class="pt" id="ptext">已掌握 0 / 100</span>
    </div>
    <div class="filters">"""
new = """    <div class="pbar">
      <div class="track"><div class="fillbar" id="pfill" style="width:0%"></div></div>
      <span class="pt" id="ptext">已掌握 0 / 100</span>
    </div>
    <div class="reviewbar" id="reviewBar" style="display:none"></div>
    <div class="filters">"""
assert old in s; s = s.replace(old, new)

old = """const DONE_KEY = 'lc100.done.v2';
function done(){ try{ return JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); }catch(e){ return []; } }"""
new = """const DONE_KEY = 'lc100.done.v2';
const STAGES = [1, 3, 7, 14, 30];   // 艾宾浩斯复习节点(天)
function done(){ try{ return JSON.parse(localStorage.getItem(DONE_KEY) || '[]'); }catch(e){ return []; } }
function loadJSON(k){ try{ return JSON.parse(localStorage.getItem(k) || '{}'); }catch(e){ return {}; } }
function reviewList(){
  const at = loadJSON('lc100.doneAt'), rv = loadJSON('lc100.reviews');
  const now = Date.now(), out = [];
  done().forEach(o => {
    let t = at[o];
    if(!t){ t = now; at[o] = t; }   // 旧数据没有时间戳 → 从现在起算
    const stage = STAGES[Math.min(rv[o] || 0, STAGES.length - 1)];
    if(now - t >= stage * 86400000) out.push({order: o, days: Math.floor((now - t) / 86400000), round: Math.min(rv[o] || 0, STAGES.length - 1) + 1});
  });
  out.sort((a, b) => b.days - a.days);
  return out;
}
function doReview(o){
  const at = loadJSON('lc100.doneAt'), rv = loadJSON('lc100.reviews');
  rv[o] = (rv[o] || 0) + 1; at[o] = Date.now();
  try{ localStorage.setItem('lc100.reviews', JSON.stringify(rv)); localStorage.setItem('lc100.doneAt', JSON.stringify(at)); }catch(e){}
  render(); toast('第 ' + rv[o] + ' 轮复习完成 ✓');
}
function toast(msg){
  let t = document.getElementById('toast2');
  if(!t){ t = document.createElement('div'); t.id = 'toast2'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}"""
assert old in s; s = s.replace(old, new)

old = """function render(){
  const dn = done();
  const secs = document.getElementById('sections');
  let html = '';"""
new = """function render(){
  const dn = done();
  const secs = document.getElementById('sections');

  // 今日复习横幅
  const rb = document.getElementById('reviewBar');
  const due = reviewList();
  if(due.length){
    let rh = '<b>📖 今日复习 · ' + due.length + ' 题</b><span class="rsub">按 1 / 3 / 7 / 14 / 30 天的记忆节点提醒,重刷一遍才算真的记住</span><div class="rlist">';
    due.slice(0, 10).forEach(x => {
      const p = window.LC_PROBLEMS.find(t => t.order === x.order);
      rh += '<span class="ritem"><a href="pages/p' + String(x.order).padStart(3,'0') + '.html">P' + String(x.order).padStart(3,'0') + ' ' + p.title + '</a><small>第' + x.round + '轮·隔' + x.days + '天</small><button data-review="' + x.order + '">✓ 复习完</button></span>';
    });
    if(due.length > 10) rh += '<span class="ritem more">…还有 ' + (due.length - 10) + ' 题</span>';
    rh += '</div></div>';
    rb.innerHTML = rh; rb.style.display = '';
    rb.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => doReview(+b.getAttribute('data-review'))));
  } else { rb.style.display = 'none'; }

  let html = '';"""
assert old in s; s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index review bar added')
