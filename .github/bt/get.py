# Backtest verisi indirici (GitHub Actions'ta calisir). Birden fazla acik kaynak dener, ne gelirse data/ altina yazar.
import os, json, time, lzma, struct, io, zipfile, gzip, datetime as dt, urllib.request

os.makedirs('data', exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'}
LOG = []
D0, D1 = dt.date(2026, 5, 1), dt.date(2026, 11, 24)


def get(u, data=None, h=None):
    r = urllib.request.Request(u, data=data, headers={**UA, **(h or {})})
    return urllib.request.urlopen(r, timeout=60).read()


def log(s):
    print(s, flush=True)
    LOG.append(s)


def days():
    d = D0
    while d <= D1:
        yield d
        d += dt.timedelta(days=1)


def save(name, rows):
    with gzip.open('data/' + name, 'wt') as f:
        f.write('timestamp,open,high,low,close\n')
        for r in rows:
            f.write(','.join(str(x) for x in r) + '\n')
    log(f'kaydedildi {name}: {len(rows)} satir')


# 1) Dukascopy eski datafeed (bi5, 1 dk mumlar). Ham tamsayi fiyat yazilir, olcek sonra ayarlanir.
def duka(sym):
    test = f'https://datafeed.dukascopy.com/datafeed/{sym}/2026/04/12/BID_candles_min_1.bi5'
    try:
        b = get(test)
        log(f'duka test ok {sym} {len(b)} bayt')
    except Exception as e:
        log(f'duka test HATA {sym}: {e}')
        return
    rows, bad = [], 0
    for d in days():
        if d.weekday() == 5:
            continue
        u = f'https://datafeed.dukascopy.com/datafeed/{sym}/{d.year}/{d.month - 1:02d}/{d.day:02d}/BID_candles_min_1.bi5'
        b = None
        for k in range(4):
            try:
                b = get(u)
                break
            except Exception as e:
                if k == 3:
                    bad += 1
                time.sleep(1 + k)
        if not b:
            continue
        raw = lzma.decompress(b)
        base = int(dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc).timestamp())
        for i in range(0, len(raw) - 23, 24):
            t, o, c, l, h, v = struct.unpack('>5if', raw[i:i + 24])
            if v > 0:
                rows.append(((base + t) * 1000, o, h, l, c))
        time.sleep(0.15)
    log(f'duka {sym}: {len(rows)} dk mum, {bad} gun indirilemedi')
    if rows:
        save(f'duka-{sym.lower()}-m1raw.csv.gz', rows)


# 2) Yahoo Finance vadeli (5 dk, son 60 gun)
def yahoo(sym, name):
    try:
        j = json.loads(get(f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=5m&range=60d'))
        r = j['chart']['result'][0]
        q = r['indicators']['quote'][0]
        rows = [(t * 1000, o, h, l, c) for t, o, h, l, c in zip(r['timestamp'], q['open'], q['high'], q['low'], q['close']) if None not in (o, h, l, c)]
        save(f'yahoo-{name}-m5.csv.gz', rows)
    except Exception as e:
        log(f'yahoo HATA {sym}: {e}')


# 3) Binance vadeli XAUUSDT (5 dk, aylik + gunluk zip)
def binance():
    rows = []
    def add(u):
        try:
            z = zipfile.ZipFile(io.BytesIO(get(u)))
            for line in z.read(z.namelist()[0]).decode().splitlines():
                a = line.split(',')
                if a[0].isdigit():
                    rows.append((int(a[0]), float(a[1]), float(a[2]), float(a[3]), float(a[4])))
            return True
        except Exception as e:
            log(f'binance yok {u.rsplit("/", 1)[-1]}: {e}')
            return False
    for m in range(5, 11):
        add(f'https://data.binance.vision/data/futures/um/monthly/klines/XAUUSDT/5m/XAUUSDT-5m-2026-{m:02d}.zip')
    for d in days():
        if d.month == 11:
            add(f'https://data.binance.vision/data/futures/um/daily/klines/XAUUSDT/5m/XAUUSDT-5m-{d.isoformat()}.zip')
    rows = sorted(set(rows))
    if rows:
        save('binance-xauusdt-m5.csv.gz', rows)


# 4) Hyperliquid (uygulamanin kullandigi kaynak; en fazla son ~5000 mum)
def hyper(coin, name):
    try:
        a = int(dt.datetime(2026, 5, 1, tzinfo=dt.timezone.utc).timestamp() * 1000)
        body = json.dumps({'type': 'candleSnapshot', 'req': {'coin': coin, 'interval': '5m', 'startTime': a, 'endTime': int(time.time() * 1000)}}).encode()
        j = json.loads(get('https://api.hyperliquid.xyz/info', body, {'Content-Type': 'application/json'}))
        rows = [(int(c['t']), float(c['o']), float(c['h']), float(c['l']), float(c['c'])) for c in j]
        save(f'hl-{name}-m5.csv.gz', rows)
    except Exception as e:
        log(f'hyperliquid HATA {coin}: {e}')


duka('XAUUSD')
duka('USATECHIDXUSD')
yahoo('NQ%3DF', 'nq')
yahoo('GC%3DF', 'gc')
binance()
hyper('xyz:XYZ100', 'us100')
hyper('xyz:GOLD', 'gold')
open('data/log.txt', 'w').write('\n'.join(LOG) + '\n')
