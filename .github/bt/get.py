import urllib.request as U, gzip, os, io, zipfile, time, datetime as dt
os.makedirs('data/bn1m', exist_ok=True)
LOG = open('data/log5.txt', 'a')
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.write(s + '\n'); LOG.flush()
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'}
def get(u, tries=3):
    err = None
    for k in range(tries):
        try: return U.urlopen(U.Request(u, headers=UA), timeout=60).read()
        except Exception as e: err = e; time.sleep(3 * (k + 1))
    raise err
BASE = 'https://data.binance.vision/data/futures/um/'
def rows_from(u):
    z = zipfile.ZipFile(io.BytesIO(get(u)))
    out = []
    for line in z.read(z.namelist()[0]).decode().splitlines():
        a = line.split(',')
        if a[0].isdigit(): out.append((int(a[0]), a[1], a[2], a[3], a[4], a[5], a[9]))
    return out
for y in (2025, 2026):
    rows = []
    for m in range(1, 13):
        if y == 2026 and m == 11: break
        u = BASE + 'monthly/klines/XAUUSDT/1m/XAUUSDT-1m-%d-%02d.zip' % (y, m)
        try: r = rows_from(u); rows += r; log(y, m, 'ok', len(r))
        except Exception as e: log(y, m, 'hata', repr(e)[:100])
    if y == 2026:
        for d in range(1, 28):
            u = BASE + 'daily/klines/XAUUSDT/1m/XAUUSDT-1m-2026-11-%02d.zip' % d
            try: r = rows_from(u); rows += r; log('2026-11', d, 'ok', len(r))
            except Exception as e: log('2026-11', d, 'hata', repr(e)[:100])
    if rows:
        rows = sorted(set(rows))
        with gzip.open('data/bn1m/xauusdt-1m-%d.csv.gz' % y, 'wt') as f:
            f.write('timestamp,open,high,low,close,volume,takerbuy\n')
            for r in rows: f.write(','.join(str(x) for x in r) + '\n')
        log(y, 'kaydedildi', len(rows))
log('bitti')
