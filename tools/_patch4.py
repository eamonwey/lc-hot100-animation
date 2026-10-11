# -*- coding: utf-8 -*-
"""引擎补丁: 相似题页脚 / 深色模式 / 遮罩挑战 / 错题记录"""
import io
p = 'assets/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new)

# 1. 顶栏加 🌙 深色 与 🕶 挑战
rep("""  html += '  <button class="mastered" id="btnPrintCard">🖨 速查卡</button>';""",
"""  html += '  <button class="mastered" id="btnPrintCard">🖨 速查卡</button>';
  html += '  <button class="mastered" id="btnTheme" title="深色 / 浅色">🌙</button>';
  html += '  <button class="mastered" id="btnChallenge" title="遮住代码与解说, 只看画面复述算法">🕶 挑战</button>';""")

# 2. DOM 引用
rep("""        btnMaster = $('btnMaster'), btnCopyCode = $('btnCopyCode'),
        btnPredict = $('btnPredict'), btnPrintCard = $('btnPrintCard');""",
"""        btnMaster = $('btnMaster'), btnCopyCode = $('btnCopyCode'),
        btnPredict = $('btnPredict'), btnPrintCard = $('btnPrintCard'),
        btnTheme = $('btnTheme'), btnChallenge = $('btnChallenge');""")

# 3. 页脚相似题
rep("""  html += '<footer>键盘：← → 逐步 · 空格 播放/暂停 · Home/End 跳转。<br>LeetCode 热题 100 · 动画题解 —— 用眼睛看懂每一行 Python。</footer>';""",
"""  const simSib = [];
  (window.LC_SIMILAR || []).forEach(g => { if(g.includes(cfg.order)) g.forEach(x => { if(x !== cfg.order && !simSib.includes(x)) simSib.push(x); }); });
  if(simSib.length){
    html += '<div class="simrow">🔗 相似题：' + simSib.map(x => {
      const pm = probs.find(t => t.order === x);
      return pm ? '<a href="p' + String(x).padStart(3, '0') + '.html">P' + String(x).padStart(3, '0') + ' ' + esc(pm.title) + '</a>' : '';
    }).join('') + '</div>';
  }
  html += '<footer>键盘：← → 逐步 · 空格 播放/暂停 · Home/End 跳转。<br>LeetCode 热题 100 · 动画题解 —— 用眼睛看懂每一行 Python。</footer>';""")

# 4. 小测答错记录 / 答对清除(错题本)
rep("""          const ok = oi === q.answer;
          opts.querySelectorAll('.qopt').forEach((x, xi) => {""",
"""          const ok = oi === q.answer;
          try{
            const w = JSON.parse(localStorage.getItem('lc100.wrong') || '{}');
            const wkey = cfg.order + ':' + qi;
            if(ok) delete w[wkey];
            else w[wkey] = {order: cfg.order, qi: qi, t: Date.now()};
            localStorage.setItem('lc100.wrong', JSON.stringify(w));
          }catch(e){}
          opts.querySelectorAll('.qopt').forEach((x, xi) => {""")

# 5. 深色模式 + 遮罩挑战(插在启动段之前)
rep("""  /* ---------- 启动 ---------- */
  const hashMatch""",
"""  /* ---------- 深色模式 ---------- */
  let dark = false;
  try{ dark = localStorage.getItem('lc100.theme') === 'dark'; }catch(e){}
  function syncTheme(){
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    btnTheme.textContent = dark ? '☀️' : '🌙';
  }
  btnTheme.addEventListener('click', () => {
    dark = !dark;
    try{ localStorage.setItem('lc100.theme', dark ? 'dark' : 'light'); }catch(e){}
    syncTheme();
  });
  syncTheme();

  /* ---------- 遮罩挑战 ---------- */
  let challenge = false;
  try{ challenge = localStorage.getItem('lc100.challenge') === '1'; }catch(e){}
  function syncChallenge(){
    document.body.classList.toggle('challenge', challenge);
    btnChallenge.classList.toggle('on', challenge);
  }
  btnChallenge.addEventListener('click', () => {
    challenge = !challenge;
    try{ localStorage.setItem('lc100.challenge', challenge ? '1' : '0'); }catch(e){}
    syncChallenge();
    if(challenge) toast('🕶 挑战模式: 代码与解说已遮住, 看画面复述算法!');
  });
  syncChallenge();

  /* ---------- 启动 ---------- */
  const hashMatch""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('engine sim/dark/challenge/wrongbook OK')
