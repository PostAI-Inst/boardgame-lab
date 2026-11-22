#!/usr/bin/env python3
"""FUT100K: full-page A4 print-and-play edition. Run from project root.
Original scenario art is supplied in assets/. All measurements are physical pt/mm.
"""
import json, math, re, os, sys
from pathlib import Path
from collections import Counter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parent.parent
os.chdir(ROOT)
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
TMP=ROOT/'tmp/pdfs';TMP.mkdir(parents=True,exist_ok=True)
MM=72/25.4; W=210*MM;H=297*MM; CW=W/2;CH=H/3
INK='#163137';DARK='#10292F';CREAM='#F3EDE1';MUTED='#667873'
GOLD='#D9AA62';TEAL='#67B9BC';CORAL='#DA896B';LINE='#C4CDC3'
TRACKS=['能','造','生','联']; TRACK_NAMES=['能源与循环','制造与维修','生命与照护','算力与联通']
CAT={'life':('#70B6AD','人生 / LIFE'),'project':('#DEA26C','工程 / BUILD'),'era':('#88AFC8','时代 / ERA'),'city':('#D5BD79','城市 / CITY'),'role':('#C7A4BD','居民 / ROLE'),'ambition':('#B3BF87','愿景 / WISH'),'quick':('#9EBCC1','速查 / GUIDE'),'ending':('#D7B87A','结局 / EPILOGUE')}
YEARS=[2031,2036,2042,2049,2057,2066]
DATA={k:json.load(open(ROOT/'data'/f'{k}.json')) for k in ['life','projects','world','evidence']}
WORLD=DATA['world']; QA=[]

def font_build():
    text=''.join(p.read_text() for p in (ROOT/'data').glob('*.json'))+''.join(p.read_text() for p in (ROOT/'source').glob('*.py'))
    text+=''.join(chr(i) for i in range(32,128))+'零一二三四五六七八九十①②③④⑤⑥→≥≤×−＋□已用预算体验压力承压能源制造生命联通满版无出血'
    for weight,filename in [('Regular','NotoSansCJK-Regular.ttc'),('Bold','NotoSansCJK-Bold.ttc')]:
        src=Path('/usr/share/fonts/opentype/noto')/filename
        ff=TTFont(str(src),fontNumber=2);cmap=ff.getBestCmap();gs=ff.getGlyphSet()
        chars={ord(c):cmap[ord(c)] for c in set(text) if ord(c) in cmap}
        glyph_order=['.notdef']+sorted(set(chars.values())- {'.notdef'})
        fb=FontBuilder(ff['head'].unitsPerEm,isTTF=True);fb.setupGlyphOrder(glyph_order)
        glyphs={}
        for g in glyph_order:
            pen=TTGlyphPen(gs);q=Cu2QuPen(pen,max_err=1.0,reverse_direction=True);gs[g].draw(q);glyphs[g]=pen.glyph()
        fb.setupGlyf(glyphs)
        fb.setupHorizontalMetrics({g:ff['hmtx'][g] for g in glyph_order})
        fb.setupHorizontalHeader(ascent=ff['hhea'].ascent,descent=ff['hhea'].descent)
        fb.setupCharacterMap(chars)
        fb.setupNameTable({'familyName':'Noto Sans SC Print','styleName':weight,'uniqueFontIdentifier':'FUT100K-NotoSC-'+weight,'fullName':'Noto Sans SC Print '+weight,'psName':'FUT100K-NotoSC-'+weight,'version':'Version 1.0'})
        fb.setupOS2(sTypoAscender=ff['hhea'].ascent,sTypoDescender=ff['hhea'].descent,usWinAscent=ff['hhea'].ascent,usWinDescent=abs(ff['hhea'].descent),fsType=0)
        fb.setupPost();fb.setupMaxp();p=TMP/f'NotoSC-{weight}.ttf';fb.save(p)
        pdfmetrics.registerFont(RLFont('CNB' if weight=='Bold' else 'CN',str(p)))
    pdfmetrics.registerFont(RLFont('EN','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(RLFont('ENB','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

def col(c):return HexColor(c) if isinstance(c,str) else c
def rect(c,x,y,w,h,fill,stroke=None,lw=.4):
    c.setFillColor(col(fill));c.setStrokeColor(col(stroke or fill));c.setLineWidth(lw);c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))
def line(c,x1,y1,x2,y2,color=LINE,lw=.5):
    c.setStrokeColor(col(color));c.setLineWidth(lw);c.line(x1,H-y1,x2,H-y2)
def txt(c,x,y,s,size=10,font='CN',color=INK,align='left'):
    c.setFillColor(col(color));c.setFont(font,size)
    fn=c.drawRightString if align=='right' else c.drawCentredString if align=='center' else c.drawString
    fn(x,H-y-size,s)

def wrap(s,w,size,font='CN'):
    out=[]
    for para in str(s).split('\n'):
        row=''
        for ch in para:
            if pdfmetrics.stringWidth(row+ch,font,size)>w and row:
                if ch in '，。、；：？！）》」』】' and len(row)>1:
                    out.append(row[:-1]);row=row[-1]+ch
                else:out.append(row);row=ch
            else:row+=ch
        out.append(row)
    return out
def para(c,s,x,y,w,size=10,font='CN',leading=None,color=INK,max_h=None,tag=''):
    leading=leading or size*1.5;lines=wrap(s,w,size,font)
    height=len(lines)*leading
    if max_h is not None and height>max_h+.5:QA.append({'type':'overflow','tag':tag,'height':height,'limit':max_h,'text':s})
    for i,l in enumerate(lines):txt(c,x,y+i*leading,l,size,font,color)
    return y+height

def img(c,key,x,y,w,h,anchor=.5):
    path=ROOT/'assets'/f'{key}.jpg'
    if not path.exists():raise FileNotFoundError(path)
    im=ImageReader(str(path));iw,ih=im.getSize();scale=max(w/iw,h/ih);dw,dh=iw*scale,ih*scale
    c.saveState();p=c.beginPath();p.rect(x,H-y-h,w,h);c.clipPath(p,stroke=0)
    c.drawImage(im,x+(w-dw)*.5,H-y-h+(h-dh)*anchor,width=dw,height=dh,mask='auto')
    c.restoreState()

def badge(c,x,y,s,bg=TEAL,fg=DARK,size=8,pad=5):
    w=pdfmetrics.stringWidth(s,'CNB',size)+pad*2
    rect(c,x,y,w,size+7,bg);txt(c,x+pad,y+2,s,size,'CNB',fg);return w

def header(c,number,kicker,title,sub='',art=None):
    rect(c,0,0,W,H,CREAM);rect(c,0,0,W,30,DARK)
    txt(c,24,9,'FUT100K  /  POST-AI INSTITUTE',8,'EN',CREAM)
    txt(c,W-24,9,f'{number:02d}  /  {kicker}',8,'CN',CREAM,'right')
    txt(c,30,47,title,26,'CNB')
    if sub:para(c,sub,31,87,W-62,10,leading=15,color=MUTED)
    footer(c,number)

def footer(c,n,kind='规则与城市手册'):
    line(c,30,H-34,W-30,H-34)
    txt(c,30,H-26,'后AI研究所 · 十万个未来',7.3,color=MUTED)
    txt(c,W-30,H-26,f'{kind}  /  {n:02d}',7.3,color=MUTED,align='right')

def section(c,title,body,y,x=31,w=None,size=10.7):
    w=w or W-62
    txt(c,x,y,title,13,'CNB');y+=23
    return para(c,body,x,y,w,size,leading=16.2)+16

