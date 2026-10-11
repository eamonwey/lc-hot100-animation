/* ============================================================
 * viz.js —— 动画可视化组件库
 * 所有组件都基于「键控 diff + CSS 过渡」：同一 key 的元素在步骤间
 * 平滑移动/变色，新元素淡入，消失元素淡出。
 * 每一步都应完整描述当前画面状态（幂等重绘），跳步/回退才安全。
 * ============================================================ */
(function(){
'use strict';

function esc(t){
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const STATES = ['st-active','st-in','st-peek','st-just','st-block','st-stale','st-gone','st-done','st-target','st-pivot','st-muted','wall','emptycell','hl','dummy'];
function setState(el, st){
  el.classList.remove(...STATES);
  if(st) el.classList.add('st-' + st);
}

class Viz{
  constructor(stage){
    this.stage = typeof stage === 'string' ? document.querySelector(stage) : stage;
    this.blocks = new Map();
    this._touched = null;
  }

  /** 每帧开始/结束：本帧没被画到的区块自动淡出（数据保留，下帧画了就回来） */
  beginFrame(){
    this._before = new Map();
    for(const [id,b] of this.blocks){
      if(!b.el.classList.contains('hide') && !b.empty) this._before.set(id,b.el.getBoundingClientRect());
      if(b.motion) b.motion.cancel();
    }
    this._oldHeight = this.stage.getBoundingClientRect().height;
    if(this._motion) this._motion.cancel();
    this._touched = new Set();
  }
  endFrame(){
    const t = this._touched;
    this._touched = null;
    if(!t) return;
    for(const [id, b] of this.blocks){
      b.el.classList.toggle('hide', !t.has(id) || !!b.empty);
    }
    if(!this.stage.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timing = {duration:280,easing:'cubic-bezier(.22,.9,.3,1)'};
    for(const [id,b] of this.blocks){
      const old = this._before && this._before.get(id);
      if(!old || b.el.classList.contains('hide')) continue;
      const now = b.el.getBoundingClientRect();
      const dx=old.left-now.left, dy=old.top-now.top;
      if(Math.abs(dx)+Math.abs(dy)>0.5) b.motion=b.el.animate([
        {transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}
      ],timing);
    }
    const height=this.stage.getBoundingClientRect().height;
    if(this._before?.size && Math.abs(height-this._oldHeight)>0.5){
      this._motion=this.stage.animate([{height:this._oldHeight+'px'},{height:height+'px'}],timing);
    }
  }

  /* ---------- 内部机制 ---------- */
  _blk(id, title){
    if(this._touched) this._touched.add(id);
    let b = this.blocks.get(id);
    if(!b){
      const el = document.createElement('div');
      el.className = 'blk';
      if(title != null) el.innerHTML = '<div class="blk-t">' + title + '</div>';
      const body = document.createElement('div');
      body.className = 'blk-b';
      el.appendChild(body);
      this.stage.appendChild(el);
      b = {el, body, items: new Map()};
      this.blocks.set(id, b);
    } else if(title != null){
      const t = b.el.querySelector('.blk-t');
      if(t && t.innerHTML !== title) t.innerHTML = title;   // 动态标题(如计数)逐帧跟随
    }
    return b;
  }
  _item(b, key, cls, html){
    let it = b.items.get(key);
    if(!it){
      const el = document.createElement('div');
      el.className = 'viz-it' + (cls ? ' ' + cls : '');
      el.innerHTML = html || '';
      el.classList.add('enter');
      b.body.appendChild(el);
      it = {el};
      b.items.set(key, it);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter')));
    }
    return it;
  }
  _sweep(b, keep){
    for(const [k, it] of Array.from(b.items)){
      if(k === '__svg') continue;             // svg 常驻，绝不清扫
      if(!keep.has(k)){
        b.items.delete(k);
        it.el.classList.add('exit');
        const el = it.el;
        setTimeout(() => el.remove(), 330);
      }
    }
  }
  _label(b, key, cls, text, color){
    const it = this._item(b, key, '', '<span></span>');
    const label = it.el.firstElementChild;
    label.className = cls;
    label.textContent = text;
    label.style.background = color || '';
    return it;
  }
  _svg(b, w, h){
    let it = b.items.get('__svg');
    if(!it){
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'vizsvg');
      // marker 用固定像素尺寸(userSpaceOnUse): 箭头大小不随线宽变化
      const defsHtml =
        '<defs>' +
        '<marker id="arw-' + b._uid + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="#9aa0ad"/></marker>' +
        '<marker id="arwA-' + b._uid + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="#c9541f"/></marker>' +
        '<marker id="arwG-' + b._uid + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">' +
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="#1e7a4e"/></marker>' +
        '</defs>';
      const defs = document.createElementNS(NS, 'defs');
      defs.innerHTML = defsHtml;
      svg.appendChild(defs);
      svg._defsHtml = defsHtml;   // 每帧 svg.innerHTML 重绘会清掉 defs, 重绘时必须拼回
      b.body.insertBefore(svg, b.body.firstChild);
      it = {el: svg, svg};
      b.items.set('__svg', it);
    }
    it.svg.setAttribute('width', w);
    it.svg.setAttribute('height', h);
    return it.svg;
  }
  _uidSeq(){ return Viz._uid = (Viz._uid || 0) + 1; }

  /** 完全清空舞台（更换测试用例时用） */
  clear(){
    if(this._motion) this._motion.cancel();
    this._before = null;
    for(const [, b] of this.blocks) b.el.remove();
    this.blocks.clear();
    this._touched = null;
  }
  order(ids){
    for(const id of ids){
      const block = this.blocks.get(id);
      if(block) this.stage.appendChild(block.el);
    }
  }

  /** 让某个区块淡出消失（本帧之后不再出现，直到再次绘制） */
  drop(id){
    const b = this.blocks.get(id);
    if(!b) return;
    if(this._touched) this._touched.delete(id);
    b.items.forEach(it => { it.el.classList.add('exit'); const el = it.el; setTimeout(() => el.remove(), 330); });
    b.items.clear();
    b.el.classList.add('hide');
  }

  /* ================= 数组 / 字符串 =================
   * viz.arr('nums', [2,7,11,15], {
   *   label:'数组 nums',                    // 区块标题（支持 <code>）
   *   states:{0:'in',1:'just'},             // 下标 → 状态
   *   idxCls:{2:'on-i'},                    // 下标数字高亮（on-i 橙 / on-r 蓝）
   *   markers:[{name:'i', idx:2, cls:'mi', text:'▲ i'}],  // 名牌指针
   *   labels:{0:'中'},                      // 格子下方的小注
   *   cw:46,                                // 格宽（默认自适应）
   *   quotes:false                          // 字符串格子加引号
   * })
   * 状态：in 窗口 / active 当前 / peek 即将 / just 刚动 / block 被挡
   *       stale 待移除 / gone 已移除 / done 完成 / target 目标
   *       pivot 基准 / muted 灰
   */
  arr(id, values, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    if(!b._uid) b._uid = this._uidSeq();
    const vals = values || [];
    const n = vals.length;
    const cw = opt.cw || Math.max(42, Math.min(64, 14 + 9 * Math.max(...vals.map(v => String(v).length), 1)));
    const gap = 8;
    const keep = new Set();
    const slotY = 17, cellY = 17, slotTop = 17 + 46;

    vals.forEach((v, i) => {
      const key = 'c' + i; keep.add(key);
      const it = this._item(b, key, 'cellwrap',
        '<div class="idx"></div><div class="cell"></div><div class="slot"></div>');
      const el = it.el;
      el.style.left = (i * (cw + gap)) + 'px';
      el.style.top = '0px';
      el.style.width = cw + 'px';
      const idxEl = el.querySelector('.idx');
      idxEl.textContent = i;
      idxEl.className = 'idx' + (opt.idxCls && opt.idxCls[i] ? ' ' + opt.idxCls[i] : '');
      const cell = el.querySelector('.cell');
      let txt = v == null ? '∅' : String(v);
      if(opt.quotes && v != null) txt = "'" + String(v) + "'";
      cell.textContent = txt;
      cell.style.width = '100%';
      setState(cell, opt.states && opt.states[i]);
      const slot = el.querySelector('.slot');
      slot.innerHTML = (opt.labels && opt.labels[i] != null)
        ? '<span style="font-family:var(--mono);font-size:11px;color:#a8a496">' + esc(opt.labels[i]) + '</span>' : '';
    });

    const markerTop = slotTop + (Object.values(opt.labels || {}).some(v=>v!=null) ? 24 : 4);
    const markerSize = this._markers(b,opt.markers || [],n,cw,gap,markerTop,keep);

    this._sweep(b, keep);
    b.body.style.height = (markerSize.height + 4) + 'px';
    b.body.style.width = Math.max(markerSize.width, n * (cw + gap) - gap, 0) + 'px';
  }
  _markers(b, marks, n, cw, gap, top, keep){
    const lanes=[]; let width=0;
    marks.forEach((m,j)=>{
      const key='mk:'+(m.name || j); keep.add(key);
      const el=this._label(b,key,'marker '+(m.cls || 'mr'),m.text || '▲').el;
      const valid=m.idx!=null && m.idx>=0 && m.idx<n;
      el.style.opacity=valid?'1':'0';
      el.style.visibility=valid?'visible':'hidden';
      if(!valid)return;
      const text=m.text || '▲';
      const size=el.firstElementChild.offsetWidth || [...text].reduce((s,c)=>s+(c.charCodeAt(0)>255?11:7),18);
      const x=Math.max(0,m.idx*(cw+gap)+cw/2-size/2);
      let lane=0;
      while(lanes[lane]?.some(r=>x<r[1]+6 && x+size+6>r[0]))lane++;
      (lanes[lane] ||= []).push([x,x+size]);
      el.style.left=x+'px'; el.style.top=(top+lane*24)+'px';
      width=Math.max(width,x+size);
    });
    return {width,height:top+lanes.length*24};
  }

  /* ================= 柱状图 =================
   * viz.bars('h', [1,8,6,...], {label:'', states:{}, markers:[...],
   *   water:[0,0,1,...],            // 每根柱子上的"积水"高度
   *   fill:{from:1,to:8,h:7,color}, // 高亮一块矩形区域（如水面/面积）
   *   chartH:150, labels:{}, cw:40 })
   */
  bars(id, values, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    if(!b._uid) b._uid = this._uidSeq();
    const vals = values || [];
    const n = vals.length;
    const cw = opt.cw || 40, gap = 6;
    const chartH = opt.chartH || 150;
    const hmax = opt.max || Math.max(...vals.map(v => Math.max(v, (opt.water && opt.water[vals.indexOf(v)]) || 0)), 1);
    const keep = new Set();
    const topPad = 20, baseY = topPad + chartH;

    vals.forEach((v, i) => {
      const key = 'b' + i; keep.add(key);
      const h = Math.max(0, v) / hmax * chartH;
      const wh = opt.water ? Math.max(0, opt.water[i] || 0) / hmax * chartH : 0;
      const it = this._item(b, key, 'barcol',
        '<div class="bval"></div><div class="bar"><div class="water" style="display:none"></div></div><div class="blab">' + i + '</div><div class="slot"></div>');
      const el = it.el;
      el.style.left = (i * (cw + gap)) + 'px';
      el.style.top = '0px';
      el.style.width = cw + 'px';
      el.querySelector('.bval').textContent = v;
      const bar = el.querySelector('.bar');
      bar.style.height = Math.max(3, h) + 'px';
      const water = bar.querySelector('.water');
      if(wh > 0){ water.style.display = ''; water.style.height = wh + 'px'; }
      else water.style.display = 'none';
      setState(bar, opt.states && opt.states[i]);
      const slot = el.querySelector('.slot');
      slot.innerHTML = (opt.labels && opt.labels[i] != null)
        ? '<span style="font-family:var(--mono);font-size:11px;color:#a8a496">' + esc(opt.labels[i]) + '</span>' : '';
    });

    const markerTop=baseY+24+(Object.values(opt.labels || {}).some(v=>v!=null)?24:0);
    const markerSize=this._markers(b,opt.markers || [],n,cw,gap,markerTop,keep);

    if(opt.fill){
      const f = opt.fill; keep.add('__fill');
      const col = f.color || 'rgba(51,85,200,.18)';
      const fh = f.h / hmax * chartH;
      const x1 = f.from * (cw + gap), x2 = (f.to + 1) * (cw + gap) - gap;
      const it = this._item(b, '__fill', '', '');
      it.el.style.background = col;
      it.el.style.borderRadius = '8px';
      it.el.style.left = x1 + 'px';
      it.el.style.top = (baseY - fh) + 'px';
      it.el.style.width = Math.max(0, x2 - x1) + 'px';
      it.el.style.height = fh + 'px';
    }

    this._sweep(b, keep);
    b.body.style.width = Math.max(markerSize.width, n * (cw + gap) - gap, 0) + 'px';
    b.body.style.height = (markerSize.height+4) + 'px';
  }

  /* ================= 哈希表 / 键值对 =================
   * viz.map('seen', [['2',0],['7',1]], {label:'哈希表 seen', hlK:'2', note:'值→下标'})
   * key/value 都会被转成字符串展示；hlK 高亮某一行
   */
  map(id, entries, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    b.el.classList.add('compact'); b.body.classList.add('map-flow');
    const ents = Array.isArray(entries) ? entries : Object.entries(entries || {});
    const keep = new Set();
    ents.forEach(([k, v], i) => {
      const key = 'r:' + k; keep.add(key);
      const it = this._item(b, key, 'mrow',
        '<span class="mk"></span><span class="mar">→</span><span class="mv"></span>');
      const el = it.el;
      it.el.querySelector('.mk').textContent = k;
      it.el.querySelector('.mv').textContent = v;
      el.classList.toggle('hl', opt.hlK != null && String(opt.hlK) === String(k));
      el.style.position='relative'; b.body.appendChild(el);
    });
    if(ents.length === 0){
      keep.add('__empty');
      const it = this._item(b, '__empty', 'chips', '<span class="chip empty">（空）</span>');
      it.el.style.position = 'relative';
    }
    this._sweep(b, keep);
    b.body.style.width = '100%';
    b.body.style.height = 'auto';
  }

  /* ================= 集合 chips =================
   * viz.set('occ', ['a','b','c'], {label:'occ 集合', color:'b'|'o'|'g'|'v'})
   */
  set(id, items, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    b.body.style.position = 'static';
    b.body.style.height = 'auto';
    const arr = items || [];
    const keep = new Set();
    if(arr.length === 0){
      keep.add('__empty');
      const it = this._item(b, '__empty', '', '<span class="chip empty">（空）</span>');
      it.el.style.position = 'static';
    }
    arr.forEach(v => {
      const key = 's:' + v; keep.add(key);
      const isNew = !b.items.has(key);
      const it = this._item(b, key, 'chip' + (opt.color ? ' chip-' + opt.color : ''), '');
      it.el.textContent = v;
      it.el.style.position = 'static';
      if(isNew) it.el.classList.add('pop');
      else it.el.classList.remove('pop');
      b.body.appendChild(it.el); // 保持插入顺序
    });
    this._sweep(b, keep);
  }

  /* ================= 链表 =================
   * viz.list('cur', [{key:1,val:1},{key:2,val:2}], {
   *   label:'原链表', states:{1:'active'},
   *   edges:[[1,3]],            // 自定义箭头（反转时用），缺省按顺序连
   *   pointers:[{key:2,text:'▼ cur',cls:'mi'}],   // 节点上方名牌
   *   headTag:{key:1,text:'head',cls:'mr'},       // 头标记
   *   cycleFrom:2,              // 尾节点回连到 key=2 的节点（画弧）
   *   dummy:true                // 在最前面画一个虚线哑节点
   * })
   * 节点 val 为 null 时显示 ∅
   */
  list(id, nodes, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    if(!b._uid) b._uid = this._uidSeq();
    const tags = [];
    if(opt.headTag) tags.push(opt.headTag);
    (opt.pointers || []).forEach(p => tags.push(p));
    const tagLevels = new Map();
    let tagHeight = 30;
    tags.forEach(t => {
      const key = String(t.key), level = tagLevels.get(key) || 0;
      tagLevels.set(key, level + 1);
      tagHeight = Math.max(tagHeight, 30 + level * 22 + (t.lift || 0));
    });
    const W = 54, H = 46, GAP = 34, padX = 8;
    let list = nodes || [];
    const keep = new Set();

    const drawNodes = (ns, offX, tag) => {
      ns.forEach((nd, i) => {
        const key = tag + nd.key; keep.add(key);
        const it = this._item(b, key, 'listnode' + (nd.dummy ? ' dummy' : ''), '');
        it.el.textContent = nd.val == null ? '∅' : String(nd.val);
        it.el.style.left = (offX + i * (W + GAP)) + 'px';
        it.el.style.top = padTop + 'px';
        it.el.style.width = W + 'px';
        it.el.style.height = H + 'px';
        setState(it.el, opt.states && opt.states[nd.key]);
        it.el.classList.toggle('dummy', !!nd.dummy);
      });
    };

    const seq = [];
    if(opt.dummy) seq.push({key:'__dummy', val:'dummy', dummy:true});
    seq.push(...list);

    // 回指边从节点上方绕行，前向跨段边从下方绕行。
    // 先按索引收集边，才能为上方通道预留空间而不挤压名牌。
    const indexOf = k => seq.findIndex(nd => String(nd.key) === String(k));
    const edgeIndexes = opt.edges
      ? opt.edges.map(([a, bb]) => [indexOf(a), indexOf(bb)]).filter(([a, bb]) => a >= 0 && bb >= 0)
      : seq.slice(0, -1).map((_, i) => [i, i + 1]);
    const upperCount = edgeIndexes.filter(([a, bb]) => bb < a).length +
      (opt.cycleFrom != null && seq.length && indexOf(opt.cycleFrom) < seq.length - 1 ? 1 : 0);
    const tagPadTop = tagHeight;
    const padTop = tagPadTop + Math.min(upperCount, 4) * 18;
    drawNodes(seq, padX, '');

    const totalW = Math.max(40, padX * 2 + seq.length * (W + GAP) - GAP);
    const svg = this._svg(b, Math.max(totalW, 40), 110);

    // 箭头
    let edges;
    if(opt.edges){
      const posOf = k => {
        const i = indexOf(k);
        return i < 0 ? null : {x: padX + i * (W + GAP), y: padTop + H / 2, index:i};
      };
      edges = opt.edges.map(([a, bb]) => [posOf(a), posOf(bb)]).filter(p => p[0] && p[1]);
    } else {
      edges = [];
      for(let i = 0; i < seq.length - 1; i++){
        edges.push([{x: padX + i * (W + GAP), y: padTop + H / 2, index:i},
                    {x: padX + (i + 1) * (W + GAP), y: padTop + H / 2, index:i + 1}]);
      }
    }
    let svgHtml = '';
    let bottom = padTop + H + 8;
    const route = (p, q, cls, label, forceCurve) => {
      const edgeLabel = (x, y) => label == null ? '' : '<text class="edge-label" x="' + x + '" y="' + y + '" text-anchor="middle" font-size="11">' + esc(label) + '</text>';
      const marker = cls.includes('e-active') ? 'arwA-' : cls.includes('e-done') ? 'arwG-' : 'arw-';
      const side = q.index < p.index ? 'top' : 'bottom';
      const attrs = ' class="edge' + cls + '" data-from="' + esc(seq[p.index].key) +
        '" data-to="' + esc(seq[q.index].key) + '" data-side="' + side + '" marker-end="url(#' + marker + b._uid + ')"';
      if(q.index === p.index + 1 && !cls.includes('e-cycle') && !forceCurve){
        return '<line' + attrs + ' x1="' + (p.x + W) + '" y1="' + p.y +
          '" x2="' + (q.x - 3) + '" y2="' + q.y + '"/>' + edgeLabel((p.x + W + q.x) / 2, p.y - 6);
      }
      // Changed links use separate lanes: forward links below, back-links above.
      const top = side === 'top';
      const y = padTop + H;
      const depth = top
        ? padTop - 8 - (route.topLane++ * 16)
        : y + 24 + (route.bottomLane++ * 16);
      bottom = Math.max(bottom, depth + (label == null ? 8 : 18));
      if(p.index !== q.index){
        const forward = q.index > p.index, cy = padTop + H / 2;
        const targetY = padTop + H * (top ? 0.2 : 0.8), direction = forward ? 1 : -1;
        const sx = forward ? p.x + W : p.x;
        const tx = forward ? q.x - 2 : q.x + W + 2;
        if(!forward && q.index === p.index - 1){
          // 相邻节点的反向(掉头)箭头: 双 S 轨道太窄会交叉成"断箭头", 改用钟形弧越过行顶
          return '<path' + attrs + ' d="M ' + sx + ' ' + cy +
            ' C ' + sx + ' ' + (depth - 6) + ', ' + tx + ' ' + (depth - 6) + ', ' + tx + ' ' + targetY + '"/>' +
            edgeLabel((sx + tx) / 2, depth - 12);
        }
        const exitX = sx + (forward ? 1 : -1) * GAP * 0.36;
        const entryX = (forward ? q.x : q.x + W) - (forward ? 1 : -1) * GAP * 0.36;
        const radius = Math.min(10, Math.abs(entryX - exitX) / 2);
        const vertical = top ? -1 : 1;
        return '<path' + attrs + ' d="M ' + sx + ' ' + cy +
          ' Q ' + exitX + ' ' + cy + ', ' + exitX + ' ' + (cy + vertical * radius) +
          ' L ' + exitX + ' ' + (depth - vertical * radius) +
          ' Q ' + exitX + ' ' + depth + ', ' + (exitX + direction * radius) + ' ' + depth +
          ' L ' + (entryX - direction * radius) + ' ' + depth +
          ' Q ' + entryX + ' ' + depth + ', ' + entryX + ' ' + (depth - vertical * radius) +
          ' L ' + entryX + ' ' + (targetY + vertical * radius) +
          ' Q ' + entryX + ' ' + targetY + ', ' + tx + ' ' + targetY + '"/>' + edgeLabel((exitX + entryX) / 2, depth + 12);
      }
      const sx = p.x + W * 0.65, tx = q.x + W * 0.35;
      return '<path' + attrs + ' d="M ' + sx + ' ' + y +
        ' C ' + sx + ' ' + depth + ', ' + tx + ' ' + depth + ', ' + tx + ' ' + (y + 3) + '"/>' + edgeLabel((sx + tx) / 2, depth + 12);
    };
    route.topLane = 0;
    route.bottomLane = 0;
    const routedPairs = new Set();
    edges.forEach(([p, q], i) => {
      const cls = ((opt.edgeStates && opt.edgeStates[i]) ? ' ' + opt.edgeStates[i] : '') +
        (q.index <= p.index ? ' e-cycle' : '');
      const pair = p.index + ':' + q.index;
      svgHtml += route(p, q, cls, opt.edgeLabels && opt.edgeLabels[i], routedPairs.has(pair));
      routedPairs.add(pair);
    });
    // 环形弧线
    if(opt.cycleFrom != null && seq.length){
      const fi = indexOf(opt.cycleFrom);
      if(fi >= 0){
        svgHtml += route({x:padX + (seq.length - 1) * (W + GAP), index:seq.length - 1},
          {x:padX + fi * (W + GAP), index:fi}, ' e-cycle');
      }
    }
    // 整体重绘线条（svg 只承担箭头，量小）
    svg.innerHTML = (svg._defsHtml || '') + svgHtml;

    // 节点上方名牌（同一节点上的多个名牌自动纵向堆叠）
    tags.forEach((t, j) => {
      const i = seq.findIndex(nd => String(nd.key) === String(t.key));
      const key = 'tag:' + (t.text || j); keep.add(key);
      const it = this._label(b, key, 'nodetag ' + (t.cls || 'mr'), t.text);
      const el = it.el;
      if(i < 0){ el.style.opacity = '0'; }
      else{
        el.style.opacity = '1';
        const level = tags.slice(0, j).filter(x => String(x.key) === String(t.key)).length;
        el.style.left = (padX + i * (W + GAP) + W / 2 - 24) + 'px';
        el.style.top = (tagPadTop - 26 - (t.lift || 0) - level * 22) + 'px';
      }
    });

    this._sweep(b, keep);
    b.body.style.width = totalW + 'px';
    svg.setAttribute('height', bottom);
    b.body.style.height = bottom + 'px';
  }

  /* ================= 二叉树 =================
   * const t = Viz.treeLayout([3,9,20,null,null,15,7]);
   * viz.tree('t', t, {label:'二叉树', states:{3:'active'}, tags:{3:'当前'}, edgeStates:{'0-2':'e-done'}})
   * t = {nodes:[{key,val,x,y,leaf}], edges:[[p,c]], w, h}
   * key = Viz.parseTree 的编号（非空节点按出现顺序 0 起）；孩子关系用 Viz.parseTree(arr) 的 left/right，
   * 不要用 2i+1 堆下标公式（对 [1,null,2,3] 这类含 null 的层序数组是错的）
   */
  tree(id, layout, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    if(!b._uid) b._uid = this._uidSeq();
    const NW = 46, NH = 38, topPad = 24;
    const keep = new Set();
    const svg = this._svg(b, layout.w, layout.h + topPad);

    let svgHtml = '';
    const posOf = {};
    layout.nodes.forEach(nd => { posOf[nd.key] = nd; });
    layout.edges.forEach(([p, c], i) => {
      const P = posOf[p], C = posOf[c];
      if(!P || !C) return;
      const cls = opt.edgeStates && opt.edgeStates[p + '-' + c] ? ' ' + opt.edgeStates[p + '-' + c] : '';
      svgHtml += '<line class="edge' + cls + '" x1="' + (P.x + NW / 2) + '" y1="' + (P.y + topPad + NH) +
        '" x2="' + (C.x + NW / 2) + '" y2="' + (C.y + topPad) + '"/>';
    });
    svg.innerHTML = (svg._defsHtml || '') + svgHtml;

    layout.nodes.forEach(nd => {
      const key = 'n:' + nd.key; keep.add(key);
      const it = this._item(b, key, 'tnode' + (nd.leaf ? ' leaf' : ''), '');
      it.el.textContent = nd.val == null ? '∅' : String(nd.val);
      it.el.style.left = nd.x + 'px';
      it.el.style.top = (nd.y + topPad) + 'px';
      it.el.style.width = NW + 'px';
      it.el.style.height = NH + 'px';
      setState(it.el, opt.states && opt.states[nd.key]);
    });

    const tags = opt.tags || {};
    Object.keys(tags).forEach(k => {
      const nd = posOf[k]; if(!nd) return;
      const key = 'tag:' + k; keep.add(key);
      const it = this._label(b, key, 'nodetag ' + (tags[k].cls || 'mi'), tags[k].text, tags[k].color);
      it.el.style.left = (nd.x + NW / 2 - 24) + 'px';
      it.el.style.top = (nd.y + topPad - 24) + 'px';
    });

    this._sweep(b, keep);
    b.body.style.width = layout.w + 'px';
    b.body.style.height = (layout.h + topPad) + 'px';
  }

  /* ================= 网格 =================
   * viz.grid('g', [[1,0],[0,1]], {label:'网格', cw:42, wallVal:null,
   *   states:{'0,1':'active'}, texts:{'0,1':'🏝'}, markers:[{r:0,c:1,text:'▼',cls:'mi'}],
   *   rowLabels:['0','1'], hideIndex:false, gap:4 })
   * wallVal: 值等于它的格子显示为实心墙样式
   */
  grid(id, matrix, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    b.body.style.position = 'static';
    b.body.style.height = 'auto';
    b.body.innerHTML = '';
    // 网格每次整体重建（表格结构，动画靠颜色过渡）
    const m = matrix || [];
    const cw = opt.cw || 42, gap = opt.gap != null ? opt.gap : 4;
    const wrap = document.createElement('div');
    wrap.className = 'gridb';
    const rows = m.length, cols = m[0] ? m[0].length : 0;
    if(!opt.hideIndex){
      const head = document.createElement('div');
      head.className = 'grow';
      head.innerHTML = '<div class="rlab"></div>';
      for(let c = 0; c < cols; c++) head.innerHTML += '<div class="rlab">' + c + '</div>';
      wrap.appendChild(head);
    }
    for(let r = 0; r < rows; r++){
      const row = document.createElement('div');
      row.className = 'grow';
      row.innerHTML = '<div class="rlab">' + r + '</div>';
      for(let c = 0; c < cols; c++){
        const cell = document.createElement('div');
        cell.className = 'gcell';
        const v = m[r][c];
        const key = r + ',' + c;
        let txt = (opt.texts && opt.texts[key] != null) ? opt.texts[key]
                : (v == null ? '' : String(v));
        cell.textContent = txt;
        const st = opt.states && opt.states[key];
        if(st) cell.classList.add('st-' + st);
        if(opt.wallVal != null && v === opt.wallVal && !st) cell.classList.add('wall');
        cell.style.margin = (gap / 2) + 'px';
        row.appendChild(cell);
      }
      wrap.appendChild(row);
    }
    b.body.appendChild(wrap);
  }

  /* ================= 栈（竖直，底在下） =================
   * viz.stack('st', [{key:1,val:'('},{key:2,val:'['}], {label:'栈', states:{2:'just'}, topTag:'栈顶'})
   */
  stack(id, items, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    b.empty = !(items && items.length);
    b.el.classList.toggle('is-empty',b.empty);
    b.el.classList.add('compact');
    const IW = opt.width || 150, IH = 40, GAPV = 6;
    const slots = (items || []).length;
    const bodyH = slots * (IH + GAPV);
    const keep = new Set();
    (items || []).forEach((it, i) => {
      const key = 'i:' + it.key; keep.add(key);
      const el = this._item(b, key, 'sitem', '').el;
      el.innerHTML = esc(it.val) + (it.fx ? '<span class="sfx">' + esc(it.fx) + '</span>' : '');
      el.style.left = '10px';
      el.style.top = (bodyH - IH - i * (IH + GAPV)) + 'px';
      el.style.width = IW + 'px';
      el.style.height = IH + 'px';
      setState(el, opt.states && opt.states[it.key]);
    });
    if(opt.topTag && items && items.length){
      const key = '__top'; keep.add(key);
      const el = this._label(b, key, 'nodetag mi', opt.topTag).el;
      el.style.left = (IW + 22) + 'px';
      el.style.top = (bodyH - IH - (items.length - 1) * (IH + GAPV) + 9) + 'px';
    }
    this._sweep(b, keep);
    b.body.style.width = (IW + 110) + 'px';
    b.body.style.height = bodyH + 'px';
  }

  /* ================= 变量面板 =================
   * viz.vars('v', {i:0, y:9, ans:1}, {label:'变量', hl:['ans']})  // hl 的变量值高亮
   */
  vars(id, obj, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    b.el.classList.add('compact'); b.body.classList.add('vars-flow');
    const keep = new Set();
    const ents = Object.entries(obj || {});
    ents.forEach(([k, v]) => {
      const key = 'v:' + k; keep.add(key);
      const vs = JSON.stringify(v);
      const changed = b.meta && b.meta.prev && b.meta.prev[k] !== undefined && b.meta.prev[k] !== vs;
      const it = this._item(b, key, 'vrow', '<span class="vk"></span><span class="vv"></span>');
      it.el.querySelector('.vk').textContent = k;
      const vv = it.el.querySelector('.vv');
      vv.textContent = v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v);
      vv.classList.toggle('chg', !!(changed || (opt.hl && opt.hl.includes(k))));
      it.el.style.position='relative'; b.body.appendChild(it.el);
      vv.title = typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
    b.meta = b.meta || {};
    const prev = {};
    ents.forEach(([k, v]) => prev[k] = JSON.stringify(v));
    b.meta.prev = prev;
    this._sweep(b, keep);
    b.body.style.width = '100%';
    b.body.style.height = 'auto';
  }

  /* ================= 文本行 =================
   * viz.text('path', '当前路径：1 → 2', {small:true})
   * 内容会做 HTML 转义吗？——不会！需要高亮请传 {html:true}，纯文本自动转义
   */
  text(id, content, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    b.body.style.position = 'static';
    b.body.style.height = 'auto';
    let it = b.items.get('t');
    if(!it){
      const el = document.createElement('div');
      el.className = 'txtb' + (opt.small ? ' small' : '');
      el.style.position = 'static';
      b.body.appendChild(el);
      it = {el};
      b.items.set('t', it);
    }
    if(opt.html) it.el.innerHTML = content;
    else it.el.textContent = content;
  }

  /* ================= 图（圆布局） =================
   * const pos = Viz.circle(['a','b','c']);
   * viz.graph('g', pos, [['a','b']], {states:{a:'active'}, edgeStates:{'a-b':'e-active'}})
   */
  graph(id, nodes, edges, opt){
    opt = opt || {};
    const b = this._blk(id, opt.label);
    if(!b._uid) b._uid = this._uidSeq();
    const R = 21;
    const keep = new Set();
    const posOf = {};
    nodes.forEach(nd => posOf[nd.key] = nd);
    const w = opt.w || 480, h = opt.h || 300;
    const svg = this._svg(b, w, h);
    let svgHtml = '';
    const graphEdges = edges || [];
    const edgePairs = new Set(graphEdges.map(([a,c]) => JSON.stringify([String(a),String(c)])));
    const unit = (x,y) => { const d = Math.hypot(x,y) || 1; return {x:x/d,y:y/d}; };
    const point = (p,u,r) => ({x:p.x+u.x*r,y:p.y+u.y*r});
    (edges || []).forEach(([a, bb], i) => {
      const P = posOf[a], Q = posOf[bb];
      if(!P || !Q) return;
      const cls = opt.edgeStates && opt.edgeStates[a + '-' + bb] ? ' ' + opt.edgeStates[a + '-' + bb] : '';
      const marker = cls.includes('e-active') ? 'arwA-' : cls.includes('e-done') ? 'arwG-' : 'arw-';
      const attrs = ' class="edge' + cls + '" data-from="' + esc(a) + '" data-to="' + esc(bb) + '" marker-end="url(#' + marker + b._uid + ')"';
      if(String(a) === String(bb)){
        const inward = unit(w/2-P.x,h/2-P.y);
        if(!inward.x && !inward.y) inward.y=1;
        const c=Math.cos(0.65),s=Math.sin(0.65);
        const u={x:inward.x*c-inward.y*s,y:inward.x*s+inward.y*c};
        const v={x:inward.x*c+inward.y*s,y:-inward.x*s+inward.y*c};
        const start=point(P,u,R),end=point(P,v,R+2),c1=point(P,u,65),c2=point(P,v,65);
        svgHtml += '<path' + attrs + ' d="M '+start.x+' '+start.y+' C '+c1.x+' '+c1.y+', '+c2.x+' '+c2.y+', '+end.x+' '+end.y+'"/>';
      }else if(edgePairs.has(JSON.stringify([String(bb),String(a)]))){
        const dir=unit(Q.x-P.x,Q.y-P.y);
        const control={x:(P.x+Q.x)/2-dir.y*36,y:(P.y+Q.y)/2+dir.x*36};
        const start=point(P,unit(control.x-P.x,control.y-P.y),R);
        const end=point(Q,unit(control.x-Q.x,control.y-Q.y),R+2);
        svgHtml += '<path' + attrs + ' d="M '+start.x+' '+start.y+' Q '+control.x+' '+control.y+', '+end.x+' '+end.y+'"/>';
      }else{
        const dir=unit(Q.x-P.x,Q.y-P.y),start=point(P,dir,R),end=point(Q,dir,-R-2);
        svgHtml += '<line' + attrs + ' x1="'+start.x+'" y1="'+start.y+'" x2="'+end.x+'" y2="'+end.y+'"/>';
      }
    });
    svg.innerHTML = (svg._defsHtml || '') + svgHtml;
    nodes.forEach(nd => {
      const key = 'g:' + nd.key; keep.add(key);
      const it = this._item(b, key, 'tnode', '');
      it.el.textContent = nd.label != null ? nd.label : String(nd.key);
      it.el.style.left = (nd.x - R) + 'px';
      it.el.style.top = (nd.y - R) + 'px';
      it.el.style.width = (R * 2) + 'px';
      it.el.style.height = (R * 2) + 'px';
      it.el.style.borderRadius = '50%';
      setState(it.el, opt.states && opt.states[nd.key]);
    });
    this._sweep(b, keep);
    b.body.style.width = w + 'px';
    b.body.style.height = h + 'px';
  }

  /* ================= 结果徽章 =================
   * viz.result([0,1])   /   viz.result('true', {label:'返回值'})
   */
  result(val, opt){
    opt = opt || {};
    const b = this._blk('result', opt.label || '返回结果');
    b.body.style.position = 'static';
    b.body.style.height = 'auto';
    let it = b.items.get('r');
    const txt = typeof val === 'string' ? val : JSON.stringify(val);
    if(!it){
      const el = document.createElement('div');
      el.className = 'ans-badge';
      el.innerHTML = '输出 = <b></b>';
      el.style.position = 'static';
      b.body.appendChild(el);
      it = {el};
      b.items.set('r', it);
    }
    it.el.querySelector('b').textContent = txt;
    it.el.classList.remove('flash');
    void it.el.offsetWidth;
    it.el.classList.add('flash');
  }
}

/* ---------- 静态工具 ---------- */

/** LeetCode 层序数组 → 树结构（BFS 跳空格式，非堆下标！）。
 *  Viz.parseTree([1,null,2,3]) → {root:0, nodes:[{key,val,left,right}]}
 *  key = 非空节点按出现顺序的编号(0 起)；left/right 为子节点 key 或 null */
Viz.parseTree = function(arr){
  arr = arr || [];
  const nodes = [];
  if(!arr.length || arr[0] == null) return {root:null, nodes};
  const root = {key:0, val:arr[0], left:null, right:null};
  nodes.push(root);
  let nextKey = 1, k = 1;
  const q = [root];
  while(k < arr.length && q.length){
    const p = q.shift();
    [0,1].forEach(side => {
      if(k >= arr.length) return;
      const v = arr[k++];
      if(v != null){
        const c = {key:nextKey++, val:v, left:null, right:null};
        nodes.push(c);
        if(side === 0) p.left = c.key; else p.right = c.key;
        q.push(c);
      }
    });
  }
  return {root:0, nodes};
};

/** 层序数组 → 树布局（配合 viz.tree 使用）。
 *  Viz.treeLayout([3,9,20,null,null,15,7])
 *  → {nodes:[{key,val,x,y,leaf}], edges:[[p,c]], w, h}  key = parseTree 的编号 */
Viz.treeLayout = function(arr){
  const T = Viz.parseTree(arr);
  const GAPX = 24, CELLW = 46, ROWH = 74, pad = 6;
  const nodes = T.nodes, edges = [];
  if(T.root == null) return {nodes, edges, w: 120, h: 60};
  const left = {}, right = {};
  nodes.forEach(nd => {
    if(nd.left != null){ edges.push([nd.key, nd.left]); left[nd.key] = nd.left; }
    if(nd.right != null){ edges.push([nd.key, nd.right]); right[nd.key] = nd.right; }
  });
  // 自根向下标深度
  const byKey = {}; nodes.forEach(n => byKey[n.key] = n);
  let maxD = 0;
  (function setD(key, d){
    byKey[key].d = d; maxD = Math.max(maxD, d);
    if(left[key] != null) setD(left[key], d + 1);
    if(right[key] != null) setD(right[key], d + 1);
  })(T.root, 0);
  // 中序位置定 x
  let counter = 0; const xpos = {};
  (function ino(key){
    if(left[key] != null) ino(left[key]);
    xpos[key] = counter++;
    if(right[key] != null) ino(right[key]);
  })(T.root);
  nodes.forEach(nd => {
    nd.x = pad + xpos[nd.key] * (CELLW + GAPX);
    nd.y = pad + nd.d * ROWH;
    nd.leaf = nd.left == null && nd.right == null;
  });
  const W = Math.max(120, pad * 2 + nodes.length * (CELLW + GAPX) - GAPX);
  const H = Math.max(60, pad * 2 + (maxD + 1) * ROWH);
  return {nodes, edges, w: W, h: H};
};

/** 键列表 → 圆形布局：Viz.circle(['a','b','c'], {w:420,h:260}) */
Viz.circle = function(keys, opt){
  opt = opt || {};
  const w = opt.w || 460, h = opt.h || 280, pad = 46;
  const cx = w / 2, cy = h / 2, rx = w / 2 - pad, ry = h / 2 - pad / 1.6;
  const n = keys.length;
  return keys.map((k, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / Math.max(n, 1);
    return {key: k, label: k, x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a)};
  });
};

window.Viz = Viz;
window.LCesc = esc;
})();
