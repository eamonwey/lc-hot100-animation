/* ============================================================
 * tools/preset_sweep.js —— 浏览器实测：每页把所有「预设」逐个点一遍，
 * 再点「恢复默认」，抓 console 错误 / 页面异常 / 致命框 / 校验失败。
 * 用法: node tools/preset_sweep.js [p001 p002 ...]   无参 = 全部页面
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'pages');
const only = process.argv.slice(2).map(s => s.replace(/\.html$/,''));
let files = fs.readdirSync(PAGES).filter(f => /^p\d+\.html$/.test(f)).sort();
if(only.length) files = files.filter(f => only.some(o => f.startsWith(o)));

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE, headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1480, height: 1100});

  let pass = 0, fail = 0;
  const failures = [];
  for(const f of files){
    const errs = [];
    const onConsole = msg => { if(msg.type() === 'error') errs.push('console: ' + msg.text().slice(0, 200)); };
    const onPageErr = e => errs.push('pageerror: ' + String(e && e.message || e).slice(0, 200));
    page.on('console', onConsole);
    page.on('pageerror', onPageErr);
    try{
      await page.goto('file:///' + path.join(PAGES, f).replace(/\\/g,'/'), {waitUntil: 'load', timeout: 30000});
      await sleep(700);

      const presets = await page.$$('.preset');
      for(let i = 0; i < presets.length; i++){
        const label = await presets[i].evaluate(el => el.textContent);
        errs.length = 0; // 只报当前预设的问题，但任何一次出错都计入总失败
        await presets[i].click();
        await sleep(420);
        const st = await page.evaluate(() => ({
          err: (window.PAGE_STATE && window.PAGE_STATE.error) || null,
          fatal: !!document.querySelector('.fatal'),
          verifyNo: !!document.querySelector('.verify.no'),
        }));
        if(st.err) errs.push('PAGE_STATE.error: ' + st.err);
        if(st.fatal) errs.push('出现 fatal 框');
        if(st.verifyNo) errs.push('校验徽章变红(sol 抛错或对拍失败)');
        if(errs.length){
          fail++;
          failures.push(f + ' 预设' + (i+1) + '「' + label + '」: ' + errs.join(' | '));
          console.log('[FAIL] ' + f + ' 预设「' + label + '」: ' + errs.join(' | '));
        }
      }
      // 恢复默认
      errs.length = 0;
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.btn')).find(x => x.textContent === '恢复默认');
        if(b) b.click();
      });
      await sleep(420);
      const st2 = await page.evaluate(() => ({
        err: (window.PAGE_STATE && window.PAGE_STATE.error) || null,
        fatal: !!document.querySelector('.fatal'),
      }));
      if(st2.err || st2.fatal){
        fail++;
        failures.push(f + ' 恢复默认: ' + (st2.err || 'fatal'));
        console.log('[FAIL] ' + f + ' 恢复默认');
      }
      if(!failures.some(x => x.startsWith(f))){
        pass++;
        console.log('[ ok ] ' + f + '  预设×' + presets.length);
      }
    }catch(e){
      fail++;
      failures.push(f + ': ' + e.message);
      console.log('[FAIL] ' + f + '  ' + e.message);
    }
    page.off('console', onConsole);
    page.off('pageerror', onPageErr);
  }
  await browser.close();
  console.log('\n===== preset_sweep: ' + pass + ' 页干净, ' + fail + ' 处失败 / ' + files.length + ' 页 =====');
  if(failures.length){ console.log('\n失败清单:'); failures.forEach(x => console.log('  - ' + x)); process.exit(1); }
})();
