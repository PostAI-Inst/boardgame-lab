#!/usr/bin/env python3
"""Legacy FUT100K 1.1 drawing helpers retained for icon reuse.

Game numbers are read from the original data. Print text is a separate layer.
The command-line entry now forwards to the current 1.2 builder.
"""
import json, math, sys
from pathlib import Path
from collections import Counter
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from pypdf import PdfReader, PdfWriter
import build_pdf as b

ROOT=b.ROOT; W=b.W; H=b.H; MM=b.MM; CW=W/3; CH=H/3
OUT=b.OUT; TMP=b.TMP
INK=b.INK; DARK=b.DARK; CREAM='#F7F0E3'; MUTED='#526C69'
TEAL='#6AC6C1'; GOLD='#E7B466'; LINE='#C6D3CA'
P=7.2; BW=CW-2*P
LIFE=json.loads((ROOT/'data/print_life_9up.json').read_text())
OTHER=json.loads((ROOT/'data/print_other_9up.json').read_text())
CHECKS=[]; MANIFEST=[]
ICOL={'能':'#A56A22','造':'#557F92','生':'#53846A','联':'#69659C','budget':'#956028','xp':'#278183','pressure':'#A75942','echo':'#4C7776'}
ACC={'life':TEAL,'project':GOLD,'era':'#9AC0E0','city':'#D7C07F','role':'#D9B4CC','ambition':'#BED195','quick':'#A8C7D1','ending':'#E4C584','helper':TEAL}
CAT={'life':'人生','project':'工程','era':'时代','city':'城市','role':'居民','ambition':'愿景','quick':'速查','ending':'结局','helper':'图例'}

def rect(c,x,y,w,h,fill,stroke=None,lw=.4): b.rect(c,x,y,w,h,fill,stroke,lw)
def text(c,x,y,s,size=8,font='CN',color=INK,align='left'): b.txt(c,x,y,str(s),size,font,color,align)
def rule(c,x,y,w,color=LINE,lw=.3): b.line(c,x,y,x+w,y,color,lw)

def para(c,s,x,y,w,size=8,leading=10,font='CN',color=INK,maxlines=None,tag=''):
    lines=b.wrap(s,w,size,font)
    if maxlines and len(lines)>maxlines: CHECKS.append({'id':tag,'kind':'too_many_lines','lines':len(lines),'max':maxlines,'text':s})
    for i,line in enumerate(lines): text(c,x,y+i*leading,line,size,font,color)
    return y+len(lines)*leading

