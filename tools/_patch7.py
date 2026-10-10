# -*- coding: utf-8 -*-
"""引擎补丁: ✍️ 默写模式(只看题面写代码, 对照参考, 计入复习轮次)"""
import io
p = 'assets/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new)

# 1. 顶栏加 ✍️ 默写
rep("""  html += '  <button class="mastered" id="btnChallenge" title="遮住代码与解说, 只看画面复述算法">🕶 挑战</button>';""",
"""  html += '  <button class="mastered" id="btnChallenge" title="遮住代码与解说, 只看画面复述算法">🕶 挑战</button>';
  html += '  <button class="mastered" id="btnRecite" title="只看题面, 凭记忆写代码">✍️ 默写</button>';""")

# 2. DOM 引用
rep("""        btnTheme = $('btnTheme'), btnChallenge = $('btnChallenge');""",
"""        btnTheme = $('btnTheme'), btnChallenge = $('btnChallenge'), btnRecite = $('btnRecite');""")

# 3. 默写弹层容器
rep("""  html += '<footer>键盘：← → 逐步 · 空格 播放/暂停 · Home/End 跳转。<br>LeetCode 热题 100 · 动画题解 —— 用眼睛看懂每一行 Python。</footer>';""",
"""  html += '<footer>键盘：← → 逐步 · 空格 播放/暂停 · Home/End 跳转。<br>LeetCode 热题 100 · 动画题解 —— 用眼睛看懂每一行 Python。</footer>';
  html += '<div id="reciteModal" style="display:none"></div>';""")

# 4. ESC 优先关闭默写弹层
rep("""  document.addEventListener('keydown', e => {
    const t = e.target;
    if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;""",
"""  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      const rm = document.getElementById('reciteModal');
      if(rm && rm.style.display !== 'none'){ closeRecite(); return; }
    }
    const t = e.target;
    if(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;""")

# 5. 默写模式功能块(插在深色模式之前)
rep("""  /* ---------- 深色模式 ---------- */
  let dark = false;""",
"""  /* ---------- ✍️ 默写模式 ---------- */
  let reciteTimer = null, reciteStart = 0;
  function openRecite(){
    const modal = $('reciteModal');
    const parts = [];
    (cfg.form || []).forEach(f => {
      const v = f.type === 'num' ? f.def : JSON.stringify(f.def);
      parts.push((f.label || f.key) + ' = ' + v);
    });
    reciteStart = Date.now();
    modal.style.display = '';
    modal.innerHTML =
      '<div class="recite-wrap">' +
        '<div class="recite-head"><b>✍️ 默写 · ' + esc(cfg.title) + '</b>' +
          '<span class="rc-timer" id="rcTimer">00:00</span>' +
          '<button class="btn btn-mini" id="btnReciteCmp">👀 对照参考</button>' +
          '<button class="btn btn-mini" id="btnReciteDone">✓ 能默写了</button>' +
          '<button class="btn btn-mini" id="btnReciteClose">✕ 关闭</button></div>' +
        '<div class="recite-problem">题目输入: ' + esc(parts.join('　·　')) + '　·　凭记忆写出完整解法, 写完再对照</div>' +
        '<div class="recite-cols">' +
          '<div class="rc-mine"><div class="rc-head">你的代码(Python)</div>' +
            '<textarea id="reciteTA" spellcheck="false" placeholder="class Solution:\\n    def ..."></textarea></div>' +
          '<div class="rc-ref" id="rcRef" style="display:none"><div class="rc-head">参考 · ' + esc(cur.label || cur.approach || (me && me.approach) || '') + '</div>' +
            '<pre class="rc-code">' + pyColor(cur.code || '') + '</pre></div>' +
        '</div>' +
      '</div>';
    $('btnReciteCmp').addEventListener('click', () => {
      const rf = $('rcRef');
      const show = rf.style.display === 'none';
      rf.style.display = show ? '' : 'none';
      $('btnReciteCmp').textContent = show ? '🙈 隐藏参考' : '👀 对照参考';
      if(show) $('reciteTA').style.minHeight = Math.max(340, rf.offsetHeight) + 'px';
    });
    $('btnReciteDone').addEventListener('click', reciteDone);
    $('btnReciteClose').addEventListener('click', closeRecite);
    reciteTimer = setInterval(() => {
      const sec = Math.floor((Date.now() - reciteStart) / 1000);
      const el = $('rcTimer');
      if(el) el.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    }, 500);
    $('reciteTA').focus();
  }
  function closeRecite(){
    if(reciteTimer){ clearInterval(reciteTimer); reciteTimer = null; }
    const modal = $('reciteModal');
    if(modal){ modal.style.display = 'none'; modal.innerHTML = ''; }
  }
  function reciteDone(){
    try{
      const rv = JSON.parse(localStorage.getItem('lc100.reviews') || '{}');
      const at = JSON.parse(localStorage.getItem('lc100.doneAt') || '{}');
      const rc = JSON.parse(localStorage.getItem('lc100.recites') || '{}');
      rv[cfg.order] = (rv[cfg.order] || 0) + 1;
      at[cfg.order] = Date.now();
      rc[cfg.order] = (rc[cfg.order] || 0) + 1;
      localStorage.setItem('lc100.reviews', JSON.stringify(rv));
      localStorage.setItem('lc100.doneAt', JSON.stringify(at));
      localStorage.setItem('lc100.recites', JSON.stringify(rc));
      const arr = LC._done();
      if(!arr.includes(cfg.order)){ arr.push(cfg.order); LC._setDone(arr); }
    }catch(e){}
    syncMaster();
    toast('✍ 能默写了! 复习轮次 +1');
    closeRecite();
  }
  btnRecite.addEventListener('click', openRecite);

  /* ---------- 深色模式 ---------- */
  let dark = false;""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('recite mode OK')
