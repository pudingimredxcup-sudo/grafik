# Backtest verisi: Binance XAUUSDT 5 dk, Ocak-Nisan 2026 (Mayis-Kasim zaten data/ altinda)
import os, io, zipfile, gzip, urllib.request

os.makedirs('data', exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0'}


def log(s):
    print(s, flush=True)
    open('data/log2.txt', 'a').write(s + '\n')


rows = []
for m in range(1, 5):
    u = f'https://data.binance.vision/data/futures/um/monthly/klines/XAUUSDT/5m/XAUUSDT-5m-2026-{m:02d}.zip'
    try:
        z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read()))
        n = 0
        for line in z.read(z.namelist()[0]).decode().splitlines():
            a = line.split(',')
            if a[0].isdigit():
                rows.append((int(a[0]), a[1], a[2], a[3], a[4]))
                n += 1
        log(f'binance 2026-{m:02d}: {n} mum')
    except Exception as e:
        log(f'binance 2026-{m:02d} HATA: {e}')
rows = sorted(set(rows))
with gzip.open('data/binance-xauusdt-m5-ocak-nisan.csv.gz', 'wt') as f:
    f.write('timestamp,open,high,low,close\n')
    for r in rows:
        f.write(','.join(str(x) for x in r) + '\n')
log(f'kaydedildi: {len(rows)} mum')
log('bitti2')
