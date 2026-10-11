/* 运行时遮挡审计(只读, 不改任何文件): 包装 Viz 组件, 逐页重放 base+alt 全部帧,
   收集: ①list 反向箭头(源在目标右侧) ②跨节点长箭头(中间隔着节点, 线从节点背后穿过)
   ③同节点名牌堆叠数 ④树标签文本过长(压邻格) ⑤环弧落点与名牌同节点 */
'use strict';
const puppeteer = require('puppeteer-core');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOCAL = f => 'file:///' + path.join(ROOT, 'pages', f).replace(/\\/g, '/');

(async () => {
  const b = await puppeteer.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: 'new', args: ['--no-sandbox']});
  const p = await b.newPage();
  await p.setViewport({width: 1600, height: 1000});
  const all = [];

  for (let ord = 1; ord <= 100; ord++) {
    const id = String(ord).padStart(3, '0');
    try {
      await p.goto(LOCAL('p' + id + '.html'), {waitUntil: 'load'});
      await sleep(350);
      const rep = await p.evaluate(() => {
        if (!window.Viz || !window.LC || !LC._cfgs) return {page: 'p???', sols: []};
        const out = {page: location.pathname.split('/').pop(), sols: []};
        const holder = document.createElement('div');
        holder.style.cssText = 'position:absolute;left:-99999px;top:0';
        document.body.appendChild(holder);

        let cur = null;   // 当前记录 {frames: [...]}
        let fi = -1;
        const origList = Viz.prototype.list, origTree = Viz.prototype.tree, origArr = Viz.prototype.arr;

        Viz.prototype.list = function(id2, nodes, opt){
          opt = opt || {};
          if (cur && Array.isArray(nodes)){
            const seq = (opt.dummy ? [{key: '__dummy'}] : []).concat(nodes);
            const idx = new Map(seq.map((nd, i) => [String(nd.key), i]));
            const rec = cur.frames[fi];
            (opt.edges || []).forEach(e => {
              const ia = idx.has(String(e[0])) ? idx.get(String(e[0])) : null;
              const ib = idx.has(String(e[1])) ? idx.get(String(e[1])) : null;
              if (ia == null || ib == null) return;
              if (ib < ia) rec.rev.push(seq[ia].val != null ? (e[0] + '→' + e[1]) : (ia + '→' + ib));
              else if (ib - ia > 1) rec.skip.push(e[0] + '→' + e[1] + '(跨' + (ib - ia - 1) + '节点)');
            });
            const cnt = {};
            (opt.pointers || []).forEach(t => { cnt[t.key] = (cnt[t.key] || 0) + 1; });
            if (opt.headTag) cnt[opt.headTag.key] = (cnt[opt.headTag.key] || 0) + 1;
            const multi = Object.keys(cnt).filter(k => cnt[k] >= 2);
            if (multi.length) rec.stack.push(multi.join(','));
            if (opt.cycleFrom != null && opt.headTag) rec.cycleHead = String(opt.headTag.key) === String(opt.cycleFrom);
          }
          return origList.call(this, id2, nodes, opt);
        };
        Viz.prototype.tree = function(id2, layout, opt){
          opt = opt || {};
          if (cur && layout && layout.nodes){
            const rec = cur.frames[fi];
            const cnt = {};
            (opt.pointers || []).forEach(t => { cnt[t.key] = (cnt[t.key] || 0) + 1; });
            const multi = Object.keys(cnt).filter(k => cnt[k] >= 2);
            if (multi.length) rec.stack.push('tree:' + multi.join(','));
            const tags = opt.tags || {};
            Object.keys(tags).forEach(k => {
              if (String(tags[k].text || '').length > 8) rec.longTag.push(k + ':' + tags[k].text);
            });
          }
          return origTree.call(this, id2, layout, opt);
        };
        Viz.prototype.arr = function(id2, vals, opt){
          opt = opt || {};
          if (cur && Array.isArray(vals)){
            const rec = cur.frames[fi];
            const mk = (opt.markers || []).filter(m => m.idx != null && m.idx >= 0 && m.idx < vals.length);
            const cnt = {};
            mk.forEach(m => { cnt[m.idx] = (cnt[m.idx] || 0) + 1; });
            const multi = Object.keys(cnt).filter(k => cnt[k] >= 2);
            if (multi.length) rec.stack.push('arr@' + multi.join(','));
          }
          return origArr.call(this, id2, vals, opt);
        };

        try {
          LC._cfgs.forEach(cfg => {
            [['', cfg], ['alt:', cfg.alt]].forEach(([pre, sc]) => {
              if (!sc || !sc.steps) return;
              const input = {};
              (cfg.form || []).forEach(f => { input[f.key] = f.def; });
              let frames = [];
              try { frames = sc.steps(JSON.parse(JSON.stringify(input))); } catch(e) { return; }
              const solRec = {label: pre + (sc.label || '解法'), n: frames.length, frames: []};
              out.sols.push(solRec);
              cur = solRec;
              const v = new Viz(holder);
              frames.forEach((f, i) => {
                fi = i;
                solRec.frames.push({i, tag: f.tag || '', rev: [], skip: [], stack: [], longTag: []});
                try { f.do(v); } catch(e) { solRec.frames[i].err = String(e.message).slice(0, 60); }
              });
            });
          });
        } finally {
          Viz.prototype.list = origList; Viz.prototype.tree = origTree; Viz.prototype.arr = origArr;
          holder.remove();
        }
        // 只留有发现的帧
        out.sols.forEach(s => { s.frames = s.frames.filter(f => f.rev.length || f.skip.length || f.stack.length || f.longTag.length || f.err); });
        return out;
      });
      all.push(rep);
      process.stdout.write('.');
    } catch (e) {
      all.push({page: 'p' + id, error: String(e).slice(0, 80)});
      process.stdout.write('x');
    }
  }
  console.log('');
  // 汇总: 只打印有发现的页
  let hits = 0;
  all.forEach(r => {
    if (r.error) { console.log(r.page, 'PROBE-ERR', r.error); return; }
    const sols = r.sols.filter(s => s.frames.length);
    if (!sols.length) return;
    hits++;
    console.log('### ' + r.page);
    sols.forEach(s => {
      console.log('  [' + s.label + '] 共' + s.n + '帧, ' + s.frames.length + '帧有发现');
      s.frames.slice(0, 6).forEach(f => {
        const parts = [];
        if (f.rev.length) parts.push('反向箭头: ' + f.rev.join(' '));
        if (f.skip.length) parts.push('跨节点箭头: ' + f.skip.join(' '));
        if (f.stack.length) parts.push('多名牌同格: ' + f.stack.join(' '));
        if (f.longTag.length) parts.push('长树标签: ' + f.longTag.join(' '));
        if (f.err) parts.push('渲染报错: ' + f.err);
        console.log('    帧' + f.i + '「' + f.tag + '」' + parts.join(' | '));
      });
      if (s.frames.length > 6) console.log('    ...(还有' + (s.frames.length - 6) + '帧)');
    });
  });
  console.log('\n===== 有遮挡风险的页: ' + hits + ' / 100 =====');
  await b.close();
})().catch(e => { console.error('runner:', e); process.exit(1); });
