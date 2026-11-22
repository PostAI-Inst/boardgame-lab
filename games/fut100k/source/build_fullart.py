#!/usr/bin/env python3
"""FUT100K 1.2. Full-art 70 x 99 mm cards, tabletop, and story companion.

All mechanics use the original JSON. Compact labels are a presentation layer.
Run: python3 source/build_fullart.py
"""
import json, math, sys
from pathlib import Path
from collections import Counter
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from pypdf.generic import RectangleObject
import build_pdf as b
import build_nine as old

ROOT=b.ROOT; OUT=b.OUT; TMP=b.TMP
W=b.W; H=b.H; MM=b.MM; CW=W/3; CH=H/3
PAD=7.6; BW=CW-2*PAD
DARK='#091E27'; PANEL='#0C2730'; WHITE='#F7F8EC'; PALE='#CBDCD5'
INK='#18353A'; CREAM='#F4F0E6'; TEAL='#9CE9D6'; GOLD='#F5CC82'; CORAL='#F0A58B'
COLORS={'能':'#F3CD7E','造':'#9DCDF0','生':'#B5DFA4','联':'#CDBEED','budget':GOLD,'xp':TEAL,'pressure':CORAL,'echo':TEAL}
ACC={'life':TEAL,'project':GOLD,'era':'#A9D9F6','city':GOLD,'role':'#E5B7D3','ambition':'#C2E6A9','ending':GOLD}
CAT={'life':'人生','project':'工程','era':'时代','city':'城市','role':'居民','ambition':'愿景','ending':'结局'}
CP=json.loads((ROOT/'data/fullart_copy.json').read_text())
PRINT=json.loads((ROOT/'data/print_other_9up.json').read_text())
CHECKS=[]; MANIFEST=[]
ART={
 'L01':'factory_fullart','L23':'factory_fullart','L32':'factory_fullart',
 'L13':'ice_exploration_fullart','L20':'migrating_street_fullart',
 'L26':'orbital_dance_fullart','P01':'factory_fullart','P07':'factory_fullart','P12':'factory_fullart',
 'P08':'migrating_street_fullart','P17':'migrating_street_fullart','R01':'migrating_street_fullart','R02':'factory_fullart',
 'E01':'factory_fullart','E04':'migrating_street_fullart','C05':'factory_fullart','C10':'migrating_street_fullart',
 'W02':'factory_fullart','W04':'migrating_street_fullart','W08':'orbital_dance_fullart','F05':'factory_fullart','F06':'orbital_dance_fullart',
}

def rect(c,x,y,w,h,fill,stroke=None,lw=.4): b.rect(c,x,y,w,h,fill,stroke,lw)
def text(c,x,y,s,size=8,font='CN',color=WHITE,align='left'): b.txt(c,x,y,str(s),size,font,color,align)
def line(c,x,y,x2,y2,color=PALE,lw=.4): b.line(c,x,y,x2,y2,color,lw)
def tint(c,x,y,w,h,color,alpha):
    # Color assignment resets alpha in ReportLab: apply alpha after the color.
    c.saveState();c.setFillColor(HexColor(color));c.setFillAlpha(alpha)
    c.rect(x,H-y-h,w,h,fill=1,stroke=0);c.restoreState()
def para(c,s,x,y,w,size=8.4,leading=None,font='CN',color=WHITE,maxlines=None,tag=''):
    leading=leading or size*1.32
    rows=b.wrap(s,w,size,font)
    if maxlines and len(rows)>maxlines:CHECKS.append({'id':tag,'kind':'line_count','actual':len(rows),'max':maxlines,'text':s})
    for i,row in enumerate(rows):text(c,x,y+i*leading,row,size,font,color)
    return y+len(rows)*leading

def icon(c,key,x,y,size=9,color=None):old.icon(c,key,x,y,size,color or COLORS.get(key,TEAL))

def badge(c,x,y,label,color=TEAL,size=6.5):
    ww=pdfmetrics.stringWidth(label,'CNB',size)+9
    tint(c,x,y,ww,13,DARK,.91)
    text(c,x+4.5,y+2.0,label,size,'CNB',color)
    return ww

