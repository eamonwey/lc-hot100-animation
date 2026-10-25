# -*- coding: utf-8 -*-
"""通过 GitHub REST API (api.github.com) 推送仓库——绕过被墙的 github.com git 端点。
用法: python tools/api_push.py <owner> <repo> <branch> <commit_message>
令牌: 读取 ~/.lc100_gh_token (经典 PAT, 需 repo 权限)
"""
import base64, json, os, subprocess, sys, time
import urllib.request, urllib.error

TOKEN = open(os.path.expanduser('~/.lc100_gh_token')).read().strip()
OWNER, REPO, BRANCH = sys.argv[1], sys.argv[2], sys.argv[3]
MSG = sys.argv[4] if len(sys.argv) > 4 else 'update'
BASE = 'https://api.github.com/repos/%s/%s' % (OWNER, REPO)

def api(method, path, payload=None, tries=4):
    """传输层用 curl(本机对 api.github.com 实测稳定), 避免 urllib 被重置"""
    data = json.dumps(payload).encode() if payload is not None else None
    last = None
    for t in range(tries):
        cmd = ['curl', '-s', '-w', '\n%{http_code}', '-X', method,
               '-H', 'Authorization: token ' + TOKEN,
               '-H', 'Accept: application/vnd.github+json',
               '-H', 'User-Agent: lc100-pusher']
        inp = None
        if data is not None:
            cmd += ['-H', 'Content-Type: application/json', '--data-binary', '@-']
            inp = data
        try:
            p = subprocess.run(cmd + [BASE + path], input=inp, capture_output=True, timeout=90)
        except subprocess.TimeoutExpired as e:
            last = 'timeout'
            time.sleep(2 + t * 2)
            continue
        out = p.stdout.decode('utf-8', 'replace')
        nl = out.rfind('\n')
        code = out[nl + 1:].strip()
        body = out[:nl]
        if code.startswith('2'):
            return json.loads(body) if body.strip() else {}
        if code.startswith('4') and code != '429':
            raise RuntimeError('%s %s -> %s: %s' % (method, path, code, body[:300]))
        last = 'http %s %s' % (code, body[:120])
        time.sleep(2 + t * 2)
    raise RuntimeError('%s %s failed after retries: %s' % (method, path, last))

files = [f for f in subprocess.check_output(
    ['git', '-c', 'core.quotepath=false', 'ls-files'], text=True).split('\n') if f.strip()]
print('files:', len(files))

def bootstrap():
    """空仓库不支持 git data API: 先用 contents API 提一个文件建首提交"""
    with open(files[0], 'rb') as fh:
        raw = fh.read()
    api('PUT', '/contents/' + files[0], {'message': 'init', 'content': base64.b64encode(raw).decode()})
    print('bootstrapped with', files[0])

tree_items = []
for i, f in enumerate(files):
    with open(f, 'rb') as fh:
        raw = fh.read()
    try:
        b = api('POST', '/git/blobs', {'content': base64.b64encode(raw).decode(), 'encoding': 'base64'})
    except RuntimeError as e:
        if '409' in str(e) and 'empty' in str(e).lower() and i == 0:
            bootstrap()
            b = api('POST', '/git/blobs', {'content': base64.b64encode(raw).decode(), 'encoding': 'base64'})
        else:
            raise
    tree_items.append({'path': f.replace('\\', '/'), 'mode': '100644', 'type': 'blob', 'sha': b['sha']})
    if (i + 1) % 20 == 0 or i + 1 == len(files):
        print('  blobs %d/%d' % (i + 1, len(files)))

tree = api('POST', '/git/trees', {'tree': tree_items})
print('tree:', tree['sha'][:12])
commit = api('POST', '/git/commits', {'message': MSG, 'tree': tree['sha'], 'parents': []})
print('commit:', commit['sha'][:12])
try:
    api('POST', '/git/refs', {'ref': 'refs/heads/' + BRANCH, 'sha': commit['sha']})
except RuntimeError as e:
    if '422' in str(e):  # 分支已存在 → 强制更新
        ref = api('GET', '/git/ref/heads/' + BRANCH)
        api('PATCH', '/git/refs/heads/' + BRANCH, {'sha': commit['sha'], 'force': True})
        print('ref updated (force)')
    else:
        raise
print('PUSHED_OK', commit['sha'])