def icon(c,key,x,y,size=8,color=None):
    """Simple monochrome vector shapes, never system emoji."""
    color=color or ICOL.get(key,INK)
    c.saveState(); c.translate(x,H-y-size); c.scale(size,size)
    c.setStrokeColor(HexColor(color)); c.setFillColor(HexColor(color))
    c.setLineWidth(.085); c.setLineCap(1);c.setLineJoin(1)
    p=c.beginPath()
    if key=='能':
        pts=[(.58,.96),(.15,.43),(.45,.43),(.36,.04),(.86,.61),(.56,.61)]
        p.moveTo(*pts[0])
        for pt in pts[1:]: p.lineTo(*pt)
        p.close();c.drawPath(p,fill=1,stroke=0)
    elif key=='造':
        for i in range(32):
            a=math.tau*i/32; r=.44 if i%4 in (0,1) else .34
            xx=.5+r*math.cos(a);yy=.5+r*math.sin(a)
            p.moveTo(xx,yy) if i==0 else p.lineTo(xx,yy)
        p.close();c.drawPath(p,fill=0,stroke=1);c.circle(.5,.5,.13,stroke=1,fill=0)
    elif key=='生':
        p.moveTo(.17,.12);p.curveTo(.04,.64,.43,.92,.91,.92);p.curveTo(.93,.42,.64,.10,.17,.12)
        c.drawPath(p,fill=0,stroke=1);c.line(.10,.05,.76,.77)
    elif key=='联':
        pts=[(.18,.22),(.82,.22),(.5,.83)]
        for a,z in [(0,1),(1,2),(2,0)]:c.line(*pts[a],*pts[z])
        c.setFillColor(HexColor(color))
        for xx,yy in pts:c.circle(xx,yy,.12,stroke=0,fill=1)
    elif key=='budget':
        c.circle(.5,.5,.42,stroke=1,fill=0);c.circle(.5,.5,.25,stroke=1,fill=0);c.line(.39,.5,.61,.5)
    elif key=='xp':
        pts=[(.5,.97),(.64,.64),(.97,.5),(.64,.36),(.5,.03),(.36,.36),(.03,.5),(.36,.64)]
        p.moveTo(*pts[0])
        for pt in pts[1:]:p.lineTo(*pt)
        p.close();c.drawPath(p,stroke=1,fill=0)
    elif key=='pressure':
        c.arc(.07,.16,.93,1.02,0,180);c.line(.07,.57,.07,.15);c.line(.93,.57,.93,.15);c.line(.07,.15,.93,.15)
        c.line(.5,.4,.73,.78);c.circle(.5,.4,.06,stroke=0,fill=1)
    elif key=='echo':
        c.circle(.52,.5,.39,stroke=1,fill=0);c.line(.52,.5,.52,.77);c.line(.52,.5,.72,.39)
        c.line(.10,.84,.10,.57);c.line(.10,.57,.32,.69)
    elif key=='check':
        c.roundRect(.08,.08,.84,.84,.12,stroke=1,fill=0);c.line(.23,.49,.43,.27);c.line(.43,.27,.79,.76)
    elif key=='people':
        c.circle(.36,.70,.15,stroke=1,fill=0);c.arc(.06,.03,.65,.64,0,180);c.circle(.77,.64,.11,stroke=1,fill=0)
    elif key=='flag':
        c.line(.2,.07,.2,.93);c.line(.2,.9,.83,.9);c.line(.83,.9,.64,.66);c.line(.64,.66,.2,.66)
    c.restoreState()

def metric_parts(key):
    if key.startswith('all_'):return key[4:],'全员'
    return key,''

def metric_width(key,n,size=8):
    k,scope=metric_parts(key);num=('+' if n>0 else '−')+str(abs(n))
    label=k if k in b.TRACKS else ''
    return (len(scope)*size+2 if scope else 0)+8+2+(len(label)*size+1 if label else 0)+pdfmetrics.stringWidth(num,'ENB',size)+4

def metrics(c,values,x,y,size=8,align='left'):
    width=sum(metric_width(k,n,size) for k,n in values.items())
    if align=='right':x-=width
    for key,n in values.items():
        k,scope=metric_parts(key)
        if scope:text(c,x,y,scope,size,'CNB',MUTED);x+=len(scope)*size+2
        icon(c,k,x,y+.1,8);x+=10
        if k in b.TRACKS:text(c,x,y,k,size,'CNB');x+=size+1
        num=('+' if n>0 else '−')+str(abs(n))
        text(c,x,y,num,size,'ENB',ICOL.get(k,INK));x+=pdfmetrics.stringWidth(num,'ENB',size)+4
    return width

def gate_row(c,gate,x,y,label='A需',width=BW):
    rect(c,x,y,width,11.5,'#E7EBE1')
    text(c,x+3,y+1.1,label,7.2,'CNB')
    xx=x+3+len(label)*7.2+7
    for k,n in gate.items():
        icon(c,k,xx,y+2.0,7.4);text(c,xx+9,y+1.0,k,7.2,'CNB')
        text(c,xx+17,y+1.0,'≥'+str(n),7.4,'ENB')
        xx+=34
    if xx>x+width+3: CHECKS.append({'kind':'gate_width','right':xx-x,'width':width})

