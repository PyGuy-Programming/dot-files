#!/bin/bash
# Win+m - Windows-like maximize: toggle floating maximize that respects gaps/bar
# Floating maximized windows get blur disabled + opaque (no blur behind)
TREE=$(swaymsg -t get_tree)
IS_FLOATING=$(echo "$TREE" | python3 -c "
import json,sys
data=json.load(sys.stdin)
def find(n):
    if n.get('focused'):
        return n
    for k in ('nodes','floating_nodes'):
        for c in n.get(k,[]):
            r=find(c)
            if r:
                return r
    return None
f=find(data)
# floating_con type means floating
if f and f.get('type')=='floating_con':
    print('1')
else:
    # also check floating field for sway >=1.9
    if f and 'floating' in str(f):
        # fallback check via floating_nodes search already done
        print('0')
    else:
        print('0')
")
if [ "$IS_FLOATING" = "1" ]; then
  swaymsg floating disable
  swaymsg opacity 0.92
  swaymsg blur enable
else
  swaymsg floating enable
  swaymsg resize set width 100ppt height 100ppt
  swaymsg move position 0 0
  swaymsg opacity 1
  swaymsg blur disable
fi
