#!/bin/bash
# Submit new URLs to IndexNow (Bing/Yandex instant indexing)
# Usage: bash scripts/submit-indexnow.sh https://www.sajubokastory.com/blog/new-post-slug

SITE_URL="$1"
KEY="b3f8a2d1e5c94f7689012345abcdef67"
HOST="www.sajubokastory.com"

if [ -z "$SITE_URL" ]; then
  echo "Usage: bash scripts/submit-indexnow.sh <full-url>"
  echo "Example: bash scripts/submit-indexnow.sh https://www.sajubokastory.com/blog/example-post"
  exit 1
fi

curl -s -X POST "https://api.indexnow.org/IndexNow"   -H "Content-Type: application/json"   -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[\"$SITE_URL\"]}"

echo ""
echo "Submitted to IndexNow: $SITE_URL"
