/**
 * build.mjs — esbuild를 사용하여 js/ 모듈들을 브라우저용으로 번들링.
 * manseryeok 같은 npm 패키지를 인라인으로 포함시킵니다.
 *
 * Usage: node build.mjs
 *
 * 출력: dist/ (배포용 디렉토리)
 *   - dist/*.html, dist/styles.css (복사)
 *   - dist/js/ (번들된 JS)
 */

import esbuild from 'esbuild';
import { readdirSync, cpSync, mkdirSync, existsSync } from 'fs';

// 1. dist/ 준비
mkdirSync('dist', { recursive: true });

// 2. HTML, CSS 등 정적 파일 복사
const staticFiles = readdirSync('.').filter(f => f.endsWith('.html') || f.endsWith('.css'));
for (const f of staticFiles) {
  cpSync(f, `dist/${f}`);
}

// 3. JS 번들링 — js/ 디렉토리의 모든 .js → dist/js/
const jsFiles = readdirSync('js').filter(f => f.endsWith('.js'));
const entryPoints = jsFiles.map(f => `js/${f}`);

await esbuild.build({
  entryPoints,
  bundle: true,
  format: 'esm',
  outdir: 'dist/js',
  splitting: true,
  platform: 'browser',
  target: 'es2020',
  minify: false,
  sourcemap: true,
});

console.log(`Built ${entryPoints.length} JS modules → dist/js/`);
console.log(`Copied ${staticFiles.length} static files → dist/`);