def table(c,x,y,width,widths,heads,rows,row_h=36,size=9.3):
    rect(c,x,y,width,25,DARK);xx=x
    for h,ww in zip(heads,widths):txt(c,xx+7,y+7,h,8.8,'CNB',CREAM);xx+=ww
    yy=y+25
    for ri,row in enumerate(rows):
        rect(c,x,yy,width,row_h,'#E6E9DF' if ri%2==0 else '#F3EDE1');xx=x
        for ss,ww in zip(row,widths):
            para(c,str(ss),xx+7,yy+6,ww-14,size,leading=size*1.45,max_h=row_h-10,tag=f'table-{ri}');xx+=ww
        yy+=row_h
    return yy

def effect(d,short=False):
    names={'budget':'预','xp':'历','pressure':'压','all_budget':'全体预','all_xp':'全体历'}
    parts=[]
    for k,v in d.items():
        n=names.get(k,k);parts.append(f'{n}{"+" if v>0 else "−"}{abs(v)}')
    return ' · '.join(parts) if parts else '无数值变化'

def gate(d):return ' / '.join(f'{k}{v}' for k,v in d.items()) if d else '无门槛'

def card_hero(c,d,typ,x,y,h=112):
    if CH>350 and typ not in ['life','ending']:h+=86
    accent,cat=CAT[typ]
    rect(c,x,y,CW,CH,CREAM)
    if d.get('art'):img(c,d['art'],x,y,CW,h)
    else:rect(c,x,y,CW,h,DARK)
    c.saveState();c.setFillAlpha(.88);rect(c,x,y,CW,22,DARK);rect(c,x,y+h-30,CW,30,DARK);c.restoreState()
    txt(c,x+10,y+6,cat,7.4,'CNB',accent)
    label=d['id']+(f'  ·  {d["year"]}' if 'year'in d else '')
    txt(c,x+CW-10,y+6,label,7.5,'EN',CREAM,'right')
    title=d.get('title',d.get('name',''))
    ts=14 if len(title)<=13 else 12.5
    txt(c,x+10,y+h-24,title,ts,'CNB',CREAM)
    return y+h+8

def card_footer(c,d,x,y,label):
    txt(c,x+10,y+CH-12,label,6.6,'CN',MUTED)
    txt(c,x+CW-10,y+CH-12,'FUT100K',6.6,'EN',MUTED,'right')

def life_card(c,d,x,y):
    # Dynamic image height keeps body at readable size without overflowing.
    large=CH>350
    bf=10.1 if large else 9.25;sl=13.2 if large else 11.6
    ef=8.8 if large else 7.9;el=11.2 if large else 9.6;rowh=24 if large else 21
    body_w=CW-20;scene_lines=len(wrap(d['scene'],body_w,bf))
    echoes=[]
    for k in ['a','b','c']:
        op=d[k];ef_label=effect(op['echo_effect'])
        echoes.append(k.upper()+' '+op['echo']+('  '+ef_label if op['echo_effect'] else ''))
    echo_lines=sum(len(wrap(e,body_w-10,ef)) for e in echoes)
    needed=scene_lines*sl+4+3*rowh+12+echo_lines*el+8
    hero=min(202 if CH>350 else 112,CH-19-needed)
    if hero<86:QA.append({'type':'dense_card','id':d['id'],'hero_height':hero})
    yy=card_hero(c,d,'life',x,y,hero)
    yy=para(c,d['scene'],x+10,yy,body_w,bf,leading=sl)+4
    for k in ['a','b','c']:
        op=d[k];txt(c,x+10,yy,k.upper(),10 if large else 9,'ENB',INK)
        txt(c,x+25,yy,op['text'],10.2 if large else 9.2,'CNB')
        cost=(f'付{op["cost"]}预，得{op.get("xp",0)}历' if op['cost'] else f'免费，预+{op.get("budget",0)}')
        cond=('需 '+gate(d['gate'])+'；' if k=='a' else '无门槛；')
        txt(c,x+25,yy+(12 if large else 10.5),cond+cost,8.7 if large else 7.8,'CN',MUTED);yy+=rowh
    rect(c,x+7,yy+1,CW-14,11+echo_lines*el,'#E0E8E1')
    txt(c,x+12,yy+3,'下一轮回声 / 只读已选一项',7.6 if large else 7,'CNB',INK);yy+=13
    for e in echoes:yy=para(c,e,x+12,yy,CW-24,ef,leading=el)
    if yy>y+CH-16:QA.append({'type':'overflow','id':d['id'],'bottom':yy-y})
    card_footer(c,d,x,y,f'情景{d["level"]} · 第{d["round"]}轮 · 预=预算 历=体验 压=承压')

def project_card(c,d,x,y):
    yy=card_hero(c,d,'project',x,y,117)
    badge(c,x+10,yy,f'第{["I","II","III"][d["phase"]-1]}期 · 第{d["round"]}轮公开',GOLD,size=7.7)
    txt(c,x+CW-10,yy+2,'资金目标 = 2 × 人数',8,'CNB',INK,'right');yy+=22
    yy=para(c,d['story'],x+10,yy,CW-20,9.5,leading=12.5)+4
    txt(c,x+10,yy,'建成门槛  '+gate(d['gate']),8.6,'CNB');yy+=16
    txt(c,x+10,yy,'建成效果  '+effect(d['gain']),9.7,'CNB');yy+=20
    yy=para(c,'留下：'+d['fact'],x+10,yy,CW-20,8.8,leading=11.8)+4
    yy=para(c,d['limit'],x+10,yy,CW-20,7.8,leading=10,color=MUTED)
    if yy>y+CH-16:QA.append({'type':'overflow','id':d['id'],'bottom':yy-y})
    card_footer(c,d,x,y,f'{d["level"]} · 另加契约收益与出资者各1历 · {d["source"]}')

def era_card(c,d,x,y):
    yy=card_hero(c,d,'era',x,y,132)
    yy=para(c,d['narrative'],x+11,yy,CW-22,10.2,leading=14)+9
    yy=para(c,d['rule'],x+11,yy,CW-22,10.5,'CNB',leading=15)+8
    txt(c,x+11,yy,f'能力上限 {2+(d["round"]-1)//2}  ·  公开 P{3*d["round"]-2:02d}–P{3*d["round"]:02d}',8.5,color=MUTED)
    card_footer(c,d,x,y,'依次执行一次 · 年份是条件情景，非实现预测')

def city_card(c,d,x,y):
    yy=card_hero(c,d,'city',x,y,126)
    txt(c,x+11,yy,d['en'].upper()+'  /  '+d['mode'],8.5,'CNB');yy+=18
    for i,(n,v) in enumerate(zip(TRACKS,d['stats'])):
        xx=x+11+i*68
        rect(c,xx,yy,62,22,INK);txt(c,xx+31,yy+4,f'{n} {v}',10.5,'CNB',CREAM,'center')
    yy+=29
    yy=para(c,d['flavor'],x+11,yy,CW-22,9.5,leading=13)+8
    yy=para(c,d['rule'],x+11,yy,CW-22,9.3,'CNB',leading=13)
    card_footer(c,d,x,y,'城市能力全桌一次 · 发动后放“城已用”标记')

def role_card(c,d,x,y):
    yy=card_hero(c,d,'role',x,y,140)
    txt(c,x+11,yy,d['identity'],10.2,'CNB');yy+=23
    yy=para(c,d['story'],x+11,yy,CW-22,10,leading=14)+11
    yy=para(c,d['power'],x+11,yy,CW-22,10,'CNB',leading=14)
    card_footer(c,d,x,y,'初始身份可以演变 · 能力使用后放“角色已用”')

