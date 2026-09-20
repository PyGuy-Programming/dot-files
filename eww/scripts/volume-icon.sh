#!/bin/bash
# volume icon — wpctl/pamixer/pactl/amixer fallback
if command -v pamixer >/dev/null 2>&1; then
  vol=$(pamixer --get-volume 2>/dev/null); muted=$(pamixer --get-mute 2>/dev/null)
  [ "$muted" = "true" ] && muted=1 || muted=0
elif command -v wpctl >/dev/null 2>&1; then
  out=$(wpctl get-volume @DEFAULT_AUDIO_SINK@ 2>/dev/null)
  vol=$(echo "$out" | grep -oP '\d+\.\d+' | awk '{print int($1*100)}')
  echo "$out" | grep -q MUTED && muted=1 || muted=0
elif pactl list sinks >/dev/null 2>&1; then
  vol=$(pactl list sinks 2>/dev/null | grep -m1 "Volume:" | grep -oP '\d+%' | head -1 | tr -d '%')
  muted=$(pactl list sinks 2>/dev/null | grep -m1 "Mute:" | grep -q yes && echo 1 || echo 0)
else
  vol=$(amixer get Master 2>/dev/null | grep -oP '\d+%' | head -1 | tr -d '%')
  muted=$(amixer get Master 2>/dev/null | grep -q "\[off\]" && echo 1 || echo 0)
fi
[ -z "$vol" ] && vol=0
if [ "$muted" = "1" ] || [ "$vol" -eq 0 ]; then
  printf "󰝟"
elif [ "$vol" -lt 33 ]; then
  printf "󰕿"
elif [ "$vol" -lt 66 ]; then
  printf "󰖀"
else
  printf "󰕾"
fi
