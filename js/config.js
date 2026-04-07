/**
 * config.js — Environment configuration.
 *
 * 배포 시 이 파일의 API_BASE_URL을 실제 서버 주소로 변경하세요.
 *
 * 로컬:      http://localhost:3000
 * 프로덕션:  https://api.yourdomain.com
 *
 * TODO: 빌드 도구(Vite, webpack 등) 도입 시 import.meta.env 또는
 *       process.env로 교체하고 이 파일은 삭제하세요.
 */

export const API_BASE_URL = (() => {
  // 현재 페이지가 localhost면 로컬 API, 아니면 프로덕션 API 자동 선택
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // 프로덕션 배포 시 아래 주소를 실제 API 서버 주소로 변경
  // 예: API Gateway + Lambda 또는 EC2/ECS 등에 배포된 API 주소
  return 'https://api.yourdomain.com';
})();