def ambition_card(c,d,x,y):
    yy=card_hero(c,d,'ambition',x,y,126)
    yy=para(c,d['desc'],x+11,yy,CW-22,10,leading=14)+10
    for i,g in enumerate(d['goals']):
        txt(c,x+11,yy,f'{i+1}',9,'ENB');yy=para(c,g,x+28,yy,CW-39,9.5,leading=13.5)+7
    card_footer(c,d,x,y,'每项2分，最多6分 · 终局核对 · 愿景公开')

def quicks():return [
 {'id':'Q01','title':'每轮怎么走','art':'space3','blocks':[
  ('01 收入与回声','每人预+3；自己每项已建专属再+1预；结上轮回声。'),
  ('02 时代与邀约','改本轮上限；读时代；公开3工程；每人领1人生牌。'),
  ('03 第一圈行动','先手起，每人做1次城市行动。'),
  ('04 过自己的生活','各选A/B/C，记下选择；立即结算。'),
  ('05 第二圈行动','同一顺序，每人再做1次城市行动。'),
  ('06 收尾','末轮结回声；压≥7每人预−1；换先手。')]},
 {'id':'Q02','title':'五种城市行动','art':'industry0','blocks':[
  ('筹措','不付费，预+3。'),('扩建','付3预，一项能力+1。受年代上限。'),('共建','向1个工程投1或2预；只投剩余所需。'),('疏解','付2预，压−2。'),('兑现生活','付2预，历+1；每人每轮至多一次。'),('每人每轮两次','所有上述动作各消耗1次行动。')]},
 {'id':'Q03','title':'三种收益契约','art':'industry3','blocks':[
  ('公共','任何人可出资；建成时压−2。'),('合伙','任何人可出资；建成时每位出资者预+1。'),('专属','仅发起者出资；建成预+人数，以后每轮收入再+1预。'),('共同规则','首笔出资锁定契约。资金目标2×人数。'),('立即建成','资金与门槛都够：卡效→契约→各出资者历+1。'),('不可撤资','满资待门槛；升级后按编号反复检查建成。')]},
 {'id':'Q04','title':'终局与关键边界','art':'space1','blocks':[
  ('共同完成','已建≥人数+1，含III期至少1项；四轨总和≥10；压≤5。'),('个人足迹','体验＋愿景分；每条愿景2分。可各自报告，不必排名。'),('数值','预算0–12；压力0–8；能力0–4；体验不低于0。'),('年代上限','第1–2轮2；第3–4轮3；第5–6轮4。'),('纸面记忆','人生牌保留；选择、投入与扩建/疏解次数记账。'),('不会提前淘汰','预算0或承压8，故事仍然继续。')]}
]

def quick_card(c,d,x,y):
    yy=card_hero(c,d,'quick',x,y,70)
    for title,body in d['blocks']:
        txt(c,x+11,yy,title,9.1,'CNB');yy+=12
        yy=para(c,body,x+11,yy,CW-22,8.6,leading=11.1)+5
    if yy>y+CH-16:QA.append({'type':'overflow','id':d['id'],'bottom':yy-y})
    card_footer(c,d,x,y,'完整细则见规则书 · 预=预算 历=体验 压=承压')

def new_canvas(path,title):
    c=canvas.Canvas(str(path),pagesize=(W,H),pageCompression=1,initialFontName='CN',initialFontSize=10)
    c.setTitle(title);c.setAuthor('后AI研究所 · POST-AI INSTITUTE');c.setSubject('十万个未来 · 未来已有人居住 · A4零出血桌游原型1.2')
    return c

def endings():return [
    {'id':'F01','title':'未来已有人居住','art':'space3','condition':'四项共同条件全部达成。','story':'傍晚，一个刚到城里的孩子问：这里的人为什么不用一辈子只做同一种事？你们没有给出一句口号，而是领他走过工坊、庭院和远端身体借阅所。这座城已经能把新的愿望接进自己的物质结构。','prompt':'每人指出一张经历牌：哪一种曾经不可思议的事，如今已经成为日常？'},
    {'id':'F02','title':'高能力，紧绷的生活','art':'space0','condition':'优先检查：若终局承压>5，读此牌。','story':'城市拥有许多新能力，晚间的调度队列仍在延长。机器会修理机器，人们却还在为等待、分配和接班奔忙。新来的居民喜欢这里的可能，也问你们：谁能让这些可能不再挤占一切？','prompt':'每人选一项已经建成的能力：下一次，你会如何让它更容易进入生活？'},
    {'id':'F03','title':'从远方借来的未来','art':'industry1','condition':'承压≤5，且四轨能力合计<10。','story':'这里没有复制出世界上全部的新能力。居民借来身体、接入远方服务，也在本地保留独特的生活。某天，熟悉的供应方更改了接口；你们第一次认真讨论，哪些本领应该留在自己手里。','prompt':'每人说出一项值得继续借用的能力，以及一项希望留在本城的能力。'},
    {'id':'F04','title':'留在熟悉的丰裕里','art':'industry3','condition':'承压≤5、能力合计≥10，但没有III期工程建成。','story':'许多事已经足够便利，城市也拥有自己喜欢的节奏。新的轨道、身体和工业机会陆续到来，你们却暂时把资源留在熟悉的生活里。孩子问起别处的世界，第一次出现了与你们不一样的愿望。','prompt':'选一个未建成的III期工程：谁想去试一次？谁愿意继续留在这里？'},
    {'id':'F05','title':'许多愿望，还在施工','art':'industry0','condition':'前述结局均不适用，但已建工程少于人数+1。','story':'新能力已经能够触及，城市也没有被压力压垮。仍有一些计划停留在半成品里：共同的时间没有凑齐，某份承诺没有续上。你们把账本交给新居民，哪些愿望值得再组织一次？','prompt':'指一项曾投入却未建成的工程；若没有，指一项未启动工程。留下一条能让它真正开工的建议。'},
    {'id':'F06','title':'写给未来的新居民','art':'life3','condition':'读完F01–F05中适用的主结局后，全桌再读此牌。','story':'“新来的居民问，这里为什么会这样？”你们想起许多普通的下午：第一次借来的手，一段尚未成形的街道，一场只有几个人懂得的新舞蹈。这一次，你们知道答案里有自己的一部分。','prompt':'每人接一句：我后来过上了____，但还想继续____。把这句话留在城史页。'}
]

def ending_card(c,d,x,y):
    yy=card_hero(c,d,'ending',x,y,214 if CH>350 else 104)
    yy=para(c,d['condition'],x+11,yy,CW-22,9,'CNB',leading=12.5)+13
    yy=para(c,d['story'],x+11,yy,CW-22,10 if CH>350 else 9.3,leading=15 if CH>350 else 12.4)+15
    yy=para(c,d['prompt'],x+11,yy,CW-22,9.5 if CH>350 else 8.6,'CNB',leading=14 if CH>350 else 11.7)
    if yy>y+CH-16:QA.append({'type':'overflow','id':d['id'],'bottom':yy-y})
    card_footer(c,d,x,y,'所有结局都保留已发生的人生 · 可继续改写的未来')

