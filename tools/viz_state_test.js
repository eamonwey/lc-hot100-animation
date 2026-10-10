'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname,'..');
(async()=>{
  const browser = await puppeteer.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page = await browser.newPage();
    for(const file of ['p035','p036','p039','p042','p043','p047','p048','p049']){
      await page.goto(pathToFileURL(path.join(ROOT,'pages',file+'.html')).href);
      const errors = await page.evaluate(()=>{
        const host=document.createElement('div');document.body.append(host);
        const viz=new Viz(host), failures=[];
        const proxy=new Proxy({}, {get:(_,method)=>(...args)=>{
          if(method!=='tree')return;
          viz.tree(...args);
          for(const [key,tag] of Object.entries(args[2]?.tags || {})){
            const el=viz.blocks.get(args[0]).items.get('tag:'+key)?.el.firstElementChild;
            if(el && parseFloat(el.parentElement.style.top)<0) failures.push('tag overlaps title');
            if(!el || el.textContent!==String(tag.text) || !el.classList.contains(tag.cls || 'mi') || el.style.background !== (tag.color || '')) failures.push(JSON.stringify({key,expected:tag,actual:el?.textContent}));
          }
        }});
        const cfg=LC._cfgs[0];
        for(const sc of [cfg,...(cfg.alt?[cfg.alt]:[])]) for(const preset of cfg.presets){
          viz.clear();
          const input=Object.assign(Object.fromEntries(cfg.form.map(f=>[f.key,f.def])),preset.values);
          const frames=sc.steps(input);
          for(const frame of [...frames,...frames.slice().reverse()]) frame.do?.(proxy);
        }
        host.remove();return [...new Set(failures)];
      });
      assert.deepEqual(errors,[],file);
    }
    const errors=await page.evaluate(()=>{
      const host=document.createElement('div');document.body.append(host);const viz=new Viz(host),failures=[];
      for(const method of ['arr','bars']){
        for(const [text,cls] of [['old','mi'],['new','mg'],['old','mi']]){
          viz[method](method,[1],{markers:[{name:'i',idx:0,text,cls}]});
          const el=viz.blocks.get(method).items.get('mk:i').el.firstElementChild;
          if(el.textContent!==text || !el.classList.contains(cls))failures.push(method);
        }
      }
      for(const cls of ['mi','mg','mi']){
        viz.list('L',[{key:'a',val:1}],{pointers:[{key:'a',text:'p',cls}]});
        if(!viz.blocks.get('L').items.get('tag:p').el.firstElementChild.classList.contains(cls))failures.push('list');
      }
      host.remove();return failures;
    });
    assert.deepEqual(errors,[]);
    console.log('Visual state updates passed: 8 tree pages forward/backward, array/bar/list label changes.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