def hero(c,d,kind,x,y,height):
    rect(c,x,y,CW,CH,CREAM)
    b.img(c,d.get('art','space3'),x,y,CW,height)
    c.saveState();c.setFillAlpha(.86);rect(c,x,y,CW,13,DARK);c.restoreState()
    # The title is anchored to the image, preserving a continuous image field.
    c.saveState();c.setFillAlpha(.91);rect(c,x,y+height-23,CW,23,DARK);c.restoreState()
    left=CAT[kind]
    if kind=='life':left+=' · '+d['level']
    if kind=='project':left+=' · '+['I','II','III'][d['phase']-1]
    if kind=='city':left+=' · '+d['mode']
    text(c,x+P,y+2.3,left,6.1,'CNB',ACC[kind])
    ident=d['id']+((' · '+str(d['year'])) if 'year' in d else '')
    text(c,x+CW-P,y+2.6,ident,6.0,'EN',CREAM,'right')
    title=d.get('title',d.get('name',''))
    ts=11.8 if len(title)<=13 else 10.8
    if pdfmetrics.stringWidth(title,'CNB',ts)>BW:ts=10.6
    text(c,x+P,y+height-18.7,title,ts,'CNB',CREAM)
    if kind=='project':
        c.saveState();c.setFillAlpha(.85);rect(c,x+P,y+height-38,65,11,DARK);c.restoreState()
        text(c,x+P+3,y+height-36.5,d['level']+' · '+d['source'],6.0,'CN',CREAM)
    MANIFEST[-1]['image_fraction']=round(height/CH,4)
    return y+height+4

def check_bottom(d,yy,y,maxbottom=274):
    if yy>y+maxbottom:CHECKS.append({'id':d['id'],'kind':'body_overflow','bottom':round(yy-y,2),'limit':maxbottom})

def tiny_footer(c,d,x,y,label):
    text(c,x+P,y+CH-9.3,label,5.7,'CN',MUTED)

def choice_marker(c,k,x,y):
    rect(c,x,y,9.4,9.4,INK)
    text(c,x+4.7,y+.1,k,7.2,'ENB',CREAM,'center')

def life_card(c,d,x,y):
    cp=LIFE[d['id']];hero(c,d,'life',x,y,155)
    para(c,cp['scene'],x+P,y+158.4,BW,8.0,9.65,maxlines=2,tag=d['id']+' scene')
    gate_row(c,d['gate'],x+P,y+179.4)
    for i,k in enumerate(['a','b','c']):
        yy=y+193.1+i*13.0;op=d[k]
        choice_marker(c,k.upper(),x+P,yy+.2)
        vals={}
        if op['cost']:vals['budget']=-op['cost']
        if op.get('budget'):vals['budget']=op['budget']
        if op.get('xp'):vals['xp']=op['xp']
        mw=sum(metric_width(j,v,8.0) for j,v in vals.items())
        maxw=BW-13-mw-2
        tw=pdfmetrics.stringWidth(cp[k]['text'],'CNB',8.0)
        if tw>maxw:CHECKS.append({'id':d['id']+k,'kind':'choice_width','actual':tw,'max':maxw})
        text(c,x+P+13,yy+.1,cp[k]['text'],8.0,'CNB')
        metrics(c,vals,x+CW-P+1,yy,8.0,'right')
    rect(c,x+5.0,y+234.2,CW-10,41.2,'#E3ECE5')
    icon(c,'echo',x+P,y+236.0,6.6)
    text(c,x+P+9,y+235.3,'下轮回声 · 只读已选项',6.5,'CNB',MUTED)
    for i,k in enumerate(['a','b','c']):
        yy=y+244.1+i*10.0;vals=d[k]['echo_effect']
        text(c,x+P,yy,k.upper(),7.4,'ENB',MUTED)
        mw=sum(metric_width(j,v,7.7) for j,v in vals.items())
        maxw=BW-11-mw-2
        tw=pdfmetrics.stringWidth(cp[k]['echo'],'CN',7.6)
        if tw>maxw:CHECKS.append({'id':d['id']+k,'kind':'echo_width','actual':tw,'max':maxw})
        text(c,x+P+11,yy,cp[k]['echo'],7.6)
        if vals:metrics(c,vals,x+CW-P+1,yy-.05,7.7,'right')

