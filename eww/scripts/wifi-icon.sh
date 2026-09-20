#!/usr/bin/env bash
line=$(nmcli -t -f TYPE,STATE device | grep -E '^(wifi|ethernet):connected' | head -n1)
if [ -z "$line" ]; then
	python3 -c "print('\U000F05AA', end='')"
	exit
fi
t=${line%%:*}
if [ "$t" != "wifi" ]; then
	python3 -c "print('\U000F0200', end='')"
	exit
fi
sig=$(nmcli -t -f IN-USE,SIGNAL device wifi | awk -F: '$1=="*"{print $2; exit}')
[ -z "$sig" ] && sig=0
if   [ "$sig" -lt 20 ]; then python3 -c "print('\U000F092E', end='')"
elif [ "$sig" -lt 40 ]; then python3 -c "print('\U000F091F', end='')"
elif [ "$sig" -lt 60 ]; then python3 -c "print('\U000F0922', end='')"
elif [ "$sig" -lt 80 ]; then python3 -c "print('\U000F0925', end='')"
else                          python3 -c "print('\U000F0928', end='')"
fi