def metric_width(key,value,size=8.5):
    key2=key.removeprefix('all_'); scope='全员' if key.startswith('all_') else ''
    val=('+' if value>0 else '−')+str(abs(value))
    return (len(scope)*size+3 if scope else 0)+size+3+(size+1 if key2 in b.TRACKS else 0)+pdfmetrics.stringWidth(val,'ENB',size)+5

def metrics(c,values,x,y,size=8.5,align='left',dark=False):
    ww=sum(metric_width(k,v,size)for k,v in values.items())
    if align=='right':x-=ww
    for key,value in values.items():
        key2=key.removeprefix('all_'); scope='全员' if key.startswith('all_') else ''
        co=old.ICOL.get(key2,INK) if dark else COLORS.get(key2,TEAL)
        if scope:text(c,x,y,scope,size,'CNB',INK if dark else PALE);x+=size*len(scope)+3
        icon(c,key2,x,y+.4,size,co);x+=size+3
        if key2 in b.TRACKS:text(c,x,y,key2,size,'CNB',INK if dark else WHITE);x+=size+1
        ss=('+' if value>0 else '−')+str(abs(value))
        text(c,x,y,ss,size,'ENB',co);x+=pdfmetrics.stringWidth(ss,'ENB',size)+5
    return ww

def gate(c,values,x,y,label='A需',dark=False):
    sz=7.4; labelw=pdfmetrics.stringWidth(label,'CNB',sz)+7
    ww=labelw+len(values)*34+6
    if not dark:
        tint(c,x,y,ww,15.5,DARK,.92)
    text(c,x+4,y+3,label,sz,'CNB',INK if dark else WHITE)
    xx=x+labelw+3
    for k,n in values.items():
        icon(c,k,xx,y+3.5,7.8,old.ICOL[k] if dark else COLORS[k])
        text(c,xx+10,y+2.8,k,sz,'CNB',INK if dark else WHITE)
        text(c,xx+18,y+3.0,'≥'+str(n),sz,'ENB',INK if dark else WHITE)
        xx+=34
    if ww>BW:CHECKS.append({'kind':'gate_width','actual':ww,'max':BW})
    return ww

def hero(c,d,kind,x,y,end=228,hook='',topnote=''):
    """Artwork fills the card; only the bottom 18.8% is an opaque HUD."""
    b.img(c,ART.get(d['id'],d.get('art','space3')),x,y,CW,CH)
    # Gentle lower-image shadow preserves scene information behind the title.
    for i in range(112):
        tint(c,x,y+end-56+i*.5,CW,.5,DARK,.85*(i/111)**.75)
    label=CAT[kind]
    if kind=='life':label+=' · '+d['level']
    if kind=='project':label+=' · '+['I','II','III'][d['phase']-1]+'期'
    badge(c,x+PAD,y+7,label,ACC[kind])
    right=d['id']+((' · '+str(d['year'])) if 'year'in d else '')
    ww=pdfmetrics.stringWidth(right,'ENB',6.9)+10
    tint(c,x+CW-PAD-ww,y+7,ww,13,DARK,.91)
    text(c,x+CW-PAD-5,y+9,right,6.9,'ENB',WHITE,'right')
    if topnote:badge(c,x+PAD,y+24,topnote,PALE,6.4)
    title=d.get('title',d.get('name',''))
    size=min(13.4,(BW-1)/max(len(title),1))
    text(c,x+PAD,y+end-36,title,size,'CNB',WHITE)
    if hook:
        hs=min(8.1,(BW-2)/max(len(hook),1))
        text(c,x+PAD,y+end-15,hook,hs,'CN',WHITE)
    rect(c,x,y+end,CW,CH-end,PANEL)
    rect(c,x+PAD,y+end,BW,1.0,ACC[kind])
    MANIFEST[-1]['image_fraction']=round(end/CH,4)
    MANIFEST[-1]['art']=ART.get(d['id'],d.get('art','space3'))

