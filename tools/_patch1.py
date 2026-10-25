# -*- coding: utf-8 -*-
"""一次性补丁: 引擎加 原题链接/复制代码/步骤深链/先猜后看/速查卡/随堂小测/复习时间戳"""
import io

p = 'assets/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new)

# 1. 顶栏: 力扣原题链接 + 速查卡按钮
rep("""  html += '<div class="topbar">';
  html += '  <a class="toplink" href="../index.html">← 返回目录</a>';
  html += '  <button class="mastered" id="btnMaster">☆ 标记已掌握</button>';
  html += '</div>';""",
"""  html += '<div class="topbar">';
  html += '  <a class="toplink" href="../index.html">← 返回目录</a>';
  html += '  <a class="toplink" href="https://leetcode.cn/problems/' + (me ? me.slug : '') + '/" target="_blank" rel="noopener">力扣原题 ↗</a>';
  html += '  <button class="mastered" id="btnPrintCard">🖨 速查卡</button>';
  html += '  <button class="mastered" id="btnMaster">☆ 标记已掌握</button>';
  html += '</div>';""")

# 2. 代码卡: 复制按钮
rep("""  html += '<aside class="card codecard">';
  html += '  <div class="code-title" id="codeTitle"></div>';
  html += '  <div class="codebox" id="codeBox"></div>';
  html += '</aside>';""",
"""  html += '<aside class="card codecard">';
  html += '  <div class="code-head"><div class="code-title" id="codeTitle"></div><button class="btn btn-mini" id="btnCopyCode" title="复制当前解法的 Python 代码">📋 复制</button></div>';
  html += '  <div class="codebox" id="codeBox"></div>';
  html += '</aside>';""")

# 3. 猜测面板 + 先猜后看按钮 + 随堂小测区
rep("""  html += '  <div class="legend" id="legendBox" style="display:none"></div>';""",
"""  html += '  <div class="legend" id="legendBox" style="display:none"></div>';
  html += '  <div id="guessPanel" style="display:none"></div>';""")

rep("""  html += '    <div class="btn-row">';
  html += '      <button class="btn" id="btnStart" title="回到第一步">⏮ 开头</button>';""",
"""  html += '    <div class="btn-row">';
  html += '      <button class="btn" id="btnPredict" title="每一步先让你预测, 再揭晓">🎯 先猜后看:关</button>';
  html += '      <button class="btn" id="btnStart" title="回到第一步">⏮ 开头</button>';""")

rep("""  html += '<section class="card qa">';""",
"""  html += '<section class="card quiz" id="quizCard" style="display:none"><h2>📝 随堂小测</h2><div id="quizBox"></div></section>';
  html += '<section class="card qa">';""")

# 4. DOM 引用
rep("""        btnNext = $('btnNext'), btnEnd = $('btnEnd'), speedSel = $('speedSel'),
        btnMaster = $('btnMaster');""",
"""        btnNext = $('btnNext'), btnEnd = $('btnEnd'), speedSel = $('speedSel'),
        btnMaster = $('btnMaster'), btnCopyCode = $('btnCopyCode'),
        btnPredict = $('btnPredict'), btnPrintCard = $('btnPrintCard');""")

# 5. goTo 清猜测门; render 写入 hash
rep("""  function goTo(nk){ stopPlay(); nk = Math.min(frames.length - 1, Math.max(0, nk)); if(nk !== k){ k = nk; render(); } }""",
"""  function goTo(nk){
    stopPlay();
    nk = Math.min(frames.length - 1, Math.max(0, nk));
    pendingGuess = null;
    const gp = $('guessPanel'); if(gp){ gp.style.display = 'none'; gp.innerHTML = ''; }
    if(nk !== k){ k = nk; render(); }
  }""")

rep("""    scrub.value = k;
    btnStart.disabled = btnPrev.disabled = (k === 0);
    btnEnd.disabled = btnNext.disabled = (k >= frames.length - 1);""",
"""    scrub.value = k;
    btnStart.disabled = btnPrev.disabled = (k === 0);
    btnEnd.disabled = btnNext.disabled = (k >= frames.length - 1);
    try{ history.replaceState(null, '', '#step=' + (k + 1)); }catch(e){}""")

# 6. 新功能函数
rep("""  /* ---------- 启动 ---------- */
  renderTabs();
  fillSolUI();
  apply();            // 读取表单默认值 → 自动校验徽章 → 生成并渲染第一步
  syncMaster();
}""",
"""  /* ---------- 复制代码 ---------- */
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
  const hashMatch = (location.hash || '').match(/step=(\\d+)/);
  const hashStep = hashMatch ? +hashMatch[1] - 1 : null;
  if(hashStep != null && hashStep >= 0 && hashStep < frames.length) goTo(hashStep);
}""")

# 7. btnNext / 键盘走 stepNext
rep("""  btnNext.addEventListener('click', () => goTo(k + 1));""",
"""  btnNext.addEventListener('click', stepNext);""")

rep("""    if(e.key === 'ArrowRight'){ e.preventDefault(); goTo(k + 1); }""",
"""    if(e.key === 'ArrowRight'){ e.preventDefault(); stepNext(); }""")

# 8. markDone 记时间戳(复习计划用)
rep("""  function markDone(order, flag){
    const arr = LC._done();
    const has = arr.includes(order);
    if(flag && !has){ arr.push(order); LC._setDone(arr); }
    syncMaster();
  }""",
"""  function markDone(order, flag){
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
  }""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('engine features patched OK')
