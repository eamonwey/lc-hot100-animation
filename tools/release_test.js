'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..');

function progressTests(){
  const values = new Map(); let failKey;
  const localStorage = {
    getItem:k => values.get(k) ?? null,
    setItem(k,v){ if(k === failKey){ failKey = null; throw new Error('quota'); } values.set(k,v); },
    removeItem:k => values.delete(k)
  };
  const s = {localStorage}; s.window = s; vm.createContext(s);
  for(const f of ['problems','progress']) vm.runInContext(fs.readFileSync(path.join(ROOT,'assets',f+'.js'),'utf8'),s);
  const p = s.LCProgress;
  p.restore({done:[1],doneAt:{1:Date.now()},recites:{1:2}});
  const before = [...values];
  const bad = [null, {}, {done:[999]}, {done:[1,1]}, {done:['1']}, {done:[],version:4},
    {done:[],doneAt:[]}, {done:[],reviews:{1:-1}}, {done:[],recites:{1:'1'}},
    {done:[],wrong:{'1:0':null}}, {done:[],wrong:{'1:0':{order:2,qi:0,t:Date.now()}}},
    {done:[],activity:{'2026-02-30':true}}, {done:[],activity:{'2026-01-01':1}}];
  for(const data of bad){ assert.throws(()=>p.restore(data)); assert.deepEqual([...values],before); }
  failKey = 'lc100.wrong';
  assert.throws(()=>p.restore({done:[2]}),/quota/);
  assert.deepEqual([...values],before);
  values.set('lc100.done.v2','[999,1,null]');
  values.set('lc100.wrong','{"1:0":null}');
  assert.equal(JSON.stringify(p.read('done')),'[1]');
  assert.equal(JSON.stringify(p.read('wrong')),'{}');
  values.clear(); failKey = 'lc100.reviews';
  assert.throws(()=>p.restore({done:[1]}),/quota/); assert.equal(values.size,0);
  p.restore({version:2,done:[1],doneAt:{1:Date.now()-86400000}});
  p.recordActivity(); assert.equal(Object.keys(p.activity()).length,2);
  p.restore({version:3,done:[1],activity:p.activity()});
  assert.equal(Object.keys(p.activity()).length,2);
  p.restore({done:[1],doneAt:{1:Date.now()-86400000}});
  p.recordActivity(false); values.set('lc100.doneAt','{}');
  assert.equal(Object.keys(p.activity()).length,1);
}

(async()=>{
  progressTests();
  const browser = await puppeteer.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page = await browser.newPage(), errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    const open = file => page.goto(pathToFileURL(path.join(ROOT,file)).href);
    await open('index.html');
    await page.evaluate(()=>{
      localStorage.clear(); localStorage.setItem('lc100.done.v2','[1]');
      const d = new Date(); d.setDate(d.getDate()-1);
      localStorage.setItem('lc100.doneAt',JSON.stringify({1:d.getTime()}));
    });
    await page.reload(); await page.click('[data-review="1"]');
    assert.match(await page.$eval('#statsBar',el=>el.textContent),/连续学习2天/);
    await page.reload(); assert.match(await page.$eval('#statsBar',el=>el.textContent),/连续学习2天/);
    const before = await page.evaluate(()=>JSON.stringify({...localStorage}));
    await page.evaluate(()=>{
      const transfer = new DataTransfer();
      transfer.items.add(new File([JSON.stringify({done:[999],doneAt:{999:Date.now()-7*86400000}})],'bad.json',{type:'application/json'}));
      const el = document.querySelector('#importFile'); el.files = transfer.files; el.dispatchEvent(new Event('change'));
    });
    await page.waitForFunction(()=>document.querySelector('#toast2').textContent.startsWith('导入失败'));
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),before);
    await page.reload();
    await page.evaluate(()=>{localStorage.setItem('lc100.done.v2','[999]');localStorage.setItem('lc100.wrong','{"bad":null}');});
    await page.reload(); assert.ok(await page.$('#sections a[href="pages/p001.html"]'));
    await page.evaluate(()=>localStorage.clear());

    for(const [file,values] of [['p080',{n:46}],['p083',{n:10000}],['p083',{n:1.5}],['p088',{nums:[10000000000,10000000000]}],['p088',{nums:[-1,1]}]]){
      await open('pages/'+file+'.html');
      const result = await page.evaluate(values=>{
        const cfg = LC._cfgs[0]; let calls = 0;
        cfg.sol = cfg.steps = () => {calls++; throw new Error('should not compute');};
        const value = values[cfg.form[0].key];
        document.querySelector('.fin').value = Array.isArray(value) ? JSON.stringify(value) : value;
        Array.from(document.querySelectorAll('.btn')).find(b=>b.textContent==='应用并重播').click();
        return {calls,error:document.querySelector('.err').textContent,disabled:document.querySelector('#btnPlay').disabled};
      },values);
      assert.equal(result.calls,0,file); assert.ok(result.error,file); assert.equal(result.disabled,true,file);
    }
    for(const [file,input] of [['p080',{n:45}],['p083',{n:200}],['p088',{nums:[...Array(29).fill(1),371]}]]){
      await open('pages/'+file+'.html');
      assert.equal(await page.evaluate(input=>{
        const cfg=LC._cfgs[0]; LC.validateInput(cfg,input);
        for(const sc of [cfg,...(cfg.alt?[cfg.alt]:[])]){
          let value;const v=new Proxy({}, {get:(_,k)=>(...args)=>{if(k==='result')value=args[0];}});
          const frames=sc.steps(input); frames.at(-1).do(v);
          if(JSON.stringify(value)!==JSON.stringify(sc.sol(input)) || frames.length>10000) return false;
        }return true;
      },input),true,file);
    }
    await open('pages/p007.html');
    const text = await page.evaluate(()=>{
      const host=document.createElement('div');document.body.append(host);const v=new Viz(host);
      v.arr('arr',['<','&','>','<img src=x onerror=alert(1)>']);
      v.list('list',[{key:'a',val:'<'},{key:'b',val:'&'}]);
      v.tree('tree',Viz.treeLayout(['<','&','>']));
      v.grid('grid',[['<','&','>']]);
      return {text:host.textContent,images:host.querySelectorAll('img').length};
    });
    assert.ok(!text.text.includes('&lt;') && !text.text.includes('&amp;'));
    assert.ok(text.text.includes('<img src=x onerror=alert(1)>')); assert.equal(text.images,0);
    assert.deepEqual(errors,[]);
    console.log('Release regressions passed: backup validation/rollback, damaged storage, streak, input budgets, literal text.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