def life_card(c,d,x,y):
    cp=CP['life'][d['id']]
    hero(c,d,'life',x,y,228,cp['hook'],f'故事 {d["round"]:02d} · {d["id"]} / 回声可先查')
    gate_y=74 if d['id']=='L26' else 43
    gate(c,d['gate'],x+PAD,y+gate_y)
    for i,k in enumerate('abc'):
        yy=y+234.1+i*14.7; op=d[k]
        rect(c,x+PAD,yy,10.5,10.5,TEAL if k=='a' else '#39595C')
        text(c,x+PAD+5.25,yy-.05,k.upper(),7.6,'ENB',DARK if k=='a' else WHITE,'center')
        vals={}
        if op['cost']:vals['budget']=-op['cost']
        if op.get('budget'):vals['budget']=op['budget']
        if op.get('xp'):vals['xp']=op['xp']
        mw=sum(metric_width(kk,v,8.4)for kk,v in vals.items())
        size=8.2; maxw=BW-15-mw
        tw=pdfmetrics.stringWidth(cp[k],'CNB',size)
        if tw>maxw:CHECKS.append({'id':d['id']+k,'kind':'choice_width','actual':tw,'max':maxw})
        text(c,x+PAD+15,yy+.15,cp[k],size,'CNB')
        metrics(c,vals,x+CW-PAD+4,yy+.05,8.4,'right')

def project_card(c,d,x,y):
    hero(c,d,'project',x,y,228,CP['projects'][d['id']]['hook'],d['level']+' · '+d['source'])
    gate(c,d['gate'],x+PAD,y+43,'建成需')
    icon(c,'budget',x+PAD,y+234,9)
    text(c,x+PAD+13,y+233.2,'目标 2 × 人数',9.1,'CNB',GOLD)
    text(c,x+CW-PAD,y+235,f'第{d["round"]}轮公开',7.1,'CN',PALE,'right')
    text(c,x+PAD,y+250,'建成',8.1,'CNB',PALE)
    metrics(c,d['gain'],x+PAD+24,y+248.5,9.6)
    text(c,x+PAD,y+267,'再结契约；实际出资者各',7.0,'CN',PALE)
    metrics(c,{'xp':1},x+CW-PAD+4,y+265.6,8.7,'right')

ERA_LINES={
 'E01':['先压+1；全员预+1。'],
 'E02':['先压+1。若联≥2：全员预+1；','否则：压−1。'],
 'E03':['先压+1。若生≥2：全员历+1；','否则：全员预+1。'],
 'E04':['先压+2。若能、造均≥2：压−1；','否则：全员预+1。'],
 'E05':['先压+1。若能≥2、造≥3、联≥3：','全员预+2；否则：全员历+1。'],
 'E06':['先压+1。若至少两项能力≥3：','全员历+1；否则：压−1。'],
}

