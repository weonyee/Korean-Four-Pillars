/**
 * relations.js — 지지 관계(合沖刑破害) 분석 모듈.
 * No DOM dependencies. All functions are stateless and exportable.
 *
 * 삼합(三合), 방합(方合), 육합(六合), 충(沖), 형(刑), 파(破), 해(害)
 */

// ── 삼합(三合) — 세 지지가 모여 하나의 오행을 이룸 ─────────────────────────
export const SAMHAP = [
  { branches: ['申', '子', '辰'], element: 'Water', name: '수국삼합' },
  { branches: ['亥', '卯', '未'], element: 'Wood',  name: '목국삼합' },
  { branches: ['寅', '午', '戌'], element: 'Fire',  name: '화국삼합' },
  { branches: ['巳', '酉', '丑'], element: 'Metal', name: '금국삼합' },
];

// ── 방합(方合) — 같은 방위의 세 지지 ────────────────────────────────────────
export const BANGHAP = [
  { branches: ['寅', '卯', '辰'], element: 'Wood',  name: '동방목국', direction: '동' },
  { branches: ['巳', '午', '未'], element: 'Fire',  name: '남방화국', direction: '남' },
  { branches: ['申', '酉', '戌'], element: 'Metal', name: '서방금국', direction: '서' },
  { branches: ['亥', '子', '丑'], element: 'Water', name: '북방수국', direction: '북' },
];

// ── 육합(六合) — 두 지지의 합 ───────────────────────────────────────────────
export const YUKHAP = [
  { pair: ['子', '丑'], element: 'Earth', name: '자축합토' },
  { pair: ['寅', '亥'], element: 'Wood',  name: '인해합목' },
  { pair: ['卯', '戌'], element: 'Fire',  name: '묘술합화' },
  { pair: ['辰', '酉'], element: 'Metal', name: '진유합금' },
  { pair: ['巳', '申'], element: 'Water', name: '사신합수' },
  { pair: ['午', '未'], element: 'Fire',  name: '오미합화' },
];

// ── 충(沖) — 대립하는 두 지지 ───────────────────────────────────────────────
export const CHUNG = [
  { pair: ['子', '午'], name: '자오충' },
  { pair: ['丑', '未'], name: '축미충' },
  { pair: ['寅', '申'], name: '인신충' },
  { pair: ['卯', '酉'], name: '묘유충' },
  { pair: ['辰', '戌'], name: '진술충' },
  { pair: ['巳', '亥'], name: '사해충' },
];

// ── 형(刑) — 서로 해치는 관계 ───────────────────────────────────────────────
export const HYUNG = [
  { branches: ['寅', '巳', '申'], name: '무은지형', type: '삼형' },
  { branches: ['丑', '戌', '未'], name: '지세지형', type: '삼형' },
  { pair: ['子', '卯'],           name: '무례지형', type: '이형' },
  // 자형(自刑)
  { self: '辰', name: '자형(진)', type: '자형' },
  { self: '午', name: '자형(오)', type: '자형' },
  { self: '酉', name: '자형(유)', type: '자형' },
  { self: '亥', name: '자형(해)', type: '자형' },
];

// ── 파(破) — 깨뜨리는 관계 ──────────────────────────────────────────────────
export const PA = [
  { pair: ['子', '酉'], name: '자유파' },
  { pair: ['丑', '辰'], name: '축진파' },
  { pair: ['寅', '亥'], name: '인해파' },
  { pair: ['卯', '午'], name: '묘오파' },
  { pair: ['巳', '申'], name: '사신파' },
  { pair: ['未', '戌'], name: '미술파' },
];

// ── 해(害) — 육해, 서로 해치는 관계 ────────────────────────────────────────
export const HAE = [
  { pair: ['子', '未'], name: '자미해' },
  { pair: ['丑', '午'], name: '축오해' },
  { pair: ['寅', '巳'], name: '인사해' },
  { pair: ['卯', '辰'], name: '묘진해' },
  { pair: ['申', '亥'], name: '신해해' },
  { pair: ['酉', '戌'], name: '유술해' },
];

// ══════════════════════════════════════════════════════════════════════════════

function hasPair(branches, pair) {
  return branches.includes(pair[0]) && branches.includes(pair[1]);
}

function hasAll(branches, targets) {
  return targets.every(t => branches.includes(t));
}

/**
 * 사주 4주 지지의 모든 관계를 분석합니다.
 *
 * @param {{ year, month, day, hour }} pillars
 * @returns {{ samhap, banghap, yukhap, chung, hyung, pa, hae }}
 */
export function analyzeRelations(pillars) {
  const branches = [
    pillars.year.branch, pillars.month.branch,
    pillars.day.branch, pillars.hour.branch,
  ];

  const result = {
    samhap: [],   // 삼합
    banghap: [],  // 방합
    yukhap: [],   // 육합
    chung: [],    // 충
    hyung: [],    // 형
    pa: [],       // 파
    hae: [],      // 해
  };

  // 삼합 (3개 모두 있으면 완전삼합, 2개면 반합)
  for (const sh of SAMHAP) {
    const count = sh.branches.filter(b => branches.includes(b)).length;
    if (count === 3) {
      result.samhap.push({ ...sh, type: '완전삼합' });
    } else if (count === 2) {
      const found = sh.branches.filter(b => branches.includes(b));
      result.samhap.push({ name: sh.name, element: sh.element, branches: found, type: '반합' });
    }
  }

  // 방합
  for (const bh of BANGHAP) {
    if (hasAll(branches, bh.branches)) {
      result.banghap.push(bh);
    }
  }

  // 육합
  for (const yh of YUKHAP) {
    if (hasPair(branches, yh.pair)) {
      result.yukhap.push(yh);
    }
  }

  // 충
  for (const ch of CHUNG) {
    if (hasPair(branches, ch.pair)) {
      result.chung.push(ch);
    }
  }

  // 형
  for (const hy of HYUNG) {
    if (hy.type === '삼형' && hasAll(branches, hy.branches)) {
      result.hyung.push(hy);
    } else if (hy.type === '이형' && hasPair(branches, hy.pair)) {
      result.hyung.push(hy);
    } else if (hy.type === '자형') {
      const count = branches.filter(b => b === hy.self).length;
      if (count >= 2) result.hyung.push(hy);
    }
  }

  // 파
  for (const p of PA) {
    if (hasPair(branches, p.pair)) {
      result.pa.push(p);
    }
  }

  // 해
  for (const h of HAE) {
    if (hasPair(branches, h.pair)) {
      result.hae.push(h);
    }
  }

  return result;
}