def project_card(c,d,x,y):
    cp=OTHER['projects'][d['id']];hero(c,d,'project',x,y,166)
    para(c,cp['story'],x+P,y+169.8,BW,8.0,9.8,maxlines=2,tag=d['id']+' story')
    yy=y+192
    icon(c,'budget',x+P,yy+1,8);text(c,x+P+11,yy,'资金目标 2 × 人数',8.1,'CNB')
    text(c,x+CW-P,yy+1,'第'+str(d['round'])+'轮公开',6.9,'CN',MUTED,'right')
    gate_row(c,d['gate'],x+P,y+207,'建成需')
    text(c,x+P,y+223,'建成',7.7,'CNB');metrics(c,d['gain'],x+P+23,y+222.5,8.4)
    para(c,cp['fact'],x+P,y+239,BW,7.8,9.6,maxlines=1,tag=d['id']+' fact')
    para(c,cp['limit'],x+P,y+251,BW,7.1,9.0,color=MUTED,maxlines=1,tag=d['id']+' limit')
    rule(c,x+P,y+264,BW)
    text(c,x+P,y+267,'另结契约；各出资者',6.9,'CNB',MUTED)
    metrics(c,{'xp':1},x+P+69,y+266.8,7.2)

def era_card(c,d,x,y):
    cp=OTHER['eras'][d['id']];hero(c,d,'era',x,y,166)
    yy=para(c,cp['narrative'],x+P,y+170,BW,8.3,10.3,maxlines=2,tag=d['id']+' story')+7
    rect(c,x+5,yy-2,CW-10,57,'#E3E9E3')
    text(c,x+P,yy,'本轮执行一次',7.0,'CNB',MUTED);yy+=12
    yy=para(c,d['rule'],x+P,yy,BW,8.5,11.0,font='CNB',tag=d['id'])
    check_bottom(d,yy,y,258)
    text(c,x+P,y+261,f'能力上限 {2+(d["round"]-1)//2}',7.7,'CNB')
    text(c,x+CW-P,y+262,f'公开P{3*d["round"]-2:02d}–{3*d["round"]:02d}',7.0,'CN',MUTED,'right')
    tiny_footer(c,d,x,y,'年份是条件情景，非技术实现预测')

def city_card(c,d,x,y):
    cp=OTHER['cities'][d['id']];hero(c,d,'city',x,y,169)
    text(c,x+P,y+173,d['en'].upper(),7.0,'ENB',MUTED)
    yy=y+186;sw=BW/4
    for i,(k,n) in enumerate(zip(b.TRACKS,d['stats'])):
        xx=x+P+i*sw;rect(c,xx,yy,sw-2,17,INK)
        icon(c,k,xx+4,yy+4,9,CREAM);text(c,xx+16,yy+3,k,7.8,'CNB',CREAM);text(c,xx+sw-6,yy+2.3,n,9,'ENB',CREAM,'right')
    yy=para(c,cp['flavor'],x+P,y+209,BW,8.1,10.2,maxlines=2,tag=d['id']+' flavor')+7
    short_rule=d['rule'].replace('全局一次：','全桌一次：').replace('先手在自己的行动后可令','').replace('先手在自己的行动后可指定','指定').replace('，仍受年代上限','')
    yy=para(c,short_rule,x+P,yy,BW,8.4,10.5,font='CNB',tag=d['id'])
    check_bottom(d,yy,y,251)
    rule(c,x+P,y+252,BW)
    text(c,x+P,y+257,'先手在自己的城市行动后发动。',7.1,'CN',MUTED)
    text(c,x+P,y+267,'升级受年代上限；用后放已用标记。',6.9,'CN',MUTED)

def role_card(c,d,x,y):
    cp=OTHER['roles'][d['id']];hero(c,d,'role',x,y,178)
    text(c,x+P,y+183,cp['identity'],8.3,'CNB')
    yy=para(c,cp['story'],x+P,y+198,BW,8.0,10.1,maxlines=2,tag=d['id']+' story')+8
    rect(c,x+5,yy-3,CW-10,40,'#E3E9E3')
    yy=para(c,d['power'],x+P,yy,BW,8.4,11.0,font='CNB',tag=d['id'])
    check_bottom(d,yy,y,268)
    tiny_footer(c,d,x,y,'身份可演变；能力用后放“已用”标记')