def era_card(c,d,x,y):
    hero(c,d,'era',x,y,228,'本轮执行一次 · 完整场景见故事册',f'故事 {d["round"]:02d} · 条件情景')
    for i,s in enumerate(ERA_LINES[d['id']]):text(c,x+PAD,y+234+i*11.5,s,8.0,'CNB')
    text(c,x+PAD,y+266,'能力上限 '+str(2+(d['round']-1)//2),8.0,'CNB',TEAL)
    text(c,x+CW-PAD,y+267,f'公开 P{3*d["round"]-2:02d}–{3*d["round"]:02d}',7.2,'CN',PALE,'right')

def city_card(c,d,x,y):
    hero(c,d,'city',x,y,228,d['mode']+' / '+d['en'], '开局四轨 · 城市能力全桌一次')
    sw=(BW-9)/4
    for i,(key,val)in enumerate(zip(b.TRACKS,d['stats'])):
        xx=x+PAD+i*(sw+3)
        tint(c,xx,y+43,sw,21,DARK,.92)
        icon(c,key,xx+4,y+49,9);text(c,xx+17,y+48,key,7.8,'CNB');text(c,xx+sw-4,y+46,val,10.2,'ENB',WHITE,'right')
    text(c,x+PAD,y+234,CP['cities'][d['id']]['power'],11.0,'CNB',GOLD)
    text(c,x+PAD,y+253,'全桌一次；先手在自己的行动后发动。',7.6,'CN')
    text(c,x+PAD,y+266,'能力仍受当前年代上限；用后放已用标记。',7.0,'CN',PALE)

def role_card(c,d,x,y):
    hero(c,d,'role',x,y,233,d['identity'],'角色特长 · 整局可用一次')
    para(c,CP['roles'][d['id']]['power'],x+PAD,y+241,BW,9.0,12.3,'CNB',maxlines=2,tag=d['id'])
    text(c,x+PAD,y+268,'发动后，把“已用”标记放到此牌上。',7.0,'CN',PALE)

def ambition_card(c,d,x,y):
    hero(c,d,'ambition',x,y,226,d['desc'],'公开愿景 · 每项2分 / 最多6分')
    for i,g in enumerate(CP['ambitions'][d['id']]['goals']):
        yy=y+232+i*13.4; icon(c,'check',x+PAD,yy+.5,8,TEAL)
        para(c,g,x+PAD+12,yy,BW-12,8.2,10.4,'CNB',maxlines=1,tag=d['id']+' goal')
    text(c,x+PAD,y+272,'终局核对；承诺出资不算实际出资。',6.5,'CN',PALE)

END_CONDITIONS={
 'F01':'四项共同目标全部达成。',
 'F02':'优先检查：终局压>5。',
 'F03':'压≤5，四轨合计<10。',
 'F04':'压≤5、四轨合计≥10；无Ⅲ期已建工程。',
 'F05':'前述均不适用，已建工程少于人数+1。',
 'F06':'读完适用主结局后，全桌再读这一张。',
}

def ending_card(c,d,x,y):
    hero(c,d,'ending',x,y,233,CP['endings'][d['id']]['hook'],'故事 07 · '+d['id'])
    yy=para(c,END_CONDITIONS[d['id']],x+PAD,y+240,BW,8.5,11.5,'CNB',maxlines=2,tag=d['id'])
    text(c,x+PAD,y+268,'翻到故事册07，读结局并接上自己的后来。',7.0,'CN',PALE)

def quicks():
    q=b.quicks()
    q[0]['blocks'][1]=('02 时代与邀约','改上限→读时代→公开3工程；依序看2张人生牌，留1放回1到底。')
    q[0]['blocks'][3]=('04 过自己的生活','全员先锁定A/B/C，再按先手顺序结算，记下编号与选择。')
    q[3]['blocks'][4]=('留下参与的证据','人生选择记在玩家板；工程与出资标记留在已建区。扩建/疏解划记。')
    return q

def quick_card(c,d,x,y):
    rect(c,x,y,CW,CH,DARK)
    text(c,x+PAD,y+9,'桌边速查  /  '+d['id'],6.8,'CNB',TEAL)
    text(c,x+PAD,y+25,d['title'],13.3,'CNB')
    line(c,x+PAD,y+48,x+CW-PAD,y+48,'#416166')
    yy=y+57
    for title,body in d['blocks']:
        text(c,x+PAD,yy,title,8.2,'CNB',GOLD);yy+=12
        yy=para(c,body,x+PAD,yy,BW,7.6,10.1,color=WHITE)+6
    if yy>y+CH-6:CHECKS.append({'id':d['id'],'kind':'quick_bottom','actual':yy-y,'max':CH-6})
    MANIFEST[-1]['image_fraction']=0

def helper_card(c,d,x,y):
    rect(c,x,y,CW,CH,DARK)
    text(c,x+PAD,y+9,'开桌助手  /  '+d['id'],6.8,'CNB',TEAL)
    text(c,x+PAD,y+25,d['title'],13,'CNB')
    line(c,x+PAD,y+48,x+CW-PAD,y+48,'#416166')
    if d['id']=='H01':
        rows=[('能','能｜能源与循环'),('造','造｜制造与维修'),('生','生｜生命与照护'),('联','联｜算力与联通'),('budget','预｜个人预算'),('xp','历｜个人体验'),('pressure','压｜城市承压'),('echo','回声｜下一轮兑现')]
        for i,(key,label)in enumerate(rows):
            yy=y+61+i*23;icon(c,key,x+PAD+2,yy,12);text(c,x+PAD+24,yy+1,label,9.1,'CNB')
        text(c,x+PAD,y+257,'≥ 门槛    + 获得    − 支付或失去',8.0,'CN',PALE)
    elif d['id']=='H02':
        blocks=[('看2张，留下想进入的未来','按先手顺序看本轮2张人生牌，留1张，另一张放回同堆底。'),('选之前，后果也可查','按牌上“故事页·L编号”查完整场景与全部回声。故事册需打开。'),('选之后，只执行一个后来','A需满足全部门槛；B/C无门槛。全员先锁定，再依序结算。'),('下轮再读你留下的回声','只执行自己已选的A/B/C。第六轮回声在本轮收尾时结算。')]
        yy=y+59
        for title,body in blocks:
            text(c,x+PAD,yy,title,8.6,'CNB',GOLD);yy+=14
            yy=para(c,body,x+PAD,yy,BW,8.0,10.8)+12
    else:
        blocks=[('棋盘上的行动允许同选','每轮放两枚行动标记，每圈放一枚。多人可选同一区，不抢格。'),('出资标记不是第二份预算','例如预算8→6，在工程旁放自己的“投2”；不可撤回或转移。'),('新工程卡槽不是项目上限','三槽只摆本轮新公开工程。旧牌移到板外储备、在建或已建区。'),('建成后，把证据一起留下','工程牌、契约与全部出资标记一起移到已建区，终局核对愿景。')]
        yy=y+59
        for title,body in blocks:
            text(c,x+PAD,yy,title,8.4,'CNB',GOLD);yy+=14
            yy=para(c,body,x+PAD,yy,BW,7.9,10.7)+11
    MANIFEST[-1]['image_fraction']=0

def make_cards():
    p=OUT/'十万个未来_九宫格图标卡牌_A4_每页9张.pdf'
    c=b.new_canvas(p,'十万个未来 · 满画幅1.2 · A4每页9张 · 70×99mm')
    deck=[('life',d)for d in b.DATA['life']]+[('project',d)for d in b.DATA['projects']]+[('era',d)for d in b.WORLD['eras']]+[('city',d)for d in b.WORLD['cities']]+[('role',d)for d in b.WORLD['roles']]+[('ambition',d)for d in b.WORLD['ambitions']]+[('quick',d)for d in quicks()]+[('ending',d)for d in b.endings()]
    assert len(deck)==96
    deck += [('helper',{'id':'H01','title':'图标就是桌上的语言'}),('helper',{'id':'H02','title':'把生活选成自己的'}),('helper',{'id':'H03','title':'让桌面留下行动'})]
    funcs={'life':life_card,'project':project_card,'era':era_card,'city':city_card,'role':role_card,'ambition':ambition_card,'quick':quick_card,'ending':ending_card,'helper':helper_card}
    for pn in range(11):
        c.bookmarkPage(f'cards{pn+1}');c.addOutlineEntry(f'卡页{pn+1:02d} · {deck[pn*9][1]["id"]}–{deck[pn*9+8][1]["id"]}',f'cards{pn+1}')
        for i,(kind,d)in enumerate(deck[pn*9:pn*9+9]):
            x=i%3*CW;y=i//3*CH
            MANIFEST.append({'id':d['id'],'type':kind,'page':pn+1,'row':i//3+1,'col':i%3+1,'size_mm':[70,99]})
            c.saveState();clip=c.beginPath();clip.rect(x,H-y-CH,CW,CH);c.clipPath(clip,stroke=0)
            funcs[kind](c,d,x,y);c.restoreState()
        # Hairlines sit on the actual cuts. No gutters, outer crop marks or bleed.
        for xx in [CW,2*CW]:line(c,xx,0,xx,H,'#648B8A',.25)
        for yy in [CH,2*CH]:line(c,0,yy,W,yy,'#648B8A',.25)
        c.showPage()
    c.save()
    (ROOT/'data/card_manifest_fullart.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2)+'\n')
    return p

def page_base(c,kind,page,title,subtitle=''):
    rect(c,0,0,W,H,CREAM);rect(c,0,0,W,31,DARK)
    text(c,26,9,'后AI研究所 / 十万个未来',8.1,'CNB',WHITE)
    text(c,W-26,9,f'{kind}  {page:02d} / 1.2',7.9,'CN',TEAL,'right')
    text(c,26,47,title,25,'CNB',INK)
    if subtitle:para(c,subtitle,27,86,W-54,10.0,14.8,color=INK)
    line(c,26,H-31,W-26,H-31,'#AABDB4',.45)
    text(c,26,H-24,'未来已有人居住 · 可选择的世界，持续的后果',7.2,'CN',INK)
    text(c,W-26,H-24,f'{kind} / {page:02d}',7.2,'CN',INK,'right')

def story_entry(c,d,x,y,w,h):
    rect(c,x,y,w,h,'#E8EDE3')
    badge(c,x+9,y+8,d['id'],TEAL,8.6)
    text(c,x+48,y+9,d['title'],12.2,'CNB',INK)
    yy=para(c,d['scene'],x+10,y+32,w-20,9.2,12.3,color=INK)+7
    for k in 'abc':
        text(c,x+11,yy,k.upper(),8.6,'ENB',INK)
        echo=d[k]['echo'];vals=d[k]['echo_effect']
        yy2=para(c,echo,x+26,yy,w-38,8.9,11.7,color=INK)
        if vals:
            metrics(c,vals,x+w-10,yy2-.1,8.5,'right',True)
            yy=yy2+13
        else:
            text(c,x+w-11,yy2,'无数值变化',7.4,'CN','#526C66','right');yy=yy2+12
    if yy>y+h-5:CHECKS.append({'id':d['id'],'kind':'story_bottom','actual':yy-y,'max':h-5})

def make_stories():
    p=OUT/'十万个未来_故事与回声册.pdf';c=b.new_canvas(p,'十万个未来 · 故事与回声册 · 1.2')
    for r,era in enumerate(b.WORLD['eras'],1):
        c.bookmarkPage(f'story{r}');c.addOutlineEntry(f'{r:02d} / {era["year"]} / L{6*r-5:02d}–L{6*r:02d}',f'story{r}')
        rect(c,0,0,W,H,CREAM);rect(c,0,0,W,104,DARK)
        text(c,26,12,f'故事 {r:02d}  /  LIFE ECHOES',8.1,'CNB',TEAL)
        text(c,26,34,str(era['year']),33,'ENB',WHITE)
        text(c,151,43,era['title'],18.0,'CNB',WHITE)
        text(c,27,83,'选前可查全部回声；下轮只执行已选分支。第六轮回声在本轮收尾兑现。',8.3,'CN',PALE)
        para(c,era['narrative'],27,115,W-54,10,13.8,color=INK,maxlines=2,tag=era['id']+' narrative')
        gw=(W-62)/2; gh=204; gy=158
        for j,d in enumerate(b.DATA['life'][(r-1)*6:r*6]):
            c.bookmarkHorizontalAbsolute(d['id'],H-(gy+j//2*(gh+9)))
            c.addOutlineEntry(d['id']+' '+d['title'],d['id'],level=1)
            story_entry(c,d,26+j%2*(gw+10),gy+j//2*(gh+9),gw,gh)
        text(c,26,H-21,'人生牌为条件情景；原始设定与研究来源见素材包。',7.2,'CN',INK)
        text(c,W-26,H-21,f'故事 {r:02d}',7.7,'CNB',INK,'right')
        c.showPage()
    c.bookmarkPage('story7');c.addOutlineEntry('07 / 六种城市后来', 'story7')
    page_base(c,'故事',7,'六种城市后来','先检查共同目标；否则依 F02→F05 找到适用主结局。读完后，全桌再读 F06。')
    gw=(W-62)/2;gh=210;gy=143
    for i,d in enumerate(b.endings()):
        x=26+i%2*(gw+10);y=gy+i//2*(gh+9)
        rect(c,x,y,gw,gh,'#E8EDE3');badge(c,x+10,y+9,d['id'],GOLD,8.3)
        text(c,x+48,y+10,d['title'],11.7,'CNB',INK)
        yy=para(c,d['condition'],x+10,y+33,gw-20,8.3,11.2,'CNB',INK)+9
        yy=para(c,d['story'],x+10,yy,gw-20,9.1,12.4,color=INK)+9
        prompt=d['prompt'].replace('把这句话留在城史页。','把这句话记在玩家板的“一句记住的事”里。')
        yy=para(c,prompt,x+10,yy,gw-20,8.6,11.7,'CNB',INK)
        if yy>y+gh-8:CHECKS.append({'id':d['id'],'kind':'ending_story_bottom','actual':yy-y,'max':gh-8})
    c.showPage();c.save();return p

def make_rules():
    data=json.loads((ROOT/'data/rules_12.json').read_text())
    if isinstance(data,dict):data=data.get('pages',data.get('rules',[]))
    assert len(data)==6
    p=OUT/'十万个未来_规则与城市手册.pdf';c=b.new_canvas(p,'十万个未来 · 开桌指南1.2')
    for pn,page in enumerate(data,1):
        c.bookmarkPage(f'rules{pn}');c.addOutlineEntry(f'{pn:02d} '+page['title'],f'rules{pn}')
        page_base(c,'规则',pn,page['title'],page.get('subtitle',''))
        yy=130
        # The six pages are deliberately typeset as a readable guide, not cards.
        for j,section in enumerate(page['sections']):
            rect(c,27,yy+1,4,15,INK)
            text(c,39,yy,section['title'],12.5,'CNB',INK);yy+=23
            yy=para(c,section['body'],39,yy,W-77,10.6,15.6,color=INK)+19
        if yy>H-42:CHECKS.append({'id':f'rules{pn}','kind':'rules_bottom','actual':yy,'max':H-42})
        c.showPage()
    c.save();return p

def boxes(path,width=W,height=H):
    reader=PdfReader(str(path));writer=PdfWriter();writer.clone_document_from_reader(reader)
    for pg in writer.pages:
        for key in ['mediabox','cropbox','trimbox','bleedbox']:setattr(pg,key,RectangleObject([0,0,width,height]))
    temp=path.with_suffix('.tmp.pdf');writer.write(str(temp));temp.replace(path)

def merge_full(rules,tabletop,cards,stories):
    p=OUT/'十万个未来_未来已有人居住_完整打印版.pdf';w=PdfWriter()
    for path,title in [(rules,'01 开桌指南 · 6页'),(tabletop,'02 棋盘、玩家板与标记 · 5页'),(cards,'03 满画幅卡牌 · 11页，每页9张'),(stories,'04 故事与回声 · 7页')]:w.append(str(path),outline_item=title)
    w.add_metadata({'/Title':'十万个未来：未来已有人居住 · 满画幅1.2','/Author':'后AI研究所 · POST-AI INSTITUTE','/Subject':'A4零出血 · 70×99mm · 可打印合作叙事桌游原型'})
    w.write(str(p));return p

def main():
    import board_fullart
    b.font_build()
    cards=make_cards();stories=make_stories();rules=make_rules();boards=board_fullart.make_tabletop()
    for p in [cards,stories,rules,Path(boards['a4'])]:boxes(Path(p))
    boxes(Path(boards['a3']),W*2,H)
    full=merge_full(rules,boards['a4'],cards,stories)
    report={'version':'1.2','layout_issues':CHECKS,'base_issues':b.QA,'board_issues':board_fullart.ISSUES,'cards':len(MANIFEST),'game_cards':96,'helpers':3,'a4_card_mm':[70,99],'external_bleed_mm':0,'image_fraction_by_type':{k:[min(d['image_fraction']for d in MANIFEST if d['type']==k),max(d['image_fraction']for d in MANIFEST if d['type']==k)]for k in sorted(set(d['type']for d in MANIFEST))}}
    (TMP/'fullart_layout_checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    for p in [rules,Path(boards['a4']),cards,stories,Path(boards['a3']),full]:print(p.name,len(PdfReader(str(p)).pages),p.stat().st_size)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if CHECKS or b.QA or board_fullart.ISSUES:sys.exit(2)

if __name__=='__main__':main()
