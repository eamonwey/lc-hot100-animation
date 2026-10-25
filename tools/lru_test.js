'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const sandbox = {console,document:{readyState:'loading',addEventListener(){}}};
sandbox.window = sandbox;
vm.createContext(sandbox);
for(const name of ['problems','progress','viz','engine'])vm.runInContext(fs.readFileSync(path.join(ROOT,'assets',name+'.js'),'utf8'),sandbox);
const html = fs.readFileSync(path.join(ROOT,'pages/p101.html'),'utf8');
vm.runInContext([...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1],sandbox);
const cfg = sandbox.LC._cfgs[0];
const copy = value => JSON.parse(JSON.stringify(value));
let seed = 146;
const random = n => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const cases = cfg.presets.map(p=>copy(p.values));
for(let t=0;t<100;t++){
  const input={ops:['LRUCache'],args:[[1+random(6)]]};
  for(let i=0;i<20;i++){
    const put=random(3)!==0,key=random(8);
    input.ops.push(put?'put':'get');input.args.push(put?[key,random(100)]:[key]);
  }
  cases.push(input);
}
function oracle(input){
  const entries=[],out=[null],trace=[{entries:[],out:out.slice()}];
  for(let i=1;i<input.ops.length;i++){
    const [key,value]=input.args[i],index=entries.findIndex(([k])=>k===key);
    if(input.ops[i]==='get'){
      if(index<0)out.push(-1);
      else{const [entry]=entries.splice(index,1);entries.push(entry);out.push(entry[1]);}
    }else{
      if(index>=0)entries.splice(index,1);
      entries.push([key,value]);
      if(entries.length>input.args[0][0])entries.shift();
      out.push(null);
    }
    trace.push({entries:copy(entries),out:out.slice()});
  }
  return {out,trace};
}
let snapshots=0;
for(const input of cases){
  const expected=oracle(input);
  sandbox.LC.validateInput(cfg,input);
  assert.deepEqual(copy(cfg.sol(input)),expected.out);
  const frames=cfg.steps(input);
  // Every completed call must match both values and recency, not just the final answer.
  for(const frame of frames.filter(f=>['初始化','返回 -1','返回值','写入结束'].includes(f.tag))){
    const rows=new Map();
    frame.do(new Proxy({}, {get:(_,method)=>(...args)=>rows.set(method+':'+args[0],args.slice(1))}));
    const outputs=rows.get('arr:returns')[0].map(x=>x==='null'?null:x);
    const expectedFrame=expected.trace[outputs.length-1];
    assert.deepEqual(copy(outputs),expectedFrame.out);
    assert.deepEqual(copy(rows.get('map:values')[0]),expectedFrame.entries);
    assert.deepEqual(copy(rows.get('list:cache')[0].map(n=>n.val)),expectedFrame.entries.map(([k])=>k));
    snapshots++;
  }
}
const python = cfg.code + '\n' + `
import json, sys
results = []
for test in json.load(sys.stdin):
    cache = LRUCache(*test['args'][0]); out = [None]; trace = [list(cache.cache.items())]
    for op, args in zip(test['ops'][1:], test['args'][1:]):
        out.append(getattr(cache, op)(*args))
        trace.append(list(cache.cache.items()))
    results.append({'out': out, 'trace': trace})
print(json.dumps(results))
`;
const actual=JSON.parse(execFileSync('python',['-c',python],{input:JSON.stringify(cases),encoding:'utf8',timeout:25000}));
cases.forEach((input,i)=>{
  const expected=oracle(input);
  assert.deepEqual(actual[i].out,expected.out);
  assert.deepEqual(actual[i].trace,expected.trace.map(s=>s.entries));
});
for(const input of [
  {ops:[],args:[]}, {ops:['get'],args:[[1]]},
  {ops:['LRUCache'],args:[[0]]}, {ops:['LRUCache'],args:[[7]]},
  {ops:['LRUCache','get'],args:[[2]]},
  {ops:['LRUCache','put'],args:[[2],[1]]},
  {ops:['LRUCache','get'],args:[[2],[NaN]]},
  {ops:['LRUCache','unknown'],args:[[2],[1]]}
])assert.throws(()=>sandbox.LC.validateInput(cfg,input));
console.log('LRU passed: '+cases.length+' Python/JS cases, '+snapshots+' operation snapshots, invalid inputs.');
