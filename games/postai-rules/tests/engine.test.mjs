import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_VERSION, STAT_LIMITS, createState, getNode, getEnding,
  availableChoice, requirementFailures, inspect, choose, validateStory, sanitizeState,
} from '../engine.js';
import { campaign } from '../content/campaign.js';
import { cases } from '../content/cases.js';

const stories = [campaign, ...cases];
const scenes = new Set(['district', 'home', 'factory', 'garden', 'orbit', 'archive']);
const effectKeys = new Set([...Object.keys(STAT_LIMITS), 'flags', 'evidence', 'rules']);
const requirementKeys = new Set(['evidence', 'flags', 'notFlags', 'min']);
const clone = value => structuredClone(value);
const text = (value, label) => assert.ok(typeof value === 'string' && value.trim(), label);
const unique = (values, label) => assert.equal(new Set(values).size, values.length, label);

function assertResources(state) {
  for (const [key, max] of Object.entries(STAT_LIMITS)) {
    assert.ok(Number.isFinite(state.stats[key]), `${key} must be finite`);
    assert.ok(state.stats[key] >= 0 && state.stats[key] <= max, `${key} outside 0..${max}`);
  }
}

function inspectAll(story, state) {
  let next = state;
  for (const hotspot of getNode(story, state).hotspots || []) {
    next = inspect(story, next, hotspot.id, 2000).state;
  }
  return next;
}

/**
 * Search real transitions and retain a replayable witness for every ending.
 * Only flags/evidence read by a requirement affect reachability; narrative echoes
 * and journal history do not. Projecting those fields prevents exponential
 * duplication of otherwise equivalent campaign paths without weakening gates.
 */
function reachableEndings(story, { investigate = true, all = true, initial } = {}) {
  const requirements = story.nodes.flatMap(node => node.choices.map(choice => choice.requires || {}));
  const relevantEvidence = new Set(requirements.flatMap(req => req.evidence || []));
  const relevantFlags = new Set(requirements.flatMap(req => [...(req.flags || []), ...(req.notFlags || [])]));
  const selected = (values, known) => values.filter(value => known.has(value)).sort();
  const key = state => JSON.stringify([
    state.nodeId, state.stats,
    selected(state.evidence, relevantEvidence), selected(state.flags, relevantFlags),
    [...state.inspected].sort(),
  ]);
  const pending = [{ state: initial || createState(story, 1000), steps: [] }];
  const seen = new Set();
  const endings = new Map();
  while (pending.length) {
    const entry = pending.pop();
    let state = entry.state;
    if (state.endingId) {
      if (!endings.has(state.endingId)) endings.set(state.endingId, { state, steps: entry.steps });
      if (!all || endings.size === story.endings.length) break;
      continue;
    }
    if (investigate) state = inspectAll(story, state);
    const signature = key(state);
    if (seen.has(signature)) continue;
    seen.add(signature);
    assert.ok(seen.size <= 100000, `${story.id}: search exceeded 100000 distinct transition states`);
    assertResources(state);
    const node = getNode(story, state);
    assert.ok(node, `${story.id}: transition lost its node`);
    const choices = node.choices.filter(choice => availableChoice(choice, state));
    assert.ok(choices.length, `${story.id}/${node.id}: no action at ${JSON.stringify(state.stats)}`);
    // Reverse push preserves authored choice order in the depth-first traversal.
    for (const choice of [...choices].reverse()) {
      const next = choose(story, state, choice.id, 3000 + entry.steps.length);
      assertResources(next);
      pending.push({ state: next, steps: [...entry.steps, { nodeId: node.id, choiceId: choice.id }] });
    }
  }
  return { endings, explored: seen.size };
}

test('story identities are unique and the campaign is complete', () => {
  assert.ok(cases.length > 0, 'standalone case collection is empty');
  unique(stories.map(story => story.id), 'story IDs collide in saved games');
  assert.equal(new Set(campaign.nodes.map(node => node.chapter)).size, 6, 'campaign must contain six chapters');
  assert.ok(campaign.endings.length >= 3, 'campaign requires three distinct outcomes');
});

