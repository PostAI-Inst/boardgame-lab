import { campaign } from './content/campaign.js';
import { cases } from './content/cases.js';
import { sources, cities, extraSeeds, designNotes } from './content/research.js';
import { createState, getNode, getEnding, inspect, choose, availableChoice, requirementFailures, sanitizeState, STAT_LABELS, STAT_LIMITS } from './engine.js';
import { mountScene } from './scene.js';

const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const paragraphs = values => (Array.isArray(values) ? values : values ? [values] : []).map(p => `<p>${esc(p)}</p>`).join('');
const icon = (name, cls = '') => {
  const paths = {
    home:'<path d="M3 11 12 3l9 8M5 9v12h5v-7h4v7h5V9"/>',
    archive:'<path d="M4 4h16v4H4zM6 8v13h12V8M9 12h6M9 16h6"/>',
    book:'<path d="M12 6C8 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-6-1-10 2Zm0 0v15"/>',
    city:'<path d="M3 21V9h6v12M9 21V3h8v18M17 21V12h4v9M6 12v2M12 7h2M12 11h2M12 15h2M1 21h22"/>',
    research:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    sound:'<path d="m3 9 4 0 5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    pin:'<circle cx="12" cy="10" r="3"/><path d="M19 10c0 6-7 12-7 12S5 16 5 10a7 7 0 0 1 14 0Z"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
  };
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
};
const stories = [campaign, ...cases];
const findStory = id => stories.find(s => s.id === id) || campaign;
const storageKey = 'postai-life-protocols-v1';
let storageAvailable = true;
let vault = { saves:{}, completed:{}, settings:{ motion:!matchMedia('(prefers-reduced-motion: reduce)').matches, largeText:false }, active:campaign.id };
try {
  const raw = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (raw && typeof raw === 'object') {
    for (const story of stories) {
      const save = sanitizeState(raw.saves?.[story.id], story);
      if (save) vault.saves[story.id] = save;
      vault.completed[story.id] = (Array.isArray(raw.completed?.[story.id]) ? raw.completed[story.id] : []).filter(id => story.endings.some(e => e.id === id));
    }
    vault.settings.motion = typeof raw.settings?.motion === 'boolean' ? raw.settings.motion : vault.settings.motion;
    vault.settings.largeText = raw.settings?.largeText === true;
    vault.active = findStory(raw.active).id;
  }
} catch { storageAvailable = false; }

