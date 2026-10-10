'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const copy = x => JSON.parse(JSON.stringify(x));
let cases = 0;
for(const file of fs.readdirSync(path.join(ROOT,'pages')).filter(f => /^p\d+\.html$/.test(f))){
  const s = {console, document:{readyState:'loading',addEventListener(){}},requestAnimationFrame(){},setTimeout(){},clearTimeout(){}};
  s.window = s; vm.createContext(s);
  for(const f of ['problems','progress','viz','engine']) vm.runInContext(fs.readFileSync(path.join(ROOT,'assets',f+'.js'),'utf8'),s);
  const html = fs.readFileSync(path.join(ROOT,'pages',file),'utf8');
  vm.runInContext([...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].at(-1)[1],s);
  const cfg = s.LC._cfgs[0];
  const inputs = [{values:{}},...(cfg.presets || [])];
  if(cfg.order === 28) inputs.push({values:{l1:[9,9],l2:[1]}});
  if(cfg.order === 27) inputs.push({values:{list1:[],list2:[]}},{values:{list1:[0,1],list2:[]}},{values:{list1:[1],list2:[2,3,4]}});
  if(cfg.order === 30) inputs.push({values:{head:[]}});
  if(cfg.order === 33) for(const head of [[2,1],[3,1,2],[2,1,2,1],[1,2,3,4]]) inputs.push({values:{head}});
  if(cfg.order === 34) for(const lists of [[],[[],[]],[[],[1,2]],[[1],[],[2],[]]]) inputs.push({values:{lists}});
  if(cfg.order === 45) for(const root of [[1,null,2,null,3],[1,1,1,1,1],[1,2,3,4,null,5,6]]) inputs.push({values:{root}});
  if(cfg.order === 22) inputs.push({values:{a:[...Array.from({length:400},(_,i)=>i),9999], b:[...Array.from({length:300},(_,i)=>i+500),9999], skipA:400, skipB:300}});
  if(cfg.order === 73) for(let k=1;k<=4;k++) inputs.push({values:{nums:[-2,5,5,0],k}});
  for(const [si,sc] of [cfg,...(cfg.alt ? [cfg.alt] : [])].entries()) for(const preset of inputs){
    const input = Object.assign(Object.fromEntries(cfg.form.map(f => [f.key,f.def])),preset.values);
    const calls = new Map(); let result, hasResult = false;
    const viz = new Proxy({}, {get:(_,method) => (...args) => {
      if(method === 'result'){ result = copy(args[0]); hasResult = true; }
      else calls.set(method + ':' + args[0],copy(args.slice(1)));
    }});
    const frames = sc.steps(copy(input));
    if(cfg.order === 45){
      const tree=s.Viz.parseTree(input.root), model=new Map(tree.nodes.map(n=>[n.key,{...n}]));
      let prev=null;
      for(const frame of frames){
        const rows=new Map();
        frame.do(new Proxy({}, {get:(_,method)=>(...args)=>{if(method==='list')rows.set(args[0],args);}}));
        const [,nodes,opt]=rows.get('T');
        const current=opt.pointers.find(p=>p.text==='node')?.key;
        if(frame.tag==='接链 ①')model.get(current).right=prev;
        if(frame.tag==='接链 ②')model.get(current).left=null;
        if(frame.tag==='接链 ③')prev=current;
        assert.equal(nodes.length,model.size,'each node must appear exactly once');
        assert.equal(new Set(nodes.map(n=>n.key)).size,model.size);
        for(const n of nodes)assert.deepEqual(copy(n),copy(model.get(n.key)),'pointer snapshot must follow highlighted assignment');
        const expected=[];
        for(const n of nodes)for(const [field,label] of [['left','L'],['right','R']])if(n[field]!=null)expected.push([n.key,n[field],label]);
        assert.deepEqual(copy(opt.edges.map((edge,i)=>[...edge,opt.edgeLabels[i]])),expected);
        const chain=[];let k=prev;
        while(k!=null){assert.ok(!chain.includes(k));chain.push(k);k=model.get(k).right;}
        assert.deepEqual(copy(rows.get('L')[1].map(n=>n.key)),chain);
      }
      for(const n of model.values())assert.equal(n.left,null);
    }
    if(cfg.order === 34){
      const capture = frame => {
        const rows=[],vars={};
        frame.do(new Proxy({}, {get:(_,method)=>(...args)=>{
          if(method==='list')rows.push(args);
          if(method==='vars')vars[args[0]]=args[1];
        }}));
        return {rows,vars};
      };
      for(let i=0;i<frames.length;i++){
        if(frames[i].tag==='配对'){
          const before=capture(frames[i]),call=capture(frames[i+1]),init=capture(frames[i+2]);
          assert.equal(frames[i+1].tag,'取出两条');
          assert.deepEqual(copy(call),copy(before),'calling merge2 must not move or replace source rows');
          assert.deepEqual(init.rows.filter(r=>r[0]!=='out').map(r=>r[0]),before.rows.map(r=>r[0]));
          assert.deepEqual(copy(init.vars.outer.nxt),copy(before.vars.outer.nxt));
          assert.equal(init.rows.find(r=>r[0]==='out')[2].dummy,false);
        }
        if(frames[i].tag==='加入 nxt'){
          const before=capture(frames[i-1]),after=capture(frames[i]);
          assert.equal(frames[i-1].tag,'merge2 返回');
          assert.equal(after.vars.outer.nxt.length,before.vars.outer.nxt.length+1);
          assert.deepEqual(copy(after.vars.outer.nxt.at(-1)),copy(before.rows.find(r=>r[0]==='out')[1].map(n=>n.val)));
        }
      }
    }
    if(cfg.order === 33){
      let previousTail;
      for(const frame of frames){
        const rows = new Map(); let vars;
        frame.do(new Proxy({}, {get:(_,method)=>(...args)=>{
          if(method==='list'){
            assert.ok(!rows.has(args[0]),'duplicate row in sort frame'); rows.set(args[0],args);
            const keys=args[1].map(n=>n.key); assert.equal(new Set(keys).size,keys.length);
          }
          if(method==='vars')vars=args[1];
        }}));
        const out=rows.get('mOut');
        if(out){
          const tail=out[2].pointers.find(p=>p.text==='▼ tail').key;
          assert.equal(out[2].headTag.key,'__dummy');
          assert.ok(tail==='__dummy' || out[1].some(n=>n.key===tail));
          if(frame.tag==='归并开始')assert.equal(tail,'__dummy');
          if(frame.tag==='接上剩余'){
            assert.equal(tail,previousTail);
            for(const id of ['mA','mB'])for(const node of rows.get(id)[1])assert.ok(out[1].some(n=>n.key===node.key),'remaining nodes must already be linked');
            const values=out[1].map(n=>n.val);assert.deepEqual(values,values.slice().sort((a,b)=>a-b));
          }
          previousTail=tail;
        }
        if(rows.has('pending') && rows.has('seg')){
          const keys=new Set(rows.get('pending')[1].map(n=>n.key));
          assert.ok(rows.get('seg')[1].every(n=>!keys.has(n.key)),'pending sibling must not redraw active nodes');
        }
        if(vars?.fast===null)for(const row of rows.values())assert.ok(!row[2].pointers.some(p=>p.text.includes('fast')));
      }
    }
    if(cfg.order === 30 && input.head.length === 0){
      frames.at(-1).do(new Proxy({}, {get:(_,method)=>(...args)=>{
        if(method==='list') assert.equal(args[2].headTag,null,'empty list must not return dummy as head');
      }}));
    }
    if(cfg.order === 27){
      const capture = frame => {
        let state;
        frame.do(new Proxy({}, {get:(_,method)=>(...args)=>{if(method==='list' && args[0]==='R')state=args;}}));
        return state;
      };
      for(const frame of frames){
        const [,nodes,opt] = capture(frame);
        assert.equal(nodes[0].key,'__d'); assert.equal(nodes[0].dummy,true);
        assert.equal(opt.headTag.key,'__d'); assert.equal(opt.headTag.text,'dummy');
      }
      const tail = frame => capture(frame)[2].pointers.find(p=>p.text==='▼ tail').key;
      assert.equal(tail(frames[0]),'__d');
      const join = frames.findIndex(f=>f.tag==='整段接上');
      assert.equal(tail(frames[join]),tail(frames[join-1]));
      assert.equal(tail(frames.at(-1)),tail(frames[join]));
    }
    frames.at(-1).do(viz);
    let expected = sc.sol(copy(input));
    if(cfg.order === 15){
      const a = input.nums, k = a.length ? input.k % a.length : 0;
      expected = k ? a.slice(-k).concat(a.slice(0,-k)) : a;
    }else if(cfg.order === 98){
      const a = input.nums.slice(); let i = a.length - 2;
      while(i >= 0 && a[i] >= a[i+1]) i--;
      if(i < 0) expected = a.slice().sort((a,b)=>a-b);
      else{
        const suffix = a.slice(i+1).sort((a,b)=>a-b), j = suffix.findIndex(x=>x>a[i]);
        const next = suffix.splice(j,1)[0]; suffix.push(a[i]); suffix.sort((a,b)=>a-b);
        expected = a.slice(0,i).concat(next,suffix);
      }
    }else if(cfg.order === 100){
      const b = input.board;
      expected = b.map((row,r)=>row.map((v,c)=>{
        let n=0;
        for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) if(dr || dc) n += b[r+dr]?.[c+dc] === 1 ? 1 : 0;
        return +(n===3 || (v===1 && n===2));
      }));
    }else if(cfg.order === 45){
      const t = s.Viz.parseTree(input.root), values=[];
      const walk = k => { if(k == null) return; const n=t.nodes.find(n=>n.key===k); values.push(n.val); walk(n.left); walk(n.right); };
      walk(t.root); expected=values;
      result = (calls.get('list:L')?.[0] || []).map(n=>n.val); hasResult=true;
    }
    if(cfg.order === 4 || cfg.order === 97){ result=calls.get('arr:nums')[0]; hasResult=true; }
    if(!hasResult && [18,20].includes(cfg.order)){ result=calls.get('grid:G')[0]; hasResult=true; }
    assert.ok(hasResult,file+' solution '+si+' missing final state');
    assert.deepEqual(copy(result),copy(expected),file+' solution '+si+' '+JSON.stringify(input));
    if(cfg.order===22 && si===1 && expected===null){
      assert.ok(frames.at(-1).hl.some(n=>sc.code.split('\n')[n-1].trim().startsWith('return None')));
    }
    cases++;
  }
}
console.log('Animation results passed: '+cases+' cases.');
