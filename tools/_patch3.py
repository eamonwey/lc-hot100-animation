# -*- coding: utf-8 -*-
"""审查修复: 猜测卡生命周期/二次点击语义/小测跳转切回主解法/hashchange/jumpTo 上限"""
import io

# ---------- engine.js ----------
p = 'assets/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new)

# 1. clearGuess 助手 + goTo 用它
rep("""  function goTo(nk){
    stopPlay();
    if(!frames.length) return;
    nk = Math.min(frames.length - 1, Math.max(0, nk));
    pendingGuess = null;
    const gp = $('guessPanel'); if(gp){ gp.style.display = 'none'; gp.innerHTML = ''; }
    if(nk !== k){ k = nk; render(); }
  }""",
"""  function clearGuess(){
    pendingGuess = null;
    const gp = $('guessPanel'); if(gp){ gp.style.display = 'none'; gp.innerHTML = ''; }
  }
  function goTo(nk){
    stopPlay();
    nk = Math.min(frames.length - 1, Math.max(0, nk));
    clearGuess();
    if(nk !== k){ k = nk; render(); }
  }""")

# 2. 播放开始时清掉悬空的猜测卡
rep("""  function startPlay(){
    if(!frames.length) return;
    playing = true;""",
"""  function startPlay(){
    if(!frames.length) return;
    clearGuess();
    playing = true;""")

# 3. 猜测卡显示时再点「下一步」= 揭晓(而不是绕过预测)
rep("""  function stepNext(){
    if(predictMode && k < frames.length - 1 && pendingGuess == null){ showGuess(k + 1); return; }
    goTo(k + 1);
  }""",
"""  function stepNext(){
    if(predictMode && k < frames.length - 1){
      if(pendingGuess == null) showGuess(k + 1);   // 先猜
      else revealNow();                            // 再点一次 = 揭晓
      return;
    }
    goTo(k + 1);
  }""")

# 4. revealNow 复用 clearGuess
rep("""  function revealNow(){
    if(pendingGuess == null) return;
    const t = pendingGuess; pendingGuess = null;
    const gp = $('guessPanel'); gp.style.display = 'none'; gp.innerHTML = '';
    goTo(t);
  }""",
"""  function revealNow(){
    if(pendingGuess == null) return;
    const t = pendingGuess;
    clearGuess();
    goTo(t);
  }""")

# 5. hashchange 监听: 手动改地址栏也能跳步
rep("""  document.addEventListener('keydown', e => {""",
"""  window.addEventListener('hashchange', () => {
    const m = (location.hash || '').match(/step=(\\d+)/);
    if(m){ const t = +m[1] - 1; if(t >= 0 && t < frames.length) goTo(t); }
  });

  document.addEventListener('keydown', e => {""")

# 6. 小测「跳到第 N 步」: 步号以主解法为准, 先切回解法一
rep("""          const jb = ex.querySelector('.qjump');
          if(jb) jb.addEventListener('click', () => {
            goTo(q.jumpTo - 1);
            document.querySelector('.stagecol').scrollIntoView({behavior: 'smooth'});
          });""",
"""          const jb = ex.querySelector('.qjump');
          if(jb) jb.addEventListener('click', () => {
            if(curIdx !== 0) switchSol(0);   // 小测步号以主解法为准
            goTo(q.jumpTo - 1);
            document.querySelector('.stagecol').scrollIntoView({behavior: 'smooth'});
          });""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('engine review fixes OK')

# ---------- check.js: jumpTo 上限 ----------
p2 = 'tools/check.js'
s2 = io.open(p2, encoding='utf-8').read()
old = """        // live-closure 启发式
        if(frames.length >= 10){"""
new = """        // 小测 jumpTo 须落在该解法的步数范围内
        if(si === 0 && Array.isArray(cfg.quiz)){
          cfg.quiz.forEach((q, qi) => {
            if(q.jumpTo != null && (!Number.isInteger(q.jumpTo) || q.jumpTo < 1 || q.jumpTo > frames.length))
              errs.push('quiz[' + qi + '] jumpTo=' + q.jumpTo + ' 超出范围(1~' + frames.length + ')');
          });
        }
        // live-closure 启发式
        if(frames.length >= 10){"""
assert old in s2; s2 = s2.replace(old, new)
io.open(p2, 'w', encoding='utf-8', newline='\n').write(s2)
print('check.js jumpTo bound OK')
