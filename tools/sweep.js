/* ============================================================
 * tools/sweep.js —— 浏览器实测：逐页打开、抓 console 错误、
 * 点几步/播放、截屏。用法：
 *   node tools/sweep.js            全部页面
 *   node tools/sweep.js p001 p023  指定页
 *   SHOT=1 时输出截图到 tools/.shots/
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const SHOTS = path.join(__dirname, '.shots');
const wantShot = !!process.env.SHOT;
if(wantShot && !fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, {recursive:true});

const only = process.argv.slice(2).map(s => s.replace(/\.html$/,''));
let files = fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)).sort();
if(only.length) files = files.filter(f => only.some(o => f.startsWith(o)));

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1480, height: 1150});

  let pass = 0, fail = 0;
  const failures = [];
  for(const f of files){
    const errs = [];
    const onConsole = msg => { if(msg.type() === 'error') errs.push('console: ' + msg.text().slice(0, 300)); };
    const onPageErr = e => errs.push('pageerror: ' + String(e && e.message || e).slice(0, 300));
    page.on('console', onConsole);
    page.on('pageerror', onPageErr);
    try{
      await page.goto('file:///' + path.join(PAGES, f).replace(/\\/g,'/'), {waitUntil: 'load', timeout: 30000});
      await new Promise(r => setTimeout(r, 900));
      const st = await page.evaluate(() => window.PAGE_STATE || null);
      if(!st) errs.push('PAGE_STATE 缺失(引擎未启动)');
      else{
        if(!st.stepsOk) errs.push('steps 未生成: ' + (st.error || ''));
        if(st.verify === false) errs.push('默认用例校验失败');
        if(st.error) errs.push('engine: ' + st.error);
      }
      // 单步 ×3 与播放 2 秒
      const click = async sel => { const b = await page.$(sel); if(b) await b.click(); };
      await click('#btnNext'); await click('#btnNext'); await click('#btnNext');
      await click('#btnPlay');
      await new Promise(r => setTimeout(r, 2000));
      await click('#btnPlay');
      await new Promise(r => setTimeout(r, 400));
      if(errs.length){ fail++; failures.push(f + ': ' + errs.join(' | ')); }
      else pass++;
      console.log((errs.length ? '[FAIL] ' : '[ ok ] ') + f + (errs.length ? '\n         ' + errs.join('\n         ') : ''));
      if(wantShot){
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(r => setTimeout(r, 250));
        await page.screenshot({path: path.join(SHOTS, f.replace('.html','.png'))});
      }
    }catch(e){
      fail++; failures.push(f + ': ' + e.message);
      console.log('[FAIL] ' + f + '  ' + e.message);
    }
    page.off('console', onConsole);
    page.off('pageerror', onPageErr);
  }
  await browser.close();
  console.log('\n===== sweep: ' + pass + ' 通过, ' + fail + ' 失败 / ' + files.length + ' =====');
  if(failures.length){ console.log(failures.join('\n')); process.exit(1); }
})();