let view = 'home';
let story = findStory(vault.active);
let sceneHandle = null;
let toastTimer;
let archiveFilter = 'all';
let archiveQuery = '';
let cityId = cities[0]?.id;
let researchTab = 'sources';
let notebookTab = 'evidence';
let handbookOpen = false;
let soundOn = false;
let audioGraph = null;
let lastEcho = '';
const app = $('#app');
const dialog = $('#dialog');
const getState = () => vault.saves[story.id];
const persist = () => {
  try { localStorage.setItem(storageKey, JSON.stringify(vault)); storageAvailable = true; }
  catch { storageAvailable = false; }
};
const toast = text => {
  $('#toast').textContent = text;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
};
const completeCount = () => Object.values(vault.completed).filter(a => a?.length).length;
const closeDialog = () => { if (dialog.open) dialog.close(); };
function showDialog(title, content, className = '') {
  dialog.className = className;
  dialog.innerHTML = `<div class="dialog-top"><span class="eyebrow">后AI生活须知 / 现场记录</span><button class="icon-button" data-action="close-dialog" aria-label="关闭窗口">${icon('close')}</button></div><h2 id="dialog-title">${esc(title)}</h2>${content}`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

function shell(content) {
  const navItems = [['home','home','开始'],['cases','archive','怪谈'],['handbook','book','手册'],['cities','city','城市'],['research','research','研究']];
  app.innerHTML = `<aside class="rail"><button class="brand-mark" data-action="nav" data-view="home" aria-label="后AI生活须知首页"><span>后</span><i>AI</i></button><nav aria-label="主要导航">${navItems.map(([id,ic,label]) => `<button class="rail-item ${view === id || view === 'play' && id === 'home' ? 'active' : ''}" data-action="nav" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`).join('')}</nav><button class="rail-item rail-settings" data-action="settings">${icon('settings')}<span>设置</span></button></aside><div class="workspace"><header class="topbar"><a class="wordmark" href="#home" data-action="nav" data-view="home">后AI研究所 <span>POST-AI INSTITUTE</span></a><div class="topbar-right"><span class="connection"><i></i>${view === 'play' ? (storageAvailable ? '本机自动存档 · 生活接续中' : '本机存储不可用 · 请导出') : '生活协议 / 试行版 1.0'}</span><button class="icon-button sound-button ${soundOn ? 'on' : ''}" data-action="sound" aria-label="${soundOn ? '关闭环境音' : '开启环境音'}" aria-pressed="${soundOn}">${icon('sound')}</button></div></header><main id="main" tabindex="-1">${content}</main><footer class="site-footer"><span>后AI · 十万个未来</span><span>${storageAvailable ? '进度自动保存在本机' : '存储不可用，请导出存档'} <i>／</i> 无账号 · 无分析追踪</span></footer></div>`;
}

function render({focus = false} = {}) {
  sceneHandle?.destroy(); sceneHandle = null;
  document.documentElement.classList.toggle('large-text', vault.settings.largeText);
  document.documentElement.classList.toggle('reduced-motion', !vault.settings.motion);
  if (view === 'play' && !getState()) { view = 'home'; }
  const renders = { home:renderHome, play:renderPlay, cases:renderCases, handbook:renderHandbook, cities:renderCities, research:renderResearch };
  shell((renders[view] || renderHome)());
  const container = $('.scene-canvas');
  if (container) {
    const node = view === 'play' ? getNode(story, getState()) : null;
    sceneHandle = mountScene(container, { scene:container.dataset.scene || 'district', chapter:node?.chapter || 1, reducedMotion:!vault.settings.motion });
  }
  if (focus) $('#main').focus({preventScroll:true});
  document.title = view === 'play' ? `${getState()?.endingId ? '你的结局' : getNode(story,getState())?.title || story.title} · 后AI生活须知` : '后AI生活须知 · 本人仍在此处';
}

function sceneMarkup(scene = 'district', extra = '', className = '') {
  return `<div class="scene-stage ${className}"><div class="scene-canvas" data-scene="${esc(scene)}" aria-hidden="true"></div><div class="scene-grain" aria-hidden="true"></div>${extra}</div>`;
}

function renderHome() {
  const save = vault.saves[campaign.id];
  const progress = save ? save.endingId ? '已完成一条世界线' : `第 ${getNode(campaign, save)?.chapter || 1} 章 · ${getNode(campaign, save)?.chapterTitle || ''}` : '';
  const overlays = `<div class="scene-location">${icon('pin')}<div><strong>澄湾街区</strong><small>CHENGWAN / 2041</small></div></div><div class="floating-note note-one"><span class="tiny-label">迁居接续系统</span><div>家庭成员 <b>已到齐</b></div><div>本人位置 <em>等待核验</em></div><i class="scanline"></i></div><div class="floating-note note-two"><span class="tiny-label">今日生活须知 01</span><p>服务已经到达。<br>请确认人也到了。</p></div><div class="scene-coordinate">31° N · 夏季迁移窗口<br><span>公共照护 / 居住模块 / 热回收</span></div>`;
  return `<section class="home-hero"><div class="hero-copy"><div class="edition"><span class="status-dot"></span>一场关于未来日常的规则怪谈</div><h1>后AI<span>生活须知<span class="title-dot">。</span></span></h1><p class="hero-premise">城市确认，家人已经全部到齐。<br><strong>但你弟弟的座位，还是空的。</strong></p><p class="hero-description">走进能重组的街区，调查会说话的家，读懂每条规则背后的人。你要找回一个人，也要决定这座城市如何照顾人。</p><div class="hero-actions"><button class="button primary large" data-action="start" data-story="${esc(campaign.id)}">${save && !save.endingId ? '继续我的调查' : save?.endingId ? '查看我的结局' : '进入澄湾街区'}<span class="button-mark">${icon('spark')}</span></button><button class="text-button" data-action="how-to">第一次来？查看调查指南</button></div>${save ? `<p class="resume-note">${icon('clock')} ${esc(progress)} <button data-action="restart" data-story="${esc(campaign.id)}">重新开始</button></p>` : '<p class="resume-note">主线约 40–60 分钟 · 可随时离开与继续</p>'}<div class="hero-meta"><div><b>06</b><span>主线章节</span></div><div><b>12</b><span>独立怪谈</span></div><div><b>39</b><span>可抵达的结局</span></div></div></div>${sceneMarkup('district', overlays, 'hero-scene')}</section><section class="home-bottom"><div class="featured-story"><span class="section-number">STORY 01</span><div><span class="eyebrow">正在发生的主线</span><h2>本人仍在此处</h2><p>代理完成了迁居。照护仍在旧址继续。<br>你能否在热浪到来之前，让一个活人重新被看见？</p></div><button class="button subtle" data-action="nav" data-view="cases">打开怪谈档案 ${icon('archive')}</button></div><div class="quote-strip"><span>一条规则，曾经救过一个人。</span><p>当它失去适用条件，<br>又会把谁留在外面？</p><small>调查 · 判断 · 承担 · 改写</small></div></section>`;
}

function statMarkup(state) {
  return `<div class="resources" aria-label="当前可用资源">${Object.entries(STAT_LABELS).map(([key,label]) => `<div class="resource ${state.stats[key] <= 2 ? 'low' : ''}"><div><span>${label}</span><b>${state.stats[key]}<small> / ${STAT_LIMITS[key]}</small></b></div><span class="resource-track"><i style="width:${state.stats[key]/STAT_LIMITS[key]*100}%"></i></span></div>`).join('')}</div>`;
}
function effectsMarkup(effects = {}) {
  return Object.entries(STAT_LABELS).filter(([key]) => effects[key]).map(([key,label]) => `<span class="effect ${effects[key] < 0 ? 'negative' : 'positive'}">${label} ${effects[key] > 0 ? '+' : ''}${effects[key]}</span>`).join('');
}
function unmetText(choice, state) {
  return requirementFailures(choice.requires, state).map(r => r.type === 'evidence' ? `需要「${story.evidence.find(e => e.id === r.id)?.title || '现场证据'}」` : r.type === 'stat' ? `${STAT_LABELS[r.id]}至少 ${r.value}` : '需要此前建立的关系或行动').join('；');
}
function renderPlay() {
  const state = getState();
  if (state.endingId) return renderEnding();
  const node = getNode(story, state);
  const total = story.id === campaign.id ? 6 : 2;
  const chapter = node.chapter || (story.nodes.indexOf(node)+1);
  const found = (node.hotspots || []).filter(h => state.inspected.includes(`${node.id}:${h.id}`)).length;
  const activeRules = story.rules.filter(r => state.rules.includes(r.id)).slice(-2);
  const overlays = `<div class="scene-location">${icon('pin')}<div><strong>${esc(node.location)}</strong><small>${esc(node.timeLabel || '迁居接续中')}</small></div></div><div class="scene-hint"><span class="status-dot"></span>点击现场标记，调查物件与人物 <b>${found}/${node.hotspots?.length || 0}</b></div>${(node.hotspots || []).map((h,i) => `<button class="hotspot ${state.inspected.includes(`${node.id}:${h.id}`) ? 'inspected' : ''}" style="--x:${Number(h.x)||30+i*20}%;--y:${Number(h.y)||45}%" data-action="inspect" data-id="${esc(h.id)}" aria-label="调查：${esc(h.label)}"><span class="hotspot-dot">${state.inspected.includes(`${node.id}:${h.id}`) ? icon('check') : '+'}</span><span class="hotspot-label">${esc(h.label)}</span></button>`).join('')}<div class="scene-caption"><span>现场 ${String(story.nodes.indexOf(node)+1).padStart(2,'0')}</span><p>${esc(node.chapterTitle || story.subtitle)}</p></div>`;
  const echoes = (node.echoes || []).filter(e => state.flags.includes(e.flag));
  return `<section class="play-heading"><div><button class="breadcrumb" data-action="nav" data-view="${story.id === campaign.id ? 'home' : 'cases'}">${story.id === campaign.id ? '主线调查' : '怪谈档案'}</button><span class="breadcrumb-separator">/</span><strong>${esc(story.title)}</strong></div><div class="chapter-track" aria-label="第 ${chapter} 章，共 ${total} 章">${Array.from({length:total},(_,i) => `<span class="${i+1 <= chapter ? 'current' : ''}">${String(i+1).padStart(2,'0')}</span>`).join('')}</div><button class="button notebook-button" data-action="notebook">${icon('book')}调查手册 <span>${state.evidence.length + state.rules.length}</span></button></section><div class="play-grid"><section class="investigation-panel" aria-label="可调查的现场">${sceneMarkup(node.scene || story.scene || 'district', overlays, 'game-scene')}<div class="field-rules"><div class="field-rules-heading"><span class="eyebrow">目前掌握的规则</span><button class="text-button" data-action="notebook" data-tab="rules">查看手册</button></div>${activeRules.length ? activeRules.map(r => `<button class="field-rule" data-action="rule" data-id="${esc(r.id)}"><span>${esc(String(r.number || story.rules.indexOf(r)+1).padStart(2,'0'))}</span><p>${esc(r.text)}</p>${icon('book')}</button>`).join('') : '<p class="empty-field">规则的适用条件藏在现场。先调查一个标记。</p>'}</div></section><section class="narrative-panel" aria-label="剧情与行动"><div class="narrative-scroll"><div class="eyebrow chapter-eyebrow">第 ${String(chapter).padStart(2,'0')} 章 <span>·</span> ${esc(node.chapterTitle || story.subtitle)}</div><h1 class="node-title">${esc(node.title)}</h1><div class="story-prose">${paragraphs(node.paragraphs)}</div>${(node.dialogue || []).map(d => `<blockquote class="dialogue"><span>${esc(d.speaker)}</span><p>${esc(d.text)}</p></blockquote>`).join('')}${echoes.map(e => `<div class="story-echo">${icon('spark')}<p>${esc(e.text)}</p></div>`).join('')}${lastEcho ? `<details class="last-echo"><summary>上一步留下的回声</summary><p>${esc(lastEcho)}</p></details>` : ''}<div class="choice-heading"><span class="eyebrow">你的下一步</span><small>选择将自动保存</small></div><div class="choices">${node.choices.map((c,i) => { const available = availableChoice(c,state); return `<button class="choice ${available ? '' : 'locked'}" data-action="choose" data-id="${esc(c.id)}" ${available ? '' : 'disabled'}><span class="choice-index">${available ? String(i+1).padStart(2,'0') : icon('lock')}</span><span class="choice-content"><strong>${esc(c.label)}</strong><span class="choice-hint">${esc(c.hint)}</span><span class="choice-effects">${effectsMarkup(c.effects)}</span>${!available ? `<span class="requirement">${esc(unmetText(c,state))}</span>` : ''}</span></button>`; }).join('')}</div></div>${statMarkup(state)}<p class="resource-note">资源影响可选行动；归零不会突然结束故事。</p></section></div>`;
}

function renderEnding() {
  const state = getState(); const ending = getEnding(story,state);
  const completed = vault.completed[story.id] || [];
  return `<section class="ending-page"><div class="ending-top"><span class="eyebrow">一条世界线，已经留下</span><span class="completion-badge">本故事 ${completed.length} / ${story.endings.length} 个结局</span></div><div class="ending-layout"><div class="ending-art">${sceneMarkup(story.id === campaign.id ? 'district' : story.scene || 'archive', `<div class="ending-art-label"><span>你的选择没有消失</span><b>${String(story.endings.indexOf(ending)+1).padStart(2,'0')}</b></div>`)}<div class="ending-stats">${statMarkup(state)}<p>调查了 ${state.inspected.length} 处现场，做出 ${state.decisions.length} 次选择。</p></div></div><article class="ending-story"><span class="eyebrow">${esc(story.title)} · 调查结束</span><h1>${esc(ending.title)}</h1><p class="ending-subtitle">${esc(ending.subtitle)}</p><div class="story-prose">${paragraphs(ending.paragraphs)}</div><div class="ending-tradeoffs"><section><h2>你保住了</h2>${paragraphs(ending.gained)}</section><section><h2>你仍需承担</h2>${paragraphs(ending.cost)}</section></div>${ending.reflection?.length ? `<div class="reflection-questions">${paragraphs(ending.reflection)}</div>` : ''}<div class="ending-actions"><button class="button primary" data-action="nav" data-view="cases">进入另一则怪谈</button><button class="button" data-action="restart" data-story="${esc(story.id)}">重走这条世界线</button><button class="text-button" data-action="notebook" data-tab="journal">回看我的选择</button></div></article></div><section class="reflection-card"><div><span class="eyebrow">给未来留一句判断</span><h2>你觉得这样的生活，离我们有多远？</h2><p>可选回答，仅随存档保存在本机，不上传。</p></div><form id="reflection-form"><label>未来距离<select name="distance"><option value="">暂不判断</option>${['已经发生','5 年以内','5–15 年','更遥远','我希望它永不发生'].map(v => `<option ${state.reflection?.distance === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>这次最想保住什么？<select name="priority"><option value="">暂不判断</option>${['人的自主权','照护的连续性','所有人的基本保障','真实与可申诉的记录','共同承担的能力'].map(v => `<option ${state.reflection?.priority === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><button class="button" type="submit">${state.reflection ? '更新我的判断' : '保存我的判断'}</button></form></section></section>`;
}

function renderCases() {
  const filtered = cases.filter(c => (archiveFilter === 'all' || archiveFilter === 'played' && vault.saves[c.id] || archiveFilter === 'unplayed' && !vault.saves[c.id]) && [c.title,c.subtitle,c.theme,c.description].join(' ').includes(archiveQuery));
  return `<section class="collection-page"><div class="page-intro"><div><span class="eyebrow">档案室 / TWELVE PROTOCOLS</span><h1>总有一条规则，<br><span>与你有关。</span></h1><p>十二个独立的未来日常。调查现场、理解限制，再决定谁来承担代价。<br>每则约 5–10 分钟，随时进入，不必先完成主线。</p></div><div class="archive-counter"><b>${String(cases.filter(c => vault.completed[c.id]?.length).length).padStart(2,'0')}<span>/ 12</span></b><small>已经留下你的世界线</small></div></div><div class="collection-toolbar"><div class="filter-tabs" aria-label="档案筛选">${[['all','全部档案'],['unplayed','尚未进入'],['played','我的进度']].map(([id,label]) => `<button data-action="filter" data-filter="${id}" class="${archiveFilter === id ? 'active' : ''}">${label}</button>`).join('')}</div><label class="search-field">${icon('research')}<input id="archive-search" type="search" placeholder="搜索主题或档案" value="${esc(archiveQuery)}" aria-label="搜索怪谈档案"></label></div><div class="case-grid">${filtered.map(c => { const index = cases.indexOf(c); const save = vault.saves[c.id]; return `<article class="case-card scene-${esc(c.scene || 'archive')}"><div class="case-art" aria-hidden="true"><span class="case-symbol">${['◈','⌁','▦','◌','◇','◎','⏣','◷','⌗','▥','◍','❋'][index]}</span><span class="case-number">${String(index+1).padStart(2,'0')}</span><div class="art-grid"></div></div><div class="case-info"><div class="case-meta"><span>${esc(c.theme)}</span><span>${esc(c.era || '未来情景')}</span></div><h2>${esc(c.title)}</h2><p>${esc(c.description)}</p><div class="case-bottom"><span class="case-tier">${esc(c.tier || '机制外推')} · 3 种结局</span><button class="text-button" data-action="start" data-story="${esc(c.id)}">${save?.endingId ? '查看结局' : save ? '继续调查' : '进入档案'} ${icon(save?.endingId ? 'check' : 'archive')}</button></div></div></article>`; }).join('') || '<div class="empty-state"><h2>没有符合条件的档案</h2><p>换一个关键词，或查看全部十二则怪谈。</p><button class="button" data-action="clear-filter">查看全部</button></div>'}</div></section>`;
}

function renderHandbook() {
  const totalEvidence = stories.reduce((sum,s) => sum+(vault.saves[s.id]?.evidence.length || 0),0);
  const totalRules = stories.reduce((sum,s) => sum+(vault.saves[s.id]?.rules.length || 0),0);
  return `<section class="collection-page handbook-page"><div class="page-intro"><div><span class="eyebrow">FIELD NOTES / 调查手册</span><h1>规则很短。<br><span>生活很长。</span></h1><p>每条须知都有发布者、适用范围和隐藏的代价。<br>这些记录来自你的调查；未发现的内容默认保留悬念。</p></div><div class="handbook-numbers"><span><b>${totalRules}</b> 条规则</span><span><b>${totalEvidence}</b> 件证据</span></div></div><div class="handbook-toolbar"><span>${handbookOpen ? '已展开全部档案，包含剧情线索' : '仅显示你在故事中发现的规则'}</span><button class="button" data-action="toggle-spoilers">${handbookOpen ? '收起未发现内容' : '展开全部规则（含剧透）'}</button></div>${stories.map(s => { const state = vault.saves[s.id]; const rules = s.rules.filter(r => handbookOpen || state?.rules.includes(r.id)); return rules.length ? `<section class="handbook-section"><div class="section-heading"><h2>${esc(s.title)}</h2><button class="text-button" data-action="start" data-story="${esc(s.id)}">${state ? '返回故事' : '进入故事'}</button></div><div class="rule-grid">${rules.map(r => `<article class="rule-card"><span class="rule-number">规则 ${String(r.number || s.rules.indexOf(r)+1).padStart(2,'0')}</span><h3>${esc(r.title)}</h3><p class="rule-text">${esc(r.text)}</p><dl><div><dt>发布者</dt><dd>${esc(r.issuer)}</dd></div><div><dt>适用范围</dt><dd>${esc(r.scope)}</dd></div></dl><details><summary>查看机制与代价</summary><p>${esc(r.explanation)}</p></details></article>`).join('')}</div></section>` : ''; }).join('') || '<div class="empty-state"><div class="empty-symbol">'+icon('book')+'</div><h2>手册还没有被翻开</h2><p>进入澄湾街区，点击现场标记，第一条规则就会出现在这里。</p><button class="button primary" data-action="start" data-story="'+esc(campaign.id)+'">开始调查</button></div>'}</section>`;
}

function renderCities() {
  const city = cities.find(c => c.id === cityId) || cities[0];
  if (!city) return '<p>城市档案暂未载入。</p>';
  return `<section class="collection-page cities-page"><div class="page-intro"><div><span class="eyebrow">六种制度原型 / ALTERNATIVE FUTURES</span><h1>同一种技术，<br><span>可以住出不同的未来。</span></h1><p>六座用于比较制度的虚构城市。它们展示收益与代价，<br>并不代表单一预测，也不替代《十万个未来》的城市设定。</p></div></div><div class="city-layout"><div class="city-tabs" role="tablist" aria-label="城市制度原型">${cities.map((c,i) => `<button role="tab" id="tab-${esc(c.id)}" aria-selected="${c.id === city.id}" aria-controls="city-detail" data-action="city" data-city="${esc(c.id)}" class="${c.id === city.id ? 'active' : ''}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${esc(c.name)}</strong><small>${esc(c.subtitle)}</small></div></button>`).join('')}</div><article id="city-detail" class="city-detail" role="tabpanel" aria-labelledby="tab-${esc(city.id)}"><div class="city-map" aria-hidden="true"><div class="city-ring ring-one"></div><div class="city-ring ring-two"></div><div class="city-ring ring-three"></div><span>${icon('city')}</span><i></i><i></i><i></i></div><span class="eyebrow">制度如何进入日常</span><h2>${esc(city.name)}</h2><p class="city-description">${esc(city.description)}</p><div class="city-tradeoffs"><section><h3>生活因此更好</h3>${paragraphs(city.benefit)}</section><section><h3>也因此更脆弱</h3>${paragraphs(city.risk)}</section></div><blockquote class="city-rule"><span>在这里，你会读到的须知</span><p>${esc(city.rule)}</p></blockquote><div class="city-mechanism"><h3>规则背后的机制</h3>${paragraphs(city.mechanism)}<small>${esc(city.sourceNote)}</small></div></article></div></section>`;
}

function renderResearch() {
  let content = '';
  if (researchTab === 'sources') content = `<p class="research-lead">现实研究提供机制线索；故事中的制度、人物和事件是创作推演。每份资料都标明了它不能证明什么。</p><div class="source-list">${sources.map((s,i) => `<article class="source-card"><span class="source-index">${String(i+1).padStart(2,'0')}</span><div><div class="source-meta">${esc(s.organization)} <span>·</span> ${esc(s.year)}</div><h2><a href="${esc(/^https?:\/\//.test(s.url) ? s.url : '#')}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ${icon('research')}</a></h2><p><strong>研究线索</strong>${esc(s.findings)}</p><p class="source-boundary"><strong>推演边界</strong>${esc(s.boundary)}</p><div class="source-tags">${(s.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</div></div></article>`).join('')}</div>`;
  if (researchTab === 'method') {
    const notes = Array.isArray(designNotes) ? designNotes : typeof designNotes === 'object' ? Object.entries(designNotes).map(([title,text])=>({title,text:typeof text==='string'?text:JSON.stringify(text)})) : [{title:'研究如何进入游戏',text:designNotes}];
    content = `<div class="method-intro"><span class="eyebrow">事实 / 机制外推 / 远期强设定</span><h2>规则怪谈，也是一种未来生活实验。</h2><p>你面对的不是知识问答。技术怎样工作、谁有权解释、代价由谁承担，共同决定了你能做什么。</p></div><div class="method-grid">${notes.map((n,i) => `<article><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(n.title || '设计原则')}</h3>${paragraphs(n.text || n.body || n.description || n)}</article>`).join('')}</div><section class="privacy-note"><h3>关于你的选择</h3><p>这是一款单人、浏览器本地运行的叙事游戏。游戏没有账号、后端、联网大模型或分析追踪代码；你的选择、结局与可选反思仅写入本机存储。导出 JSON 才能把存档带到另一个设备。托管平台仍会收到正常网页请求。</p><p>剧情不是对未来的事实断言，也不构成医疗、法律或安全操作指引。</p></section>`;
  }
  if (researchTab === 'seeds') content = `<p class="research-lead">主线之外，还有六个关于文化、信仰与关系的创作种子。以下是可阅读的世界观扩展，尚未做成额外关卡。</p><div class="seed-grid">${extraSeeds.map((s,i) => `<article class="seed-card"><span class="eyebrow">SEED ${String(i+1).padStart(2,'0')} / ${esc(s.theme)}</span><h2>${esc(s.title)}</h2>${paragraphs(s.description)}<blockquote>${esc(s.rule)}</blockquote></article>`).join('')}</div>`;
  return `<section class="collection-page research-page"><div class="page-intro"><div><span class="eyebrow">机制档案 / BEHIND THE FICTION</span><h1>怪谈从想象开始。<br><span>推演需要依据。</span></h1><p>硬件、基础设施、制度、照护、记忆与主体权利。<br>在真实约束与开放未来之间，保留可以追问的空间。</p></div></div><div class="filter-tabs research-tabs" aria-label="研究档案栏目">${[['sources','研究来源'],['method','创作方法'],['seeds','更多生活种子']].map(([id,label]) => `<button class="${researchTab === id ? 'active' : ''}" data-action="research-tab" data-tab="${id}">${label}</button>`).join('')}</div>${content}</section>`;
}

function startStory(id, reset = false) {
  closeDialog();
  story = findStory(id); vault.active = story.id;
  if (reset || !vault.saves[story.id]) vault.saves[story.id] = createState(story);
  persist(); lastEcho = ''; view = 'play';
  location.hash = `play/${story.id}`;
  render({focus:true}); window.scrollTo(0,0);
}
function navigate(nextView) {
  closeDialog(); view = nextView; lastEcho = '';
  location.hash = nextView;
  render({focus:true}); window.scrollTo(0,0);
}
function showRule(id) {
  const rule = story.rules.find(r => r.id === id);
  if (!rule) return;
  showDialog(rule.title, `<div class="inspection-rule"><span class="rule-number">规则 ${esc(rule.number || story.rules.indexOf(rule)+1)}</span><p>${esc(rule.text)}</p></div><dl class="detail-list"><div><dt>发布者</dt><dd>${esc(rule.issuer)}</dd></div><div><dt>适用范围</dt><dd>${esc(rule.scope)}</dd></div></dl><details class="mechanism-details"><summary>查看这条规则的机制解释（含线索）</summary><p>${esc(rule.explanation)}</p></details><button class="button primary" data-action="close-dialog">返回现场</button>`);
}
function showNotebook(tab = 'evidence') {
  if (!getState()) { navigate('handbook'); return; }
  notebookTab = tab;
  const state = getState();
  let body = '';
  if (tab === 'evidence') body = story.evidence.filter(e=>state.evidence.includes(e.id)).map(e=>`<article class="notebook-entry"><span class="eyebrow">${esc(e.source)}</span><h3>${esc(e.title)}</h3>${paragraphs(e.body)}</article>`).join('') || '<p class="empty-notebook">还没有收集到证据。点击现场中的调查标记。</p>';
  if (tab === 'rules') body = story.rules.filter(r=>state.rules.includes(r.id)).map(r=>`<article class="notebook-entry"><span class="eyebrow">${esc(r.issuer)} / ${esc(r.scope)}</span><h3>${esc(r.title)}</h3><p class="rule-text">${esc(r.text)}</p><details><summary>机制解释（含线索）</summary><p>${esc(r.explanation)}</p></details></article>`).join('') || '<p class="empty-notebook">现场还有你未读过的须知。</p>';
  if (tab === 'journal') body = [...state.journal].reverse().map((j,i)=>`<article class="journal-entry"><span>${j.type === 'inspect' ? icon('eye') : icon('spark')}</span><div><small>${esc(story.nodes.find(n=>n.id===j.nodeId)?.location || '')}</small><h3>${esc(j.title)}</h3>${paragraphs(j.text)}</div></article>`).join('') || '<p class="empty-notebook">你的第一步还没有留下记录。</p>';
  showDialog(`${story.title} · 调查手册`, `<div class="filter-tabs notebook-tabs">${[['evidence',`证据 ${state.evidence.length}`],['rules',`规则 ${state.rules.length}`],['journal','行动记录']].map(([id,label])=>`<button class="${tab===id?'active':''}" data-action="notebook-tab" data-tab="${id}">${label}</button>`).join('')}</div><div class="notebook-entries">${body}</div><div class="notebook-bottom"><button class="button" data-action="export">${icon('download')}导出全部存档</button><button class="text-button" data-action="close-dialog">返回现场</button></div>`, 'wide-dialog');
}
function inspectHotspot(id) {
  try {
    const result = inspect(story,getState(),id);
    vault.saves[story.id] = result.state; persist();
    const h = result.hotspot;
    render();
    const foundEvidence = story.evidence.filter(e=>(h.evidence || []).includes(e.id));
    const foundRules = story.rules.filter(r=>(h.rules || []).includes(r.id));
    showDialog(h.title, `<div class="inspection-prose">${paragraphs(h.text)}</div>${foundEvidence.map(e=>`<div class="evidence-found"><span class="eyebrow">${result.fresh ? '证据已收入手册' : '已收录的证据'} · ${esc(e.source)}</span><h3>${esc(e.title)}</h3>${e.body === h.text ? '' : paragraphs(e.body)}</div>`).join('')}${foundRules.map(r=>`<div class="inspection-rule"><span class="rule-number">已发现规则 ${esc(r.number || story.rules.indexOf(r)+1)} / ${esc(r.issuer)}</span><p>${esc(r.text)}</p><small>适用范围：${esc(r.scope)}</small></div>`).join('')}<div class="inspection-bottom"><span>${result.fresh ? effectsMarkup(h.effects) : '重复查看不会消耗资源或重复获得收益'}</span><button class="button primary" data-action="close-dialog">记住了，返回现场</button></div>`);
    if (result.fresh) playChime(440);
  } catch (error) { toast(error.message); }
}
function makeChoice(id) {
  try {
    const next = choose(story,getState(),id);
    lastEcho = next.decisions.at(-1)?.echo || '';
    vault.saves[story.id] = next;
    if (next.endingId) vault.completed[story.id] = [...new Set([...(vault.completed[story.id] || []),next.endingId])];
    persist(); render({focus:true});
    if (next.endingId) { window.scrollTo(0,0); playChime(660); }
    else { $('.narrative-scroll')?.scrollTo(0,0); if (innerWidth <= 900) window.scrollTo({top:$('.play-heading').offsetTop,behavior:'instant'}); }
    if (!storageAvailable) toast('浏览器未允许保存进度，请在设置中导出存档。');
  } catch(error) { toast(error.message); }
}
function settingsDialog() {
  showDialog('你的游戏设置', `<p class="dialog-lead">随时暂停、继续，或者把这一条世界线带走。</p><div class="settings-list"><label><span><strong>环境音</strong><small>轻微合成声，默认关闭</small></span><input type="checkbox" data-setting="sound" ${soundOn?'checked':''}></label><label><span><strong>动态场景</strong><small>关闭后保留静态画面与全部功能</small></span><input type="checkbox" data-setting="motion" ${vault.settings.motion?'checked':''}></label><label><span><strong>放大剧情文字</strong><small>适合长时间阅读</small></span><input type="checkbox" data-setting="largeText" ${vault.settings.largeText?'checked':''}></label></div><section class="save-management"><h3>本机存档</h3><p>已保存 ${Object.keys(vault.saves).length} 个故事，完成 ${completeCount()} 个故事。${storageAvailable ? '进度仅保存在当前浏览器。' : '本机存储当前不可用，请导出保存。'}</p><div class="button-row"><button class="button" data-action="export">导出存档</button><button class="button" data-action="import">导入存档</button><input type="file" id="save-input" accept="application/json,.json" hidden></div><button class="text-button danger" data-action="reset-all">清空本机进度</button></section><section class="keyboard-help"><h3>键盘操作</h3><p><kbd>1</kbd>–<kbd>4</kbd> 选择行动 <kbd>E</kbd> 打开手册 <kbd>Esc</kbd> 关闭窗口</p><p>所有调查标记都可使用 <kbd>Tab</kbd> 与 <kbd>Enter</kbd> 操作。</p></section>`);
}
function exportSave() {
  const blob = new Blob([JSON.stringify({ format:'postai-life-protocols',version:1,...vault },null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href=url; a.download=`后AI生活须知_存档_${new Date().toISOString().slice(0,10)}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000); toast('存档已导出。可以在另一台设备的设置中导入。');
}
async function importSave(file) {
  if (!file) return;
  if (file.size > 2_000_000) { toast('存档过大，请选择游戏导出的 JSON 文件。'); return; }
  try {
    const raw = JSON.parse(await file.text());
    if (raw.format !== 'postai-life-protocols' || raw.version !== 1) throw new Error('不是受支持的游戏存档');
    const incoming = {};
    for (const s of stories) { const state = sanitizeState(raw.saves?.[s.id],s); if (state) incoming[s.id] = state; }
    if (!Object.keys(incoming).length) throw new Error('存档中没有有效的故事进度');
    pendingImport = {raw,incoming};
    showDialog('导入这份世界线？', `<p>找到 ${Object.keys(incoming).length} 个有效故事。相同故事的本机进度将被替换，其他故事仍会保留。已抵达的结局会合并。</p><div class="button-row"><button class="button primary" data-action="confirm-import">确认导入</button><button class="button" data-action="settings">取消</button></div>`);
  } catch(error) { toast(`导入失败：${error.message}`); }
}
let pendingImport = null;
async function toggleSound(force) {
  const next = typeof force === 'boolean' ? force : !soundOn;
  if (!next) { await audioGraph?.context.suspend(); soundOn=false; }
  else {
    try {
      if (!audioGraph) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('no audio');
        const context = new AudioContextClass(); const gain = context.createGain(); gain.gain.value=0.018; gain.connect(context.destination);
        [110,164.81,220.4].forEach((f,i)=>{ const osc=context.createOscillator(); const volume=context.createGain(); osc.type='sine'; osc.frequency.value=f; volume.gain.value=i===0?0.65:0.2; osc.connect(volume);volume.connect(gain);osc.start(); });
        audioGraph={context,gain};
      }
      await audioGraph.context.resume(); soundOn=true;
    } catch { soundOn=false; toast('当前浏览器无法播放环境音，游戏仍可正常进行。'); }
  }
  const b=$('.sound-button'); if(b){b.classList.toggle('on',soundOn);b.setAttribute('aria-pressed',String(soundOn));b.setAttribute('aria-label',soundOn?'关闭环境音':'开启环境音');}
}
function playChime(frequency) {
  if (!soundOn || !audioGraph) return;
  const {context}=audioGraph; const osc=context.createOscillator(); const gain=context.createGain();
  osc.frequency.value=frequency; gain.gain.setValueAtTime(0,context.currentTime); gain.gain.linearRampToValueAtTime(0.03,context.currentTime+0.04); gain.gain.exponentialRampToValueAtTime(0.0001,context.currentTime+0.6); osc.connect(gain); gain.connect(context.destination);osc.start();osc.stop(context.currentTime+0.65);osc.onended=()=>{osc.disconnect();gain.disconnect();};
}

function handleAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  event.preventDefault();
  const a = button.dataset.action;
  switch(a) {
    case 'nav': navigate(button.dataset.view); break;
    case 'start': startStory(button.dataset.story); break;
    case 'restart': {
      const s=findStory(button.dataset.story);
      showDialog('重走这条世界线？', `<p>《${esc(s.title)}》的当前调查进度将被替换；你已经抵达的结局记录会保留。其他故事不受影响。</p><div class="button-row"><button class="button primary" data-action="confirm-restart" data-story="${esc(s.id)}">重新开始</button><button class="button" data-action="close-dialog">保留当前进度</button></div>`); break;
    }
    case 'confirm-restart': startStory(button.dataset.story,true); break;
    case 'inspect': inspectHotspot(button.dataset.id); break;
    case 'choose': makeChoice(button.dataset.id); break;
    case 'rule': showRule(button.dataset.id); break;
    case 'notebook': showNotebook(button.dataset.tab || 'evidence'); break;
    case 'notebook-tab': showNotebook(button.dataset.tab); break;
    case 'close-dialog': closeDialog(); break;
    case 'settings': settingsDialog(); break;
    case 'sound': toggleSound(); break;
    case 'filter': archiveFilter=button.dataset.filter; render(); break;
    case 'clear-filter': archiveFilter='all';archiveQuery='';render();break;
    case 'toggle-spoilers': handbookOpen=!handbookOpen;render();break;
    case 'city': cityId=button.dataset.city;render();document.getElementById(`tab-${cityId}`)?.focus({preventScroll:true});break;
    case 'research-tab': researchTab=button.dataset.tab;render();break;
    case 'export': exportSave();break;
    case 'import': $('#save-input')?.click();break;
    case 'confirm-import': {
      if (!pendingImport) break;
      Object.assign(vault.saves,pendingImport.incoming);
      for(const s of stories){const valid=(Array.isArray(pendingImport.raw.completed?.[s.id])?pendingImport.raw.completed[s.id]:[]).filter(id=>s.endings.some(e=>e.id===id));vault.completed[s.id]=[...new Set([...(vault.completed[s.id]||[]),...valid,...(vault.saves[s.id]?.endingId?[vault.saves[s.id].endingId]:[])])];}
      pendingImport=null;persist();closeDialog();render();toast('已导入存档。');break;
    }
    case 'reset-all': showDialog('清空全部本机进度？', '<p>所有故事的当前进度、结局收藏与反思记录都会被清除。此操作无法撤销，建议先导出存档。</p><div class="button-row"><button class="button" data-action="export">先导出存档</button><button class="button danger" data-action="confirm-reset">清空全部进度</button><button class="button" data-action="settings">取消</button></div>');break;
    case 'confirm-reset':vault.saves={};vault.completed={};persist();navigate('home');toast('本机进度已清空。');break;
    case 'how-to':showDialog('在未来生活中，做一次调查员', '<ol class="guide-steps"><li><strong>先看现场</strong><p>点击发光的标记，调查物件、人物和系统记录。证据与规则会自动放入手册。</p></li><li><strong>问规则对谁有效</strong><p>注意发布者、适用范围、版本与人的处境。手册中的机制解释可以按需展开。</p></li><li><strong>做出有代价的选择</strong><p>你的行动改变接续时间、照护余量、共同信任，也会留下影响后文的关系与证据。没有统一的满分答案。</p></li><li><strong>带着后果继续</strong><p>主线六章，独立怪谈各两幕。随时退出都能继续；已发现的结局会保留。所有进度仅存于本机。</p></li></ol><button class="button primary" data-action="start" data-story="'+esc(campaign.id)+'">开始我的调查</button>');break;
  }
}
app.addEventListener('click',handleAction);
dialog.addEventListener('click',event=>{ if(event.target===dialog){ const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog(); }else handleAction(event); });
app.addEventListener('input',event=>{
  if(event.target.id==='archive-search'){
    const position=event.target.selectionStart; archiveQuery=event.target.value; render();
    const input=$('#archive-search');input.focus({preventScroll:true});try{input.setSelectionRange(position,position);}catch{}
  }
});
app.addEventListener('submit',event=>{
  if(event.target.id!=='reflection-form')return;event.preventDefault();
  const values=new FormData(event.target);getState().reflection={distance:values.get('distance'),priority:values.get('priority')};persist();toast('你的判断已随存档保存在本机。');
});
dialog.addEventListener('change',async event=>{
  if(event.target.id==='save-input'){importSave(event.target.files[0]);return;}
  const setting=event.target.dataset.setting;if(!setting)return;
  if(setting==='sound'){await toggleSound(event.target.checked);event.target.checked=soundOn;}
  else{vault.settings[setting]=event.target.checked;persist();render();}
});
document.addEventListener('keydown',event=>{
  if(dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,select,textarea,button,a'))return;
  if(view==='play' && !getState()?.endingId){
    if(event.key.toLowerCase()==='e'){event.preventDefault();showNotebook();}
    const i=Number(event.key)-1;const node=getNode(story,getState());
    if(i>=0&&i<4&&node.choices[i]&&availableChoice(node.choices[i],getState())){event.preventDefault();makeChoice(node.choices[i].id);}
  }
});
document.addEventListener('visibilitychange',()=>{if(audioGraph&&soundOn){if(document.hidden)audioGraph.context.suspend();else audioGraph.context.resume();}});
function readRoute() {
  const route=location.hash.slice(1).split('/');
  if(route[0]==='play'&&stories.some(s=>s.id===route[1])){story=findStory(route[1]);vault.active=story.id;if(!getState())vault.saves[story.id]=createState(story);view='play';persist();}
  else view=['home','cases','handbook','cities','research'].includes(route[0])?route[0]:'home';
}
window.addEventListener('popstate',()=>{readRoute();closeDialog();render({focus:true});});
readRoute();render();
