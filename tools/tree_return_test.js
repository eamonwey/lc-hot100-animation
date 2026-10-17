'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname,'..'));
const cases=[];
for(const file of ['p041','p046']){
  const s={console,document:{readyState:'loading',addEventListener(){}}};s.window=s;
  vm.createContext(s);
  for(const name of ['problems','progress','viz','engine'])vm.runInContext(fs.readFileSync(path.join(ROOT,'assets',name+'.js'),'utf8'),s);
  const html=fs.readFileSync(path.join(ROOT,'pages',file+'.html'),'utf8');
  vm.runInContext([...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1],s);
  const cfg=s.LC._cfgs[0];
  const inputs=cfg.presets.map(p=>p.values);
  if(file==='p041')for(let n=0;n<=64;n++)inputs.push({nums:Array.from({length:n},(_,i)=>i*3-90)});
  else for(let n=0;n<=20;n++){
    const sorted=Array.from({length:n},(_,i)=>i-10);
    const pre=(a)=>a.length?[a[Math.floor(a.length/2)],...pre(a.slice(0,Math.floor(a.length/2))),...pre(a.slice(Math.floor(a.length/2)+1))]:[];
    inputs.push({preorder:pre(sorted),inorder:sorted},{preorder:sorted,inorder:sorted},{preorder:sorted.slice().reverse(),inorder:sorted});
  }
  for(const input of inputs)cases.push({code:cfg.code,method:cfg.method,input,expected:cfg.sol(JSON.parse(JSON.stringify(input)))});
}
const driver=`
import json, sys
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right
for test in json.loads(sys.stdin.buffer.read().decode('utf-8')):
    env = {'TreeNode': TreeNode}
    exec(test['code'], env)
    data = test['input']
    root = getattr(env['Solution'](), test['method'])(**data)
    assert root is None or isinstance(root, TreeNode), 'expected TreeNode or None, got ' + type(root).__name__
    seen, inorder, preorder = set(), [], []
    def walk(node):
        if node is None: return 0
        assert isinstance(node, TreeNode), 'child must be TreeNode or None'
        assert id(node) not in seen, 'result contains a cycle or shared node'
        seen.add(id(node)); preorder.append(node.val)
        left = walk(node.left); inorder.append(node.val); right = walk(node.right)
        if test['method'] == 'sortedArrayToBST': assert abs(left-right) <= 1, 'tree not height-balanced'
        return 1 + max(left, right)
    walk(root)
    if test['method'] == 'sortedArrayToBST': assert inorder == data['nums'], 'BST inorder differs from input'
    else:
        assert inorder == data['inorder'], 'inorder differs from input'
        assert preorder == data['preorder'], 'preorder differs from input'
    level, queue = [], [root] if root is not None else []
    while queue:
        node = queue.pop(0)
        if node is None: level.append(None)
        else: level.append(node.val); queue.extend([node.left, node.right])
    while level and level[-1] is None: level.pop()
    assert level == test['expected'], 'Python tree differs from displayed result'
print('ok')
`;
assert.equal(execFileSync('python',['-c',driver],{input:JSON.stringify(cases),encoding:'utf8',timeout:25000}).trim(),'ok');
console.log('Tree return contracts passed: '+cases.length+' cases; node types, null roots, balanced BSTs, traversals and displayed results.');
