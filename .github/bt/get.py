import urllib.request as U, gzip, os, io, zipfile, time, datetime as dt
from concurrent.futures import ThreadPoolExecutor
os.makedirs('data/of', exist_ok=True)
LOG = open('data/log6.txt', 'a')
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'}
def get(u, tries=3):
    err = None
    for k in range(tries):
        try: return U.urlopen(U.Request(u, headers=UA), timeout=120).read()
        except Exception as e: err = e; time.sleep(3 * (k + 1))
    raise err
BASE = 'https://data.binance.vision/data/futures/um/'
DAYS = [dt.date(2026, 1, 1) + dt.timedelta(days=i) for i in range(331)]
TH = (1, 5, 25, 100)
def agg_zip(raw, M):
    z = zipfile.ZipFile(io.BytesIO(raw)); first = True
    for line in io.TextIOWrapper(z.open(z.namelist()[0]), 'utf8'):
        a = line.split(',')
        if not a[0].isdigit(): continue
        if first: log('  ornek', line.strip()); first = False
        q = float(a[2]); t = int(a[5]); sell = a[6].strip().lower() == 'true'
        k = t // 60000; m = M.get(k)
        if m is None: m = M[k] = [0, 0.0, 0.0] + [0.0] * (2 * len(TH)) + [0.0, 0.0]
        m[0] += 1; m[2 if sell else 1] += q
        for j, th in enumerate(TH):
            if q >= th: m[3 + 2 * j + (1 if sell else 0)] += q
        if sell: m[-1] = max(m[-1], q)
        else: m[-2] = max(m[-2], q)
def save_agg(name, M):
    with gzip.open('data/of/agg-' + name + '.csv.gz', 'wt') as f:
        f.write('minute,n,bv,sv,' + ','.join('b%d,s%d' % (t, t) for t in TH) + ',maxb,maxs\n')
        for k in sorted(M): f.write(str(k) + ',' + ','.join(('%d' % v) if i == 0 else ('%.3f' % v) for i, v in enumerate(M[k])) + '\n')
    log('agg', name, len(M), 'dakika')
for m in range(1, 11):
    name = '2026-%02d' % m
    if os.path.exists('data/of/agg-' + name + '.csv.gz'): continue
    try:
        raw = get(BASE + 'monthly/aggTrades/XAUUSDT/XAUUSDT-aggTrades-%s.zip' % name); log('agg indirildi', name, len(raw) // 1e6, 'MB')
        M = {}; agg_zip(raw, M); save_agg(name, M)
    except Exception as e: log('agg', name, 'hata', repr(e)[:120])
M = {}
for d in DAYS:
    if d.month != 11 or d.day > 27: continue
    try: agg_zip(get(BASE + 'daily/aggTrades/XAUUSDT/XAUUSDT-aggTrades-%s.zip' % d.isoformat()), M)
    except Exception as e: log('agg', d, 'hata', repr(e)[:100])
if M: save_agg('2026-11', M)
def depth_day(d):
    try:
        z = zipfile.ZipFile(io.BytesIO(get(BASE + 'daily/bookDepth/XAUUSDT/XAUUSDT-bookDepth-%s.zip' % d.isoformat())))
        return d, z.read(z.namelist()[0]).decode().splitlines()
    except Exception as e: log('depth', d, 'hata', repr(e)[:100]); return d, []
D = {}; shown = False; pcts = set()
with ThreadPoolExecutor(4) as ex:
    for d, rows in ex.map(depth_day, DAYS):
        for line in rows:
            a = line.split(',')
            if not a[0][:1].isdigit():
                if not shown: log('depth baslik', line); shown = True
                continue
            try:
                ts = a[0].strip()
                t = int(ts) if ts.isdigit() else int(dt.datetime.strptime(ts[:19], '%Y-%m-%d %H:%M:%S').replace(tzinfo=dt.timezone.utc).timestamp() * 1000)
                p = float(a[1]); pcts.add(p)
                if abs(p) <= 2: D[(t // 60000, p)] = (float(a[2]), float(a[3]))
            except Exception: pass
log('depth yuzdeler', sorted(pcts))
with gzip.open('data/of/depth-2026.csv.gz', 'wt') as f:
    f.write('minute,pct,depth,notional\n')
    for (k, p) in sorted(D): f.write('%d,%g,%.3f,%.1f\n' % (k, p, D[(k, p)][0], D[(k, p)][1]))
log('depth', len(D), 'satir')
def met_day(d):
    try:
        z = zipfile.ZipFile(io.BytesIO(get(BASE + 'daily/metrics/XAUUSDT/XAUUSDT-metrics-%s.zip' % d.isoformat())))
        return z.read(z.namelist()[0]).decode().splitlines()
    except Exception as e: log('metrics', d, 'hata', repr(e)[:100]); return []
with ThreadPoolExecutor(4) as ex: parts = list(ex.map(met_day, DAYS))
with gzip.open('data/of/metrics-2026.csv.gz', 'wt') as f:
    hdr = False
    for rows in parts:
        for line in rows:
            if not line[:1].isdigit():
                if not hdr: f.write(line + '\n'); hdr = True
                continue
            f.write(line + '\n')
log('metrics', sum(len(p) for p in parts), 'satir')
log('bitti')
