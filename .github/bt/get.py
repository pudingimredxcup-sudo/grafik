import urllib.request as U, lzma, struct, gzip, os, json, io, zipfile, time, datetime as dt
from concurrent.futures import ThreadPoolExecutor
os.makedirs('data/tail', exist_ok=True)
LOG = open('data/log4.txt', 'a')
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'}
def get(u, tries=4, to=30):
    err = None
    for k in range(tries):
        try: return U.urlopen(U.Request(u, headers=UA), timeout=to).read()
        except Exception as e: err = e; time.sleep(2 * (k + 1))
    raise err
def m5(rows):
    B = {}
    for t, o, h, l, c in sorted(rows):
        k = t - t % 300000; b = B.get(k)
        if b is None: B[k] = [o, h, l, c]
        else: b[1] = max(b[1], h); b[2] = min(b[2], l); b[3] = c
    return B
def save(name, B):
    with gzip.open('data/tail/' + name + '.csv.gz', 'wt') as f:
        f.write('timestamp,open,high,low,close\n')
        for k in sorted(B): f.write('%d,%.3f,%.3f,%.3f,%.3f\n' % (k, *B[k]))
    log(name, len(B), 'bar')
DAYS = [dt.date(2026, 11, 9) + dt.timedelta(days=i) for i in range(18)]
def duka_day(inst, d):
    u = 'https://datafeed.dukascopy.com/datafeed/%s/%d/%02d/%02d/BID_candles_min_1.bi5' % (inst, d.year, d.month - 1, d.day)
    try: raw = get(u)
    except Exception as e: log(inst, d, 'hata', repr(e)[:120]); return []
    if not raw: return []
    b = lzma.decompress(raw); base = int(dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc).timestamp())
    out = []
    for i in range(0, len(b) // 24 * 24, 24):
        t, o, c, l, h, v = struct.unpack('>IIIIIf', b[i:i + 24])
        if v > 0: out.append(((base + t) * 1000, o / 1000, h / 1000, l / 1000, c / 1000))
    return out
for inst in ('XAUUSD', 'USATECHIDXUSD'):
    with ThreadPoolExecutor(6) as ex: parts = list(ex.map(lambda d: duka_day(inst, d), DAYS))
    save('duka-' + inst.lower(), m5([r for p in parts for r in p]))
for sym, nm in (('NQ=F', 'nq'), ('GC=F', 'gc')):
    try:
        j = json.loads(get('https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=5m&range=60d' % sym))['chart']['result'][0]
        q = j['indicators']['quote'][0]; rows = []
        for i, t in enumerate(j['timestamp']):
            if None in (q['open'][i], q['high'][i], q['low'][i], q['close'][i]): continue
            rows.append((t * 1000, q['open'][i], q['high'][i], q['low'][i], q['close'][i]))
        save('yahoo-' + nm, m5(rows))
    except Exception as e: log(sym, 'hata', repr(e)[:150])
rows = []
for d in DAYS:
    u = 'https://data.binance.vision/data/futures/um/daily/klines/XAUUSDT/5m/XAUUSDT-5m-%s.zip' % d.isoformat()
    try:
        z = zipfile.ZipFile(io.BytesIO(get(u, tries=2)))
        for line in z.read(z.namelist()[0]).decode().splitlines():
            a = line.split(',')
            if a[0].isdigit(): rows.append((int(a[0]), float(a[1]), float(a[2]), float(a[3]), float(a[4])))
    except Exception as e: log('binance', d, 'hata', repr(e)[:100])
save('binance-xauusdt', m5(rows))
log('bitti')
