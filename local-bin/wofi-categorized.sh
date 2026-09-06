#!/bin/bash
# Categorized wofi - custom categories defined in ~/.config/wofi/categories
# Win (Super) will open category picker, then apps in category

CATEGORIES_FILE="$HOME/.config/wofi/categories"
# Fallback if no file
if [ ! -f "$CATEGORIES_FILE" ]; then
  echo -e "Work\nMedia\nGames\nSystem\nDevelopment\nAll" | wofi --show dmenu --prompt "Category" --insensitive
  exit
fi

# Parse categories: "Name: app1,app2" -> map
declare -A CAT_MAP
CATEGORY_NAMES=()
while IFS= read -r line; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  name=$(echo "$line" | cut -d: -f1 | xargs)
  apps=$(echo "$line" | cut -d: -f2- | xargs)
  CAT_MAP["$name"]="$apps"
  CATEGORY_NAMES+=("$name")
done < "$CATEGORIES_FILE"

# Show category picker via wofi (uses menu.css)
if [ ${#CATEGORY_NAMES[@]} -eq 0 ]; then
  wofi --show drun --prompt "Apps"
  exit
fi

CATEGORY=$(printf "%s\n" "${CATEGORY_NAMES[@]}" | wofi --show dmenu --prompt "Category:" --insensitive --allow-markup)

[ -z "$CATEGORY" ] && exit 0

APPS="${CAT_MAP[$CATEGORY]}"

# All -> normal drun
if [ "$APPS" = "*" ] || [ "$CATEGORY" = "All" ]; then
  wofi --show drun --prompt "Apps"
  exit 0
fi

# Build app list for selected category: show Name (Exec) via dmenu
# Convert comma list to newline, then find .desktop files
IFS=',' read -ra APP_ARR <<< "$APPS"
TMP_LIST=$(mktemp)
for app in "${APP_ARR[@]}"; do
  app=$(echo "$app" | xargs)
  # Find desktop file
  DESKTOP=$(find /usr/share/applications ~/.local/share/applications -name "$app.desktop" 2>/dev/null | head -n1)
  if [ -n "$DESKTOP" ]; then
    NAME=$(grep -m1 "^Name=" "$DESKTOP" | cut -d= -f2)
    EXEC=$(grep -m1 "^Exec=" "$DESKTOP" | cut -d= -f2 | cut -d' ' -f1)
    echo -e "$NAME\t$EXEC\t$app" >> "$TMP_LIST"
  else
    # fallback: try as command
    echo -e "$app\t$app\t$app" >> "$TMP_LIST"
  fi
done

if [ ! -s "$TMP_LIST" ]; then
  wofi --show drun --prompt "$CATEGORY"
  rm "$TMP_LIST"
  exit 0
fi

# Show apps in category via wofi dmenu with custom display
# Format: Name - show only name in wofi, but keep exec
SELECTED_NAME=$(cut -f1 "$TMP_LIST" | wofi --show dmenu --prompt "$CATEGORY:" --insensitive --allow-markup)
[ -z "$SELECTED_NAME" ] && rm "$TMP_LIST" && exit 0

# Find exec for selected name
EXEC_LINE=$(grep -F "$SELECTED_NAME"$'\t' "$TMP_LIST" | head -n1)
EXEC=$(echo "$EXEC_LINE" | cut -f2)
APPID=$(echo "$EXEC_LINE" | cut -f3)

rm "$TMP_LIST"

if [ -z "$EXEC" ]; then
  exit 0
fi

# Launch app via gtk-launch if desktop exists, else exec directly
if [ -n "$APPID" ] && [ -f "/usr/share/applications/$APPID.desktop" ] || [ -f "$HOME/.local/share/applications/$APPID.desktop" ]; then
  gtk-launch "$APPID" 2>/dev/null || dex "$APPID" 2>/dev/null || $EXEC &
else
  # Try to run as command
  $EXEC &
fi

# Alternative: use dex or gtk-launch for proper startup
# if command -v gtk-launch >/dev/null; then gtk-launch "$APPID"; else $EXEC &; fi
