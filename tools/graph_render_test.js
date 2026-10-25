'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage();let count=0;
  for(const file of ['p052','p099']){
   await page.goto(pathToFileURL(path.resolve(__dirname,'../pages/'+file+'.html')).href);
   const result=await page.evaluate(()=>{
    const h=document.createElement('div');document.body.append(h);const viz=new Viz(h),failures=[];let count=0;
    function check(id,nodes,edges,opt={}){
     viz.graph(id,nodes,edges,opt);const b=viz.blocks.get(id),svg=b.items.get('__svg').svg;
     const paths=[...svg.querySelectorAll('.edge')];if(paths.length!==edges.length)failures.push('missing edge');
     paths.forEach((edge,i)=>{
      const [a,c]=edges[i],p=nodes.find(n=>n.key===a),q=nodes.find(n=>n.key===c);
      const len=edge.getTotalLength(),start=edge.getPointAtLength(0),end=edge.getPointAtLength(len);
      if(len<5)failures.push('invisible edge');
      if(Math.abs(Math.hypot(start.x-p.x,start.y-p.y)-21)>0.2)failures.push('wrong source anchor');
      if(Math.abs(Math.hypot(end.x-q.x,end.y-q.y)-23)>0.2)failures.push('wrong target anchor');
      const cls=opt.edgeStates?.[a+'-'+c] || '';
      const marker=cls.includes('e-active')?'arwA-':cls.includes('e-done')?'arwG-':'arw-';
      if(!edge.getAttribute('marker-end').includes(marker))failures.push('wrong arrow color');
      if(!svg.querySelector(edge.getAttribute('marker-end').slice(4,-1)))failures.push('missing marker');
      for(let t=0;t<=20;t++){
       const pt=edge.getPointAtLength(len*t/20);
       if(pt.x<0 || pt.y<0 || pt.x>+svg.getAttribute('width') || pt.y>+svg.getAttribute('height'))failures.push('edge clipped');
      }
     });count+=paths.length;
    }
    const cfg=LC._cfgs[0],proxy=new Proxy({}, {get:(_,method)=>method==='graph'?check:()=>{}});
    for(const sc of [cfg,...(cfg.alt?[cfg.alt]:[])])for(const preset of cfg.presets){
     const input=Object.assign(Object.fromEntries(cfg.form.map(f=>[f.key,f.def])),preset.values);
     const frames=sc.steps(input);for(const f of [...frames,...frames.slice().reverse()])f.do?.(proxy);
    }
    check('self',Viz.circle(['0'],{w:420,h:250}),[['0','0']],{w:420,h:250});
    const ns=Viz.circle(['0','1'],{w:420,h:250});check('both',ns,[['0','1'],['1','0']],{w:420,h:250});
    const [a,b]=[...viz.blocks.get('both').items.get('__svg').svg.querySelectorAll('.edge')].map(e=>e.getPointAtLength(e.getTotalLength()/2));
    if(Math.hypot(a.x-b.x,a.y-b.y)<10)failures.push('reciprocal arrows overlap');
    h.remove();return {failures:[...new Set(failures)],count};
   });
   assert.deepEqual(result.failures,[],file);count+=result.count;
  }
  console.log('Graph geometry passed: '+count+' edges, including reciprocal arrows and self loops.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