for (const story of stories) {
  test(`${story.id}: complete content, valid references and connected story graph`, () => {
    assert.deepEqual(validateStory(story), []);
    for (const field of ['id', 'title', 'description', 'start']) text(story[field], `${story.id}.${field}`);
    unique(story.evidence.map(item => item.id), `${story.id}: evidence IDs collide`);
    unique(story.rules.map(item => item.id), `${story.id}: rule IDs collide`);
    const evidence = new Set(story.evidence.map(item => item.id));
    const rules = new Set(story.rules.map(item => item.id));
    const items = story.nodes.flatMap(node => [...node.choices, ...(node.hotspots || [])]);
    const flags = new Set(items.flatMap(item => item.effects?.flags || []));
    const refs = (values, known, label) => {
      assert.ok(values === undefined || Array.isArray(values), `${label}: expected an array`);
      for (const id of values || []) assert.ok(typeof id === 'string' && known.has(id), `${label}: unknown ${id}`);
    };
    for (const item of story.evidence) for (const field of ['id', 'title', 'source', 'body']) text(item[field], `${item.id}.${field}`);
    for (const rule of story.rules) for (const field of ['id', 'number', 'title', 'text', 'issuer', 'scope', 'explanation']) text(rule[field], `${rule.id}.${field}`);
    for (const node of story.nodes) {
      for (const field of ['id', 'title', 'location', 'chapterTitle', 'timeLabel']) text(node[field], `${node.id}.${field}`);
      assert.ok(scenes.has(node.scene), `${node.id}: unknown scene ${node.scene}`);
      assert.ok(Number.isInteger(node.chapter) && node.chapter > 0, `${node.id}: invalid chapter`);
      node.paragraphs.forEach(paragraph => text(paragraph, `${node.id}: empty paragraph`));
      unique((node.hotspots || []).map(hotspot => hotspot.id), `${node.id}: duplicate investigation IDs`);
      for (const entry of node.dialogue || []) {
        text(entry.speaker, `${node.id}: dialogue speaker`); text(entry.text, `${node.id}: dialogue text`);
      }
      for (const echo of node.echoes || []) {
        assert.ok(flags.has(echo.flag), `${node.id}: echo references unknown flag ${echo.flag}`);
        text(echo.text, `${node.id}: empty echo`);
      }
      for (const hotspot of node.hotspots || []) {
        for (const field of ['id', 'label', 'title', 'text']) text(hotspot[field], `${node.id}/${hotspot.id}.${field}`);
        for (const axis of ['x', 'y']) assert.ok(Number.isFinite(hotspot[axis]) && hotspot[axis] >= 0 && hotspot[axis] <= 100, `${hotspot.id}: ${axis} is outside the illustration`);
        refs(hotspot.evidence, evidence, hotspot.id); refs(hotspot.rules, rules, hotspot.id);
      }
      for (const choice of node.choices) {
        text(choice.id, `${node.id}: choice ID`); text(choice.label, `${choice.id}: label`);
        for (const key of Object.keys(choice.requires || {})) assert.ok(requirementKeys.has(key), `${choice.id}: unsupported requirement ${key}`);
        refs(choice.requires?.evidence, evidence, choice.id);
        refs(choice.requires?.flags, flags, choice.id); refs(choice.requires?.notFlags, flags, choice.id);
        for (const [key, minimum] of Object.entries(choice.requires?.min || {})) {
          assert.ok(Object.hasOwn(STAT_LIMITS, key), `${choice.id}: unknown resource ${key}`);
          assert.ok(Number.isFinite(minimum) && minimum >= 0 && minimum <= STAT_LIMITS[key], `${choice.id}: impossible resource threshold`);
        }
      }
    }
    for (const item of items) {
      for (const [key, value] of Object.entries(item.effects || {})) {
        assert.ok(effectKeys.has(key), `${item.id}: unsupported effect ${key}`);
        if (Object.hasOwn(STAT_LIMITS, key)) assert.ok(Number.isFinite(value), `${item.id}: resource delta must be finite`);
      }
      refs(item.effects?.evidence, evidence, item.id); refs(item.effects?.rules, rules, item.id);
      refs(item.effects?.flags, flags, item.id);
    }
    for (const ending of story.endings) {
      for (const field of ['id', 'title', 'subtitle']) text(ending[field], `${ending.id}.${field}`);
      for (const field of ['paragraphs', 'gained', 'cost', 'reflection']) {
        assert.ok(Array.isArray(ending[field]) && ending[field].length, `${ending.id}.${field} missing`);
        ending[field].forEach(value => text(value, `${ending.id}.${field} contains empty text`));
      }
    }
    const visited = new Set(); const pending = [story.start];
    while (pending.length) {
      const id = pending.pop(); if (visited.has(id)) continue; visited.add(id);
      const node = story.nodes.find(item => item.id === id);
      if (node) pending.push(...node.choices.map(choice => choice.next));
    }
    for (const item of [...story.nodes, ...story.endings]) assert.ok(visited.has(item.id), `${story.id}: orphaned content ${item.id}`);
  });

  test(`${story.id}: every ending has an executable path from a new game`, t => {
    const result = reachableEndings(story);
    assert.deepEqual([...result.endings.keys()].sort(), story.endings.map(ending => ending.id).sort());
    for (const [endingId, witness] of result.endings) {
      let replay = createState(story, 1000);
      for (const step of witness.steps) {
        assert.equal(replay.nodeId, step.nodeId);
        replay = inspectAll(story, replay);
        replay = choose(story, replay, step.choiceId, 4000);
      }
      assert.equal(getEnding(story, replay)?.id, endingId);
      assert.throws(() => choose(story, replay, witness.steps.at(-1).choiceId), /结束/);
      assert.throws(() => inspect(story, replay, 'after-ending'), /结束/);
    }
    t.diagnostic(`${result.endings.size} endings reached and replayed; ${result.explored} distinct states examined`);
  });

  test(`${story.id}: a player can finish without inspecting any hotspot`, () => {
    const result = reachableEndings(story, { investigate: false, all: false });
    assert.ok(result.endings.size, 'no unassisted route reaches an ending');
    for (const witness of result.endings.values()) {
      assert.deepEqual(witness.state.inspected, []);
      assert.ok(witness.state.journal.every(entry => entry.type === 'choice'));
    }
  });

  test(`${story.id}: zero resources never strand a player at a story node`, () => {
    for (const node of story.nodes) {
      const state = createState(story, 1000);
      state.nodeId = node.id; state.stats = { time: 0, care: 0, trust: 0 };
      const before = clone(state);
      const choices = node.choices.filter(choice => availableChoice(choice, state));
      assert.ok(choices.length, `${node.id}: no action with zero resources and no evidence`);
      for (const choice of choices) assertResources(choose(story, state, choice.id, 2000));
      assert.deepEqual(state, before, `${node.id}: choosing mutated the previous save state`);
    }
    const initial = createState(story, 1000); initial.stats = { time: 0, care: 0, trust: 0 };
    assert.ok(reachableEndings(story, { investigate: false, all: false, initial }).endings.size, 'zero-resource start cannot finish');
  });

  test(`${story.id}: inspection is immutable and can grant each reward only once`, () => {
    for (const node of story.nodes) for (const hotspot of node.hotspots || []) {
      const state = createState(story, 1000); state.nodeId = node.id;
      const before = clone(state);
      const first = inspect(story, state, hotspot.id, 2000);
      assert.equal(first.fresh, true); assert.deepEqual(state, before);
      assert.ok(first.state.inspected.includes(`${node.id}:${hotspot.id}`));
      for (const id of [...(hotspot.evidence || []), ...(hotspot.effects?.evidence || [])]) assert.ok(first.state.evidence.includes(id));
      for (const id of [...(hotspot.rules || []), ...(hotspot.effects?.rules || [])]) assert.ok(first.state.rules.includes(id));
      assert.equal(first.state.journal.length, state.journal.length + 1);
      const afterFirst = clone(first.state);
      const second = inspect(story, first.state, hotspot.id, 9000);
      assert.equal(second.fresh, false); assert.deepEqual(second.state, afterFirst);
      assertResources(second.state);
    }
  });

  test(`${story.id}: every authored gate rejects each missing requirement without mutation`, () => {
    for (const node of story.nodes) for (const choice of node.choices.filter(item => item.requires)) {
      const satisfied = createState(story, 1000); satisfied.nodeId = node.id;
      satisfied.stats = { ...STAT_LIMITS };
      satisfied.evidence = [...(choice.requires.evidence || [])];
      satisfied.flags = [...(choice.requires.flags || [])];
      assert.equal(availableChoice(choice, satisfied), true, `${choice.id}: inconsistent requirements`);
      assert.doesNotThrow(() => choose(story, satisfied, choice.id, 2000));
      const blockedStates = [];
      for (const id of choice.requires.evidence || []) {
        const state = clone(satisfied); state.evidence = state.evidence.filter(value => value !== id); blockedStates.push(state);
      }
      for (const id of choice.requires.flags || []) {
        const state = clone(satisfied); state.flags = state.flags.filter(value => value !== id); blockedStates.push(state);
      }
      for (const id of choice.requires.notFlags || []) {
        const state = clone(satisfied); state.flags.push(id); blockedStates.push(state);
      }
      for (const [key, minimum] of Object.entries(choice.requires.min || {})) if (minimum > 0) {
        const state = clone(satisfied); state.stats[key] = minimum - 1; blockedStates.push(state);
      }
      for (const state of blockedStates) {
        const before = clone(state);
        assert.equal(availableChoice(choice, state), false);
        assert.ok(requirementFailures(choice.requires, state).length);
        assert.throws(() => choose(story, state, choice.id, 2000), /条件/);
        assert.deepEqual(state, before);
      }
    }
    const state = createState(story, 1000); const before = clone(state);
    assert.throws(() => inspect(story, state, 'missing-hotspot'), /不存在/);
    assert.throws(() => choose(story, state, 'missing-choice'), /不存在/);
    assert.deepEqual(state, before);
  });

  test(`${story.id}: a real play state survives save and load`, () => {
    let state = inspectAll(story, createState(story, 1000));
    const choice = getNode(story, state).choices.find(item => availableChoice(item, state));
    state = choose(story, state, choice.id, 3000);
    state.reflection = { distance: '十年以内', priority: '人的当前意愿' };
    const saved = JSON.parse(JSON.stringify(state));
    const loaded = sanitizeState(saved, story);
    assert.deepEqual(loaded, saved);
    assert.notEqual(loaded, saved);
  });
}

