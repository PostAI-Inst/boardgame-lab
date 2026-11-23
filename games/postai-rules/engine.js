export const SAVE_VERSION = 1;
export const STAT_LIMITS = { time: 24, care: 12, trust: 12 };
export const STAT_LABELS = { time: '接续时间', care: '照护余量', trust: '共同信任' };

const addUnique = (base, values) => [...new Set([...(base || []), ...(Array.isArray(values) ? values.filter(v => typeof v === 'string') : [])])];
const clamp = (v, max) => Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));
const finiteNumber = (value, fallback = 0) => {
  if (typeof value !== 'number' && typeof value !== 'string') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const shortText = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';

export function createState(story, now = Date.now()) {
  return {
    version: SAVE_VERSION, storyId: story.id, nodeId: story.start, endingId: null,
    stats: { time: 18, care: 4, trust: 3 }, flags: [], evidence: [], rules: [],
    inspected: [], decisions: [], journal: [], visited: [story.start],
    startedAt: now, updatedAt: now, reflection: null,
  };
}

export function getNode(story, state) { return story.nodes.find(n => n.id === state.nodeId) || null; }
export function getEnding(story, state) { return story.endings.find(e => e.id === state.endingId) || null; }

export function requirementFailures(requires = {}, state) {
  const failures = [];
  for (const id of requires.evidence || []) if (!state.evidence.includes(id)) failures.push({ type: 'evidence', id });
  for (const id of requires.flags || []) if (!state.flags.includes(id)) failures.push({ type: 'flag', id });
  for (const id of requires.notFlags || []) if (state.flags.includes(id)) failures.push({ type: 'notFlag', id });
  for (const [key, value] of Object.entries(requires.min || {})) if ((state.stats[key] || 0) < value) failures.push({ type: 'stat', id: key, value });
  return failures;
}
export function availableChoice(choice, state) { return requirementFailures(choice.requires, state).length === 0; }

export function applyEffects(state, effects = {}) {
  const next = structuredClone(state);
  for (const [key, max] of Object.entries(STAT_LIMITS)) next.stats[key] = clamp(next.stats[key] + (Number(effects[key]) || 0), max);
  next.flags = addUnique(next.flags, effects.flags);
  next.evidence = addUnique(next.evidence, effects.evidence);
  next.rules = addUnique(next.rules, effects.rules);
  return next;
}

export function inspect(story, state, hotspotId, now = Date.now()) {
  if (state.endingId) throw new Error('故事已结束');
  const node = getNode(story, state);
  const hotspot = node?.hotspots?.find(h => h.id === hotspotId);
  if (!hotspot) throw new Error('调查点不存在');
  const key = `${node.id}:${hotspot.id}`;
  if (state.inspected.includes(key)) return { state, hotspot, fresh: false };
  let next = applyEffects(state, hotspot.effects);
  next.evidence = addUnique(next.evidence, hotspot.evidence);
  next.rules = addUnique(next.rules, hotspot.rules);
  next.inspected.push(key);
  next.updatedAt = now;
  next.journal.push({ type: 'inspect', nodeId: node.id, title: hotspot.title, text: hotspot.text, at: now });
  return { state: next, hotspot, fresh: true };
}

export function choose(story, state, choiceId, now = Date.now()) {
  if (state.endingId) throw new Error('故事已结束');
  const node = getNode(story, state);
  const choice = node?.choices?.find(c => c.id === choiceId);
  if (!choice) throw new Error('行动不存在');
  if (!availableChoice(choice, state)) throw new Error('行动条件尚未满足');
  const destination = story.nodes.find(n => n.id === choice.next);
  const ending = story.endings.find(e => e.id === choice.next);
  if (!destination && !ending) throw new Error('故事缺少后续节点');
  const next = applyEffects(state, choice.effects);
  next.decisions.push({ nodeId: node.id, choiceId, label: choice.label, echo: choice.echo || '', at: now });
  next.journal.push({ type: 'choice', nodeId: node.id, title: choice.label, text: choice.echo || choice.hint || '', at: now });
  next.updatedAt = now;
  if (ending) next.endingId = ending.id;
  else { next.nodeId = destination.id; next.visited = addUnique(next.visited, [destination.id]); }
  return next;
}

export function validateStory(story) {
  const errors = [];
  if (!story?.id || !Array.isArray(story.nodes) || !Array.isArray(story.endings)) return ['缺少故事结构'];
  const ids = [...story.nodes, ...story.endings].map(n => n.id);
  if (new Set(ids).size !== ids.length) errors.push(`${story.id}: 节点或结局 ID 重复`);
  if (!story.nodes.some(n => n.id === story.start)) errors.push(`${story.id}: 起始节点缺失`);
  const knownEvidence = new Set((story.evidence || []).map(e => e.id));
  const knownRules = new Set((story.rules || []).map(r => r.id));
  const validateRefs = (obj, label) => {
    for (const id of obj?.evidence || []) if (!knownEvidence.has(id)) errors.push(`${label}: 未定义证据 ${id}`);
    for (const id of obj?.rules || []) if (!knownRules.has(id)) errors.push(`${label}: 未定义规则 ${id}`);
  };
  for (const node of story.nodes) {
    if (!node.paragraphs?.length) errors.push(`${node.id}: 没有剧情`);
    if (!node.choices?.length) errors.push(`${node.id}: 没有行动`);
    if (!(node.choices || []).some(c => !c.requires || Object.keys(c.requires).length === 0)) errors.push(`${node.id}: 缺少无条件行动`);
    const choiceIds = (node.choices || []).map(c => c.id);
    if (new Set(choiceIds).size !== choiceIds.length) errors.push(`${node.id}: 行动 ID 重复`);
    for (const c of node.choices || []) {
      if (!ids.includes(c.next)) errors.push(`${node.id}: 错误后续 ${c.next}`);
      validateRefs(c.effects, c.id); validateRefs(c.requires, c.id);
    }
    for (const h of node.hotspots || []) { validateRefs(h, h.id); validateRefs(h.effects, h.id); }
  }
  return errors;
}

export function sanitizeState(raw, story) {
  if (!raw || raw.version !== SAVE_VERSION || raw.storyId !== story.id) return null;
  if (!story.nodes.some(n => n.id === raw.nodeId)) return null;
  if (raw.endingId && !story.endings.some(e => e.id === raw.endingId)) return null;
  const state = createState(story);
  state.nodeId = raw.nodeId; state.endingId = raw.endingId || null;
  for (const [key, max] of Object.entries(STAT_LIMITS)) state.stats[key] = clamp(finiteNumber(raw.stats?.[key]), max);
  const knownEvidence = new Set(story.evidence.map(e => e.id));
  const knownRules = new Set(story.rules.map(r => r.id));
  const knownNodes = new Set(story.nodes.map(n => n.id));
  const knownInspections = new Set(story.nodes.flatMap(n => (n.hotspots || []).map(h => `${n.id}:${h.id}`)));
  const allEffects = story.nodes.flatMap(n => [...(n.choices || []), ...(n.hotspots || [])]).map(x => x.effects || {});
  const knownFlags = new Set(allEffects.flatMap(e => e.flags || []));
  const filter = (values, known) => Array.isArray(values) ? [...new Set(values.filter(v => typeof v === 'string' && known.has(v)))].slice(0,500) : [];
  state.evidence = filter(raw.evidence, knownEvidence); state.rules = filter(raw.rules, knownRules);
  state.flags = filter(raw.flags, knownFlags); state.inspected = filter(raw.inspected, knownInspections); state.visited = filter(raw.visited, knownNodes);
  state.decisions = (Array.isArray(raw.decisions) ? raw.decisions : []).flatMap(d => {
    const node = story.nodes.find(n => n.id === d?.nodeId);
    const c = node?.choices.find(c => c.id === d?.choiceId);
    return c ? [{ nodeId: node.id, choiceId: c.id, label: c.label, echo: c.echo || '', at: finiteNumber(d.at) }] : [];
  }).slice(0,300);
  state.journal = [];
  for (const item of (Array.isArray(raw.journal) ? raw.journal : []).slice(0,500)) {
    if (!knownNodes.has(item?.nodeId)) continue;
    const node = story.nodes.find(n => n.id === item.nodeId);
    if (item.type === 'inspect') {
      const h = node.hotspots?.find(h => h.title === item.title);
      if (h) state.journal.push({ type: 'inspect', nodeId: node.id, title: h.title, text: h.text, at: finiteNumber(item.at) });
    } else if (item.type === 'choice') {
      const c = node.choices.find(c => c.label === item.title);
      if (c) state.journal.push({ type: 'choice', nodeId: node.id, title: c.label, text: c.echo || c.hint || '', at: finiteNumber(item.at) });
    }
  }
  state.startedAt = finiteNumber(raw.startedAt, Date.now()); state.updatedAt = finiteNumber(raw.updatedAt, Date.now());
  state.reflection = raw.reflection && typeof raw.reflection === 'object' ? { distance: shortText(raw.reflection.distance,50), priority: shortText(raw.reflection.priority,100) } : null;
  return state;
}
