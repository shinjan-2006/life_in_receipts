"""
Turns the three raw exports into compact JSON the front-end can load.
No server is involved at runtime: everything below is a build-time step.
  archive.zip     -> spotify_history.csv                      (songs)
  archive (1).zip -> Daily Household Transactions.csv         (hand-kept ledger)
  archive (2).zip -> Augmented_IndiaTransactMultiFacet2024    (card swipes)
"""
import pandas as pd, numpy as np, json, re, base64, collections, sys, os
RAW = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/data'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/site/src/data'
os.makedirs(OUT, exist_ok=True)
BASE = pd.Timestamp('2013-01-01')

def b64(a): return base64.b64encode(a.tobytes()).decode('ascii')
def dayidx(series): return ((series.dt.normalize() - BASE).dt.days).astype(int)

# ------------------------------------------------------------------ SONGS
s = pd.read_csv(f'{RAW}/a/spotify_history.csv', encoding='utf-8-sig')
n_raw_s = len(s)
s['ts'] = pd.to_datetime(s['ts'])
s = s.drop_duplicates().sort_values('ts', kind='stable').reset_index(drop=True)
n_dup_s = n_raw_s - len(s)
s['reason_end'] = s.reason_end.fillna('unknown')
s['day'] = dayidx(s.ts)
s['min'] = ((s.ts - BASE).dt.total_seconds() // 60).astype(np.uint32)

artists = sorted(s.artist_name.unique()); a_ix = {a: i for i, a in enumerate(artists)}
albums = sorted(s.album_name.fillna('').unique()); al_ix = {a: i for i, a in enumerate(albums)}
uris = s.drop_duplicates('spotify_track_uri')[['spotify_track_uri','track_name','artist_name','album_name']]
t_ix = {u: i for i, u in enumerate(uris.spotify_track_uri)}
tracks = [[r.track_name, a_ix[r.artist_name], al_ix[r.album_name if isinstance(r.album_name, str) else '']] for r in uris.itertuples()]
PLAT = ['android', 'iOS', 'windows', 'mac', 'web player', 'cast to device']
REAS = ['trackdone','fwdbtn','endplay','logout','backbtn','unexpected-exit-while-paused','unknown','remote','unexpected-exit','clickrow','nextbtn','appload','popup','reload','trackerror']
s['tr'] = s.spotify_track_uri.map(t_ix).astype(np.uint16)
s['sec'] = np.minimum(s.ms_played // 1000, 65535).astype(np.uint16)
s['flag'] = (s.platform.map({p: i for i, p in enumerate(PLAT)}).astype(int)
             | (s.shuffle.astype(int) * 8)
             | (s.reason_end.map(lambda r: REAS.index(r) if r in REAS else 6).astype(int) * 16)).astype(np.uint8)
spotify = dict(base='2013-01-01', artists=artists, albums=albums, tracks=tracks, plat=PLAT, reasons=REAS, n=len(s),
               t=b64(s['min'].values.astype('<u4')), tr=b64(s.tr.values.astype('<u2')),
               sec=b64(s.sec.values.astype('<u2')), f=b64(s.flag.values.astype('u1')))
json.dump(spotify, open(f'{OUT}/spotify.json', 'w'), separators=(',', ':'))

# ------------------------------------------------------------------ LEDGER
h = pd.read_csv(f'{RAW}/b/Daily Household Transactions.csv', encoding='utf-8-sig')
n_raw_h = len(h)
h['dt'] = pd.to_datetime(h.Date, dayfirst=True, format='mixed')
h['hastime'] = h.Date.str.contains(':')
h['day'] = dayidx(h.dt)
h['m'] = np.where(h.hastime, h.dt.dt.hour * 60 + h.dt.dt.minute, -1)
h = h.sort_values(['dt'], kind='stable').reset_index(drop=True)
h['Subcategory'] = h.Subcategory.fillna('')
h['Note'] = h.Note.fillna('').str.strip()
modes = sorted(h.Mode.unique()); cats = sorted(h.Category.unique()); subs = sorted(h.Subcategory.unique())
typ = {'Expense': 0, 'Income': 1, 'Transfer-Out': 2}
ledger = dict(modes=modes, cats=cats, subs=subs, rows=[
    [int(r.day), int(r.m), modes.index(r.Mode), cats.index(r.Category), subs.index(r.Subcategory), r.Note, float(r.Amount), typ[r._7]]
    for r in h.rename(columns={'Income/Expense': '_7'}).itertuples()])
json.dump(ledger, open(f'{OUT}/ledger.json', 'w'), separators=(',', ':'), ensure_ascii=False)

# ------------------------------------------------------------------ CARDS
c = pd.read_csv(f'{RAW}/c/Augmented_IndiaTransactMultiFacet2024.csv')
n_raw_c = len(c)
c = c.drop_duplicates().reset_index(drop=True)
n_dup_c = n_raw_c - len(c)
c['dt'] = pd.to_datetime(c.trans_date_trans_time, errors='coerce', format='mixed')
c['merchant'] = c.merchant.str.replace(r'^fraud_', '', regex=True).str.replace(r'\s+Pvt Ltd$', '', regex=True)
c['day'] = np.where(c.dt.notna(), dayidx(c.dt.fillna(BASE)), -1)
c['m'] = np.where(c.dt.notna(), c.dt.dt.hour.fillna(0) * 60 + c.dt.dt.minute.fillna(0), -1).astype(int)
c = c.sort_values(['day', 'm'], kind='stable')
c = pd.concat([c[c.day >= 0], c[c.day < 0]]).reset_index(drop=True)
cmer = sorted(c.merchant.dropna().unique()); ccat = sorted(c.category.dropna().unique())
cards = dict(merchants=cmer, cats=ccat, rows=[
    [int(r.day), int(r.m), (cmer.index(r.merchant) if isinstance(r.merchant, str) else -1),
     (ccat.index(r.category) if isinstance(r.category, str) else -1),
     (round(float(r.amt), 2) if pd.notna(r.amt) else -1),
     (int(r.is_fraud) if pd.notna(r.is_fraud) else -1),
     (int(r.trans_id) if pd.notna(r.trans_id) else 0)] for r in c.itertuples()])
json.dump(cards, open(f'{OUT}/cards.json', 'w'), separators=(',', ':'), ensure_ascii=False)

# ================================================================== FACTS
F = {}
def d2s(d): return (BASE + pd.Timedelta(days=int(d))).strftime('%Y-%m-%d')
F['notes'] = dict(songs_raw=n_raw_s, songs_dupes=n_dup_s, songs=len(s), ledger=len(h), cards_raw=n_raw_c, cards_dupes=n_dup_c, cards=len(c),
                  cards_undated=int((c.day < 0).sum()), cards_no_cat=int(c.category.isna().sum()), cards_no_amt=int(c.amt.isna().sum()),
                  cards_flagged=int((c.is_fraud == 1).sum()), cards_flag_known=int(c.is_fraud.notna().sum()))
F['totals'] = dict(songs=len(s), hours=round(s.ms_played.sum() / 3.6e6, 1), tracks=len(tracks), artists=len(artists),
                   ledger=len(h), cards=len(c))
first = s.iloc[0]; last = s.iloc[-1]
F['first_song'] = dict(ts=str(first.ts), name=first.track_name, artist=first.artist_name, plat=first.platform, ms=int(first.ms_played), reason=first.reason_start)
F['last_song'] = dict(ts=str(last.ts), name=last.track_name, artist=last.artist_name)
hh = h.sort_values('dt'); F['first_ledger'] = dict(d=d2s(hh.iloc[0].day), note=hh.iloc[0].Note, amt=float(hh.iloc[0].Amount))
F['last_ledger'] = dict(d=str(hh.iloc[-1]['dt']), sub=hh.iloc[-1].Subcategory, note=hh.iloc[-1].Note, amt=float(hh.iloc[-1].Amount))

# ---- monthly lanes
months = pd.period_range('2013-07', '2024-12', freq='M')
def mser(df, col, agg='size', val=None):
    g = df.groupby(df[col].dt.to_period('M'))
    x = g.size() if agg == 'size' else g[val].sum()
    return [float(x.get(m, 0)) for m in months]
s['dtu'] = s.ts
INV = ['Investment','Recurring Deposit','Public Provident Fund','Life Insurance','Share Market','Fixed Deposit','Small Cap fund 2','Small cap fund 1']
inv_mask = h.Category.isin(INV) | h.Category.str.startswith('Equity Mutual Fund')
hexp = h[h['Income/Expense'] == 'Expense']
hinc = h[h['Income/Expense'] == 'Income']
cd = c[c.day >= 0].copy(); cd['dtx'] = c.dt[c.day >= 0]
F['months'] = [str(m) for m in months]
F['monthly'] = dict(
    plays=mser(s, 'dtu'),
    hours=[round(v / 3.6e6, 1) for v in mser(s, 'dtu', 'sum', 'ms_played')],
    ledger=mser(h, 'dt'),
    expense=mser(hexp, 'dt', 'sum', 'Amount'),
    income=mser(hinc, 'dt', 'sum', 'Amount'),
    invest=mser(h[inv_mask], 'dt', 'sum', 'Amount'),
    cards=mser(cd, 'dtx'))

# ---- yearly
yr = []
first_seen = s.groupby('spotify_track_uri').ts.transform('min'); s['isnew'] = s.ts == first_seen
s['y'] = s.ts.dt.year
for y in range(2013, 2025):
    x = s[s.y == y]
    top = x.artist_name.value_counts().head(8)
    yr.append(dict(y=y, plays=len(x), hours=round(x.ms_played.sum() / 3.6e6, 1), uniq=int(x.spotify_track_uri.nunique()),
                   newshare=round(float(x.isnew.mean()), 3), fwd=round(float((x.reason_end == 'fwdbtn').mean()), 3),
                   done=round(float((x.reason_end == 'trackdone').mean()), 3), shuffle=round(float(x.shuffle.mean()), 3),
                   top=[[a, int(n)] for a, n in top.items()],
                   plat={k: int(v) for k, v in x.platform.value_counts().items()}))
F['yearly'] = yr

# ---- bump data (top 7 by year 2016-2024)
years = list(range(2016, 2025)); bump = {}
for y in years:
    x = s[s.y == y].artist_name.value_counts().head(7)
    for r, (a, n) in enumerate(x.items()):
        bump.setdefault(a, {})[y] = [r + 1, int(n)]
F['bump'] = dict(years=years, artists=bump,
                 order=sorted(bump, key=lambda a: -sum(v[1] for v in bump[a].values())))
# artist arrival & totals
art = s.groupby('artist_name').agg(n=('ts', 'size'), first=('ts', 'min'), last=('ts', 'max'), hrs=('ms_played', lambda x: x.sum() / 3.6e6))
F['top_artists'] = [dict(a=a, n=int(r.n), first=str(r['first'])[:10], last=str(r['last'])[:10], hrs=round(r.hrs)) for a, r in art.sort_values('n', ascending=False).head(12).iterrows()]

# ---- comfort songs / loops / busiest days
g = s.groupby('spotify_track_uri').agg(n=('ts', 'size'), yrs=('y', 'nunique'), name=('track_name', 'first'), art=('artist_name', 'first'), f=('ts', 'min'), l=('ts', 'max'))
comf = g[g.yrs >= 8].sort_values('n', ascending=False).head(8)
F['comfort'] = [dict(name=r['name'], artist=r.art, n=int(r.n), yrs=int(r.yrs), first=str(r.f)[:10], last=str(r.l)[:10]) for _, r in comf.iterrows()]
lp = s.groupby(['day', 'spotify_track_uri']).size().rename('c').reset_index().sort_values('c', ascending=False).head(6)
lp = lp.merge(g[['name', 'art']], left_on='spotify_track_uri', right_index=True)
F['loops'] = [dict(day=int(r.day), name=r['name'], artist=r.art, n=int(r.c)) for _, r in lp.iterrows()]
bd = s.groupby('day').agg(n=('ts', 'size'), hrs=('ms_played', lambda x: x.sum() / 3.6e6), med=('ms_played', 'median'))
F['busiest'] = [dict(day=int(d), n=int(r.n), hrs=round(r.hrs, 1), med=int(r.med)) for d, r in bd.sort_values('n', ascending=False).head(5).iterrows()]
F['longest'] = [dict(day=int(d), n=int(r.n), hrs=round(r.hrs, 1)) for d, r in bd.sort_values('hrs', ascending=False).head(5).iterrows()]

# ---- 24h clocks
s['hr'] = s.ts.dt.hour
F['clock'] = dict(
    songs=[int(v) for v in s.groupby('hr').size().reindex(range(24), fill_value=0)],
    ledger=[int(v) for v in h[h.hastime].groupby(h.dt.dt.hour).size().reindex(range(24), fill_value=0)],
    cards=[int(v) for v in cd.groupby(cd.dtx.dt.hour).size().reindex(range(24), fill_value=0)])
# flatness of card clock vs songs: coefficient of variation
cc = np.array(F['clock']['cards']); ss = np.array(F['clock']['songs']); ll = np.array(F['clock']['ledger'])
F['clock_cv'] = dict(songs=round(float(ss.std() / ss.mean()), 2), ledger=round(float(ll.std() / ll.mean()), 2), cards=round(float(cc.std() / cc.mean()), 2))

# ---- rituals (ledger)
def ritual(label, mask, note=''):
    days = sorted(set(h[mask].day.tolist()))
    if len(days) < 6: return None
    gaps = np.diff(days); med = float(np.median(gaps))
    return dict(label=label, note=note, n=int(mask.sum()), days=[int(d) for d in days], gap=med,
                first=d2s(days[0]), last=d2s(days[-1]))
R = [
 ritual('Milk', h.Subcategory == 'Milk'),
 ritual('Auto rides', h.Subcategory.str.lower() == 'auto'),
 ritual('Mobile recharge', h.Subcategory == 'Mobile Service Provider'),
 ritual('Salary credited', h.Category == 'Salary'),
 ritual('₹10,000 transfer', (h.Category == 'Money transfer') & (h.Amount == 10000)),
 ritual('Public Provident Fund', h.Category == 'Public Provident Fund'),
 ritual('Mutual fund instalments', h.Subcategory == 'Mutual fund'),
 ritual('Recurring deposit', (h.Category == 'Recurring Deposit') | (h.Subcategory == 'RD')),
 ritual('Tata Sky', h.Subcategory == 'Tata Sky'),
 ritual('Flour mill', h.Subcategory == 'flour mill'),
 ritual('Netflix', h.Subcategory == 'Netflix'),
]
F['rituals'] = [r for r in R if r]

# ---- routes
def norm(x):
    x = x.strip(); x = re.sub(r'^\s*(\d+\s*(CC)?\s+)', '', x)
    x = re.sub(r'(?i)^(ola cab|uber auto|uber|ola)\s*[-:]\s*', '', x)
    x = re.sub(r'(?i)\s*(returns?)\s*$', '', x); x = re.sub(r'\s*:.*$', '', x)
    x = re.sub(r'(?i)\bstation\b|\bstand\b|\bbus stop.*$', '', x).strip()
    x = re.sub(r'(?i)\s*-\s*.*(travels)$', '', x)
    if re.fullmatch(r'(?i)current residence.*', x): return 'Current Residence'
    if re.fullmatch(r'(?i)permanent residence.*', x): return 'Permanent Residence'
    m = re.fullmatch(r'(?i)place\s*([0-9A-Za-z]+)', x)
    if m: return 'Place ' + m.group(1).upper()
    return x.strip().title()
E = collections.Counter(); NW = collections.Counter(); spend = collections.Counter()
for r in h[h.Category == 'Transportation'].itertuples():
    m = re.match(r'^(.*?)\s+to\s+(.*)$', r.Note or '', flags=re.I)
    if not m: continue
    a, b = norm(m.group(1)), norm(m.group(2))
    if not a or not b or a == b: continue
    k = tuple(sorted((a, b))); E[k] += 1; NW[a] += 1; NW[b] += 1; spend[k] += r.Amount
keep = {n for n, v in NW.items() if v >= 4}
F['routes'] = dict(nodes=[dict(id=n, n=int(NW[n])) for n in sorted(keep, key=lambda n: -NW[n])],
                   edges=[dict(a=a, b=b, n=int(v), spend=float(spend[(a, b)])) for (a, b), v in E.most_common() if a in keep and b in keep])
F['routes']['total_trips'] = int(sum(E.values()))
F['transport_modes'] = {k: int(v) for k, v in h[h.Category == 'Transportation'].Subcategory.str.lower().value_counts().head(6).items()}

# ---- lifts: does the ledger change how much music was played that day?
lo, hi = pd.Timestamp('2016-06-01'), pd.Timestamp('2018-09-20')
days = pd.date_range(lo, hi)
sd = s[(s.ts >= lo) & (s.ts <= hi + pd.Timedelta(days=1))].groupby(s.ts.dt.normalize()).size().reindex(days, fill_value=0).astype(float)
mm = sd.groupby(sd.index.to_period('M')).transform('mean'); rel = sd / mm
relmap = {int((d - BASE).days): float(v) for d, v in rel.items()}
rng = np.random.default_rng(7)
def lift(mask):
    ld = set(h[mask].dt.dt.normalize()) & set(days)
    if len(ld) < 10: return None
    a = rel[rel.index.isin(ld)].values; b = rel[~rel.index.isin(ld)].values
    bs = np.array([rng.choice(a, len(a)).mean() for _ in range(800)])
    return dict(n=len(ld), ratio=float(a.mean() / b.mean()), lo=float(np.percentile(bs, 5) / b.mean()), hi=float(np.percentile(bs, 95) / b.mean()),
                days=sorted(int((d - BASE).days) for d in ld))
groups = []
for sub, cnt in h[h.Subcategory != ''].Subcategory.value_counts().items():
    if cnt >= 10:
        cat = h[h.Subcategory == sub].Category.mode().iloc[0]
        r = lift(h.Subcategory == sub)
        if r: groups.append(dict(kind='sub', key=sub, label=sub[0].upper() + sub[1:], cat=cat, **r))
for cat, cnt in h.Category.value_counts().items():
    if cnt >= 10 and cat not in ('Food', 'Transportation'):
        r = lift(h.Category == cat)
        if r: groups.append(dict(kind='cat', key=cat, label=cat[0].upper() + cat[1:], cat=cat, **r))
sig = [g_ for g_ in groups if g_['hi'] < 1 or g_['lo'] > 1]
F['lifts'] = dict(tested=len(groups), window=[d2s((lo - BASE).days), d2s((hi - BASE).days)], groups=sorted(sig, key=lambda g_: g_['ratio']), rel=relmap)

# ---- monthly link between ledger + music (and cards + music)
from scipy import stats
idx = pd.period_range('2016-06', '2018-08', freq='M')
pm = pd.Series(F['monthly']['plays'], index=months); lm = pd.Series(F['monthly']['ledger'], index=months)
r1 = stats.spearmanr(pm.reindex(idx), lm.reindex(idx))
idx2 = pd.period_range('2022-05', '2024-03', freq='M')
cm = pd.Series(F['monthly']['cards'], index=months)
r2 = stats.spearmanr(pm.reindex(idx2), cm.reindex(idx2))
F['monthly_corr'] = dict(ledger=dict(rho=round(float(r1.statistic), 2), p=round(float(r1.pvalue), 3), months=len(idx)),
                         cards=dict(rho=round(float(r2.statistic), 2), p=round(float(r2.pvalue), 3), months=len(idx2)))

# ---- subscriptions + key ledger events
subs_ev = []
for sub in ['Audible', 'Kindle unlimited', 'Netflix', 'Hotstar', 'Amazon Prime', 'Tata Sky', 'Edtech Course']:
    x = h[h.Subcategory == sub]
    subs_ev.append(dict(label=sub, n=len(x), first=d2s(x.day.min()), last=d2s(x.day.max()), days=[int(d) for d in sorted(x.day.unique())], amt=float(x.Amount.median())))
F['subs'] = subs_ev
rd = h[(h.Note.str.contains('audible|kindle', case=False) | h.Subcategory.isin(['Audible','Kindle unlimited'])) & (h.Amount < 1000)].sort_values('dt')
F['reading'] = [dict(d=int(r.day), kind=('Audible' if 'audible' in (r.Note+r.Subcategory).lower() else 'Kindle Unlimited'), amt=float(r.Amount)) for r in rd.itertuples()]
w0, w1 = pd.Timestamp('2015-11-01'), pd.Timestamp('2016-05-31')
F['book_winter'] = dict(start=d2s((w0 - BASE).days), end=d2s((w1 - BASE).days),
                        plays=int(((s.ts >= '2016-01-01') & (s.ts < '2016-06-01')).sum()),
                        prev=int(((s.ts >= '2015-08-01') & (s.ts < '2015-11-01')).sum()),
                        comeback=str(s[s.ts >= '2016-06-01'].iloc[0].ts), comeback_track=s[s.ts >= '2016-06-01'].iloc[0].track_name)
F['book_winter']['plays_dates'] = [str(t) for t in s[(s.ts >= '2016-01-01') & (s.ts < '2016-06-01')].ts]
wg = h[h.Note.str.contains('wedding gift', case=False)]
F['wedding_gift'] = dict(d=d2s(wg.day.iloc[0]), amt=float(wg.Amount.iloc[0])) if len(wg) else None

# ---- salary / investing
sal = h[h.Category == 'Salary'].sort_values('dt')
F['salary'] = dict(first=float(sal.iloc[0].Amount), last=float(sal.iloc[-1].Amount), series=[[int(r.day), float(r.Amount)] for r in sal.itertuples()])
inv = h[inv_mask]
F['invest'] = dict(by_year={int(y): float(v) for y, v in inv.groupby(inv.dt.dt.year).Amount.sum().items()},
                   biggest=[dict(d=d2s(r.day), cat=r.Category, note=r.Note, amt=float(r.Amount)) for r in inv.sort_values('Amount', ascending=False).head(4).itertuples()])
F['ledger_median'] = float(hexp.Amount.median()); F['ledger_under50'] = round(float((hexp.Amount < 50).mean()), 3)
F['card_median'] = float(c.amt.median()); F['card_mean'] = float(c.amt.mean()); F['card_min'] = float(c.amt.min()); F['card_max'] = float(c.amt.max())
F['card_cats'] = {k: int(v) for k, v in c.category.value_counts(dropna=False).rename(index={np.nan: 'unlabelled'}).items()}

# ---- chapters (stat blocks; copy lives in the UI)
def chap(a, b):
    A, B = pd.Timestamp(a), pd.Timestamp(b)
    x = s[(s.ts >= A) & (s.ts < B)]
    lg = h[(h.dt >= A) & (h.dt < B)]; cx = cd[(cd.dtx >= A) & (cd.dtx < B)]
    return dict(a=a, b=b, ad=int((A - BASE).days), bd=int((B - BASE).days), plays=len(x), hours=round(x.ms_played.sum() / 3.6e6),
                top=[[k, int(v)] for k, v in x.artist_name.value_counts().head(4).items()],
                ledger=len(lg), cards=len(cx), fwd=round(float((x.reason_end == 'fwdbtn').mean()), 2) if len(x) else 0,
                uniq=int(x.spotify_track_uri.nunique()))
F['chapters'] = [chap('2013-07-01', '2015-11-01'), chap('2015-11-01', '2016-06-01'), chap('2016-06-01', '2017-01-01'),
                 chap('2017-01-01', '2018-01-01'), chap('2018-01-01', '2018-09-21'), chap('2018-09-21', '2022-04-01'), chap('2022-04-01', '2025-01-01')]

# ---- notable days
notable = [
 (F['first_song']['ts'][:10], 'The first receipt', 'song'),
 (F['first_ledger']['d'], 'The ledger opens', 'ledger'),
 (F['wedding_gift']['d'] if F['wedding_gift'] else '2016-01-13', 'A wedding gift arrives', 'ledger'),
 (F['book_winter']['comeback'][:10], 'The music comes back', 'song'),
 ('2016-07-18', 'The Beatles arrive', 'song'),
 (d2s(F['busiest'][0]['day']), 'The busiest day', 'song'),
 ('2017-12-26', 'The biggest deposit', 'ledger'),
 (F['last_ledger']['d'][:10], 'The last ledger line', 'ledger'),
 (d2s(F['longest'][0]['day']), 'The longest listening day', 'song'),
 (F['last_song']['ts'][:10], 'The last song', 'song'),
]
bigc = cd.sort_values('amt', ascending=False).iloc[0]
notable.insert(-2, (d2s(int(bigc.day)), 'The largest card swipe', 'card'))
F['notable'] = [dict(d=(pd.Timestamp(d) - BASE).days, label=l, kind=k) for d, l, k in notable]

F['plat'] = PLAT; F['reasons'] = REAS
json.dump(F, open(f'{OUT}/facts.json', 'w'), separators=(',', ':'), ensure_ascii=False)
print({k: os.path.getsize(f'{OUT}/{k}.json') // 1024 for k in ['spotify', 'ledger', 'cards', 'facts']}, 'KB')