def make_cards(layout='large'):
    global CH
    rows=2 if layout=='large' else 3;CH=H/rows;perpage=rows*2
    name='十万个未来_96张大画幅卡牌_A4无留白零出血.pdf' if layout=='large' else '十万个未来_96张卡牌_省纸版_A4每页6张.pdf'
    p=OUT/name;c=new_canvas(p,'十万个未来 · 96张卡牌 · '+layout)
    deck=[('life',d)for d in DATA['life']]+[('project',d)for d in DATA['projects']]+[('era',d)for d in WORLD['eras']]+[('city',d)for d in WORLD['cities']]+[('role',d)for d in WORLD['roles']]+[('ambition',d)for d in WORLD['ambitions']]+[('quick',d)for d in quicks()]+[('ending',d)for d in endings()]
    funcs={'life':life_card,'project':project_card,'era':era_card,'city':city_card,'role':role_card,'ambition':ambition_card,'quick':quick_card,'ending':ending_card}
    assert len(deck)==96
    manifest=[]
    for pn in range(len(deck)//perpage):
        c.bookmarkPage(f'cards{pn+1}');c.addOutlineEntry(f'卡页{pn+1:02d}：{deck[pn*perpage][1]["id"]}–{deck[pn*perpage+perpage-1][1]["id"]}',f'cards{pn+1}',level=0)
        for i,(typ,d)in enumerate(deck[pn*perpage:pn*perpage+perpage]):
            xx=(i%2)*CW;yy=(i//2)*CH;funcs[typ](c,d,xx,yy)
            manifest.append({'id':d['id'],'type':typ,'page':pn+1,'row':i//2+1,'col':i%2+1,'size_mm':[105,297/rows]})
        # Shared trim lines lie on real card boundaries; no external marks or bleed.
        line(c,CW,0,CW,H,'#7A8E87',.35)
        for yy in[CH*i for i in range(1,rows)]:line(c,0,yy,W,yy,'#7A8E87',.35)
        c.showPage()
    c.save();(ROOT/'data'/f'card_manifest_{layout}.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    return p

def ring(c,x,y,r,label,size=11,fill=CREAM,stroke=INK):
    c.setFillColor(col(fill));c.setStrokeColor(col(stroke));c.setLineWidth(.7);c.circle(x,H-y,r,fill=1,stroke=1);txt(c,x,y-size*.6,label,size,'ENB',INK,'center')

def board_base(c,title,kicker):
    rect(c,0,0,W,H,CREAM);rect(c,0,0,W,38,DARK);txt(c,20,11,title,14,'CNB',CREAM);txt(c,W-20,16,kicker,7.7,'EN',TEAL,'right')

def make_boards():
    p=OUT/'十万个未来_城市板玩家板与标记_A4.pdf';c=new_canvas(p,'十万个未来 · 6页桌面组件')
    board_base(c,'我们共同建成的城市','CITY BOARD  /  01')
    img(c,'space3',0,38,W,194)
    rect(c,0,204,W,28,DARK);txt(c,21,211,'城市：________________     人数：____     城市能力：可用 / 已用',10,'CNB',CREAM)
    yy=249
    descriptions=['稳定供能、储能、水与热循环','制造、维修、关键件与质量验证','身体修复、照护、食品与生态','计算、通信、远端身体及跨域基础设施']
    for i,(n,long,desc) in enumerate(zip(TRACKS,TRACK_NAMES,descriptions)):
        txt(c,21,yy,n,22,'CNB');txt(c,59,yy+2,long,11,'CNB');txt(c,59,yy+20,desc,8,color=MUTED)
        for v in range(5):ring(c,256+v*66,yy+19,14,str(v),11)
        yy+=67
    line(c,20,yy-3,W-20,yy-3);txt(c,21,yy+7,'公共承压',15,'CNB');txt(c,143,yy+12,'维护、分配与协调的综合负担',9,color=MUTED)
    for v in range(9):ring(c,44+v*63,yy+60,17,str(v),12,fill='#E3BEAD' if v>=7 else CREAM)
    txt(c,23,yy+86,'压达到7或8：每轮收尾每人预−1。压到8也不提前终止。',9,color=MUTED)
    y2=yy+119;txt(c,21,y2,'六次时代跃迁',14,'CNB')
    for i,year in enumerate(YEARS):
        xx=21+i*94;rect(c,xx,y2+28,88,47,DARK);txt(c,xx+44,y2+32,str(year),13,'ENB',CREAM,'center');txt(c,xx+44,y2+54,f'上限 {2+i//2}',8,'CN',TEAL,'center')
    para(c,'共同目标：工程≥人数+1，含至少1项III期工程；四项能力合计≥10；承压≤5。',22,y2+88,W-44,10.5,'CNB',leading=15)
    txt(c,22,H-24,'能力数值是本桌游的部署抽象，不是现实技术成熟度或普及率。',8,color=MUTED);c.showPage()

    board_base(c,'工程账本：谁把哪种未来建成','PROJECT LEDGER  /  02')
    para(c,'一格记累计出资。首笔出资锁定契约；资金目标为人数×2。满足门槛立即建成并打勾。用铅笔可重复使用。',22,53,W-44,10,leading=15)
    heads=['工程','契约','P1','P2','P3','P4','合计','已建']
    widths=[204,59,45,45,45,45,53,55];s=sum(widths);widths=[a*(W-40)/s for a in widths]
    rows=[]
    for d in DATA['projects']:rows.append([d['id']+' '+d['title'],'公/伙/专','','','','','','□'])
    yy=table(c,20,108,W-40,widths,heads,rows,row_h=32,size=8.8)
    para(c,'P1–P4 对应玩家板编号。两人局与三人局将未使用列划掉。能力提升后，按编号从小到大检查所有满资工程，必要时反复检查。',22,yy+14,W-44,9.4,leading=14)
    para(c,'已开工跨期保留；进入新阶段时，未开工的旧阶段工程移出。本期未开工工程继续保留到阶段结束。',22,yy+61,W-44,9.4,leading=14)
    txt(c,22,H-24,'资金不能撤回，不可超投。口头承诺不等于已付款。工程卡不必写字。',8,color=MUTED);c.showPage()

    for sheet,ids in enumerate([(1,2),(3,4)]):
        for block,pid in enumerate(ids):
            y=block*H/2;ph=H/2
            rect(c,0,y,W,ph,CREAM);img(c,['industry2','industry0','life0','life1'][pid-1],0,y,W,60)
            c.saveState();c.setFillAlpha(.82);rect(c,0,y,W,60,DARK);c.restoreState()
            txt(c,20,y+12,f'P{pid}  我的未来生活',18,'CNB',CREAM)
            txt(c,W-20,y+18,'PLAYER BOARD',8,'EN',TEAL,'right')
            txt(c,21,y+69,'称呼：__________  角色：__________  愿景：__________  能力已用 □',9.8)
            txt(c,21,y+94,'预算  0–12',10,'CNB')
            for v in range(13):ring(c,146+v*35,y+107,11,str(v),9)
            txt(c,21,y+132,'体验 / 十位',10,'CNB')
            for v in range(5):ring(c,146+v*35,y+144,10,str(v),9)
            txt(c,332,y+132,'本轮行动',9,'CNB');rect(c,406,y+130,64,25,'#D8E3DA',INK);rect(c,482,y+130,64,25,'#D8E3DA',INK)
            txt(c,438,y+136,'第一圈',8.5,'CN',INK,'center');txt(c,514,y+136,'第二圈',8.5,'CN',INK,'center')
            txt(c,21,y+165,'体验 / 个位',10,'CNB')
            for v in range(10):ring(c,146+v*42,y+177,10,str(v),9)
            hh=['年代','人生牌号','选择','一句记得的事'];ww=[65,85,64,W-40-214]
            rows=[[str(year),'','A / B / C','']for year in YEARS]
            yy=table(c,20,y+202,W-40,ww,hh,rows,row_h=22,size=8.5)
            txt(c,21,yy+9,'扩建次数：____  疏解次数：____  愿景达成：□1  □2  □3  终局合计：____',9)
            txt(c,21,y+ph-20,'收入3＋自己每项已建专属1；选择留牌，下轮读回声。体验十位/个位合并读。',7.8,color=MUTED)
        line(c,0,H/2,W,H/2,INK,.5);c.showPage()

    # 60 small markers fit the actual player-board track spacing.
    toks=[];palette=['#497B86','#C58B63','#6D9473','#9C80A6']
    for pid in range(1,5):
        for label in ['预算','历十','历个','行动1','行动2','A','B','C','已用','本人']:
            toks.append((f'P{pid}',label,palette[pid-1]))
    for label in ['能','造','生','联','承压','年代','先手','城已用','公共','合伙','专属','已建','已建','已建','已建','已建','已建','备用','备用','备用']:
        toks.append(('城市',label,DARK))
    tw=W/15;th=H/20;token_h=4*th
    rect(c,0,0,W,H,DARK)
    for i,(owner,label,bg) in enumerate(toks):
        xx=i%15*tw;yy=i//15*th;rect(c,xx,yy,tw,th,bg)
        txt(c,xx+tw/2,yy+5,owner,6.2,'CNB',CREAM,'center');txt(c,xx+tw/2,yy+21,label,7.5 if len(label)<4 else 6.3,'CNB',CREAM,'center')
    for i in range(1,15):line(c,i*tw,0,i*tw,token_h,CREAM,.3)
    for i in range(1,5):line(c,0,i*th,W,i*th,CREAM,.3)
    txt(c,22,token_h+16,'60枚标记 / 仅裁页顶区域',16,'CNB',CREAM)
    txt(c,22,token_h+44,'15列 × 4行，每枚14 × 14.85mm；大小与玩家轨道相配。',9,'CN',TEAL)
    img(c,'space3',0,token_h+76,W,276)
    yy=token_h+373
    txt(c,22,yy,'把未来放在桌上',24,'CNB',CREAM)
    para(c,'P1–P4各取自己的10枚。历十/历个分别标记体验的十位/个位；已用盖住角色能力。城市标记用于四条能力、承压、年代与先手。',22,yy+44,W-44,11,leading=18,color=CREAM)
    para(c,'A/B/C放在本轮人生牌旁，下一轮只读对应回声。行动标记在两圈城市行动后分别移走，收尾时取回。已建、契约和备用标记可选用；工程投入以账本为准。',22,yy+115,W-44,11,leading=18,color=CREAM)
    txt(c,22,H-66,'50mm',9,'EN',TEAL);line(c,22,H-40,22+50*MM,H-40,CREAM,1)
    line(c,22,H-45,22,H-35,CREAM,1);line(c,22+50*MM,H-45,22+50*MM,H-35,CREAM,1)
    txt(c,W-22,H-30,'后AI研究所 · POST-AI INSTITUTE',8,'CN',CREAM,'right')
    c.showPage()

    board_base(c,'把这一局写进城市的历史','CITY CHRONICLE  /  06')
    txt(c,22,53,'城市：________________    居民：__________________________',11)
    txt(c,22,81,'每幕写一句：哪种新能力进入生活？谁作出了什么承诺？',10,color=MUTED)
    for i,year in enumerate(YEARS):
        yy=115+i*82;rect(c,20,yy,62,64,DARK);txt(c,51,yy+8,str(year),13,'ENB',CREAM,'center');txt(c,51,yy+32,'第'+str(i+1)+'幕',8,'CN',TEAL,'center')
        txt(c,96,yy+2,'新建工程：____________________   城市四轨：___ / ___ / ___ / ___',9)
        line(c,96,yy+38,W-22,yy+38);line(c,96,yy+62,W-22,yy+62)
    yy=620;txt(c,22,yy,'2066：我们留下了什么？',15,'CNB')
    para(c,'已建数____  III期已建数____  四轨合计____  承压____\n共同结局________________   每人挑一张经历牌，说一句“后来……”',23,yy+30,W-46,11,leading=22)
    txt(c,22,yy+92,'可选复盘：这种未来现在离你感觉有多远？',11,'CNB')
    para(c,'开局：已在发生 / 5年内 / 5–15年 / 更久 / 不确定\n终局：已在发生 / 5年内 / 5–15年 / 更久 / 不确定',23,yy+116,W-46,9.5,leading=18)
    txt(c,22,H-22,'复盘自愿、不计分；若做正式研究，应另行告知同意，不能据此给人贴人格标签。',7.8,color=MUTED)
    c.showPage();c.save();return p

def make_rules():
    p=OUT/'十万个未来_规则与城市手册.pdf';c=new_canvas(p,'十万个未来 · 未来已有人居住 · 规则与城市手册')
    # 01 Cover: full-page illustration, editorial title in the lower third.
    img(c,'space3',0,0,W,H*.67)
    rect(c,0,H*.62,W,H*.38,DARK)
    txt(c,32,H*.655,'FUT100K  /  A CITY THROUGH SIX FUTURES',9,'EN',TEAL)
    txt(c,30,H*.697,'十万个未来',38,'CNB',CREAM)
    txt(c,32,H*.765,'未来已有人居住',24,'CNB',CREAM)
    para(c,'从一座会复制的工厂，到一顿隔着地月的晚餐。\n把新能力变成自己的生活，再把后果交给下一代。',33,H*.824,W-66,11,leading=18,color=CREAM)
    txt(c,33,H-67,'2–4人  ·  六幕  ·  约75–110分钟  ·  无主持人也可游玩',10,'CNB',TEAL)
    txt(c,33,H-37,'后AI研究所  /  POST-AI INSTITUTE',9,'CN',CREAM)
    txt(c,W-31,H-37,'九宫格图标版 1.1  ·  2026.11',8,'CN',CREAM,'right');c.showPage()

    header(c,2,'WELCOME','未来从一个上午开始','一桌共建一座城，每个人过自己的生活。')
    img(c,'industry1',30,117,W-60,180)
    y=316
    y=section(c,'开局朗读', '“2031年，你第一次走进这座城。楼下工坊正在装配下一座工坊的骨架，海边的一双机械手等你借用。你带来一种手艺、一些关系和一个愿望。三十五年后，这里会长成怎样的世界？你愿意先把哪一种未来过成日常？”',y)
    y=section(c,'你会做的三件事','用有限预算选择新的生活；与别人共同建造跨年代工程；在下一幕收到自己过去选择的回声。城市能力、工程产权和个人愿景相互牵动。每轮先做一次建设，再决定怎么生活，最后还有一次行动承担后果。',y)
    y=section(c,'本局有两个结果','全桌检查城市是否宜居并有余力；每人报告体验与愿景。默认合作叙事，不设唯一人生冠军。想比较成绩时可比“体验＋愿景分”，并列共享。',y)
    para(c,'年份是条件情景。组织修复、轨道居住与工业复制都需要额外假设；它们不会只因时间到了就自动普及。卡牌插画是虚构情景图。',31,y,W-62,9.5,leading=15,color=MUTED);c.showPage()

    header(c,3,'SETUP','十分钟开桌','首次建议选铸城；喜欢公共智能可选阿戈拉。')
    steps=[('01 裁牌与分组','96张牌按编号分组：L人生36，P工程18，E时代6，C城市10，R居民8，W愿景8，Q速查4，F结局6。另有3张图例辅助牌，不入牌堆。人生按六个年代分六小堆，各自洗匀；工程与时代按编号排好。'),('02 选城与初始状态','全桌选一张城市牌。把城市四条能力设为卡面数值，公共承压设为2；放好年代与先手标记。每人拿一个编号玩家板，预算4、体验0。'),('03 领身份和愿景','每人从未选居民牌中选1张；愿景洗牌，每人抽2选1，另一张移出。身份和愿景公开。每人拿预算、体验十位/个位、两行动、A/B/C与角色已用标记。'),('04 摆出城市','城市板放中央，城市牌与时代牌在旁。工程区留出正在施工和已经建成两块空间，账本记出资。每人面前留一张“等回声”的人生牌位置。'),('05 谁先来','离下一次生日最近的人先手；相同则座位靠门者。以后每轮顺时针轮换。两圈城市行动使用同一先后顺序。'),('06 开始2031','按下一页顺序行动。第1轮照常领取收入3，再读E01；尚未领取人生牌时不先偷看下一轮内容。')]
    y=122
    for title,body in steps:y=section(c,title,body,y,size=10.3)
    para(c,'只需纸、剪刀或裁纸刀、直尺和铅笔。已提供全部标记；也可用硬币替代指示物。两人局只用P1/P2玩家板与账本列。',31,y,W-62,9.5,leading=15,color=MUTED);c.showPage()

    header(c,4,'TURN','一幕里，先造出可能，再生活','每人只有两次城市行动；生活选择不消耗行动。')
    y=122
    for title,body in [
      ('1 收入与回声','每人预算+3；自己每有1项已建专属工程，再预算+1。按先手顺序读上轮所选回声并结算，然后将牌收入个人经历堆。第1轮没有回声。'),
      ('2 时代与邀约','把能力上限调到本轮值，执行E时代卡一次；公开本轮3张P工程；每人抽本轮1张L人生牌。先看场景与选项，暂不付款。'),
      ('3 第一圈城市行动','先手起，每人做1次城市行动。你可以先补能力、筹钱或共同建成工程，为接下来的生活打开入口。'),
      ('4 生活选择','每人独立决定A/B/C。全部先放下选择标记，再按先手顺序支付并结算；门槛只检验选择时的城市能力。把选择记录到玩家板。'),
      ('5 第二圈城市行动','同样顺序，每人再做1次行动。工程建成与能力变化立即生效；可以为下一幕准备，也可以兑现自己的生活。'),
      ('6 收尾','第6轮此时结算本轮人生回声；每轮最后，若承压≥7，每人预算−1。收回行动标记，先手顺时针交接；第6轮转入终局。')]:y=section(c,title,body,y,size=10.1)
    para(c,'能力上限：第1–2轮为2，第3–4轮为3，第5–6轮为4。上限提高不会自动增加任何能力。若多个工程同时可建成，按编号处理并重新检查。',31,y,W-62,9.5,leading=15,color=MUTED);c.showPage()

    header(c,5,'ACTIONS','五种动作，改变两种尺度','预算把购买力、生产时段和协调资源压缩成一种桌面货币。')
    rows=[['筹措','0预','预算+3。'],['扩建','3预','任选一项城市能力+1；受年代上限。'],['共建','1或2预','投入一个工程，记入你的出资列；不得超投。'],['疏解','2预','公共承压−2。'],['兑现生活','2预','个人体验+1；每人每轮最多一次。']]
    y=table(c,31,125,W-62,[83,66,W-211],['动作','支付','结果'],rows,row_h=45,size=10)
    y=section(c,'每个动作都占一次行动','移动自己的第一圈或第二圈标记，表示该次行动已经使用。可以做两次相同动作，只有“兑现生活”每轮限一次。预算不够时不能支付；可以改做筹措。',y+25)
    y=section(c,'哪些数值会保留','预算0–12，承压0–8，能力0–4。体验不低于0，用十位和个位标记记录；如超过49，改用铅笔记总数。所有增减立即截断：超过上限的收益忽略，损失最多扣到0。',y)
    y=section(c,'谈判怎样发生','可以讨论共建、提出下一轮承诺、拒绝投入，或者另起一个工程。不能替别人作生活选择。本版不直接转账、不借贷、不转让已投入的资金；合作由各人向同一工程实际出资完成。口头承诺不强制执行。',y)
    para(c,'没有被卡住的回合：无钱仍可筹措；每张人生牌都有免费C；承压到8也继续完整六幕。压力是综合协调负担，不是居民幸福的客观量表。',31,y,W-62,9.5,leading=15,color=MUTED);c.showPage()

    header(c,6,'PROJECTS','工程建成，也决定收益归谁','公共、合伙与专属代表不同的使用和收益安排；它们获得同样的出资体验。')
    y=section(c,'资金目标 = 2 × 玩家人数','两人局每项需4预算，三人局6，四人局8。第一次共建时锁定一种契约；将出资累计记到工程账本。专属只能由最初发起者继续出资。其他两类任何人都能加入。',121)
    rows=[['公共','任何人出资','承压−2'],['合伙','任何人出资','每位实际出资者预算+1'],['专属','仅发起者出资','发起者预算+人数；以后每轮收入时再+1预']]
    y=table(c,31,y,W-62,[73,145,W-280],['契约','谁能投入','契约收益'],rows,row_h=44,size=10)+23
    y=section(c,'立即建成的三个结算','资金满额且门槛全达到：先执行卡面效果，再执行建成契约收益，最后每位出资者各得1体验。“全体”包括未出资者。以上只结一次；专属后续收入另按每轮执行。能力超上限部分忽略。',y)
    y=section(c,'满资等待与连锁建成','可以先投满资金再等能力；此时不能继续出资。任何能力变化后，按P编号从小到大检查所有满资工程。满足者建成，重复检查直至没有新项目可建成。不可重复领奖。',y)
    y=section(c,'项目怎样跨年代留下','每轮公开连续3张工程：P01–03、04–06、07–09、10–12、13–15、16–18。每两轮是一阶段。进入第3或第5轮，移出旧阶段从未出资的工程；凡已出资，保留到结束。已建成工程始终保留。',y)
    para(c,'只看账本上的实际出资；发起、讨论或承诺不算出资。投入不能超过剩余目标；若只差1，即使原想投2也只付1。',31,y,W-62,9.3,leading=14,color=MUTED);c.showPage()

    header(c,7,'LIFE & ECHO','每个选择，要在下一幕回来','A/B/C是三条可行路径，不是性格分类。')
    img(c,'industry0',31,122,244,157);img(c,'life1',286,122,278,157)
    y=296
    y=section(c,'A：把新能力变成自己的生活','先达到卡面所有门槛，再按牌面支付与获得体验。有人把资源押在工厂的后续回款，有人愿意支付更多进入失重舞会；有些新经历会增加城市承压。A不是固定的最优选项。',y)
    y=section(c,'B与C：另一种有内容的人生','B无技术门槛，按卡面支付与获得体验；它可能通向另一种协作关系、较低强度体验或地面模拟，有时比A留下更多体验。C无门槛、不付款，预算+1；你选择另一种具体活动，保留未来余量。',y)
    y=section(c,'只执行所选项的回声','本轮立即支付与领奖，回声留到下一轮收入之后。读出对应A/B/C的一句，再执行后面的数字；没有数字即只留故事。第6轮在第二圈行动之后兑现自己的回声，之后才结算压力和终局。',y)
    y=section(c,'角色与城市能力','每位角色能力每局一次，用后放“角色已用”。城市能力全桌一次，由当轮先手在自己任一城市行动结束后宣布，并放“城已用”。能力优惠先于余额检验；不免除技术门槛。达到上限时可以留着以后再用。',y)
    para(c,'桌边叙事只需一句：“我选这条路，因为我想……”不想表演可以直接读选项。场景是本轮邀约；门槛未满足时，不把A的高级服务当成已经在本城普及。',31,y,W-62,9.3,leading=14,color=MUTED);c.showPage()

    header(c,8,'WORLD MODEL','四条轨道，留下不同的城市','共同前沿经过本地基础设施、产权与制度过滤，才变成普通人的日常。')
    rows=[['能','稳定供能、储能与循环','决定制造、食物、住房与热的物质余量。'],['造','实体制造、维修和验证','决定图纸到实物、机器扩产与接口能否兑现。'],['生','生命、照护、食品与生态','决定身体与环境变化需要怎样的持续支持。'],['联','算力、通信与跨域基础设施','包括远端具身；高等级强情景还包含运输、驻留与服务体系。']]
    y=table(c,31,126,W-62,[35,170,W-267],['轨道','压缩的能力包','它怎样进入生活'],rows,row_h=61,size=9.7)
    y=section(c,'0、1、2、3、4 怎样理解','0：主要靠外部服务或基础替代；1：局部试点；2：稳定常态；3：广泛部署；4：改变城市组织方式的强情景。它们是游戏门槛，不是现实TRL、覆盖率或技术成功概率。',y+23)
    y=section(c,'同一个数字不代表同一种社会','制造3可以由公营体系、企业园区或合作网络提供。拥有能力不代表居民自动拥有产出；工程契约与个人预算继续决定谁获得回报。城市四轨无需齐头并进。',y)
    y=section(c,'联通4为什么能遇见月面生活','这里的“联”是跨域基础设施能力包，不是网速。它在强情景中同时要求可靠交通、补给和通信；月面牌另要求生命与能源。提高一个数字是桌面抽象，并不表示现实能跳过这些工程。',y)
    para(c,'标记“外推”的牌也不是事实预告；“强假设”额外依赖多项尚未证明的突破与扩散。游戏允许提前体验，但不替未来下结论。',31,y,W-62,9.5,leading=15,color=MUTED);c.showPage()

    header(c,9,'TEN CITIES','十座城，十种进入未来的方式','沿用既有名称与制度方向；本版为十种起始环境，并非完整经济仿真。')
    rows=[]
    for d in WORLD['cities']:rows.append([d['name']+'\n'+d['en'],d['mode'],' / '.join(map(str,d['stats'])),d['flavor']])
    y=table(c,24,123,W-48,[93,64,84,W-289],['城市','制度方向','能 / 造 / 生 / 联','日常现场'],rows,row_h=57,size=8.5)
    para(c,'初始四轨总和均为4。城市特殊能力详见C牌，都是全桌一次。城市不是阵营标签：玩家仍可改变产权安排、产业结构和生活方向。',25,y+13,W-50,9.4,leading=14.5)
    c.showPage()

    header(c,10,'WALKTHROUGH','两个人，把2031年摆一次','以下演算用于教学：铸城，P1维修者，P2移动家庭住户。')
    y=122
    y=section(c,'起点与邀约','城市能1 / 造2 / 生0 / 联1，压2；每人预4。收入3，再执行E01（压+1、全体预+1）：每人预8，压3。公开P01–03。教学固定给P1人生L01，P2人生L02。',y)
    y=section(c,'第一圈：把身体借阅变成可能','P1用维修者的一次能力，以1预算扩建联通：联1→2，预算8→7；这是一次扩建，记次数并消耗第一圈行动。P2向P03身体借阅所出资2，选择合伙：预算8→6；账本P2=2，目标4。',y)
    y=section(c,'生活：各自决定怎样进入','P1选L01-A，与妹妹建独立工作坊，需造2/能1：付3，预算7→4，体验0→1。P2选L02-A，借海边身体陪孩子，需联2/造1：付2，预算6→4，体验0→2。两张牌保留，放A标记；回声尚不结算。',y)
    y=section(c,'第二圈：一项共同工程建成','P1向P03再投2，预算4→2。资金达到4、造1/联1门槛已满足，立即建成。联通+1因本期上限2而忽略；两名合伙人各预+1、各历+1，故P1预3历2、P2预5历3。P2选择筹措，预5→8。',y)
    y=section(c,'一次有意的取舍','这轮提前建成P03，能力收益被上限截断，但双方马上获得合伙回款与出资体验。玩家也可把钱留给其他工程或等2042再完成。卡牌不会替你把延期判成错误。',y)
    y=section(c,'进入2036','压3，没有高压扣款。先手转给P2；下轮先每人预+3，再读两张A回声。角色能力不会刷新。新人生卡只在时代与邀约步骤领取。',y)
    para(c,'教学使用指定牌。正常局人生按年代随机发；若不想让工程升级浪费，可以先读门槛与本期上限再决定投入时点。',31,y,W-62,9.3,leading=14,color=MUTED);c.showPage()

    header(c,11,'ENDING','2066年，城市还愿意接住人吗？','先完成末轮回声，再做压力收尾，最后核对。')
    y=table(c,31,123,W-62,[246,W-308],['共同条件','填入本局结果'],[
      ['已建工程≥人数+1','____ 项 / 目标 ____ 项'],['至少1项III期工程建成','____ 项'],['能＋造＋生＋联≥10','____ / ____ / ____ / ____'],['公共承压≤5','____']],row_h=37,size=10.5)+25
    y=section(c,'四项都达成：未来已有人居住','“新能力终于成为日常。有人留下，有人出发；一座城市已经能把新的愿望接进自己的物质结构。后来者得到的，是一份仍可修改的生活。”',y)
    y=section(c,'未达成时，按这一顺序读主结局','先看承压：若>5，读“高能力、紧绷的生活”；否则若能力合计<10，读“仍要向远方借来的未来”；否则若无III期工程，读“留在熟悉的丰裕里”；其余读“许多愿望，还在施工”。这些都保留已经发生的经历，没有提前失败。',y)
    y=section(c,'再看每个人的足迹','愿景每达成一项得2分，最多6分。与体验相加得到个人足迹；报告数字之后，每人选一张人生牌和一项自己参与的工程，说：“我后来过上了____，但还想继续____。”',y)
    y=section(c,'所有结局的最后一句','取出对应的F01–F05结局牌，读完再读F06。把这一局的城市名、工程与一句记忆留在城史页。',y)
    para(c,'这些门槛是游戏目标，不是对现实好城市的统一定义。不以体验高低推断玩家人格，也不把公共、合伙或专属视为道德排名。',31,y,W-62,9.5,leading=15,color=MUTED);c.showPage()

    header(c,12,'FAQ','会遇到的边界，一次讲清','卡面只写例外；下面是共同规则。')
    qs=[('不够付钱怎么办？','支付必须余额充足；生活可选C，城市行动可筹措。角色减免先算。时代或回声写“预−1”属于损失，最低扣到0，不会欠债。'),('能否先做完两次城市行动再选择？','不能。所有人完成第一圈后才统一进行人生选择，再开始第二圈。这样第一圈会为大家共同打开能力，第二圈承担或投资后续。'),('时代、回声或工程有多个效果？','按印刷顺序逐条执行，每条立即截断上下限。效果中的条件在该句执行时检查；不回溯重算。每张时代牌只执行一次。'),('公共能力或角色何时能用？','按卡面时机。城市能力由本轮先手在自己某次城市行动后使用；角色“行动结束后”能力也只能在本人行动后。使用不另耗行动。'),('经验、扩建与出资怎么计愿景？','体验是“历”。扩建/疏解次数只计这两类城市行动，工程或回声自动变化不算。同一已建工程有过实际投入只计1项，不按金额重复计。'),('完成项目以后能再收收益吗？','建成卡效、一次性契约奖励和出资体验不能再领。唯一持续数值收益是已建专属工程：以后每轮收入时，拥有者每项多1预算。工程“留下”本身不另加数值。'),('两人局少拿了牌，会影响完整剧情吗？','不会。每轮6张人生随机发2–4张，未发牌移出本局。六幕宏观叙事完整保留，个人故事与城市组合会变化。'),('卡牌的图画是否等于技术已经实现？','不是。所有画面是情景插画；“强假设”需额外突破。生物组织、月面居住、感官互通都按卡面和手册边界理解。')]
    y=120
    for q,a in qs:
        txt(c,31,y,q,11.2,'CNB');y+=20;y=para(c,a,31,y,W-62,10,leading=14.2)+15
    c.showPage()

    # 13–14: sources as transparent bridges from evidence to fiction.
    for pg,group in [(13,DATA['evidence'][:6]),(14,DATA['evidence'][6:])]:
        header(c,pg,'EVIDENCE','现实支点与想象的边界' if pg==13 else '从硬未来到具体生活','现实研究说明起点；本游戏负责提出有条件的生活外推。')
        for i,d in enumerate(group):
            xx=31+(i%2)*279;yy=124+(i//2)*209;ww=254
            badge(c,xx,yy,d['id'],INK,CREAM,8)
            txt(c,xx+39,yy,d['title'],11,'CNB')
            sy=yy+24
            sy=para(c,d['source'],xx,sy,ww,7.9,leading=10,color=MUTED)+6
            sy=para(c,'实证/项目：'+d['verified'],xx,sy,ww,8.8,leading=12.1)+7
            sy=para(c,'本局外推：'+d['future'],xx,sy,ww,8.8,leading=12.1)+7
            sy=para(c,'边界：'+d['boundary'],xx,sy,ww,8.2,leading=11.2,color=MUTED)+5
            domain=re.sub(r'^https?://','',d['url']).split('/')[0]
            txt(c,xx,sy,'原始来源 ↗  '+domain,8,'CNB','#24797D')
            c.linkURL(d['url'],(xx,H-sy-13,xx+ww,H-sy),relative=0,thickness=0)
            if sy>yy+197:QA.append({'type':'source_overflow','id':d['id'],'height':sy-yy})
        if pg==14 and len(group)<6:
            xx=310;yy=542
            txt(c,xx,yy,'项目既有线索',12,'CNB')
            para(c,'承接十城设定、工业自举与模块化制造、轨道算力的供能/运载/散热/寿命约束，以及体验式未来学。四条数值轨道与本版全部牌面均为新桌游设计。',xx,yy+25,254,9.6,leading=14.3)
            para(c,'研究核对：2026-11-20。原始链接可在电子版点击；完整URL与可编辑卡牌数据见资源包。',xx,yy+122,254,8.5,leading=13,color=MUTED)
            c.drawImage(str(ROOT/'assets/postai-logo.png'),W-114,H-794,width=83,height=83,mask='auto')
        c.showPage()

    header(c,15,'STORYTELLING','把技术变成值得经历的一幕','这套牌的叙事来自可执行的新生活，再让它积累成城市史。')
    img(c,'life3',31,124,W-62,175)
    y=320
    for title,body in [('让每一幕先有一个诱人的动作','用海边机器人的手给孩子捡贝壳；发明一种朋友才能读懂的触感；让家在午后变成剧场；进入失重舞会；把自己参与制造的零件送往轨道。玩家首先得到“我想做这件事”的理由。'),('把宏观变化装进一件小事','工厂复制进入最后一箱关节；自动科研进入一副尚在验证的手；轨道工业进入家庭晚餐与探亲窗口；能源系统进入居民作息。玩家通过材料、维护与契约看见尺度之间的因果。'),('前面的承诺要回来','下一轮只读已选回声，最后再把某张经历与一项工程连起来。使用城市史记录已发生的东西，避免在结尾凭空补写成功、死亡或技术突破。'),('复盘保持开放','可在开局与结尾询问同一题：“这种未来现在离你感觉有多远？”再问“哪次选择改变了判断？”这些不是预测考试；正式收集研究数据需要另行说明用途与取得同意。')]:y=section(c,title,body,y,size=10.3)
    c.showPage()

    header(c,16,'PRINT & INVENTORY','A4原尺寸打印，沿共边直接切','没有额外出血，没有页外裁切标，没有卡牌之间的白缝。')
    y=section(c,'文件与打印顺序','九宫格卡牌11页，每页9张，每张70×99毫米。包含96张游戏牌与3张图例辅助牌。桌面组件6页、手册16页。完整文件33页：手册1–16，桌面17–22，卡牌23–33。',123)
    rows=[['九宫格卡牌','A4竖向，单面，实际大小100%','从左切70/140mm；从上切99/198mm。'],['玩家板','桌面组件第3–4页','沿148.5mm水平中线分成两张玩家板。'],['标记','桌面组件第5页','页顶15列×4行，14×14.85mm，共60枚。'],['城市板/账本/城史','桌面第1、2、6页','整张使用，无须裁切。']]
    y=table(c,31,y,W-62,[85,204,W-351],['材料','输出','裁切或使用'],rows,row_h=50,size=9.3)+22
    y=section(c,'输出设置','选择无边距、关闭自动放大与“适合页面”。若设备不能无边距，请交给支持原尺寸满版输出的打印服务。文件本身的页面、裁切框与出血框均是同一个210×297毫米A4范围。纸张外沿直接作卡牌外边。',y)
    y=section(c,'纸张与文字','卡牌可用约200–250g哑光纸，桌面页用普通纸。场景引子、选择与回声已按小卡重编；完整叙事保留在数据文件。全部中文字体已嵌入PDF；正文为矢量文字。单面牌无需对齐背面，下一轮牌堆可以翻面或用规则书遮住。',y)
    txt(c,31,y,'50毫米校准',10,'CNB');line(c,31,y+31,31+50*MM,y+31,INK,1)
    for xx in[31,31+50*MM]:line(c,xx,y+25,xx,y+37,INK,1)
    txt(c,31,y+43,'用尺量两端刻线，应为50mm。',8.5,color=MUTED)
    para(c,'图标读法：门槛用“≥”，支付/获得用“−/+”；时钟区只读已选回声。H01–H03为辅助牌。版本1.1已做规则及版式检查，尚未真人桌测。插画为生成情景，标识沿用项目素材。',31,y+78,W-62,9.1,leading=14,color=MUTED)
    c.showPage();c.save();return p

def set_boxes(paths):
    # Exactly A4: do not invent printing bleed or crop marks outside the sheet.
    from pypdf.generic import RectangleObject
    for p in paths:
        r=PdfReader(str(p));w=PdfWriter()
        w.clone_document_from_reader(r)
        for pg in w.pages:
            for key in ['mediabox','cropbox','trimbox','bleedbox']:
                setattr(pg,key,RectangleObject([0,0,W,H]))
        temp=p.with_suffix('.tmp.pdf');w.write(str(temp));temp.replace(p)

def merge_full(rules,boards,cards):
    p=OUT/'十万个未来_未来已有人居住_完整打印版.pdf';w=PdfWriter()
    for part,name in [(rules,'01 规则与城市手册'),(boards,'02 城市板、玩家板与标记'),(cards,'03 96张满版大画幅卡牌')]:
        w.append(str(part),outline_item=name)
    w.add_metadata({'/Title':'十万个未来：未来已有人居住 · 完整打印版','/Author':'后AI研究所 · POST-AI INSTITUTE'})
    w.write(str(p));return p

def main():
    font_build();cards=make_cards('large');compact=make_cards('compact');boards=make_boards();rules=make_rules()
    set_boxes([cards,compact,boards,rules]);full=merge_full(rules,boards,cards)
    (TMP/'layout_checks.json').write_text(json.dumps(QA,ensure_ascii=False,indent=2))
    for p in[rules,boards,cards,compact,full]:print(p.name,len(PdfReader(str(p)).pages),p.stat().st_size)
    print('LAYOUT_FLAGS',json.dumps(QA,ensure_ascii=False))
    if QA:sys.exit(2)

if __name__=='__main__':
    from build_fullart import main as fullart_main
    fullart_main()
