# -*- coding: utf-8 -*-
"""p025/p026 手术: 展示代码换官方签名版(去 build/pos), 全部帧 hl 重指"""
import io

# ---------- p025 (LC141 hasCycle) ----------
p = 'pages/p025.html'
s = io.open(p, encoding='utf-8').read()

old_code = """  code: `class Solution:
    def hasCycle(self, head, pos):
        nodes = []                      # 先按数组把节点造出来
        for v in head:
            nodes.append(ListNode(v))
        for i in range(len(nodes) - 1):
            nodes[i].next = nodes[i + 1] # 依次相连
        if pos >= 0 and nodes:          # 尾巴接到第 pos 个 → 成环
            nodes[-1].next = nodes[pos]
        head = nodes[0] if nodes else None
        slow = fast = head              # 快慢指针同一地点出发
        met = False                     # 先假设没追上
        while fast and fast.next:       # 快的能再走两步才继续
            slow = slow.next            # 慢的走 1 步
            fast = fast.next.next       # 快的走 2 步
            if slow is fast:            # 快的绕圈追上慢的
                met = True
                break
        return met                      # 追上=有环; 快的到头=无环
`,"""
new_code = """  code: `class Solution:
    def hasCycle(self, head):
        slow = fast = head          # 快慢指针同一地点出发
        while fast and fast.next:   # 快的能再走两步才继续
            slow = slow.next        # 慢的走 1 步
            fast = fast.next.next   # 快的走 2 步
            if slow is fast:        # 快的绕圈追上慢的
                return True         # 有环实锤
        return False                # 快的到头 = 无环
`,"""
assert old_code in s, 'p025 code not found'
s = s.replace(old_code, new_code, 1)

# hl 重指(逐值全局替换, 同值的帧都映射到同一新行)
hlmap25 = [
    ('hl: [1,2,3,4,5,6,7,8,9,10]', 'hl: [1,2]'),
    ('hl: [11,12]', 'hl: [3]'),
    ('hl: [13]', 'hl: [4]'),
    ('hl: [14]', 'hl: [5]'),
    ('hl: [15]', 'hl: [6]'),
    ('hl: [16,17,18]', 'hl: [7,8]'),
    ("hl: [16], no: 16", "hl: [7], no: 7"),
    ("hl: [19]", "hl: met ? [8] : [9]"),
]
for old, new in hlmap25:
    assert old in s, 'p025 hl not found: ' + old
    s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('p025 OK')

# ---------- p026 (LC142 detectCycle) ----------
p = 'pages/p026.html'
s = io.open(p, encoding='utf-8').read()

old_code = """  code: `class Solution:
    def detectCycle(self, head, pos):
        nodes = []                       # 先按数组把节点造出来
        for v in head:
            nodes.append(ListNode(v))
        for i in range(len(nodes) - 1):
            nodes[i].next = nodes[i + 1] # 依次相连
        if pos >= 0 and nodes:           # 尾巴接到第 pos 个 → 成环
            nodes[-1].next = nodes[pos]
        head = nodes[0] if nodes else None
        entry = -1                       # 先记答案: -1 表示无环
        slow = fast = head
        while fast and fast.next:        # 阶段一: 快慢指针判环
            slow = slow.next
            fast = fast.next.next
            if slow is fast:             # 相遇 → 有环, 开始找入口
                meet, p = slow, head     # meet 留原地, p 回到开头
                while p is not meet:     # 阶段二: 同步一步一步走
                    p = p.next
                    meet = meet.next
                entry = nodes.index(p)   # 再相遇处就是入环口
                break
        return entry                     # 入口下标; 无环是 -1
`,"""
new_code = """  code: `class Solution:
    def detectCycle(self, head):
        slow = fast = head
        while fast and fast.next:        # 阶段一: 快慢指针判环
            slow = slow.next
            fast = fast.next.next
            if slow is fast:             # 相遇 → 有环, 开始找入口
                meet, p = slow, head     # meet 留原地, p 回到开头
                while p is not meet:     # 阶段二: 同步一步一步走
                    p = p.next
                    meet = meet.next
                return p                 # 再相遇处就是入环口
        return None                      # 无环
`,"""
assert old_code in s, 'p026 code not found'
s = s.replace(old_code, new_code, 1)

hlmap26 = [
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
    ('hl: [23]', 'hl: entry >= 0 ? [12] : [13]'),
]
for old, new in hlmap26:
    assert old in s, 'p026 hl not found: ' + old
    s = s.replace(old, new)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('p026 OK')
