/**
 * Lambda: saju-interpret
 *
 * 사주 분석 데이터 + 템플릿을 받아 Claude API로 자연어 해석을 생성합니다.
 *
 * 환경변수:
 *   ANTHROPIC_API_KEY — Anthropic API 키
 *   ALLOWED_ORIGIN    — CORS origin (default: *)
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const SYSTEM_PROMPT = `당신은 40년 경력의 사주명리학 전문가입니다.
사주 분석 데이터와 해석 템플릿을 기반으로, 일반인이 이해할 수 있는 따뜻하고 통찰력 있는 사주 풀이를 작성합니다.

규칙:
- 전문 용어(십신, 격국 등)는 쉬운 설명과 함께 사용
- 부정적인 내용도 건설적인 조언으로 전환
- 구체적이고 실용적인 조언 포함
- 마크다운 형식으로 작성
- 섹션: 종합운세, 성격과 기질, 직업과 재물, 대인관계와 연애, 건강, 시기별 운세(대운), 종합 조언`;

export async function handler(event) {
  // CORS는 Lambda Function URL 설정에서 처리 (코드에서 중복 설정하지 않음)
  const headers = {
    'Content-Type': 'application/json',
  };

  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { analysisData, templates, gender, birthDate, birthTime, city } = body;

    if (!analysisData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'analysisData is required' }),
      };
    }

    const userPrompt = buildPrompt({ analysisData, templates, gender, birthDate, birthTime, city });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Claude API error', detail: err }),
      };
    }

    const result = await response.json();
    const interpretation = result.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ interpretation }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

function buildPrompt({ analysisData, templates, gender, birthDate, birthTime, city }) {
  const { pillars, tenGods, yongsin, sinsal, relations, daeun } = analysisData;
  const genderKo = gender === 'female' ? '여성' : '남성';

  let prompt = `## 사주 분석 대상\n`;
  prompt += `- 생년월일: ${birthDate}\n`;
  if (birthTime) prompt += `- 생시: ${birthTime}\n`;
  if (city) prompt += `- 출생지: ${city}\n`;
  prompt += `- 성별: ${genderKo}\n\n`;

  // 사주 원국
  prompt += `## 사주 원국 (四柱)\n`;
  prompt += `| | 년주 | 월주 | 일주 |${pillars.hour ? ' 시주 |' : ''}\n`;
  prompt += `|---|---|---|---|${pillars.hour ? '---|' : ''}\n`;
  prompt += `| 천간 | ${pillars.year.stem} | ${pillars.month.stem} | ${pillars.day.stem} |${pillars.hour ? ` ${pillars.hour.stem} |` : ''}\n`;
  prompt += `| 지지 | ${pillars.year.branch} | ${pillars.month.branch} | ${pillars.day.branch} |${pillars.hour ? ` ${pillars.hour.branch} |` : ''}\n\n`;

  // 진태양시
  if (pillars.solarTimeCorrection) {
    const c = pillars.solarTimeCorrection;
    prompt += `- 진태양시 보정: ${c.originalTime} → ${String(c.correctedHour).padStart(2,'0')}:${String(c.correctedMinute).padStart(2,'0')}\n\n`;
  }

  // 십신
  if (tenGods) {
    prompt += `## 십신 분석\n`;
    prompt += `- 일간: ${pillars.day.stem}\n`;
    prompt += `- 격국: ${tenGods.structure}\n`;
    prompt += `- 십신 분포: ${Object.entries(tenGods.summary).map(([k,v]) => `${k}(${v})`).join(', ')}\n\n`;
  }

  // 용신
  if (yongsin) {
    const EL = { Wood:'목', Fire:'화', Earth:'토', Metal:'금', Water:'수' };
    prompt += `## 일간 강약 & 용신\n`;
    prompt += `- 강약: ${yongsin.strength.level} (${yongsin.strength.score}점/100)\n`;
    prompt += `- 용신: ${EL[yongsin.yongsin.primary]}(${yongsin.yongsin.primary})\n`;
    prompt += `- 희신: ${EL[yongsin.yongsin.secondary]}(${yongsin.yongsin.secondary})\n`;
    prompt += `- 기신: ${EL[yongsin.gisin.primary]}, ${EL[yongsin.gisin.secondary]}\n\n`;
  }

  // 신살
  if (sinsal?.length) {
    prompt += `## 신살\n`;
    for (const s of sinsal) {
      prompt += `- ${s.name}(${s.hanja}) — ${s.type === 'lucky' ? '길신' : s.type === 'neutral' ? '중성' : '흉신'}\n`;
    }
    prompt += '\n';
  }

  // 합충형파해
  if (relations) {
    const typeKo = { samhap:'삼합', banghap:'방합', yukhap:'육합', chung:'충', hyung:'형', pa:'파', hae:'해' };
    const items = [];
    for (const [type, list] of Object.entries(relations)) {
      for (const item of list) items.push(`${typeKo[type]}: ${item.name}`);
    }
    if (items.length) {
      prompt += `## 합충형파해\n`;
      for (const item of items) prompt += `- ${item}\n`;
      prompt += '\n';
    }
  }

  // 대운
  if (daeun?.length) {
    prompt += `## 대운\n`;
    for (const d of daeun) {
      prompt += `- ${d.startAge}~${d.endAge}세: ${d.stem}${d.branch}\n`;
    }
    prompt += '\n';
  }

  // 관련 템플릿
  if (templates) {
    prompt += `## 참고 해석 템플릿 (이 내용을 기반으로 풀이를 작성하세요)\n\n`;
    prompt += JSON.stringify(templates, null, 2);
    prompt += '\n\n';
  }

  prompt += `위 분석 데이터와 템플릿을 종합하여, ${genderKo} 사용자를 위한 사주 풀이를 작성하세요.\n`;
  prompt += `마크다운 형식으로, 종합운세 → 성격 → 직업/재물 → 연애/대인관계 → 건강 → 시기별 운세 → 조언 순서로 작성하세요.`;

  return prompt;
}
