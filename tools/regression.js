'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..');
const EDGE = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

(async () => {
  const browser = await puppeteer.launch({executablePath:EDGE, headless:true});
  try{
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if(msg.type() === 'error') errors.push(msg.text()); });
    const open = file => page.goto(pathToFileURL(path.join(ROOT, file)).href);
    const click = id => page.evaluate(id => document.getElementById(id).click(), id);
    const snapshot = () => page.evaluate(() => ({
      state:window.PAGE_STATE, error:document.querySelector('.err').textContent,
      output:document.querySelector('.verify').textContent,
      disabled:document.getElementById('btnPlay').disabled
    }));

    await page.goto(pathToFileURL(path.join(ROOT, 'pages/p001.html')).href + '#step=8');
    assert.equal(await page.$eval('#scrub', el => el.value), '7');
    await page.reload();
    assert.equal(await page.$eval('#scrub', el => el.value), '7');
    await click('btnMaster');
    let at = await page.evaluate(() => JSON.parse(localStorage.getItem('lc100.doneAt'))[1]);
    assert.ok(at > 0);
    await page.evaluate(() => localStorage.setItem('lc100.reviews', '{"1":2}'));
    await click('btnMaster');
    assert.deepEqual(await page.evaluate(() => [LC._done(), JSON.parse(localStorage.getItem('lc100.doneAt')), JSON.parse(localStorage.getItem('lc100.reviews'))]), [[], {}, {}]);
    await click('btnMaster');
    await open('index.html');
    assert.equal(await page.evaluate(() => {
      const now = Date.now(); Date.now = () => now + 2 * 86400000;
      window.dispatchEvent(new Event('focus'));
      return document.getElementById('reviewBar').style.display;
    }), '');
    await page.evaluate(() => { localStorage.setItem('lc100.done.v2', '[2]'); localStorage.removeItem('lc100.doneAt'); });
    await page.reload();
    at = await page.evaluate(() => JSON.parse(localStorage.getItem('lc100.doneAt'))[2]);
    assert.ok(at > 0);
    await page.reload();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lc100.doneAt'))[2]), at);
    assert.equal(await page.evaluate(() => {
      const now = Date.now(); Date.now = () => now + 2 * 86400000;
      window.dispatchEvent(new Event('focus'));
      return document.getElementById('reviewBar').style.display;
    }), '');

    await open('pages/p002.html');
    assert.deepEqual(await page.evaluate(() => [LC.parseArrStr('[""]'), LC.parseArrStr('[]'), LC.parseArrStr('""'), LC.parseArrStr('eat, tea'), LC.parseArrStr('["a,b",""," a "]')]), [[''], [], [''], ['eat','tea'], ['a,b','',' a ']]);
    await page.evaluate(() => document.querySelectorAll('.preset')[2].click());
    assert.ok((await snapshot()).output.endsWith('[[""]]'));
    await click('btnEnd');
    assert.match(await page.$eval('#msgText', el => el.textContent), /1/);
    await page.evaluate(() => Array.from(document.querySelectorAll('.btn')).find(b => b.textContent === '恢复默认').click());
    assert.equal((await snapshot()).state.verify, true);

    for(const [file, value] of [['p054','1,2,3,4,5,6,7,8,9,10,11,12'], ['p058','15']]){
      await open('pages/' + file + '.html');
      await page.evaluate(value => {
        const cfg = LC._cfgs[0];
        window.computeCalls = 0;
        const sol = cfg.sol, steps = cfg.steps;
        cfg.sol = input => { window.computeCalls++; return sol(input); };
        cfg.steps = input => { window.computeCalls++; return steps(input); };
        document.querySelector('.fin').value = value;
        Array.from(document.querySelectorAll('.btn')).find(b => b.textContent === '应用并重播').click();
      }, value);
      const rejected = await snapshot();
      assert.ok(rejected.error);
      assert.equal(rejected.disabled, true);
      assert.equal(rejected.output, '');
      assert.equal(await page.evaluate(() => window.computeCalls), 0);
      await page.evaluate(() => Array.from(document.querySelectorAll('.btn')).find(b => b.textContent === '恢复默认').click());
      const restored = await snapshot();
      assert.equal(restored.state.error, null);
      assert.equal(restored.state.verify, true);
      assert.equal(restored.disabled, false);
      assert.equal(await page.evaluate(() => {
        const cfg = LC._cfgs[0], input = Object.fromEntries(cfg.form.map(f => [f.key,f.def]));
        let result;
        const viz = new Proxy({}, {get:(_,key) => (...args) => { if(key === 'result') result = args[0]; }});
        cfg.steps(input).at(-1).do(viz);
        return JSON.stringify(result) === JSON.stringify(cfg.sol(input));
      }), true);
    }

    await open('index.html');
    const backup = await page.evaluate(async () => {
      localStorage.setItem('lc100.recites', '{"1":3}');
      let blob;
      const createURL = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
      try{
        URL.createObjectURL = value => { blob = value; return createURL(value); };
        HTMLAnchorElement.prototype.click = function(){};
        document.getElementById('btnExport').click();
      }finally{ URL.createObjectURL = createURL; HTMLAnchorElement.prototype.click = click; }
      return JSON.parse(await blob.text());
    });
    assert.deepEqual(backup.recites, {1:3});
    const importBackup = async data => {
      await page.evaluate(data => {
        const transfer = new DataTransfer();
        transfer.items.add(new File([JSON.stringify(data)], 'progress.json', {type:'application/json'}));
        const el = document.getElementById('importFile');
        el.files = transfer.files; el.dispatchEvent(new Event('change'));
      }, data);
      await page.waitForFunction(expected => localStorage.getItem('lc100.recites') === JSON.stringify(expected), {}, data.recites || {});
    };
    await page.evaluate(() => localStorage.clear());
    await importBackup(backup);
    assert.match(await page.$eval('#statsBar', el=>el.textContent), /可默写1题/);
    const legacy = {...backup}; delete legacy.recites; delete legacy.version;
    await importBackup(legacy);
    assert.match(await page.$eval('#statsBar', el=>el.textContent), /可默写0题/);

    let presets = 0, solutions = 0;
    const files = fs.readdirSync(path.join(ROOT, 'pages')).filter(f => /^p\d+\.html$/.test(f)).sort();
    for(const file of files){
      await open('pages/' + file);
      const result = await page.evaluate(() => {
        const cfg = LC._cfgs[0];
        const failures = [];
        let count = 0;
        const tabs = Array.from(document.querySelectorAll('.soltab'));
        for(const tab of tabs.length ? tabs : [null]){
          if(tab) tab.click();
          for(const preset of document.querySelectorAll('.preset')){
            preset.click(); count++;
            if(PAGE_STATE.error || !PAGE_STATE.stepsOk || document.querySelector('.verify.no') || document.querySelector('.err').textContent){
              failures.push(preset.textContent + ': ' + (PAGE_STATE.error || document.querySelector('.verify').textContent));
            }
          }
          Array.from(document.querySelectorAll('.btn')).find(b => b.textContent === '恢复默认').click();
          if(PAGE_STATE.error || PAGE_STATE.verify !== true) failures.push('reset failed');
        }
        // Exercise each declared bound with an input just outside it.
        const defs = Object.fromEntries(cfg.form.map(f => [f.key, f.def]));
        for(const f of cfg.form){
          const bad = [];
          if(f.maxLength != null) bad.push(typeof f.def === 'string' ? 'a'.repeat(f.maxLength + 1) : Array(f.maxLength + 1).fill(1));
          if(f.max != null) bad.push(f.max + 1);
          if(f.min != null) bad.push(f.min - 1);
          if(f.integer) bad.push(1.5);
          if(f.itemMin != null) bad.push([0], [-1]);
          if(f.maxRows != null) bad.push(Array.from({length:f.maxRows + 1}, () => [1]), [Array(f.maxCols + 1).fill(1)], [[1],[1,2]]);
          for(const value of bad){
            let threw = false;
            try{ LC.validateInput(cfg, {...defs, [f.key]:value}); }catch(e){ threw = true; }
            if(!threw) failures.push('accepted invalid ' + f.key);
          }
        }
        return {failures,count,solutions:tabs.length || 1};
      });
      assert.deepEqual(result.failures, [], file);
      await page.setViewport({width:390,height:844});
      await new Promise(resolve => setTimeout(resolve,400));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 4, file + ' mobile overflow: ' + overflow);
      await page.setViewport({width:1480,height:1100});
      presets += result.count; solutions += result.solutions;
    }
    assert.deepEqual(errors, []);
    console.log('Regression checks passed; browser sweep: ' + files.length + ' pages, ' + solutions + ' solutions, ' + presets + ' presets.');
  }finally{ await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