test('validation catches broken destinations, duplicate IDs and missing evidence', () => {
  const bad = clone(campaign);
  bad.nodes[0].choices[0].next = 'missing-node';
  bad.nodes[0].choices[0].effects.evidence = ['missing-evidence'];
  bad.nodes.push(clone(bad.nodes[0]));
  const errors = validateStory(bad).join('\n');
  assert.match(errors, /重复/); assert.match(errors, /missing-node/); assert.match(errors, /missing-evidence/);
  assert.deepEqual(validateStory(null), ['缺少故事结构']);
});

test('saves with the wrong version, story, node or ending are rejected', () => {
  const valid = createState(campaign, 1000);
  for (const raw of [null, undefined, false, [], {},
    { ...valid, version: SAVE_VERSION + 1 }, { ...valid, storyId: 'another-story' },
    { ...valid, nodeId: 'missing-node' }, { ...valid, endingId: 'missing-ending' },
  ]) assert.equal(sanitizeState(raw, campaign), null);
});

test('save cleaning filters injected IDs and restores authored text', () => {
  const node = campaign.nodes[0], choice = node.choices[0], hotspot = node.hotspots[0];
  const attack = '<img src=x onerror=alert(1)>';
  const raw = createState(campaign, 1000);
  raw.stats = { time: 99999, care: -300, trust: 'not-a-number', extra: 888 };
  raw.evidence = [campaign.evidence[0].id, campaign.evidence[0].id, attack, {}, null];
  raw.rules = [campaign.rules[0].id, '__proto__'];
  raw.flags = [choice.effects.flags[0], attack, null];
  raw.inspected = [`${node.id}:${hotspot.id}`, 'missing:hotspot'];
  raw.visited = [node.id, node.id, 'missing-node'];
  raw.decisions = [null, { nodeId: node.id, choiceId: choice.id, label: attack, echo: attack, at: 2000 }, { nodeId: node.id, choiceId: attack }];
  raw.journal = [null, { type: 'inspect', nodeId: node.id, title: hotspot.title, text: attack, at: 2000 }, { type: 'choice', nodeId: node.id, title: choice.label, text: attack, at: 3000 }, { type: 'script', nodeId: node.id, title: attack }];
  raw.reflection = { distance: '远'.repeat(1000), priority: '变'.repeat(1000), injected: attack };
  raw.unrecognizedField = attack;
  const cleaned = sanitizeState(raw, campaign);
  assert.ok(cleaned);
  assert.deepEqual(cleaned.stats, { time: STAT_LIMITS.time, care: 0, trust: 0 });
  assert.deepEqual(cleaned.evidence, [campaign.evidence[0].id]);
  assert.deepEqual(cleaned.rules, [campaign.rules[0].id]);
  assert.deepEqual(cleaned.flags, [choice.effects.flags[0]]);
  assert.deepEqual(cleaned.inspected, [`${node.id}:${hotspot.id}`]);
  assert.deepEqual(cleaned.visited, [node.id]);
  assert.equal(cleaned.decisions.length, 1);
  assert.equal(cleaned.decisions[0].label, choice.label); assert.equal(cleaned.decisions[0].echo, choice.echo || '');
  assert.equal(cleaned.journal.length, 2);
  assert.equal(cleaned.journal[0].text, hotspot.text);
  assert.equal(cleaned.journal[1].text, choice.echo || choice.hint || '');
  assert.equal(cleaned.reflection.distance.length, 50); assert.equal(cleaned.reflection.priority.length, 100);
  assert.equal(Object.hasOwn(cleaned.reflection, 'injected'), false);
  assert.equal(Object.hasOwn(cleaned, 'unrecognizedField'), false);
  assert.equal(JSON.stringify(cleaned).includes(attack), false);
});

