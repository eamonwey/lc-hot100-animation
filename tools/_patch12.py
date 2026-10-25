# -*- coding: utf-8 -*-
"""p025 alt + p026 base 官方签名版手术(幂等): 展示代码去建表、帧 hl 重映射、msg 对齐、pyCheck:false"""
import io, re

def load(p): return io.open(p, encoding='utf-8').read()
def save(p, s): io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

def rep1(s, old, new, tag):
    if new in s: return s
    assert old in s, 'MISSING ' + tag
    return s.replace(old, new, 1)

def repall(s, old, new, tag):
    assert old in s, 'MISSING ' + tag
    return s.replace(old, new)

# ================= p025 =================
p = 'pages/p025.html'
s = load(p)

if 'def hasCycle(self, head, pos):' in s:
    ma = re.search(r'\n\s*alt:\s*\{', s)
    assert ma, 'p025 alt anchor not found'
    ai = ma.start()
    base, alt = s[:ai], s[ai:]

    # 1) alt 代码 → 官方哈希集合版 (第 2 个 code 块)
    blocks = list(re.finditer(r'(code: `class Solution:\n)(.*?)(`,)', alt, re.S))
    assert len(blocks) == 1, 'alt code block not found'
    ALT_BODY = (
"    def hasCycle(self, head):\n"
"        visited = set()             # 集合: 登记见过的每个节点\n"
"        cur = head                  # 从头出发\n"
"        while cur:                  # 还没走出链尾就继续\n"
"            if cur in visited:      # 撞见老面孔 → 有环实锤\n"
"                return True\n"
"            visited.add(cur)        # 登记当前节点\n"
"            cur = cur.next          # 往前走一步\n"
"        return False                # 冲到 None 没重复 → 无环\n")
    m = blocks[0]
    alt = alt[:m.start(2)] + ALT_BODY + alt[m.end(2):]

    # 2) alt 帧 hl 重映射 (顺序防连锁: 先消耗与目标冲突的源)
    remap = [
        ('hl: [1,2,3,4,5,6,7,8,9]', 'hl: [1,2]'),
        ('hl: [10,11]', 'hl: [3,4]'),
        ('hl: [6]', 'hl: [8]'),
        ('hl: [4], ok: 13', 'hl: [6], ok: 6'),
        ('hl: [4], no: 13', 'hl: [6], no: 6'),
        ('hl: [5]', 'hl: [7]'),
        ('hl: [12], no: 12', 'hl: [5], no: 5'),
        ('hl: [12], ok: 12', 'hl: [5], ok: 5'),
        ('hl: [17]', 'hl: [10]'),
        ('hl: [16]', 'hl: [9]'),
    ]
    for old, new in remap:
        alt = repall(alt, old, new, 'p025 alt hl ' + old)
    for bad in ['hl: [12]', 'hl: [17]', 'hl: [16]', 'hl: [1,2,3']:
        assert bad not in alt, 'p025 alt remnant ' + bad
    s = base + alt
    save(p, s)
    print('p025 alt patched')
else:
    print('p025 alt already patched')

s = load(p)
# 3) pyCheck: false ×2 (base + alt, 各插在 expected 之前)
out, n = [], 0
for line in s.split('\n'):
    m = re.match(r'^(\s*)expected:', line)
    if m and 'pyCheck' not in '\n'.join(out[-40:]):
        out.append(m.group(1) + 'pyCheck: false,')
        n += 1
    out.append(line)
assert n == 2, 'p025 expected x' + str(n)
save(p, '\n'.join(out))
print('p025 pyCheck x' + str(n))

# ================= p026 =================
p = 'pages/p026.html'
s = load(p)

