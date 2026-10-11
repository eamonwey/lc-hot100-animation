# -*- coding: utf-8 -*-
"""p032 手术: ①解法一去 mk=type(head) 换官方 Node 写法 + hl 重映射 ②新增解法二(哈希表法)"""
import io, re

p = 'pages/p032.html'
s = io.open(p, encoding='utf-8').read()

# ---------- ① 解法一代码: 删 mk 行, 改用 Node ----------
old_code = """  code: `class Solution:
    def copyRandomList(self, head):
        if not head: return None
        mk = type(head)               # 新节点与输入节点同一类型(Node)
        cur = head
        while cur:                    # ① 每个节点后面插一个复制品
            dup = mk(cur.val)
            dup.next = cur.next
            cur.next = dup
            cur = dup.next
        cur = head                    # 回到开头, 第二遍补 random
        while cur:                    # ② 复制品的 random 跟着主人走
            if cur.random:
                cur.next.random = cur.random.next
            cur = cur.next.next
        dummy = mk(0)                 # ③ 把复制品拆成新链
        tail, cur = dummy, head
        while cur:
            tail.next = cur.next
            tail = tail.next
            cur.next = cur.next.next
            cur = cur.next
        return dummy.next
`,"""
new_code = """  code: `class Solution:
    def copyRandomList(self, head):
        if not head: return None
        cur = head
        while cur:                    # ① 每个节点后面插一个复制品
            dup = Node(cur.val)       # Node 是力扣判题环境自带的节点类
            dup.next = cur.next
            cur.next = dup
            cur = dup.next
        cur = head                    # 回到开头, 第二遍补 random
        while cur:                    # ② 复制品的 random 跟着主人走
            if cur.random:
                cur.next.random = cur.random.next
            cur = cur.next.next
        dummy = Node(0)               # ③ 把复制品拆成新链
        tail, cur = dummy, head
        while cur:
            tail.next = cur.next
            tail = tail.next
            cur.next = cur.next.next
            cur = cur.next
        return dummy.next
`,"""
assert old_code in s, 'base code not found'
s = s.replace(old_code, new_code, 1)

# ---------- ② 行号重映射: hl 数组里 4 删掉, >=5 减 1 (ok/no 只有 3, 不动) ----------
def remap(m):
    nums = [int(x) for x in m.group(1).replace(' ', '').split(',') if x]
    out = []
    for x in nums:
        if x == 4: continue
        out.append(x - 1 if x >= 5 else x)
    assert out, 'empty hl after remap'
    return 'hl:[' + ','.join(str(x) for x in out) + ']'
s = re.sub(r'hl:\s*\[([0-9,\s]+)\]', remap, s)
assert 'hl:[1,2,3,4,5]' not in s and 'hl:[6,7,8,9]' not in s
print('base remapped')

