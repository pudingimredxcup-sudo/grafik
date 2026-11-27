import urllib.request as U, urllib.parse as P, re, io, zipfile, gzip, os, time, calendar
os.makedirs('data/hd', exist_ok=True)
LOG = open('data/log3.txt', 'a')
def log(*a):
    s = ' '.join(str(x) for x in a); print(s); LOG.write(s + '\n'); LOG.flush()
BASE = 'https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/'
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def fetch(pair, year, month=None):
    ref = BASE + pair + '/' + str(year) + ('/' + str(month) if month else '')
    h = U.urlopen(U.Request(ref, headers={'User-Agent': UA}), timeout=60).read().decode('utf8', 'ignore')
    m = re.search(r'<input[^>]*id="tk"[^>]*>', h)
    v = re.search(r'value="([^"]*)"', m.group(0)) if m else None
    if not v or not v.group(1): raise Exception('token yok')
    dm = str(year) + (str(month).zfill(2) if month else '')
    body = P.urlencode({'tk': v.group(1), 'date': str(year), 'datemonth': dm, 'platform': 'ASCII', 'timeframe': 'M1', 'fxpair': pair.upper()}).encode()
    rq = U.Request('https://www.histdata.com/get.php', data=body, headers={'User-Agent': UA, 'Referer': ref, 'Origin': 'https://www.histdata.com', 'Content-Type': 'application/x-www-form-urlencoded'})
    z = U.urlopen(rq, timeout=300).read()
    zf = zipfile.ZipFile(io.BytesIO(z))
    n = [x for x in zf.namelist() if x.lower().endswith('.csv')][0]
    return zf.read(n).decode()
def m5(txt):
    B = {}
    for ln in txt.splitlines():
        a = ln.strip().split(';')
        if len(a) < 5 or ' ' not in a[0]: continue
        d, t = a[0].split(' ')
        ts = calendar.timegm((int(d[:4]), int(d[4:6]), int(d[6:8]), int(t[:2]), int(t[2:4]), 0)) + 5 * 3600
        k = ts - ts % 300
        o, hi, lo, c = map(float, a[1:5])
        b = B.get(k)
        if b is None: B[k] = [o, hi, lo, c]
        else:
            if hi > b[1]: b[1] = hi
            if lo < b[2]: b[2] = lo
            b[3] = c
    return B
def save(name, B):
    with gzip.open('data/hd/' + name + '.csv.gz', 'wt') as f:
        f.write('timestamp,open,high,low,close\n')
        for k in sorted(B):
            b = B[k]; f.write('%d,%.3f,%.3f,%.3f,%.3f\n' % (k * 1000, b[0], b[1], b[2], b[3]))
JOBS = []
for pair, y0 in (('xauusd', 2009), ('nsxusd', 2010)):
    for y in range(y0, 2026): JOBS.append((pair, y, None))
    for mo in range(1, 12): JOBS.append((pair, 2026, mo))
for pair, y, mo in JOBS:
    name = pair + '-' + str(y) + ('-' + str(mo).zfill(2) if mo else '')
    if os.path.exists('data/hd/' + name + '.csv.gz'): continue
    for k in range(3):
        try:
            B = m5(fetch(pair, y, mo)); save(name, B); log(name, 'ok', len(B)); break
        except Exception as e:
            log(name, 'hata', k, repr(e)[:200]); time.sleep(5 * (k + 1))
    time.sleep(1)
log('bitti')
