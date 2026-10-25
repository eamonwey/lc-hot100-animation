# -*- coding: utf-8 -*-
"""p022 手术 v2: 展示代码换官方 5 行版, 造链帧合并, 行号/跳转同步, pyCheck:false"""
import io, re
p = 'pages/p022.html'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, cnt=1):
    global s
    n = s.count(old)
    assert n >= min(cnt, 1), 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, n if cnt >= 99 else cnt)

# 1. 展示代码 → 官方 5 行版(用首尾锚点做正则替换, 覆盖整个方法体)
pat = re.compile(r"    def getIntersectionNode\(self, a, b, skipA, skipB\):[\s\S]*?# 相遇点就是交点")
new_body = """    def getIntersectionNode(self, headA, headB):
        pA, pB = headA, headB
        while pA is not pB:
            pA = pA.next if pA else headB  # 走到头就换到另一条链
            pB = pB.next if pB else headA
        return pA                          # 相遇点就是交点(可能为 None)"""
s, c1 = pat.subn(new_body, s, count=1)
print('code block replaced:', c1)
assert c1 == 1

# 2. 帧1「造链」→「读题·两条链就位」
rep("""F.push({hl: [1,2,3,4,5,6,7], tag: '造链', cls: 't-grey',
      msg: '先把结构造出来（build 是从后往前接节点的）：画面上下两行各画一条链，A 链前 <b>' + sA + '</b> 个、B 链前 <b>' + sB + '</b> 个是各自独有的前缀，' +""",
"""F.push({hl: [1,2], tag: '读题·两条链就位', cls: 't-grey',
      msg: '力扣的这道题直接给你两个<b>已建好的链表</b> headA、headB（页面用 skipA/skipB 描述它们在哪里相交，与官方题面的用例格式一致）——画面上下两行各画一条链，A 链前 <b>' + sA + '</b> 个、B 链前 <b>' + sB + '</b> 个是各自独有的前缀，' +""")

# 3. 帧2「接上尾巴」→ 不再对应代码行(hl 置空 = 代码面板不高亮)
rep("""F.push({hl: [8,9,10], tag: '接上尾巴', cls: 't-ink',
      msg: 'headA = '""",
"""F.push({hl: [], tag: '用例速览', cls: 't-ink',
      msg: 'headA = '""")

# 4. 帧3「出发」11 → 3
rep("hl: [11], tag: '出发'", "hl: [3], tag: '出发'")

# 5. while 检查 / 相遇: 12 → 4
rep("hl: [12], ok: 12, tag: 'while 检查'", "hl: [4], ok: 4, tag: 'while 检查'", 99)
rep("hl: [12], no: 12, tag: meetNode ? '相遇！' : '同时到 None'", "hl: [4], no: 4, tag: meetNode ? '相遇！' : '同时到 None'", 99)

# 6. pA/pB 移动: 13/14 → 5/6
rep("hl: [13], tag: 'pA 移动'", "hl: [5], tag: 'pA 移动'", 99)
rep("hl: [14], tag: 'pB 移动'", "hl: [6], tag: 'pB 移动'", 99)

# 7. 返回帧: 15 → 7, msg 按官方返回节点说明
rep("""hl: [15], tag: '返回', cls: 't-dark',
      msg: meetNode
        ? 'return pA.val 🎉 交点值 = <b>'""",
"""hl: [7], tag: '返回', cls: 't-dark',
      msg: meetNode
        ? '<code>return pA</code>：返回<b>交点节点本身</b>（力扣要求返回节点，页面用它的值展示）→ 交点值 = <b>'""")

# 8. 返回帧第二分支
rep("""        : 'return None：pA 是 None，两条链没有相交节点，返回空。',""",
"""        : '<code>return pA</code> = <b>None</b>：pA 是 None，两条链没有相交节点，返回空。',""")

# 9. 小测 jumpTo 同步(帧2 已删, 后续步号 -1)
rep("jumpTo:3}", "jumpTo:2}", 1)
rep("jumpTo:31}", "jumpTo:30}", 1)
rep("jumpTo:4}", "jumpTo:3}", 1)

# 10. pyCheck: false(展示代码吃链表, 页面输入是数组; JS sol 对拍覆盖正确性)
rep("""  expected: 8,
""", """  expected: 8,
  pyCheck: false,   // 展示代码为官方签名(吃链表), 页面输入是数组——正确性由 JS sol 对拍验证
""", 1)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('p022 surgery v2 OK')
