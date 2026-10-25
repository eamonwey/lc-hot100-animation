/* 最终逐项验收: 9 项需求在线实测 */
'use strict';
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message).slice(0, 100)));
  const V = Date.now();
  const R = 'https://eamonwey.github.io/lc-hot100-animation/';

  // 引擎修复(审查轮)是否在线
  await p.goto(R + 'assets/engine.js?v=' + V, {waitUntil: 'load'});
  const eng = await p.evaluate(() => ({
    clearGuess: document.body.textContent.includes('function clearGuess'),
    challenge: document.body.textContent.includes('challenge'),
  }));

  // 种子数据: 掌握 P7(2 天前, 复习 1 轮) + P12 错题
  await p.evaluateOnNewDocument(() => {
    const now = Date.now();
    localStorage.setItem('lc100.done.v2', JSON.stringify([7]));
    localStorage.setItem('lc100.doneAt', JSON.stringify({7: now - 2 * 86400000}));
    localStorage.setItem('lc100.reviews', JSON.stringify({7: 1}));
    localStorage.setItem('lc100.wrong', JSON.stringify({12: {order: 12, qi: 1, t: now}}));
  });

  // ===== 目录页: 2 统计 / 3 备份 / 4 深色 / 5 错题本 / 6 手册入口 =====
  await p.goto(R + '?v=' + V, {waitUntil: 'load', timeout: 60000});
  await sleep(1200);
  const idx = await p.evaluate(() => ({
    stats: document.getElementById('statsBar').textContent.replace(/\s+/g, ' ').slice(0, 70),
    streak: document.getElementById('statsBar').textContent.includes('连续学习'),
    reviewDue: document.getElementById('reviewBar').style.display !== 'none',
    wrong: (document.getElementById('wrongBar').textContent || '').includes('最小覆盖'),
    backup: !!document.getElementById('btnExport') && !!document.getElementById('btnImport'),
    manual: !!document.querySelector('a[href*="手册"]'),
    themeBtn: (document.getElementById('btnTheme') || {}).textContent || '缺',
  }));
  // 深色切换
  await p.click('#btnTheme');
  await sleep(200);
  const darkOn = await p.evaluate(() => document.documentElement.dataset.theme);
  await p.click('#btnTheme');

  // ===== 页面: 1 相似题 / 8 双解法标签 / 9 挑战 / 原题链接 / 复制 =====
  await p.goto(R + 'pages/p007.html?v=' + V, {waitUntil: 'load', timeout: 60000});
  await sleep(1200);
  const pg7 = await p.evaluate(() => ({
    sim: (document.querySelector('.simrow') || {}).textContent?.includes('盛最多水') || false,
    lc: !!document.querySelector('a.toplink[href*="leetcode.cn"]'),
    copy: !!document.getElementById('btnCopyCode'),
    predict: !!document.getElementById('btnPredict'),
    print: !!document.getElementById('btnPrintCard'),
    quiz: document.querySelectorAll('.quizcard').length,
  }));
  // ===== 8 双解法第三批(抽查 4 页标签数) =====
  const altPages = {};
  for(const pg of ['p013', 'p022', 'p060', 'p088']){
    await p.goto(R + 'pages/' + pg + '.html?v=' + V, {waitUntil: 'load', timeout: 60000});
    await sleep(900);
    const t = await p.evaluate(() => document.querySelectorAll('.soltab').length);
    altPages[pg] = t;
  }
  // ===== 10 挑战模式 =====
  await p.goto(R + 'pages/p023.html?v=' + V, {waitUntil: 'load', timeout: 60000});
  await sleep(1000);
  await p.click('#btnChallenge');
  await sleep(300);
  const challenge = await p.evaluate(() => ({
    on: document.body.classList.contains('challenge'),
    blur: getComputedStyle(document.querySelector('.codecard')).filter.includes('blur'),
  }));

  console.log('引擎修复在线:', JSON.stringify(eng));
  console.log('2 统计面板:', JSON.stringify(idx.stats));
  console.log('5 错题本(含种子P12):', idx.wrong, '| 3 备份按钮:', idx.backup, '| 6 手册入口:', idx.manual);
  console.log('4 深色切换:', idx.themeBtn, '→', darkOn, '| 复习到期提醒:', idx.reviewDue);
  console.log('1 相似题:', pg7.sim, '| 原题链接:', pg7.lc, '| 复制:', pg7.copy, '| 先猜后看:', pg7.predict, '| 速查卡:', pg7.print, '| 小测:', pg7.quiz + '题');
  console.log('8 双解法标签数:', JSON.stringify(altPages), '(p013/p022/p060/p088)');
  console.log('10 挑战模式:', JSON.stringify(challenge));
  console.log('页面错误:', errs.length ? errs : '无');
  await b.close();
})();
