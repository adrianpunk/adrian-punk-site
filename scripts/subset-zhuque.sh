#!/bin/sh
# Cut Zhuque Fangsong (OFL, github.com/TrionesType/zhuque) down to the characters this site uses,
# so the Chinese face is a small woff2 instead of 9 MB. Rerun after changing any Chinese copy.
#   usage: scripts/subset-zhuque.sh path/to/ZhuqueFangsong-Regular.ttf   (needs: pip install fonttools brotli)
set -e
cd "$(dirname "$0")/.."
cat index.html src/*.js | python3 -c "import sys; t=sys.stdin.read(); print(''.join(sorted({c for c in t if ord(c) > 0x2000})))" > /tmp/zhuque-chars.txt
pyftsubset "$1" --text-file=/tmp/zhuque-chars.txt --unicodes="U+0020-007E,U+3000-303F,U+FF00-FFEF" \
  --layout-features='*' --flavor=woff2 --output-file=public/fonts/zhuque-fangsong.woff2
ls -la public/fonts/zhuque-fangsong.woff2
