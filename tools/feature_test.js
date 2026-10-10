/* 新功能端到端冒烟: 先猜后看 / 小测跳转切解法 / 复制 / 速查卡 / 今日复习 */
'use strict';
const path = require('path');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOCAL = f => 'file:///' + path.join(ROOT, 'pages', f).replace(/\\/g, '/');
const fail = [];
let pass = 0;

(async () => {
  const b = await puppeteer.launch({executablePath: EDGE, headless: 'new', args: ['--no-sandbox']});
  const p = await b.newPage();
  await p.setViewport({width: 1600, height: 1080});
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));

  /* ---- 1. 先猜后看: 开 → 下一步出猜测卡 → 再点揭晓 → 播放清卡 ---- */
  await p.goto(LOCAL('p007.html'), {waitUntil: 'load'});
  await sleep(700);
  await p.click('#btnPredict');
  await p.click('#btnNext');
  await sleep(300);
  const g1 = await p.evaluate(() => document.getElementById('guessPanel').style.display !== 'none');
  await p.click('#btnNext');            // 二次点击 = 揭晓
  await sleep(300);
  const g2 = await p.evaluate(() => ({
    hidden: document.getElementById('guessPanel').style.display === 'none',
    step: document.getElementById('stepCounter').textContent,
  }));
  if(g1 && g2.hidden && g2.step.includes('2')) pass++; else fail.push('先猜后看流程异常: ' + JSON.stringify({g1, g2}));
  await p.click('#btnNext'); await sleep(200);
  await p.click('#btnPredict');         // 关掉
  await p.click('#btnNext'); await sleep(200);
  await p.click('#btnNext'); await sleep(200);
  await p.click('#btnPredict');         // 再开
  await p.click('#btnNext'); await sleep(200);
  const g3 = await p.evaluate(() => document.getElementById('guessPanel').style.display !== 'none');
  await p.click('#btnPlay');            // 播放应清掉猜测卡
  await sleep(300);
  const g4 = await p.evaluate(() => document.getElementById('guessPanel').style.display === 'none' && document.getElementById('btnPlay').textContent.includes('暂停'));
  await p.click('#btnPlay');            // 暂停
  if(g3 && g4) pass++; else fail.push('播放未清猜测卡: ' + JSON.stringify({g3, g4}));

  /* ---- 2. 小测: 答错 → 跳转按钮 → 自动切回解法一并落步 ---- */
  await p.goto(LOCAL('p011.html'), {waitUntil: 'load'});
  await sleep(700);
  await p.evaluate(() => {
    document.querySelectorAll('.soltab')[1].click();   // 先切到解法二
  });
  await sleep(400);
  const before = await p.evaluate(() => document.querySelector('.soltab.on').textContent);
  // 点第一题的错误选项(answer 之外的第一个)
  await p.evaluate(() => {
    const q = document.querySelector('.quizcard');
    const opts = q.querySelectorAll('.qopt');
    opts[0].click();                                    // 未必是正确项
  });
  await sleep(200);
  const hasJump = await p.evaluate(() => !!document.querySelector('.qjump'));
  if(hasJump){
    await p.evaluate(() => document.querySelector('.qjump').click());
    await sleep(500);
    const st = await p.evaluate(() => ({
      tab: document.querySelector('.soltab.on').textContent,
      counter: document.getElementById('stepCounter').textContent,
    }));
    if(st.tab.startsWith('解法一')) pass++; else fail.push('小测跳转未切回解法一: ' + JSON.stringify(st));
  } else {
    // 第一题点中的恰好是正确项 → 换第二题再试
    await p.reload(); await sleep(700);
    await p.evaluate(() => { document.querySelectorAll('.soltab')[1].click(); });
    await sleep(400);
    const r = await p.evaluate(() => {
      const qs = document.querySelectorAll('.quizcard');
      for(const q of qs){
        const opts = q.querySelectorAll('.qopt');
        for(let i = 0; i < opts.length; i++){
          // 找到正确项的下一个位置点(必错) — 通过连点非正确项: 先点 0, 若对了再试别的题
        }
      }
      const opts = document.querySelectorAll('.quizcard')[1].querySelectorAll('.qopt');
      opts[0].click();
      return !!document.querySelector('.qjump');
    });
    await sleep(200);
    if(r){
      await p.evaluate(() => document.querySelector('.qjump').click());
      await sleep(500);
      const st = await p.evaluate(() => document.querySelector('.soltab.on').textContent);
      if(st.startsWith('解法一')) pass++; else fail.push('小测跳转未切回解法一');
    } else fail.push('两题都没产生跳转按钮(选项分布异常)');
  }
  console.log('小测前所在标签:', before.trim().slice(0, 20));

  /* ---- 3. 复制代码(桩 clipboard) ---- */
  await p.evaluateOnNewDocument(() => {
    window.__copied = null;
    Object.defineProperty(navigator, 'clipboard', {
      value: {writeText: t => { window.__copied = t; return Promise.resolve(); }}
    });
  });
  await p.goto(LOCAL('p007.html'), {waitUntil: 'load'});
  await sleep(700);
  await p.click('#btnCopyCode');
  await sleep(300);
  const copied = await p.evaluate(() => ({len: (window.__copied || '').length, ok: (window.__copied || '').includes('class Solution')}));
  if(copied.ok && copied.len > 50) pass++; else fail.push('复制代码失败: ' + JSON.stringify(copied));

  /* ---- 4. 速查卡(window.print 桩) ---- */
  await p.evaluate(() => { window.__printed = false; window.print = () => { window.__printed = true; }; });
  await p.click('#btnPrintCard');
  await sleep(300);
  const printed = await p.evaluate(() => ({
    printed: window.__printed,
    card: (document.getElementById('printCard') || {}).textContent || '',
  }));
  if(printed.printed && printed.card.includes('class Solution') && printed.card.includes('💡')) pass++;
  else fail.push('速查卡异常: printed=' + printed.printed);

  /* ---- 5. 今日复习(种子数据) ---- */
  await p.evaluateOnNewDocument(() => {
    const now = Date.now();
    localStorage.setItem('lc100.done.v2', JSON.stringify([7]));
    localStorage.setItem('lc100.doneAt', JSON.stringify({7: now - 5 * 86400000}));
    localStorage.setItem('lc100.reviews', JSON.stringify({}));
  });
  await p.goto('file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/'), {waitUntil: 'load'});
  await sleep(700);
  const rb1 = await p.evaluate(() => ({
    shown: document.getElementById('reviewBar').style.display !== 'none',
    txt: document.getElementById('reviewBar').textContent.replace(/\s+/g, ' ').slice(0, 60),
  }));
  await p.evaluate(() => document.querySelector('[data-review]').click());
  await sleep(400);
  const rb2 = await p.evaluate(() => ({hidden: document.getElementById('reviewBar').style.display === 'none'}));
  if(rb1.shown && rb1.txt.includes('P007') && rb2.hidden) pass++; else fail.push('今日复习异常: ' + JSON.stringify({rb1, rb2}));

  /* ---- 6. 步骤深链 ---- */
  await p.goto(LOCAL('p007.html') + '#step=30', {waitUntil: 'load'});
  await sleep(700);
  const deep = await p.evaluate(() => document.getElementById('stepCounter').textContent);
  if(deep.includes('30')) pass++; else fail.push('深链未生效: ' + deep);

  /* ---- 7. 默写模式: 打开 → 对照 → 标记 → 复习轮次 +1 ---- */
  await p.goto(LOCAL('p011.html'), {waitUntil: 'load'});
  await sleep(700);
  await p.click('#btnRecite'); await sleep(300);
  const ro = await p.evaluate(() => ({
    open: document.getElementById('reciteModal').style.display !== 'none',
    problem: ((document.querySelector('.recite-problem') || {}).textContent || '').includes('nums'),
  }));
  await p.type('#reciteTA', 'class Solution:\n    def reverseList(self, head):');
  await p.click('#btnReciteCmp'); await sleep(300);
  const rc = await p.evaluate(() => document.getElementById('rcRef').style.display !== 'none' &&
    document.getElementById('rcRef').textContent.includes('def'));
  const rvB = await p.evaluate(() => localStorage.getItem('lc100.reviews'));
  await p.click('#btnReciteDone'); await sleep(300);
  const rvA = await p.evaluate(() => ({
    reviews: localStorage.getItem('lc100.reviews'),
    closed: document.getElementById('reciteModal').style.display === 'none',
  }));
  if(ro.open && ro.problem && rc && rvA.closed && rvA.reviews !== rvB) pass++;
  else fail.push('默写模式异常: ' + JSON.stringify({ro, rc, rvB, rvA}));

  await b.close();
  console.log('\n===== 功能冒烟: ' + pass + ' 项通过, ' + fail.length + ' 项失败 =====');
  if(errs.length) console.log('页面错误:', errs);
  if(fail.length){ console.log(fail.map(x => '  - ' + x).join('\n')); process.exit(1); }
})();
