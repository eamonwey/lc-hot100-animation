'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const puppeteer = require('puppeteer-core');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const browser = await puppeteer.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page = await browser.newPage();
    let checked = 0;
    const files = fs.readdirSync(path.join(ROOT,'pages')).filter(f => /\.html$/.test(f) && /\.list\(/.test(fs.readFileSync(path.join(ROOT,'pages',f),'utf8')));
    for(const file of files){
      await page.goto(pathToFileURL(path.join(ROOT,'pages',file)).href);
      const result = await page.evaluate(() => {
        const cfg = LC._cfgs[0], host = document.createElement('div');
        document.body.appendChild(host);
        const viz = new Viz(host), seen = new Set(), failures = [];
        let count = 0;
        function check(id,nodes,opt = {}){
          const signature = JSON.stringify([nodes,opt]);
          if(seen.has(signature)) return;
          seen.add(signature); count++;
          viz.list(id,nodes,opt);
          const block = viz.blocks.get(id), svg = block.items.get('__svg').svg;
          const seq = opt.dummy ? [{key:'__dummy',dummy:true},...nodes] : nodes;
          for(const node of seq){
            const el = block.items.get(String(node.key)).el;
            if(el.classList.contains('dummy') !== !!node.dummy) failures.push('dummy identity lost');
            if(node.dummy && getComputedStyle(el).borderTopStyle !== 'dashed') failures.push('dummy border not dashed');
          }
          const rects = [...block.items.entries()].filter(([k]) => k !== '__svg' && !String(k).startsWith('tag:')).map(([,it]) => ({x:parseFloat(it.el.style.left),y:parseFloat(it.el.style.top),w:parseFloat(it.el.style.width),h:parseFloat(it.el.style.height)}));
          const edges = [...svg.querySelectorAll('.edge')];
          if(opt.edgeLabels){
            const labels = [...svg.querySelectorAll('.edge-label')].map(el=>el.textContent);
            if(JSON.stringify(labels)!==JSON.stringify(opt.edgeLabels)) failures.push('pointer field labels missing');
          }
          const expected = (opt.edges ? opt.edges.length : Math.max(0,nodes.length + (opt.dummy ? 1 : 0) - 1)) + (opt.cycleFrom != null && nodes.length ? 1 : 0);
          if(edges.length !== expected) failures.push('edge count: ' + edges.length + '/' + expected);
          for(const edge of edges){
            const length = edge.getTotalLength();
            const from = edge.getAttribute('data-from'), to = edge.getAttribute('data-to');
            if(edge.tagName.toLowerCase() === 'path' && from !== to){
              const target = block.items.get(to).el;
              const end = edge.getPointAtLength(length), near = edge.getPointAtLength(Math.max(0,length-0.1));
              const targetY = parseFloat(target.style.top)+parseFloat(target.style.height)*
                (edge.getAttribute('data-side') === 'top' ? 0.2 : 0.8);
              if(Math.abs(end.y-targetY)>0.1) failures.push('routed arrow misses target side');
              if(Math.abs(end.y-near.y)>Math.abs(end.x-near.x)*0.15) failures.push('routed arrowhead not horizontal');
            }
            if(length < 5) failures.push('degenerate arrow');
            const marker = edge.getAttribute('marker-end').slice(5,-1);
            if(!svg.querySelector('#' + marker)) failures.push('missing arrowhead');
            for(let i=1;i<30;i++){
              const p=edge.getPointAtLength(length*i/30);
              if(rects.some(r=>p.x>r.x+0.5 && p.x<r.x+r.w-0.5 && p.y>r.y+0.5 && p.y<r.y+r.h-0.5)) failures.push('arrow crosses node');
              if(p.y>parseFloat(block.body.style.height)) failures.push('arrow outside block');
            }
          }
        }
        const proxy = new Proxy({}, {get:(_,method) => method === 'list' ? check : () => {}});
        for(const sol of [cfg,...(cfg.alt ? [cfg.alt] : [])]){
          for(const preset of [{values:{}},...(cfg.presets || [])]){
            const input = Object.fromEntries(cfg.form.map(f=>[f.key,f.def]));
            Object.assign(input,preset.values);
            const frames=sol.steps(JSON.parse(JSON.stringify(input)));
            for(const frame of frames) if(frame.do) frame.do(proxy);
            seen.clear();
            for(const frame of frames.slice().reverse()) if(frame.do) frame.do(proxy);
          }
        }
        check('self',[{key:'one',val:1}],{cycleFrom:'one'});
        check('dummy-toggle',[{key:'d',val:0,dummy:true}],{states:{d:'active'}});
        check('dummy-toggle',[{key:'d',val:0}],{});
        check('dummy-option',[],{dummy:true});
        check('both',[{key:'a',val:1},{key:'b',val:2}],{edges:[['a','b'],['b','a']],pointers:[{key:'a',text:'head'},{key:'a',text:'prev'}]});
        host.remove();
        return {count,failures:[...new Set(failures)]};
      });
      assert.deepEqual(result.failures,[],file); checked += result.count;
    }
    console.log('Linked-list geometry passed: ' + files.length + ' pages, ' + checked + ' states.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