# ---------- ③ 插入解法二(哈希表法) ----------
ALT = r'''    return F;
  },

  /* ========== 解法二：力扣官方方法一 · 哈希表 ========== */

  alt: {
    label: '官方 · 哈希表',
    method: 'copyRandomList',

    lede: '题目不变：深拷贝一条带 random 的链表。解法一的穿插法把空间压到 O(1)；' +
          '这一版是力扣官方方法一——<b>哈希表</b>：第一遍逐节点造复制品，登记 <span class="var b">原节点 → 新节点</span> 的映射；' +
          '第二遍照着字典把每个复制品的 next 和 random 逐一接线。直白、不易错，面试先讲它。',

    roles: [
      {c:'orange', code:'cur',   text:'当前指针：两遍各扫一遍原链'},
      {c:'blue',   code:'dic',   text:'哈希表：原节点 → 新节点 的映射'},
      {c:'green',  code:'新节点', text:'dic 里新建的复制品（带撇，先孤岛后接线）'}
    ],
    legend: [
      {c:'orange', text:'cur 当前节点'},
      {c:'blue',   text:'dic 里已登记的映射'},
      {c:'green',  text:'新链节点（next 接好用箭头连出）'}
    ],

    codeTitle: '跟着高亮读代码——第 7 行登记映射，第 11-12 行照表接线；<code>dic.get</code> 查不到（包括 None）就返回 None，空指针天然安全。',

    idea: 'random 能乱指，边建边接会扑空；先把所有复制品建完、用哈希表记账「原 → 新」，第二遍接线时任何目标都能 O(1) 查到。时间 O(n)、空间 O(n)——直白版的正确。',

    complexity: '时间 O(n) · 两遍各扫一次；空间 O(n) · dic 存 n 对映射。对比解法一：穿插法 O(1) 空间但技巧性强，哈希法 O(n) 空间但一眼写对——面试先讲这版。',

    qa: [
      {q:'为什么用 <code>dic.get(cur.next)</code> 而不是 <code>dic[cur.next]</code>？',
       a:'<code>cur.next</code> 走到尾会是 <code>None</code>，<code>dic[None]</code> 直接 KeyError；<code>.get</code> 对任何查不到的键（包括 None）返回 None，恰好就是「没有下一个 / 没有 random」的正确语义，一处特判都不用写。'},
      {q:'为什么第一遍要把所有复制品都建完，而不是边建边接线？',
       a:'random 可能指向「还没出生」的节点（指前、指后都合法）。先把 n 个复制品全部建好、账本齐全，第二遍接线时任何目标都在字典里——这正是本题的核心难点：<b>先记账，后结账</b>。'}
    ],

    code: `class Solution:
    def copyRandomList(self, head):
        if not head: return None
        dic = {}                          # 原节点 → 新节点 的映射表
        cur = head
        while cur:                        # ① 第一遍: 复制各节点, 登记映射
            dic[cur] = Node(cur.val)
            cur = cur.next
        cur = head                        # 回到开头, 第二遍照表接线
        while cur:                        # ② 补 next 和 random
            dic[cur].next = dic.get(cur.next)
            dic[cur].random = dic.get(cur.random)
            cur = cur.next
        return dic[head]                  # ③ 新链表的头节点
`,

    sol(input){
      const arr = (input.head || []).map(p => Array.isArray(p) ? p : [p, null]);
      const n = arr.length;
      if(!n) return [];
      const ridx = i => { const r = arr[i][1]; return (r != null && r >= 0 && r < n) ? r : null; };
      // 哈希表法（与展示代码同构）：dic[原下标] = 新节点
      const dic = new Map();
      for(let i = 0; i < n; i++) dic.set(i, {val:arr[i][0], next:null, random:null});
      for(let i = 0; i < n; i++){
        dic.get(i).next = (i + 1 < n) ? dic.get(i + 1) : null;
        const r = ridx(i);
        dic.get(i).random = (r == null) ? null : dic.get(r);
      }
      const owner = new Map();
      dic.forEach((nd, i) => owner.set(nd, i));
      const out = [];
      for(let c = dic.get(0); c; c = c.next){
        out.push([c.val, c.random == null ? null : owner.get(c.random)]);
      }
      return out;
    },
    expected: [[7,null],[13,0],[11,4],[10,2],[1,0]],

    steps(input){
      const F = [];
      const arr = (input.head || []).map(p => Array.isArray(p)
        ? [p[0], (p[1] != null && p[1] >= 0 && p[1] < (input.head || []).length) ? p[1] : null]
        : [p, null]);
      const n = arr.length;
      if(!n){
        F.push({hl:[2,3], ok:3, tag:'空链表', cls:'t-grey',
          msg:'head 为空 → <code>if not head</code> 成立，直接 <code>return None</code>：空链的深拷贝还是空。',
          do: (v) => { v.list('L', [], {label:'原链表'}); }});
        F.push({hl:[14], tag:'返回', cls:'t-dark',
          msg:'<code>dic</code> 里什么都没有——第 3 行就把空输入挡掉了，返回 []，后面两遍一次都不用走。',
          do: (v) => { v.list('L', [], {label:'原链表'}); v.result([], {label:'返回结果'}); }});
        return F;
      }
      const vals = arr.map(p => p[0]);
      const rands = arr.map(p => p[1]);
      /* ★ 快照原则：所有画面数据在 F.push 那一刻现算 */
      const origNodes = () => vals.map((val, i) => ({key:'o' + i, val:val}));
      const newNodes = (cnt) => { const a = []; for(let i = 0; i < cnt; i++) a.push({key:'d' + i, val:vals[i] + "'"}); return a; };
      const dicPairs = (cnt) => { const a = []; for(let i = 0; i < cnt; i++) a.push([vals[i] + '(#' + i + ')', vals[i] + '′']); return a; };
      const headTag = {key:'o0', text:'head', cls:'mq'};

      const drawP1 = (o) => (v) => {
        v.list('L', origNodes(), {label:'原链表', states:o.states || {}, pointers:o.ptrs || [], headTag:headTag});
        v.list('NEW', newNodes(o.built), {label:'已建的新节点（孤岛，第②遍才接线）'});
        v.map('DIC', dicPairs(o.built), {label:'dic　·　原节点 → 新节点'});
        v.vars('V', o.vars, {label:'变量'});
      };
      const drawP2 = (o) => (v) => {
        const edges = [];
        for(let i = 0; i < o.wired && i + 1 < n; i++) edges.push(['d' + i, 'd' + (i + 1)]);
        v.list('L', origNodes(), {label:'原链表', states:o.states || {}, pointers:o.ptrs || [], headTag:headTag});
        v.list('NEW', newNodes(n), {label:'新链（next 一根根接上，random 记在变量面板）',
          dummy:o.wired > 0, edges:edges, headTag:o.wired > 0 ? {key:'__dummy', text:'dic[head]', cls:'mq'} : undefined});
        v.map('DIC', dicPairs(n), {label:'dic　·　原节点 → 新节点'});
        v.vars('V', o.vars, {label:'变量'});
        if(o.result) v.result(o.result, {label:'返回结果'});
      };

      F.push({hl:[1,2,3,4,5], tag:'初始化', cls:'t-grey',
        msg:'先认题：每个节点有 next 和 random 两条线，random 能乱指——指前、指后、指自己甚至 null' +
            (rands[1] != null ? '（比如下标 1 的 random 指向下标 ' + rands[1] + '）' : '') +
            '。这版的策略是<b>先记账、后结账</b>：<code>dic = {}</code> 空字典就位，第一遍把 n 个复制品全部造出来登记进 dic，' +
            '第二遍照着字典接线。为什么要两遍？接线时 random 的目标必须<b>已经存在</b>——先建完，谁都逃不掉。',
        do: drawP1({states:{['o0']:'active'}, ptrs:[{key:'o0', text:'▼ cur', cls:'mi'}], built:0,
                    vars:{cur:'节点 ' + vals[0] + '（下标 0）', dic:'{} 空字典', '计划':'①建+登记 ②接线 ③返回'}})});

      /* ---------- ① 建复制品 + 登记 ---------- */
      for(let i = 0; i < n; i++){
        F.push({hl:[6,7,8], tag:'① 建复制品·登记', cls:'t-blue',
          msg:'第①遍走到下标 ' + i + '：<code>dic[cur] = Node(cur.val)</code>——给节点 <b>' + LCesc(vals[i]) + '</b> 造一个复制品 <b>' + LCesc(vals[i]) + '′</b>，' +
              '以「原节点」为键登记进 dic。此刻 ' + LCesc(vals[i]) + '′ 还是<b>孤岛</b>：next、random 都空着，只完成了「出生 + 上户口」。' +
              '（演示里键写成「' + vals[i] + '(#' + i + ')」，真实 Python 里键就是<b>节点对象本身</b>，哈希表按对象身份查。）目前 dic 有 ' + (i + 1) + ' 对映射。',
          do: drawP1({states:{['o' + i]:'active'}, ptrs:[{key:'o' + i, text:'▼ cur', cls:'mi'}], built:i + 1,
                      vars:{cur:'节点 ' + vals[i] + '（下标 ' + i + '）', dic:(i + 1) + ' 对映射', '新登记':vals[i] + ' → ' + vals[i] + '′'}})});
      }

      /* ---------- ② 照表接线 ---------- */
      for(let i = 0; i < n; i++){
        const r = rands[i];
        F.push({hl:[10,11], tag:'② 接 next', cls:'t-ink',
          msg:'第②遍回到下标 ' + i + '：<code>dic[cur].next = dic.get(cur.next)</code>——左边从字典取出复制品 <b>' + LCesc(vals[i]) + '′</b>，' +
              '右边查「原 next」' + (i + 1 < n ? '节点 ' + LCesc(vals[i + 1]) + '(#' + (i + 1) + ') 对应的复制品 <b>' + LCesc(vals[i + 1]) + '′</b>' : '是 <b>None</b> → <code>dic.get(None)</code> 返回 None，不用特判') +
              '。原链的 next 顺藤摸瓜，新链的 next 照葫芦画瓢——<b>键查的是原节点，值接的是新节点</b>，别混。',
          do: drawP2({states:{['o' + i]:'active'}, ptrs:[{key:'o' + i, text:'▼ cur', cls:'mi'}], wired:i + 1,
                      vars:{cur:'节点 ' + vals[i] + '（下标 ' + i + '）', dic:n + ' 对映射', '接线进度':'next ' + (i + 1) + '/' + n}})});
        F.push({hl:[12,13], tag:'② 接 random', cls:'t-orange',
          msg:'重头戏：<code>dic[cur].random = dic.get(cur.random)</code>。' + (r != null
            ? '节点 ' + LCesc(vals[i]) + ' 的 random 指向<b>下标 ' + r + '</b>（节点 ' + LCesc(vals[r]) + '）→ 字典里一查，它的复制品 <b>' + LCesc(vals[r]) + '′</b> 现成的！这就是第①遍先记账的意义：任何 random 目标此刻都已在册。'
            : '节点 ' + LCesc(vals[i]) + ' 的 random 是 <b>None</b> → <code>dic.get(None)</code> 返回 <b>None</b>，random 就该是空，一行搞定。') +
            ' 假如不记账（没有 dic），这一步就得临时翻整条链找目标——O(n²)；记账之后一切 O(1)。',
          do: drawP2({states:{['o' + i]:'active', ['d' + i]:'peek'}, ptrs:[{key:'o' + i, text:'▼ cur', cls:'mi'}], wired:i + 1,
                      vars:{cur:'节点 ' + vals[i] + '（下标 ' + i + '）', 'cur.random':r != null ? '下标 ' + r + '（节点 ' + vals[r] + '）' : 'None', 'random 接到':r != null ? vals[r] + '′（下标 ' + r + '）' : 'None', '接线进度':'random ' + (i + 1) + '/' + n}})});
      }

      /* ---------- ③ 返回 ---------- */
      const res = arr.map(p => [p[0], p[1]]);
      F.push({hl:[14], tag:'返回', cls:'t-dark',
        msg:'🎉 <code>return dic[head]</code>：新链的头就是「原头节点的复制品」。复盘：两遍遍历 O(n) 时间；dic 存 n 对映射，O(n) 空间。' +
            '和解法一的穿插法对比——穿插法让「目标的复制品 = 目标.next」省掉整张表（O(1) 空间），哈希法多花一个字典换来<b>直白不易错</b>：' +
            '面试先讲这版，再优化成 O(1)，就是满分答案。',
        do: drawP2({states:{}, ptrs:[], wired:n, result:res,
                    vars:{dic:n + ' 对映射', '新链头':'节点 ' + vals[0] + '′（下标 0）', '复盘':'时间 O(n) · 空间 O(n)'}})});
      return F;
    }
  }
});
'''
tail_old = '    return F;\n  }\n});'
assert s.count(tail_old) == 1, 'tail anchor not unique: ' + str(s.count(tail_old))
s = s.replace(tail_old, ALT, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('p032 patched: base officialized + alt added')
