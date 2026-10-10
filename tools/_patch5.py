# -*- coding: utf-8 -*-
"""index.html 补丁: 统计面板 / 错题本 / 进度备份 / 深色开关"""
import io
p = 'index.html'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new)

# 1. 顶栏: 深色开关 + 手册 + 备份
rep("""  <div class="topbar">
    <span class="toplink" style="cursor:default">🏠 目录</span>
  </div>""",
"""  <div class="topbar">
    <span class="toplink" style="cursor:default">🏠 目录</span>
    <a class="toplink" href="手册.html">📖 速查手册</a>
    <button class="toplink" id="btnTheme" title="深色 / 浅色">🌙</button>
    <span class="backupbar" style="margin-left:auto">
      <button class="toplink" id="btnExport" title="把学习进度保存成文件">💾 导出进度</button>
      <button class="toplink" id="btnImport" title="从备份文件恢复进度">📂 导入进度</button>
      <input type="file" id="importFile" accept=".json" style="display:none">
    </span>
  </div>""")

# 2. 统计面板 + 错题本容器(插在进度条之后)
rep("""    <div class="reviewbar" id="reviewBar" style="display:none"></div>""",
"""    <div class="statsbar" id="statsBar"></div>
    <div class="reviewbar" id="reviewBar" style="display:none"></div>
    <div class="wrongbar" id="wrongBar" style="display:none"></div>""")

# 3. JS: 深色 / 备份 / 统计 / 错题 渲染
rep("""const DONE_KEY = 'lc100.done.v2';
const STAGES = [1, 3, 7, 14, 30];   // 艾宾浩斯复习节点(天)""",
"""const DONE_KEY = 'lc100.done.v2';
const STAGES = [1, 3, 7, 14, 30];   // 艾宾浩斯复习节点(天)

/* ---------- 深色模式 ---------- */
let dark = false;
try{ dark = localStorage.getItem('lc100.theme') === 'dark'; }catch(e){}
function syncTheme(){
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const b = document.getElementById('btnTheme');
  if(b) b.textContent = dark ? '☀️' : '🌙';
}
document.getElementById('btnTheme').addEventListener('click', () => {
  dark = !dark;
  try{ localStorage.setItem('lc100.theme', dark ? 'dark' : 'light'); }catch(e){}
  syncTheme();
});
syncTheme();

/* ---------- 进度备份 / 恢复 ---------- */
function exportProgress(){
  const data = {
    done: done(), doneAt: loadJSON('lc100.doneAt'), reviews: loadJSON('lc100.reviews'),
    wrong: loadJSON('lc100.wrong'), exported: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lc100-progress-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
  toast('进度已导出 💾');
}
function importProgress(file){
  const rd = new FileReader();
  rd.onload = () => {
    try{
      const d = JSON.parse(rd.result);
      if(!Array.isArray(d.done)) throw new Error('格式不对');
      localStorage.setItem(DONE_KEY, JSON.stringify(d.done));
      if(d.doneAt) localStorage.setItem('lc100.doneAt', JSON.stringify(d.doneAt));
      if(d.reviews) localStorage.setItem('lc100.reviews', JSON.stringify(d.reviews));
      if(d.wrong) localStorage.setItem('lc100.wrong', JSON.stringify(d.wrong));
      render(); toast('进度已恢复 📂');
    }catch(e){ toast('导入失败: ' + e.message); }
  };
  rd.readAsText(file);
}
document.getElementById('btnExport').addEventListener('click', exportProgress);
document.getElementById('btnImport').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', function(){
  if(this.files[0]) importProgress(this.files[0]);
  this.value = '';
});

/* ---------- 错题本 ---------- */
function wrongList(){
  const w = loadJSON('lc100.wrong');
  return Object.values(w).sort((a, b) => b.t - a.t);
}
function clearWrong(){
  try{ localStorage.setItem('lc100.wrong', '{}'); }catch(e){}
  render(); toast('错题本已清空');
}""")

# 4. render(): 统计面板 + 错题本渲染
rep("""function render(){
  const dn = done();
  const secs = document.getElementById('sections');

  // 今日复习横幅""",
"""function render(){
  const dn = done();
  const secs = document.getElementById('sections');

  // 统计面板
  const at = loadJSON('lc100.doneAt'), rv = loadJSON('lc100.reviews');
  const rvTotal = Object.values(rv).reduce((s, x) => s + x, 0);
  const daySet = new Set(Object.values(at).map(t => new Date(t).toDateString()));
  const cur = new Date();
  if(!daySet.has(cur.toDateString())) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while(daySet.has(cur.toDateString())){ streak++; cur.setDate(cur.getDate() - 1); }
  const sb = document.getElementById('statsBar');
  let sh = '<span class="st">已掌握<b>' + dn.length + '</b>/100</span>' +
           '<span class="st">🔥 连续学习<b>' + streak + '</b>天</span>' +
           '<span class="st">🔄 累计复习<b>' + rvTotal + '</b>轮</span>';
  sh += '<div class="catmini">' + CATS.map(([cat]) => {
    const items = window.LC_PROBLEMS.filter(t => t.cat === cat);
    const n = items.filter(t => dn.includes(t.order)).length;
    const cls = n === items.length ? 'full' : (n > 0 ? 'half' : '');
    return '<span class="cchip ' + cls + '">' + cat + ' ' + n + '/' + items.length + '</span>';
  }).join('') + '</div>';
  sb.innerHTML = sh;

  // 错题本
  const wb = document.getElementById('wrongBar');
  const wl = wrongList();
  if(wl.length){
    let wh = '<b>❌ 错题回顾 · ' + wl.length + ' 题</b><span class="rsub">答对同题同问会自动移出</span><div class="rlist">';
    wl.slice(0, 10).forEach(x => {
      const p = window.LC_PROBLEMS.find(t => t.order === x.order);
      if(!p) return;
      wh += '<span class="ritem"><a href="pages/p' + String(x.order).padStart(3,'0') + '.html">P' + String(x.order).padStart(3,'0') + ' ' + p.title + '</a><small>小测第' + (x.qi + 1) + '题</small></span>';
    });
    if(wl.length > 10) wh += '<span class="ritem more">…还有 ' + (wl.length - 10) + ' 条</span>';
    wh += '</div><button class="wclear" id="btnClearWrong">清空错题本</button>';
    wb.innerHTML = wh; wb.style.display = '';
    const cwb = document.getElementById('btnClearWrong');
    if(cwb) cwb.addEventListener('click', clearWrong);
  } else { wb.style.display = 'none'; }

  // 今日复习横幅""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('index stats/wrong/backup OK')
