/* 自定义输入边界测试(对应 2026-10-06 审查报告 5 项):
   1) P084 大金额必须被拦截且不生成动画
   2) P025 301 节点尾接头: 判环结论必须 true(守卫按 2N 上界)
   3) P026 同输入: 入口必须 = 下标 0
   4) P031 k=101=n: 整条链一组反转(去掉 k≤100 钳制)
   5) 解析器超 2000 项报错而非静默截断
   6) P054 动态计数标题逐帧更新(viz._blk 根因) */
'use strict';
const path = require('path');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOCAL = f => 'file:///' + path.join(ROOT, 'pages', f).replace(/\\/g, '/');
let pass = 0; const fail = [];
const ok = (cond, name, detail) => { if(cond){ pass++; console.log('  [ok] ' + name); } else fail.push(name + ' :: ' + JSON.stringify(detail)); };

async function applyInput(p, vals){
  await p.evaluate(vals => {
    const ins = [...document.querySelectorAll('#customRow input')];
    ins.forEach((el, i) => { el.value = vals[i]; });
    [...document.querySelectorAll('#customRow .btn')].find(b => b.textContent.includes('应用并重播')).click();
  }, vals);
  await sleep(800);
}
const errText = p => p.evaluate(() => { const e = document.querySelector('#customRow .err'); return e ? e.textContent : ''; });
const resultText = p => p.evaluate(() => {
  const blk = [...document.querySelectorAll('.blk')].find(b => { const t = b.querySelector('.blk-t'); return t && t.textContent === '返回结果'; });
  return blk ? blk.querySelector('.blk-b').textContent.trim() : '(无结果块)';
});

(async () => {
  const b = await puppeteer.launch({executablePath: EDGE, headless: 'new', args: ['--no-sandbox']});
  const p = await b.newPage();
  await p.setViewport({width: 1600, height: 1080});
  const errs = [];
  p.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));

  const arr301 = Array.from({length: 301}, (_, i) => i + 1).join(',');
  const arr101 = Array.from({length: 101}, (_, i) => i + 1).join(',');

  /* ---- 1. P084: 大金额被拦截, 不生成动画 ---- */
  await p.goto(LOCAL('p084.html'), {waitUntil: 'load'}); await sleep(600);
  await applyInput(p, ['[1,2,5]', '100000000']);
  const e84 = await errText(p);
  const c84 = await p.evaluate(() => window.PAGE_STATE.stepsCount);
  ok(e84.length > 0 && c84 === 0, 'P084 大金额被拦截且不生成动画', {e84, c84});
  ok(/amount|金额|范围|上限/.test(e84), 'P084 报错信息可读', {e84});

  /* ---- 2. P025: 301 节点全环(tail→head) 判 true ---- */
  await p.goto(LOCAL('p025.html'), {waitUntil: 'load'}); await sleep(600);
  await applyInput(p, [arr301, '0']);
  const e25 = await errText(p);
  await p.click('#btnEnd'); await sleep(600);
  const r25 = await resultText(p);
  ok(!e25 && /^输出 = true$/.test(r25), 'P025 301节点全环 判true', {e25, r25});
  const alt25 = await p.evaluate(() => {
    const cfg = LC._cfgs.find(c => c.num === 141);
    const fr = cfg.alt.steps({head: Array.from({length: 301}, (_, i) => i + 1), pos: 0});
    const stage = document.createElement('div');
    stage.style.cssText = 'position:absolute;left:-99999px;top:0';
    document.body.appendChild(stage);
    const v = new Viz(stage);
    let out = '(无)';
    for(let i = fr.length - 1; i >= 0; i--){        // 从末帧往前找第一个画了结果块的帧
      v.clear(); fr[i].do(v);
      const blk = [...stage.querySelectorAll('.blk')].find(b => { const t = b.querySelector('.blk-t'); return t && t.textContent === '返回结果'; });
      if(blk){ out = blk.querySelector('.blk-b').textContent.trim(); break; }
    }
    stage.remove();
    return {out, n: fr.length};
  });
  ok(alt25.n <= 3000 && /^输出 = true$/.test(alt25.out), 'P025解法二 301节点判true且步数合规', alt25);

  /* ---- 3. P026: 同输入, 入口 = 下标 0 ---- */
  await p.goto(LOCAL('p026.html'), {waitUntil: 'load'}); await sleep(600);
  await applyInput(p, [arr301, '0']);
  const e26 = await errText(p);
  await p.click('#btnEnd'); await sleep(600);
  const r26 = await resultText(p);
  ok(!e26 && /^输出 = 0$/.test(r26), 'P026 301节点 入口=下标0', {e26, r26});

  /* ---- 4. P031: k=101=n 整条链一组反转 ---- */
  await p.goto(LOCAL('p031.html'), {waitUntil: 'load'}); await sleep(600);
  await applyInput(p, [arr101, '101']);
  const e31 = await errText(p);
  const f31 = await p.evaluate(() => {
    const cfg = LC._cfgs.find(c => c.order === 31);
    const fr = cfg.steps({head: Array.from({length: 101}, (_, i) => i + 1), k: 101});
    const lock = fr.find(f => f.msg.includes('本组锁定'));
    return {n: fr.length,
            lockOk: !!lock && lock.msg.includes('数够了 101 个，本组锁定为'),
            lastOk: fr[fr.length - 1].msg.includes('101→100→99')};
  });
  ok(!e31 && f31.n <= 3000 && f31.lockOk && f31.lastOk,
     'P031 k=101=n 整链一组反转', Object.assign({e31}, f31));

  /* ---- 5. 解析器: 超 2000 项报错, 恰好 2000 项可解析 ---- */
  const cap = await p.evaluate(() => {
    try{ LC.parseNums(Array.from({length: 2001}, (_, i) => i + 1).join(',')); return 'NO_THROW'; }
    catch(e){ return e.message; }
  });
  ok(/2000/.test(cap) && cap !== 'NO_THROW', '2001项报错且含上限说明', {cap});
  const fine = await p.evaluate(() => {
    try{ return LC.parseNums(Array.from({length: 2000}, (_, i) => i + 1).join(',')).length; }
    catch(e){ return 'THROW:' + e.message; }
  });
  ok(fine === 2000, '恰好2000项可正常解析', {fine});

  /* ---- 6. P054: 动态计数标题逐帧更新 ---- */
  await p.goto(LOCAL('p054.html'), {waitUntil: 'load'}); await sleep(600);
  await p.click('#btnEnd'); await sleep(600);
  const t54 = await p.evaluate(() => {
    const blk = [...document.querySelectorAll('.blk')].find(bb => { const t = bb.querySelector('.blk-t'); return t && t.textContent.includes('已收集'); });
    return blk ? blk.querySelector('.blk-t').textContent : '(未找到计数块)';
  });
  ok(/（6 个）/.test(t54), 'P054 计数标题跟随到 6 个', {t54});

  ok(errs.length === 0, '全程无页面脚本错误', errs);
  console.log('\n===== 边界测试: ' + pass + ' 通过, ' + fail.length + ' 失败 =====');
  fail.forEach(f => console.log('  FAIL ' + f));
  await b.close();
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('runner error:', e); process.exit(1); });