if 'def detectCycle(self, head, pos):' in s:
    # 1) 代码 → 官方 12 行版
    m = re.search(r'(code: `class Solution:\n)(.*?)(`,)', s, re.S)
    assert m, 'p026 code block not found'
    NEW_BODY = (
"    def detectCycle(self, head):\n"
"        slow = fast = head\n"
"        while fast and fast.next:        # 阶段一: 快慢指针判环\n"
"            slow = slow.next\n"
"            fast = fast.next.next\n"
"            if slow is fast:             # 相遇 → 有环, 开始找入口\n"
"                meet, p = slow, head     # meet 留原地, p 回到开头\n"
"                while p is not meet:     # 阶段二: 同步一步一步走\n"
"                    p = p.next\n"
"                    meet = meet.next\n"
"                return p                 # 再相遇处就是入环口\n"
"        return None                      # 无环\n")
    s = s[:m.start(2)] + NEW_BODY + s[m.end(2):]

    # 2) 帧 hl 重映射
    remap = [
        ('hl: [1,2,3,4,5,6,7,8,9]', 'hl: [1,2]'),
        ('hl: [10,11,12]', 'hl: [3]'),
        ('hl: [13], ok: 13', 'hl: [4], ok: 4'),
        ('hl: [13], no: 13', 'hl: [4], no: 4'),
        ('hl: [14]', 'hl: [5]'),
        ('hl: [15]', 'hl: [6]'),
        ('hl: [16,17]', 'hl: [7,8]'),
        ('hl: [16], no: 16', 'hl: [7], no: 7'),
        ('hl: [18], no: 18', 'hl: [9], no: 9'),
        ('hl: [19]', 'hl: [10]'),
        ('hl: [20]', 'hl: [11]'),
        ('hl: [18], ok: 18', 'hl: [9], ok: 9'),
        ('hl: [21,22]', 'hl: [12]'),
    ]
    for old, new in remap:
        s = repall(s, old, new, 'p026 hl ' + old)

    # 3) 两个返回帧: 上下文锚定, 无环→[13] 有环→[12]
    s = rep1(s,
        "hl: [23], tag: '返回', cls: 't-dark',\n        msg: 'return entry = <b>-1</b>",
        "hl: [13], tag: '返回', cls: 't-dark',\n        msg: '<code>return None</code>：链表无环——阶段一快慢指针没追上就直接走到头了（力扣输出记作 no cycle，页面沿用 -1 表示\"查无入环口\"）。金色输出框里就是这道题的最终答案。", 'p026 返回无环')
    assert "hl: [23]" in s, 'p026 返回有环 missing'
    s = s.replace('hl: [23]', 'hl: [12]', 1)

    # 4) msg 对齐新代码
    s = rep1(s,
        "msg: 'entry 先记为 -1——万一最后发现无环，就原样返回这个\"查无入口\"的暗号。slow、fast 从节点 ",
        "msg: 'slow、fast 从节点 ", 'p026 出发 msg')
    s = rep1(s,
        "msg: '<code>entry = nodes.index(p)</code>：入环口下标记为 <b>' + entry + '</b>（第 ' + idxOf(p) + ' 个节点，值 ' + vals[entry] + '），break 收工。画面上紫底节点就是它——任务完成，只差把它交回去。'",
        "msg: '<code>return p</code>：阶段二再相遇，p 停下的地方就是<b>入环口</b>——第 ' + idxOf(p) + ' 个节点（值 ' + vals[entry] + '）。力扣要求返回<b>节点本身</b>，页面用它的下标展示。画面上紫底节点就是它——任务完成，只差把它交回去。'", 'p026 记下入口 msg')
    s = rep1(s,
        "msg: 'return entry = <b>' + entry + '</b> ✨ 入环口是第 ' + entry + ' 个节点（值 ' + vals[entry] + '）。复盘：",
        "msg: '<code>return p</code> ✨ 力扣要求返回<b>入环节点本身</b>，页面用它的下标展示：入环口是第 ' + entry + ' 个节点（值 ' + vals[entry] + '）。复盘：", 'p026 返回有环 msg')

    for bad in ["self, head, pos", 'nodes.index', "hl: [13], ok: 13", 'hl: [23]']:
        assert bad not in s, 'p026 remnant ' + bad
    save(p, s)
    print('p026 patched')
else:
    print('p026 already patched')

s = load(p)
out, n = [], 0
for line in s.split('\n'):
    m = re.match(r'^(\s*)expected:', line)
    if m and 'pyCheck' not in '\n'.join(out[-40:]):
        out.append(m.group(1) + 'pyCheck: false,')
        n += 1
    out.append(line)
assert n == 1, 'p026 expected x' + str(n)
save(p, '\n'.join(out))
print('p026 pyCheck x' + str(n))
print('ALL DONE')