def ambition_card(c,d,x,y):
    hero(c,d,'ambition',x,y,168)
    yy=para(c,d['desc'],x+P,y+172,BW,8.1,10.0)+7
    for i,g in enumerate(d['goals']):
        icon(c,'check',x+P,yy+1,8)
        yy=para(c,g,x+P+13,yy,BW-13,8.0,10.3,font='CNB')+5
    check_bottom(d,yy,y,269)
    tiny_footer(c,d,x,y,'每项2分，最多6分；愿景公开，终局核对')

def quick_card(c,d,x,y):
    need=sum(11+len(b.wrap(body,BW,7.8))*9.4+4 for title,body in d['blocks'])
    hh=min(102,CH-14-need)
    if hh<61:CHECKS.append({'id':d['id'],'kind':'dense_quick','hero':hh})
    yy=hero(c,d,'quick',x,y,hh)
    for i,(title,body) in enumerate(d['blocks']):
        text(c,x+P,yy,title,8.1,'CNB');yy+=11
        yy=para(c,body,x+P,yy,BW,7.8,9.4)+4
    check_bottom(d,yy,y,CH-8)

def ending_card(c,d,x,y):
    cp=OTHER['endings'][d['id']]
    need=len(b.wrap(d['condition'],BW,7.9))*10.1+8+len(b.wrap(cp['story'],BW,8.4))*11.2+9+len(b.wrap(cp['prompt'],BW,8.1))*10.8
    hh=min(176,CH-15-need)
    yy=hero(c,d,'ending',x,y,hh)
    yy=para(c,d['condition'],x+P,yy,BW,7.9,10.1,font='CNB',color=MUTED)+8
    yy=para(c,cp['story'],x+P,yy,BW,8.4,11.2)+9
    yy=para(c,cp['prompt'],x+P,yy,BW,8.1,10.8,font='CNB')
    check_bottom(d,yy,y,274)

def helper_card(c,d,x,y):
    rect(c,x,y,CW,CH,DARK)
    text(c,x+P,y+8,'FUT100K  /  '+d['id'],6.2,'EN',TEAL)
    text(c,x+P,y+25,d['title'],13,'CNB',CREAM)
    rule(c,x+P,y+47,BW,'#47716F',.5)
    if d['id']=='H01':
        rows=[('能','能｜能源与循环'),('造','造｜制造与维修'),('生','生｜生命与照护'),('联','联｜计算与联通'),('budget','预｜预算'),('xp','历｜体验'),('pressure','压｜公共承压'),('echo','回声｜延后结算')]
        for i,(k,label) in enumerate(rows):
            yy=y+59+i*22;icon(c,k,x+P+2,yy,12,TEAL if i<4 else GOLD)
            text(c,x+P+23,yy+1,label,9.0,'CNB',CREAM)
        para(c,'图形辅助识别；同一图标在所有牌上含义相同。',x+P,y+244,BW,7.8,10.2,color='#C8DAD0')
    elif d['id']=='H02':
        text(c,x+P,y+60,'① 门槛：达到才可选A',9.3,'CNB',CREAM)
        gate_row(c,{'造':2,'能':1},x+P,y+79)
        text(c,x+P,y+101,'② 当下：支付与获得',9.3,'CNB',CREAM)
        rect(c,x+P,y+120,BW,24,CREAM)
        metrics(c,{'budget':-3,'xp':1},x+P+8,y+126,9.4)
        text(c,x+P,y+154,'③ 下轮：只读已选回声',9.3,'CNB',CREAM)
        para(c,'A选了什么，下轮就读A。B、C同理。第六轮在收尾前兑现本轮回声。',x+P,y+175,BW,8.6,12,color=CREAM)
        para(c,'≥是能力要求；+是获得；−是支付或损失。C不用支付，仍有预算+1。',x+P,y+225,BW,8.1,11,color='#C8DAD0')
    else:
        rows=[('先创造条件','收入与上轮回声 → 时代/邀约 → 第一圈行动。'),('再决定怎么生活','所有人先选A/B/C，再按先手顺序支付并结算。'),('最后承担与投资','第二圈行动 → 末轮回声 → 高压扣款 → 换先手。'),('一句自己的后来','挑一张经历和一项工程，说出自己后来过上的生活。')]
        yy=y+61
        for title,body in rows:
            text(c,x+P,yy,title,9,'CNB',TEAL);yy+=16
            yy=para(c,body,x+P,yy,BW,8.3,11.0,color=CREAM)+14
        check_bottom(d,yy,y,278)
    MANIFEST[-1]['image_fraction']=0.0

