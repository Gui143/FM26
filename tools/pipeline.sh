#!/bin/bash
cd /home/user/futmanager
for i in $(seq 1 8); do
  echo "=== passo $i squads $(date +%H:%M:%S) ==="
  python3 tools/fetch_squads.py squads
  pend=$(python3 -c "import json;d=json.load(open('/tmp/squads.json'));print(sum(1 for v in d.values() if len(v)<8))" 2>/dev/null || echo 999)
  total=$(python3 -c "import json;d=json.load(open('/tmp/squads.json'));print(len(d))" 2>/dev/null || echo 0)
  echo ">>> passo $i fim: $total clubes, pendentes=$pend"
  if [ "$pend" = "0" ] || [ "$total" -ge 192 ] && [ "$pend" -le 10 ]; then break; fi
  sleep 15
done
echo "=== faces $(date +%H:%M:%S) ==="
python3 tools/fetch_squads.py faces
echo "=== build $(date +%H:%M:%S) ==="
python3 tools/fetch_squads.py build
echo "PIPELINE DONE"
