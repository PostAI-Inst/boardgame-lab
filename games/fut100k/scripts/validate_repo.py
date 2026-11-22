#!/usr/bin/env python3
"""No-network, stdlib-only validation of the FUT100K 1.2 print-and-play repo."""
import collections, json, sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def js(name):return json.loads((root/'data'/name).read_text(encoding='utf-8'))
manifest=js('card_manifest_fullart.json');life=js('life.json');projects=js('projects.json');world=js('world.json');rules=js('rules_12.json')
assert len(manifest)==99, 'Card manifest must cover 99 slots'
assert len(life)==36 and len(projects)==18 and len(rules)==6
assert len(world['cities'])==10 and len(world['roles'])==8 and len(world['ambitions'])==8 and len(world['eras'])==6
assert [v['year'] for v in world['eras']]==[2031,2036,2042,2049,2057,2066] if 'year' in world['eras'][0] else len(world['eras'])==6
ids=[x['id'] for x in manifest]
assert len(ids)==len(set(ids)), 'Duplicate card IDs'
assert all(x['size_mm']==[70,99] and 1<=x['page']<=11 and 1<=x['row']<=3 and 1<=x['col']<=3 for x in manifest)
spots=[(x['page'],x['row'],x['col']) for x in manifest]
assert len(set(spots))==99
expected_types={'life':36,'project':18,'city':10,'role':8,'ambition':8,'era':6,'ending':6,'quick':4,'helper':3}
assert dict(collections.Counter(x['type'] for x in manifest))==expected_types, 'Incorrect card-type counts'
assert set(x['id'] for x in life+projects).issubset(set(ids)), 'Game cards missing from print manifest'
for x in life:
 assert all(v in x for v in ['a','b','c','gate','scene','year'])
 assert x['year'] in [2031,2036,2042,2049,2057,2066]
for x in projects:assert all(k in x for k in ['gate','gain','story'])
for f in root.glob('data/*.json'):json.loads(f.read_text(encoding='utf8'))
expected={
 '十万个未来_九宫格图标卡牌_A4_每页9张.pdf':11,
 '十万个未来_棋盘玩家板与筹码_A4.pdf':5,
 '十万个未来_共享城市棋盘_A3.pdf':1,
 '十万个未来_规则与城市手册.pdf':6,
 '十万个未来_故事与回声册.pdf':7,
 '十万个未来_未来已有人居住_完整打印版.pdf':29,
}
for name,pages in expected.items():
 f=root/'output/pdf'/name
 assert f.exists() and f.stat().st_size>1000 and f.read_bytes()[:5]==b'%PDF-', f'Invalid PDF: {name}'
 # Count PDF page tree using optional package; signature/size are always checked.
 try:
  from pypdf import PdfReader
 except ImportError:continue
 actual=len(PdfReader(str(f)).pages)
 assert actual==pages, f'{name}: {actual} != {pages}'
for x in manifest:
 art=x.get('art')
 if art:
  assert (root/'assets'/(art+'.jpg')).exists() or (root/'assets'/(art+'.png')).exists(), f'Missing illustration {art}'
print('OK: 99 cards, 36 stories, 18 projects, 10 cities, six eras and six print PDFs.')
