# -*- coding: utf-8 -*-
"""p022 解法二手术 v3: 官方哈希版 + 行号同步 + 集合就位合并 + pyCheck"""
import io, re
p = 'pages/p022.html'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n >= min(cnt, 1), 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, n if cnt >= 99 else cnt)

# 1. 解法二代码 → 官方哈希版
pat = re.compile(r"    def getIntersectionNode\(self, a, b, skipA, skipB\):[\s\S]*?# B 走完都没查到 → 不相交")
new_body = """    def getIntersectionNode(self, headA, headB):
        seen = set()                      # 哈希集合: 登记见过的每个节点
        pA = headA
        while pA:                         # 上半场: 扫 A 链, 逐个登记
            seen.add(pA)
            pA = pA.next
        pB = headB
        while pB:                         # 下半场: 扫 B 链, 逐个查表
            if pB in seen:                # 第一个查到的 = 交点
                return pB
            pB = pB.next
        return None                       # B 走完都没查到 → 不相交"""
s, c1 = pat.subn(new_body, s, count=1)
assert c1 == 1, 'code block'
print('alt code replaced:', c1)

# 2. 造链帧 → 读题
rep("hl: [1,2,3,4,5,6,7], tag: '造链'", "hl: [1,2], tag: '读题·两条链就位'")
rep("先把结构造出来（build 从后往前接节点）：", "力扣直接给你两个<b>建好的链表</b> headA、headB（页面用 skipA/skipB 构造相交结构，与官方题面用例格式一致）：")

# 3. 接上尾巴帧 → 哈希集合就位
rep("hl: [8,9,10], tag: '接上尾巴'", "hl: [3,4], tag: '哈希集合就位'")

# 4. 删除原「集合就位」帧
i = s.find("tag: '集合就位'")
assert i > 0, '集合就位 not found'
j = s.rfind('F.push', 0, i)
k = s.find('});', i) + 5
s = s[:j] + s[k:]
print('集合就位 frame removed')

# 5. 行号同步
rep("hl: [13], ok: 13, tag: 'A 链 · while'", "hl: [5], ok: 5, tag: 'A 链 · while'", 99)
rep("hl: [14], tag: '登记'", "hl: [6], tag: '登记'", 99)
rep("hl: [15], tag: '前进'", "hl: [7], tag: '前进'", 99)
rep("hl: [13], no: 13, tag: 'A 链登记完毕'", "hl: [5], no: 5, tag: 'A 链登记完毕'", 99)
rep("hl: [16], tag: '换扫 B 链'", "hl: [8], tag: '换扫 B 链'", 99)
rep("hl: [17], ok: 17, tag: 'B 链 · while'", "hl: [9], ok: 9, tag: 'B 链 · while'", 99)
rep("hl: [18], no: 18, tag: '查无此人'", "hl: [10], no: 10, tag: '查无此人'", 99)
rep("hl: [18], ok: 18, tag: '查表命中！'", "hl: [10], ok: 10, tag: '查表命中！'", 99)
rep("hl: [19], tag: '返回交点'", "hl: [11], tag: '返回交点'", 99)

# 6. 返回交点 msg
rep("msg: '🎉 <code>return p.val</code>：交点值 = <b>'",
    "msg: '🎉 <code>return pB</code>：返回<b>交点节点本身</b>（力扣要求返回节点，页面用它的值展示）→ 交点值 = <b>'")

# 7. 解法二 pyCheck: false(第二个 expected: 8 的行后插入, 缩进随该行)
NL = chr(10)
lines = s.split(NL)
seen_exp = 0
for li in range(len(lines)):
    if 'expected: 8,' in lines[li]:
        seen_exp += 1
        if seen_exp == 2:
            indent = lines[li][:len(lines[li]) - len(lines[li].lstrip())]
            lines.insert(li + 1, indent + 'pyCheck: false,   // 展示代码为官方签名(吃链表), 页面输入是数组——正确性由 JS sol 对拍验证')
            break
assert seen_exp >= 2, 'alt expected not found'
s = NL.join(lines)
print('alt pyCheck inserted')

# 8. codeTitle 行号同步
rep('上半场第 14 行把 A 链逐个 <code>add</code> 进集合；下半场第 18 行 <code>if p in seen</code> 变',
    '上半场第 6 行把 A 链逐个 <code>add</code> 进集合；下半场第 10 行 <code>if p in seen</code> 变')

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('p022 alt surgery v3 OK')
