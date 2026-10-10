# -*- coding: utf-8 -*-
"""p018 修复 v2: mat 快照 / 去掉 return matrix / 收尾帧原地完成"""
import io, re
p = 'pages/p018.html'
s = io.open(p, encoding='utf-8').read()

# 1. 全部 draw 调用补上 mat 快照
n = s.count('draw({')
assert n == 15, 'draw 调用数异常: ' + str(n)
s = s.replace('draw({', 'draw({mat: snap(), ')
print('mat snapshots x' + str(n))

# 2. 去掉 return matrix(原题原地修改、不返回)
old = """        for i in range(m):               # 最后补清首列
            if fc: matrix[i][0] = 0
        return matrix
`,"""
new = """        for i in range(m):               # 最后补清首列
            if fc: matrix[i][0] = 0
        # 原地修改完成: 不返回任何值, matrix 本身就是答案
`,"""
assert old in s, 'return matrix not found'
s = s.replace(old, new)
print('return matrix removed')

# 3. 尾帧: 标签/高亮/解说/画面 改为「原地完成」
s, c1 = re.subn(r"F\.push\(\{hl:\[19\], tag:'返回', cls:'t-dark',",
                "F.push({hl:[15,16,17,18], tag:'原地完成', cls:'t-dark',", s)
s, c2 = re.subn(r"🎉 置零完成，画面上每个绿格都查得到来路",
                "🎉 原地修改完成——原题不返回任何值，矩阵本身就是答案。画面上每个绿格都查得到来路", s)
s, c3 = re.subn(r"do: draw\(\{mat: snap\(\), states:stZeros\(\), res:snap\(\)\}\)\}\);",
                "do: draw({mat: snap(), states:stZeros()})});", s)
print('tail frames:', c1, c2, c3)
assert c2 == 1 and c3 == 1 and c1 == 2, '尾帧替换不完整: ' + str((c1, c2, c3))

# 4. 空矩阵分支(同样被 c1 改了标签, 这里落地它的高亮与画面)
s, c4 = re.subn(r"hl:\[15,16,17,18\], tag:'原地完成', cls:'t-dark', msg:'空矩阵原样返回——没有 0 就没有行/列要清，结果仍是空。', do: \(v\) => \{ v\.result\(\[\], \{label:'结果'\}\); \}\}\);",
                "hl:[1,2,3], tag:'原地完成', cls:'t-dark', msg:'空矩阵：没有格子就没有 0 可查，两遍扫描循环范围都是空的，原地修改完成后 matrix 仍是空——原题不返回任何值。', do: (v) => { v.text('t', '（空矩阵，无处可清）'); }});", s)
print('empty branch:', c4)
assert c4 == 1

# 5. sol 注释
s, c5 = re.subn(r"    if\(fc\) for\(let i = 0; i < R; i\+\+\) m\[i\]\[0\] = 0;\n    return m;",
                "    if(fc) for(let i = 0; i < R; i++) m[i][0] = 0;\n    return m;   // 返回仅供自动对拍(原题原地修改、不返回)", s)
print('sol comment:', c5)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('p018 fixed v2')