test('JSON-shaped malformed saves cannot crash numeric or reflection conversion', async t => {
  const node = campaign.nodes[0], choice = node.choices[0], hotspot = node.hotspots[0];
  const uncoercible = () => JSON.parse('{"toString":null,"valueOf":null}');
  const changes = [
    ['object in resource', raw => { raw.stats.time = uncoercible(); }],
    ['object in decision time', raw => { raw.decisions = [{ nodeId: node.id, choiceId: choice.id, at: uncoercible() }]; }],
    ['object in journal time', raw => { raw.journal = [{ nodeId: node.id, type: 'inspect', title: hotspot.title, at: uncoercible() }]; }],
    ['object in start time', raw => { raw.startedAt = uncoercible(); }],
    ['object in reflection', raw => { raw.reflection = { distance: uncoercible(), priority: uncoercible() }; }],
    ['nonfinite timestamps', raw => {
      const infinite = JSON.parse('1e999'); raw.startedAt = infinite; raw.updatedAt = infinite;
      raw.decisions = [{ nodeId: node.id, choiceId: choice.id, at: infinite }];
      raw.journal = [{ nodeId: node.id, type: 'inspect', title: hotspot.title, at: infinite }];
    }],
  ];
  for (const [label, change] of changes) await t.test(label, () => {
    const raw = createState(campaign, 1000); change(raw);
    let cleaned;
    assert.doesNotThrow(() => { cleaned = sanitizeState(raw, campaign); });
    // Rejecting an unusable save or salvaging safe values are both acceptable.
    if (!cleaned) return;
    assertResources(cleaned);
    for (const timestamp of [cleaned.startedAt, cleaned.updatedAt, ...cleaned.decisions.map(item => item.at), ...cleaned.journal.map(item => item.at)]) {
      assert.ok(Number.isFinite(timestamp), 'save loader retained a nonfinite timestamp');
    }
    if (cleaned.reflection) {
      assert.equal(typeof cleaned.reflection.distance, 'string');
      assert.equal(typeof cleaned.reflection.priority, 'string');
    }
  });
});

test('save cleaning bounds history arrays and discards prototype payloads', () => {
  const node = campaign.nodes[0], choice = node.choices[0], hotspot = node.hotspots[0];
  const raw = JSON.parse(JSON.stringify(createState(campaign, 1000)).replace(/}$/, ',"__proto__":{"postaiInjected":true},"constructor":{"prototype":{"postaiInjected":true}}}'));
  raw.decisions = Array.from({ length: 1000 }, () => ({ nodeId: node.id, choiceId: choice.id, at: 2000 }));
  raw.journal = Array.from({ length: 1000 }, () => ({ type: 'inspect', nodeId: node.id, title: hotspot.title, at: 2000 }));
  const cleaned = sanitizeState(raw, campaign);
  assert.ok(cleaned.decisions.length <= 300); assert.ok(cleaned.journal.length <= 500);
  assert.equal(Object.hasOwn(cleaned, '__proto__'), false);
  assert.equal(Object.hasOwn(cleaned, 'constructor'), false);
  assert.equal(Object.prototype.postaiInjected, undefined);
  assert.equal(cleaned.postaiInjected, undefined);
});
