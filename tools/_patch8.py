# -*- coding: utf-8 -*-
"""原地修改题去 return: p020 / p004 / p097(展示代码与 LC 签名一致)"""
import io, re

def fix(path, ret_line_no, final_hl, page_label):
    s = io.open(path, encoding='utf-8').read()
    # 1. 展示代码删 return 行
    m = re.search(r'code: `([^\`]+)`', s)
    code = m.group(1)
    lines = code.split('\n')
    assert lines[ret_line_no - 1].strip().startswith('return'), path + ' return 行不符'
    del lines[ret_line_no - 1]
    s = s.replace(code, '\n'.join(lines), 1)
    # 2. 帧引用行号 > 删行号 的全部左移一位
    def shift(mm):
        nums = [int(x) for x in mm.group(1).split(',') if x.strip()]
        nums = [x - 1 if x > ret_line_no else x for x in nums]
        ok = mm.group(2); no = mm.group(3)
        if ok and int(ok) > ret_line_no: ok = str(int(ok) - 1)
        if no and int(no) > ret_line_no: no = str(int(no) - 1)
        return 'hl:[' + ','.join(map(str, nums)) + ']' + (', ok:' + ok if ok else '') + (', no:' + no if no else '') + ', tag:'
    s = re.sub(r"hl:\[([0-9, ]*)\](?:, ok:(\d+))?(?:, no:(\d+))?, tag:", shift, s)
    # 3. 尾帧: 返回 → 原地完成, 去结果徽章, msg 补"不返回任何值"
    s = s.replace("tag:'返回', cls:'t-dark'", "tag:'原地完成', cls:'t-dark'")
    s = s.replace("<code>return nums</code> = <b>", "原地修改完成(原题不返回任何值, nums 本身就是答案) = <b>")
    s = s.replace("result:nums.slice()", "result:null") if path.endswith('p004.html') else s
    s = s.replace("res: nums.slice()", "res: null") if path.endswith('p097.html') else s
    # p020 的 v.result(snap(), ...) 移除
    if 'p020' in path:
        s = s.replace("        v.result(snap(), {label:'旋转后的矩阵'});\n", "")
    # p004 final draw result:null → 移除该键(p004 draw 判 result != null 才画)
    if 'p004' in path:
        s = s.replace("result:null,", "")
    if 'p097' in path:
        s = s.replace("res: null,", "")
    io.open(path, 'w', encoding='utf-8', newline='\n').write(s)
    print(page_label, 'fixed')

fix('pages/p020.html', 10, [7, 8, 9], 'p020 旋转图像')
fix('pages/p004.html', 8, [4, 5, 6, 7], 'p004 移动零')
fix('pages/p097.html', 14, [13], 'p097 颜色分类')
