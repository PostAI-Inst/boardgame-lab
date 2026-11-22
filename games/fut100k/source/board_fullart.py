#!/usr/bin/env python3
"""Physical tabletop components for FUT100K 1.2.

Only drawing functions live here. The caller must register CN/CNB/EN/ENB
through build_pdf.font_build() before calling make_tabletop().

A3 is landscape 420 x 297 mm. A4 output contains its left/right halves,
two two-player sheets and a single 210-piece marker sheet, in that order.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.colors import HexColor
from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import RectangleObject
import build_pdf as b
import build_nine as n

MM=b.MM
A4W=b.W
PAGEH=b.H
A3W=A4W*2
INK='#14343A'
DARK='#102B32'
CREAM='#F4EEDF'
SOFT='#E4EADF'
TEAL='#83D4CB'
GOLD='#E4BA76'
LINE='#B5C6B9'
PALETTE=['#3D7D93','#B66B3B','#57846D','#8C6A9C']
ISSUES=[]


def _r(c,x,y,w,h,fill,stroke=None,lw=.4):
    b.rect(c,x*MM,y*MM,w*MM,h*MM,fill,stroke,lw)


def _t(c,x,y,s,size=9,font='CN',color=INK,align='left'):
    b.txt(c,x*MM,y*MM,str(s),size,font,color,align)


def _line(c,x1,y1,x2,y2,color=LINE,lw=.4):
    b.line(c,x1*MM,y1*MM,x2*MM,y2*MM,color,lw)


def _p(c,s,x,y,w,size=9.2,leading=13,color=INK,font='CN',max_h=None,tag=''):
    lines=b.wrap(s,w*MM,size,font)
    height=len(lines)*leading
    if max_h is not None and height>max_h*MM+.1:
        ISSUES.append({'type':'paragraph_overflow','tag':tag,'height_mm':height/MM,'limit_mm':max_h})
    for i,ln in enumerate(lines):
        b.txt(c,x*MM,y*MM+i*leading,ln,size,font,color)
    return y+height/MM


def _circle(c,x,y,r,label='',size=10,fill=CREAM,stroke=INK,lw=.65):
    c.setFillColor(HexColor(fill));c.setStrokeColor(HexColor(stroke));c.setLineWidth(lw)
    c.circle(x*MM,PAGEH-y*MM,r*MM,stroke=1,fill=1)
    if label!='':
        b.txt(c,x*MM,y*MM-size*.61,str(label),size,'ENB',INK,'center')


def _icon(c,key,x,y,size=12,color=INK):
    n.icon(c,key,x*MM,y*MM,size,color)


def _outline(c,x,y,w,h,color=GOLD,dash=False,lw=.8):
    c.saveState();c.setStrokeColor(HexColor(color));c.setLineWidth(lw)
    if dash:c.setDash(4,3)
    c.rect(x*MM,PAGEH-(y+h)*MM,w*MM,h*MM,fill=0,stroke=1)
    c.restoreState()


def _canvas(path,size,title):
    c=canvas.Canvas(str(path),pagesize=size,pageCompression=1,initialFontName='CN',initialFontSize=10)
    c.setTitle(title);c.setAuthor('后AI研究所 · POST-AI INSTITUTE')
    c.setSubject('十万个未来 · 满画幅桌面原型1.2 · 实尺寸共享棋盘与筹码')
    return c


def _board(c):
    """One exact A3 board; the three project slots are 70 x 99 mm."""
    _r(c,0,0,420,297,DARK)
    # A subdued existing illustration makes the play surface a city, while all
    # functional tracks, costs and card slots remain clean vector elements.
    c.saveState();c.setFillAlpha(.20)
    b.img(c,'space3',149*MM,28*MM,271*MM,247*MM)
    c.restoreState()
    _r(c,0,0,420,34,DARK)
    _t(c,11,8,'十万个未来',25,'CNB',CREAM)
    _t(c,71,11,'把未来建在一起',15,'CNB',TEAL)
    _t(c,409,10,'CITY COMMONS  /  1.2',9,'EN',GOLD,'right')
    _t(c,12,25,'城市：________________    人数：____',10,'CN',CREAM)
    _t(c,155,25,'牌与筹码会留下这座城市的历史。',10,'CN',CREAM)
    _t(c,409,25,'先手：____    城市能力：可用 / 已用',9,'CN',CREAM,'right')

    # Four shared ability tracks, with generous physical marker spacing.
    _r(c,10,42,133,94,CREAM)
    _t(c,15,46,'城市能力',12,'CNB')
    _t(c,138,47,'当前上限随年代变化',8.4,'CN',INK,'right')
    names=[('能','能源与循环'),('造','制造与维修'),('生','生命与照护'),('联','计算与联通')]
    for row,(key,label) in enumerate(names):
        cy=64+20*row
        _icon(c,key,15,cy-5,15,INK)
        _t(c,23,cy-6,key,16,'CNB')
        _t(c,23,cy+1,label,8.1)
        for v in range(5):_circle(c,67+15*v,cy,5.6,v,10.5,fill='#E5EBE1')

    # Pressure never ends a game early; the threshold is printed next to track.
    _r(c,10,141,133,31,CREAM)
    _icon(c,'pressure',15,145,12)
    _t(c,22,144.8,'承压',11,'CNB')
    _t(c,138,145.4,'达到7或8：收尾每人预−1',8.6,'CN',INK,'right')
    for v in range(9):
        _circle(c,20+14*v,163,4.7,v,9.5,fill='#E7BBA5' if v>=7 else '#E5EBE1')

    # Shared action spaces intentionally have no exclusive occupancy limit.
    _t(c,11,176,'城市行动',12,'CNB',CREAM)
    _t(c,142,177,'可同选 · 筹码可叠放',8.5,'CN',TEAL,'right')
    actions=[
        ('筹措','免费：预算+3。','budget'),
        ('扩建','付3预：任选能力+1，受年代上限。','造'),
        ('共建','付1或2预：放自己的“投1 / 投2”。','people'),
        ('疏解','付2预：承压−2。','pressure'),
        ('兑现生活','付2预：体验+1；每人每轮至多1次。','xp')
    ]
    for i,(title,body,ic) in enumerate(actions):
        yy=185+i*17
        _r(c,10,yy,133,14.5,'#E4EADF')
        _icon(c,ic,14,yy+4,11)
        _t(c,20,yy+2.6,title,10.8,'CNB')
        _p(c,body,43,yy+3.0,68,8.8,11.2,max_h=10,tag='action-'+title)
        _outline(c,116,yy+1.0,25,12.5,'#8AA89B',True,.4)
        _t(c,128.5,yy+4.1,'行动',8.3,'CNB',INK,'center')

    # Era rail and project market.
    _t(c,155,38,'六次时代跃迁',12,'CNB',CREAM)
    for i,year in enumerate(b.YEARS):
        xx=155+i*40
        _r(c,xx,47,37,24,'#173C43',GOLD,.6)
        _t(c,xx+18.5,50,str(year),17,'ENB',CREAM,'center')
        _t(c,xx+18.5,61.9,'能力上限 '+str(2+i//2),8.8,'CN',TEAL,'center')
    _t(c,160,80,'本轮公开工程',13,'CNB',CREAM)
    _t(c,390,81,'资金目标：2 × 玩家人数',10,'CNB',GOLD,'right')
    for i,xx in enumerate([160,240,320]):
        _r(c,xx,93,70,99,'#E4EBE2')
        _outline(c,xx,93,70,99,GOLD,True,1.0)
        _t(c,xx+35,124,'工程 '+str(i+1),17,'CNB','#537770','center')
        _t(c,xx+35,139,'把新的可能放在这里',9.5,'CN','#537770','center')
        _t(c,xx+35,158,'每轮公开3张',9,'CNB','#537770','center')
        # An integral funding tray makes contributions visibly owned.
        _r(c,xx,195,70,52,'#1B4147',GOLD,.45)
        _t(c,xx+5,198,'出资筹码',10,'CNB',CREAM)
        _t(c,xx+5,204,'先扣预算，再放筹码。',8.0,'CN',TEAL)
        _outline(c,xx+51,196,14,14.85,GOLD,False,.5)
        _t(c,xx+58,201,'契约',8.5,'CNB',GOLD,'center')
        for row in range(2):
            for col in range(4):
                _outline(c,xx+5+15*col,214+16*row,14,14.85,'#6E9692',False,.35)
        _t(c,xx+35,250,'总值4 / 6 / 8 = 2 / 3 / 4人',8.4,'CNB',CREAM,'center')
    _t(c,155,260,'三槽只放本轮新牌；板外的储备工程、在建工程仍可选择。',9.5,'CNB',CREAM)
    _t(c,155,266.1,'储备：未出资  /  在建：带筹码  /  已建：牌、契约、筹码一起保留。',8.8,'CN',TEAL)

    # A footer is operational, not a second rules booklet.
    _r(c,0,274,420,23,'#0B2026')
    _t(c,11,278,'共同目标',10.2,'CNB',GOLD)
    _t(c,38,278,'已建≥人数+1 · 含至少1项III期 · 四能力合计≥10 · 承压≤5',9.8,'CNB',CREAM)
    _t(c,11,286,'第3 / 5轮移出旧阶段未开工工程；已出资工程跨期保留。收尾取回行动标记。',8.5,'CN',TEAL)
    _t(c,409,286,'POST-AI INSTITUTE  /  FUT100K',8,'EN',CREAM,'right')


def _player(c,pid,y0):
    """A5 landscape player surface within an A4 portrait page."""
    color=PALETTE[pid-1]
    _r(c,0,y0,210,148.5,CREAM)
    b.img(c,['industry2','industry0','life0','life1'][pid-1],0,y0*MM,A4W,20*MM)
    c.saveState();c.setFillAlpha(.82);_r(c,0,y0,210,20,DARK);c.restoreState()
    _r(c,0,y0,26,20,color)
    _t(c,13,y0+4,'P'+str(pid),21,'ENB',CREAM,'center')
    _t(c,32,y0+4.4,'我的未来生活',17,'CNB',CREAM)
    _t(c,200,y0+7,'两次行动，一段自己的未来',9,'CN',TEAL,'right')
    _t(c,10,y0+24,'称呼：________  角色：________  愿景：________  角色能力：可用 / 已用',8.8)

    _icon(c,'budget',10,y0+37,12)
    _t(c,17,y0+36,'预算',10.5,'CNB')
    _t(c,17,y0+41.4,'0–12 · 初始4',8)
    for v in range(13):_circle(c,61+11.4*v,y0+40,4.5,v,9.2)

    _icon(c,'xp',10,y0+53,12)
    _t(c,17,y0+52,'体验 / 十位',10,'CNB')
    for v in range(5):_circle(c,61+11.4*v,y0+56,4.2,v,9.2)
    for x,label in [(126,'第一圈行动'),(165,'第二圈行动')]:
        _r(c,x,y0+50,31,14,'#DCE7DD',color,.55)
        _t(c,x+15.5,y0+54,label,8.5,'CNB',INK,'center')
    _t(c,17,y0+68,'体验 / 个位',10,'CNB')
    for v in range(10):_circle(c,61+14.6*v,y0+72,4.2,v,9.2)

    # Permanent, compact memory needed by wish-card scoring.
    xx=10;yy=y0+83;ww=[23,27,30,110]
    _r(c,xx,yy,190,6,DARK)
    for label,width in zip(['年代','人生编号','我的选择','一句记住的事'],ww):
        _t(c,xx+2,yy+1.1,label,8.3,'CNB',CREAM);xx+=width
    for row,year in enumerate(b.YEARS):
        yy=y0+89+6*row
        _r(c,10,yy,190,6,'#E4EADF' if row%2==0 else CREAM)
        _t(c,12,yy+1.1,str(year),8.6,'ENB')
        _t(c,62,yy+1.1,'A / B / C',8.4)
        _line(c,90,yy+5,198,yy+5,'#B8C8BC',.25)
    _t(c,10,y0+129,'扩建次数：____  疏解次数：____  愿景：□1  □2  □3  足迹合计：____',8.8,'CNB')
    _t(c,10,y0+138,'看2留1 → 第一圈行动 → 选择A/B/C → 第二圈行动；记下牌号与选择。',8.0)
    _t(c,10,y0+143,'收入3＋自己的每项已建专属1；选择前可查全部回声；体验超49改用铅笔。',8.0)


def _token_items():
    items=[]
    for pid in range(1,5):
        for label in ['预算','历十','历个','行动1','行动2','A','B','C','已用','本人']:
            items.append({'owner':'P'+str(pid),'label':label,'color':PALETTE[pid-1],'kind':'player'})
    for label in ['能','造','生','联','承压','年代','先手','城已用']:
        items.append({'owner':'城市','label':label,'color':INK,'kind':'city'})
    for pid in range(1,5):
        for value in [1,2]:
            for _ in range(12):
                items.append({'owner':'P'+str(pid)+'·投','label':str(value),'color':PALETTE[pid-1],'kind':'investment'})
    for label,color in [('公共','#447F79'),('合伙','#8C713E'),('专属','#765F8A')]:
        for _ in range(18):items.append({'owner':'契约','label':label,'color':color,'kind':'contract'})
    for _ in range(12):items.append({'owner':'备用','label':'空白','color':'#526E70','kind':'spare'})
    assert len(items)==210
    return items


def _tokens(c):
    _r(c,0,0,210,297,DARK)
    tw=14;th=14.85;items=_token_items()
    for i,item in enumerate(items):
        xx=i%15*tw;yy=i//15*th
        _r(c,xx,yy,tw,th,item['color'])
        _t(c,xx+tw/2,yy+1.3,item['owner'],8.0,'CNB',CREAM,'center')
        size=17 if item['kind']=='investment' else (10.4 if len(item['label'])<=2 else 8.8)
        _t(c,xx+tw/2,yy+(5.3 if size==17 else 7.1),item['label'],size,'CNB',CREAM,'center')
    for i in range(1,15):_line(c,i*tw,0,i*tw,14*th,CREAM,.24)
    for i in range(1,15):_line(c,0,i*th,210,i*th,CREAM,.24)
    _t(c,10,214,'预算先扣，出资留下',21,'CNB',CREAM)
    _t(c,10,225,'210枚标记 · 页顶15列×14行 · 每枚14×14.85毫米',9.3,'CN',TEAL)
    _p(c,'例如：预算8→6，再留一枚自己的“投2”。投资筹码只记录已经付出的预算，不能当作另一个钱包。',10,235,190,10.0,14.5,CREAM,max_h=15,tag='token-explain-1')
    _p(c,'工程建成后，牌、契约与出资筹码一起留在已建区，不回收或跨工程挪用。两人局裁P1/P2玩家与投资筹码，另裁公共标记及所需契约。',10,249,190,9.4,13.8,CREAM,max_h=17,tag='token-explain-2')
    _t(c,10,273,'50毫米校准',8.3,'CNB',TEAL)
    _line(c,10,283,60,283,CREAM,1)
    _line(c,10,280.5,10,285.5,CREAM,1)
    _line(c,60,280.5,60,285.5,CREAM,1)
    _t(c,200,282,'后AI研究所 / POST-AI INSTITUTE',8.2,'CN',CREAM,'right')
    _t(c,200,290,'满版打印100% · 不加出血 · 单面',8,'CN',TEAL,'right')


def _set_boxes(path,width,height):
    r=PdfReader(str(path));w=PdfWriter();w.clone_document_from_reader(r)
    for page in w.pages:
        for key in ['mediabox','cropbox','trimbox','bleedbox']:
            setattr(page,key,RectangleObject([0,0,width,height]))
    tmp=path.with_suffix('.boxfix.pdf');w.write(str(tmp));tmp.replace(path)


def make_tabletop():
    """Generate the A3 board and five-page A4 tabletop packet.

    Place the first two A4 pages side by side: their 297 mm long edges meet.
    There is no overlap, page expansion, external bleed, or white seam.
    """
    ISSUES.clear()
    a3=b.OUT/'十万个未来_共享城市棋盘_A3.pdf'
    c=_canvas(a3,(A3W,PAGEH),'十万个未来 · 共享城市棋盘 · A3实尺寸')
    _board(c);c.showPage();c.save();_set_boxes(a3,A3W,PAGEH)

    extras=b.TMP/'fullart-tabletop-extras.pdf'
    c=_canvas(extras,(A4W,PAGEH),'十万个未来 · 玩家板与210枚筹码')
    for pair in [(1,2),(3,4)]:
        _player(c,pair[0],0);_player(c,pair[1],148.5)
        _line(c,0,148.5,210,148.5,INK,.45);c.showPage()
    _tokens(c);c.showPage();c.save()

    a4=b.OUT/'十万个未来_棋盘玩家板与筹码_A4.pdf'
    board=PdfReader(str(a3));w=PdfWriter()
    for half in range(2):
        page=w.add_blank_page(A4W,PAGEH)
        page.merge_transformed_page(board.pages[0],Transformation().translate(tx=-half*A4W,ty=0),over=True)
        for key in ['mediabox','cropbox','trimbox','bleedbox']:
            setattr(page,key,RectangleObject([0,0,A4W,PAGEH]))
    w.append(str(extras))
    w.add_metadata({'/Title':'十万个未来 · 棋盘、玩家板与筹码 · A4五页','/Author':'后AI研究所 · POST-AI INSTITUTE'})
    w.write(str(a4));_set_boxes(a4,A4W,PAGEH)
    return {'a3':a3,'a4':a4}


if __name__=='__main__':
    raise SystemExit('Import board_fullart and call make_tabletop() after registering the fonts.')
