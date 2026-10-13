'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
(async () => {
  const browser = await puppeteer.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    const page = await browser.newPage();
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    await page.setViewport({width:1366,height:1000});
    await page.goto(pathToFileURL(path.join(ROOT,'pages/p038.html')).href);
    await page.evaluate(() => {
      document.querySelector('.fin').value='1,2,2,3,4,4,3,5,6,7,8,8,7,6,5';
      [...document.querySelectorAll('.btn')].find(b=>b.textContent==='应用并重播').click();
    });
    await new Promise(resolve=>setTimeout(resolve,450));
    const four=await page.evaluate(()=>{
      const stage=document.getElementById('stage');
      const tree=stage.querySelector('.tnode').closest('.blk');
      return {stage:stage.clientWidth,tree:parseFloat(tree.querySelector('.blk-b').style.width),right:Math.max(...[...tree.querySelectorAll('.tnode')].map(n=>n.getBoundingClientRect().right)),limit:stage.getBoundingClientRect().right};
    });
    assert.ok(four.right<=four.limit+1,'four-level tree right side is clipped: '+JSON.stringify(four));
    assert.ok(four.tree<=four.stage,'four levels should fit desktop without scrolling');
    let checked=0;
    for(const width of [1600,1366,900,390]){
      await page.setViewport({width,height:1000});
      for(const levels of [4,5,6]){
        await page.evaluate(levels=>{
          document.querySelector('.fin').value=Array(2**levels-1).fill(1).join(',');
          [...document.querySelectorAll('.btn')].find(b=>b.textContent==='应用并重播').click();
        },levels);
        await new Promise(resolve=>setTimeout(resolve,400));
        for(const step of [0,Math.floor(await page.$eval('#scrub',el=>+el.max)/2),await page.$eval('#scrub',el=>+el.max)]){
          await page.evaluate(step=>{const s=document.getElementById('scrub');s.value=step;s.dispatchEvent(new Event('input'));},step);
          await new Promise(resolve=>setTimeout(resolve,300));
          const state=await page.evaluate(()=>{
            const stage=document.getElementById('stage'),tree=stage.querySelector('.tnode').closest('.blk');
            const viewport=tree.querySelector('.tree-viewport');
            if(!viewport)return {missing:true};
            viewport.scrollLeft=viewport.scrollWidth;
            const right=Math.max(...[...tree.querySelectorAll('.tnode')].map(n=>n.getBoundingClientRect().right));
            const body=tree.querySelector('.blk-b'),sv=body.querySelector('svg');
            return {right,limit:viewport.getBoundingClientRect().right,viewport:viewport.clientWidth,stage:stage.clientWidth,overflow:document.documentElement.scrollWidth-innerWidth,svg:+sv.getAttribute('width'),body:parseFloat(body.style.width),error:PAGE_STATE.error};
          });
          assert.equal(state.missing,undefined);
          assert.equal(state.error,null);
          assert.ok(state.right<=state.limit+1,'rightmost node cannot be reached by scrolling');
          assert.ok(state.viewport<=state.stage+1,'tree viewport spills into code column');
          assert.ok(state.overflow<=4,'tree creates page overflow');
          assert.equal(state.svg,state.body,'edges and nodes use different coordinate widths');
          checked++;
        }
      }
    }
    const files=fs.readdirSync(path.join(ROOT,'pages')).filter(f=>/\.tree\(/.test(fs.readFileSync(path.join(ROOT,'pages',f),'utf8')));
    for(const file of files){
      await page.goto(pathToFileURL(path.join(ROOT,'pages',file)).href);
      const result=await page.evaluate(()=>{
        const samples=[[],[1],[1,null,2,null,3,null,4],[1,2,null,3,null,4],[1,2,2,3,null,null,3,4,null,null,4],Array(15).fill(1)];
        const failures=[];
        for(const sample of samples){
          const t=Viz.treeLayout(sample),byKey=new Map(t.nodes.map(n=>[n.key,n]));
          for(const n of t.nodes){
            if(n.x<0 || n.x+46>t.w || n.y<0 || n.y+38>t.h)failures.push('node outside layout');
            if(n.left!=null && byKey.get(n.left).x>=n.x)failures.push('left child on wrong side');
            if(n.right!=null && byKey.get(n.right).x<=n.x)failures.push('right child on wrong side');
          }
          for(let i=0;i<t.nodes.length;i++)for(let j=i+1;j<t.nodes.length;j++){
            const a=t.nodes[i],b=t.nodes[j];
            if(a.y===b.y && Math.abs(a.x-b.x)<46)failures.push('nodes overlap');
          }
          if(sample.length===15 && Math.abs(byKey.get(0).x+23-t.w/2)>1)failures.push('symmetric tree off center');
        }
        return [...new Set(failures)];
      });
      assert.deepEqual(result,[],file);
    }
    assert.deepEqual(errors,[]);
    console.log('Tree layout passed: '+checked+' expanded-tree views and '+files.length+' tree pages; scrolling, sparse children, node/edge bounds.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
