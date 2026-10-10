'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1600,390]){
   await page.setViewport({width,height:1000});
   for(const id of ['p057','p076','p079']){
    await page.goto(pathToFileURL(path.join(ROOT,'pages',id+'.html')).href);
    await page.click('#btnEnd');await new Promise(r=>setTimeout(r,500));
    const result=await page.evaluate(()=>{
     const overlap=(a,b)=>a.left<b.right-1 && a.right>b.left+1 && a.top<b.bottom-1 && a.bottom>b.top+1;
     const visible=el=>el.getClientRects().length && getComputedStyle(el).visibility!=='hidden' && getComputedStyle(el).opacity!=='0';
     const blocks=[...document.querySelectorAll('#stage>.blk')].filter(visible);
     const rects=blocks.map(el=>el.getBoundingClientRect());let collisions=0;
     for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)if(overlap(rects[i],rects[j]))collisions++;
     let labels=0;
     for(const block of blocks){
      const tags=[...block.querySelectorAll('.marker,.slot span')].filter(visible).map(el=>el.getBoundingClientRect());
      for(let i=0;i<tags.length;i++)for(let j=i+1;j<tags.length;j++)if(overlap(tags[i],tags[j]))labels++;
     }
     const map=[...document.querySelectorAll('.map-flow .mrow:not(.exit)')].map(el=>el.getBoundingClientRect().left);
     return {collisions,labels,mapColumns:new Set(map.map(Math.round)).size,emptyStacks:blocks.filter(b=>b.querySelector('.sitem')===null && b.classList.contains('is-empty')).length,
       height:document.querySelector('#stage').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.equal(result.collisions,0,id+' block overlap');assert.equal(result.labels,0,id+' label overlap');
    assert.ok(result.overflow<=4,id+' page overflow');
    if(id==='p079' && width===1600)assert.ok(result.mapColumns>1,'map must use available horizontal space');
    if(id==='p057')assert.equal(await page.$$eval('#stage .blk.is-empty',els=>els.every(el=>getComputedStyle(el).display==='none')),true);
   }
  }
  const transition=await page.evaluate(async()=>{
   const host=document.createElement('div');host.style.width='600px';document.body.append(host);const v=new Viz(host);
   v.beginFrame();v.stack('stack',[{key:1,val:'one'},{key:2,val:'two'}]);v.text('answer','result');v.endFrame();
   const answer=v.blocks.get('answer').el, before=answer.getBoundingClientRect().top;
   v.beginFrame();v.stack('stack',[]);v.text('answer','result');v.endFrame();
   const moving=answer.getAnimations().length>0;
   for(let i=0;i<8;i++){v.beginFrame();v.stack('stack',i%2?[{key:1,val:'one'}]:[]);v.text('answer','result');v.endFrame();}
   v.beginFrame();v.stack('stack',[]);v.text('answer','result');v.endFrame();
   await new Promise(r=>setTimeout(r,350));
   const out={moving,collapsed:answer.getBoundingClientRect().top<before,remaining:answer.getAnimations().length};host.remove();return out;
  });
  assert.equal(transition.moving,true);assert.equal(transition.collapsed,true);assert.equal(transition.remaining,0);
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  assert.equal(await page.evaluate(()=>{const h=document.createElement('div');document.body.append(h);const v=new Viz(h);v.beginFrame();v.stack('s',[{key:1,val:1}]);v.text('r','result');v.endFrame();v.beginFrame();v.stack('s',[]);v.text('r','result');v.endFrame();const n=h.getAnimations({subtree:true}).length;h.remove();return n;}),0);
  assert.deepEqual(errors,[]);console.log('Layout passed: compact maps, empty stacks, separated labels, continuous repositioning and reduced motion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
