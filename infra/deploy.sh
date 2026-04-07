#!/bin/bash
# deploy.sh — S3 + CloudFront 배포 스크립트
# 사용법: ./infra/deploy.sh [stack-name]
#
# 사전 조건:
#   - AWS CLI 설치 및 자격 증명 설정 (aws configure)
#   - 적절한 IAM 권한 (S3, CloudFront, CloudFormation)

set -euo pipefail

STACK_NAME="${1:-saju-oracle-frontend}"
TEMPLATE="infra/cloudformation.yaml"
REGION="${AWS_REGION:-ap-northeast-2}"

echo "=== 1. CloudFormation 스택 배포 ==="
aws cloudformation deploy \
  --template-file "$TEMPLATE" \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --no-fail-on-empty-changeset

echo "=== 2. 스택 출력값 조회 ==="
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`BucketName`].OutputValue' \
  --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

CF_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
  --output text)

echo "  Bucket: $BUCKET"
echo "  Distribution: $DISTRIBUTION_ID"
echo "  Domain: $CF_DOMAIN"

echo "=== 3. README.md 배포 정보 업데이트 ==="
README="README.md"
if [ -f "$README" ]; then
  sed -i "s|CloudFront Distribution ID | \`.*\`|CloudFront Distribution ID | \`$DISTRIBUTION_ID\`|" "$README"
  sed -i "s|CloudFront Domain | \`.*cloudfront\.net\`|CloudFront Domain | \`$CF_DOMAIN\`|" "$README"
  sed -i "s|S3 Bucket | \`.*\`|S3 Bucket | \`$BUCKET\`|" "$README"
  sed -i "s|AWS Region | \`.*\`|AWS Region | \`$REGION\`|" "$README"
  sed -i "s|CloudFormation Stack | \`.*\`|CloudFormation Stack | \`$STACK_NAME\`|" "$README"
  sed -i "s|Website URL | https://.*cloudfront\.net|Website URL | https://$CF_DOMAIN|" "$README"
  sed -i "s|s3://[^ ]* |s3://$BUCKET |g" "$README"
  sed -i "s|--distribution-id [A-Z0-9]*|--distribution-id $DISTRIBUTION_ID|g" "$README"
  echo "  README.md updated"
else
  echo "  README.md not found, skipping"
fi

echo "=== 4. 빌드 ==="
npm run build

echo "=== 5. 정적 파일 S3 업로드 (dist/) ==="
# HTML 파일
aws s3 sync dist/ "s3://$BUCKET" \
  --region "$REGION" \
  --exclude "*" \
  --include "*.html" \
  --content-type "text/html" \
  --cache-control "no-cache"

# CSS 파일
aws s3 sync dist/ "s3://$BUCKET" \
  --region "$REGION" \
  --exclude "*" \
  --include "*.css" \
  --content-type "text/css" \
  --cache-control "max-age=31536000"

# JS 파일
aws s3 sync dist/js/ "s3://$BUCKET/js/" \
  --region "$REGION" \
  --content-type "application/javascript" \
  --cache-control "no-cache"

echo "=== 6. CloudFront 캐시 무효화 ==="
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --region "$REGION"

echo ""
echo "✅ 배포 완료!"
echo "🌐 https://$CF_DOMAIN"