def make_cards():
    p=OUT/'十万个未来_九宫格图标卡牌_A4_每页9张.pdf'
    c=b.new_canvas(p,'十万个未来 · 九宫格图标卡牌 · 70×99mm')
    deck=[('life',d) for d in b.DATA['life']]+[('project',d)for d in b.DATA['projects']]+[('era',d)for d in b.WORLD['eras']]+[('city',d)for d in b.WORLD['cities']]+[('role',d)for d in b.WORLD['roles']]+[('ambition',d)for d in b.WORLD['ambitions']]+[('quick',d)for d in b.quicks()]+[('ending',d)for d in b.endings()]
    assert len(deck)==96
    deck += [('helper',{'id':'H01','title':'看图标，就能读数值'}),('helper',{'id':'H02','title':'怎样读一张人生牌'}),('helper',{'id':'H03','title':'把一轮玩成一幕'})]
    funcs={'life':life_card,'project':project_card,'era':era_card,'city':city_card,'role':role_card,'ambition':ambition_card,'quick':quick_card,'ending':ending_card,'helper':helper_card}
    for pn in range(11):
        c.bookmarkPage(f'nine{pn+1}');c.addOutlineEntry(f'卡页{pn+1:02d} · {deck[pn*9][1]["id"]}–{deck[pn*9+8][1]["id"]}',f'nine{pn+1}')
        for i,(kind,d) in enumerate(deck[pn*9:pn*9+9]):
            xx=i%3*CW;yy=i//3*CH
            MANIFEST.append({'id':d['id'],'type':kind,'page':pn+1,'row':i//3+1,'col':i%3+1,'size_mm':[70,99]})
            funcs[kind](c,d,xx,yy)
        for xx in [CW,2*CW]:b.line(c,xx,0,xx,H,'#8C9F94',.24)
        for yy in [CH,2*CH]:b.line(c,0,yy,W,yy,'#8C9F94',.24)
        c.showPage()
    c.save();(ROOT/'data/card_manifest_nine.json').write_text(json.dumps(MANIFEST,ensure_ascii=False,indent=2)+'\n')
    return p

def merge_full(rules,boards,cards):
    p=OUT/'十万个未来_未来已有人居住_完整打印版.pdf';w=PdfWriter()
    for part,title in [(rules,'01 规则与城市手册'),(boards,'02 桌面组件'),(cards,'03 九宫格图标卡牌 · 11页')]:w.append(str(part),outline_item=title)
    w.add_metadata({'/Title':'十万个未来：未来已有人居住 · 九宫格图标版1.1','/Author':'后AI研究所 · POST-AI INSTITUTE'})
    w.write(str(p));return p

def main():
    b.font_build();cards=make_cards();rules=b.make_rules();boards=b.make_boards()
    b.set_boxes([cards,rules,boards]);full=merge_full(rules,boards,cards)
    report={'layout_issues':CHECKS,'handbook_issues':b.QA,'cards':len(MANIFEST),'game_cards':96,'helper_cards':3,'image_fraction_by_type':{k:[min(x['image_fraction']for x in MANIFEST if x['type']==k),max(x['image_fraction']for x in MANIFEST if x['type']==k)]for k in set(x['type']for x in MANIFEST)}}
    (TMP/'nine_layout_checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    for p in[cards,rules,boards,full]:print(p.name,len(PdfReader(p).pages),p.stat().st_size)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if CHECKS or b.QA:sys.exit(2)

if __name__=='__main__':
    from build_fullart import main as current_main
    current_main()
