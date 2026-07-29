/**
 * gate-config.ts
 *
 * 발행 게이트의 레포별 설정 로더. `scripts/gate.config.json` 하나가 권위다.
 *
 * 원칙: **정책이면 config, 사실이면 코드.**
 *  - 정책(사람이 정한 값) = 자수 컷, 썸네일 키, 카테고리 라우트 목록, 팩트체크 on/off → 여기
 *  - 사실(레포의 구조) = 슬러그가 무엇이냐, 이미지 경로가 무엇이냐 → 코드의 단일 규칙
 *
 * 슬러그 해석을 config 로 빼지 않은 이유: 8개 레포를 겹쳐 보면
 * `frontmatter.slug || basename(file, '.mdx')` 단 하나가 8개 전부에서 정답이다.
 * config 로 빼면 8곳에 같은 값을 적게 되고, 한 곳이라도 틀리는 순간 전편 오격리가 된다.
 */

import fs from 'fs';
import path from 'path';

export interface GateConfig {
  /** 한글 자수 하한. 미만이면 thin-content 로 격리. 레포 CLAUDE.md·check-post-length.sh CUT_MAP·thin-scan.ts CUTS 와 반드시 같은 값이어야 한다. */
  minKorean: number;
  /** 프론트매터의 썸네일 필드명. 없는 레포(coinday: 동적 OG 라우트)는 null → 썸네일 검사·동반 격리를 건너뛴다. */
  thumbnailKey: string | null;
  /** `/blog/category/<x>` 링크에서 유효한 <x> 목록. 그 라우트가 없는 레포는 빈 배열이 정확한 값이다(= 그런 링크는 실제로 깨진 링크). */
  validCategories: string[];
  /** 'off' = 링크·이미지·자수만 검사(린터). 'strict' = 적대적 팩트체크까지. 캐시 생산자가 없는 레포에서 strict 를 켜면 전량 격리된다. */
  factCheck: 'off' | 'strict';
  /** 리서치 캐시를 만드는 스크립트 경로. 없으면 null. factCheck: 'strict' 승격의 전제 조건이다. */
  researchProducer: string | null;
}

const DEFAULTS: GateConfig = {
  minKorean: 2500,
  thumbnailKey: 'image',
  validCategories: [],
  factCheck: 'off',
  researchProducer: null,
};

let cached: GateConfig | null = null;

export function loadGateConfig(): GateConfig {
  if (cached) return cached;

  const p = path.join(process.cwd(), 'scripts', 'gate.config.json');
  if (!fs.existsSync(p)) {
    throw new Error(
      `gate.config.json 없음: ${p}\n` +
      `  게이트는 레포별 설정 없이 돌면 안 된다(자수 컷·썸네일 키가 기본값으로 조용히 떨어진다).`
    );
  }

  let raw: any;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err: any) {
    throw new Error(`gate.config.json 파싱 실패: ${err.message}`);
  }

  const cfg: GateConfig = { ...DEFAULTS, ...raw };

  // 설정 오류를 "대량 격리"가 아니라 "즉시 중단"으로 바꾼다.
  if (!Number.isInteger(cfg.minKorean) || cfg.minKorean <= 0) {
    throw new Error(`gate.config.json: minKorean 이 양의 정수가 아니다 (${raw.minKorean})`);
  }
  if (cfg.thumbnailKey !== null && typeof cfg.thumbnailKey !== 'string') {
    throw new Error(`gate.config.json: thumbnailKey 는 문자열이거나 null 이어야 한다 (${raw.thumbnailKey})`);
  }
  if (!Array.isArray(cfg.validCategories)) {
    throw new Error(`gate.config.json: validCategories 는 배열이어야 한다`);
  }
  if (cfg.factCheck !== 'off' && cfg.factCheck !== 'strict') {
    throw new Error(`gate.config.json: factCheck 는 'off' 또는 'strict' 여야 한다 (${raw.factCheck})`);
  }

  cached = cfg;
  return cfg;
}

/**
 * 레포 전체에서 유일한 슬러그 해석 규칙.
 *
 * 🔴 원본 ai-blog 은 findTargetFiles() 에만 이 폴백이 있고 getAllSlugs() 에는 없었다.
 * 그 비대칭 때문에 frontmatter slug 가 없는 레포(easy-zetec 0/253, tokennara 0/222)에서
 * 슬러그 집합이 빈 Set 이 되어 모든 내부링크가 broken-link 로 잡히고 검사 대상이 전량 격리된다.
 * ai-blog 은 737편 전부 slug 를 갖고 있어 이 결함이 한 번도 드러나지 않았다.
 */
export function resolveSlug(file: string, data: Record<string, any>): string {
  const s = data?.slug;
  if (typeof s === 'string' && s.trim()) return s.trim();
  return path.basename(file, '.mdx');
}
