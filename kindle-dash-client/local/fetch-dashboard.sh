#!/usr/bin/env sh
# Fetch a new dashboard image, make sure to output it to "$1".
# For example:
battery_percent=$(gasgauge-info -s)
# invoke https://YOUR_DOMAIN/battery/27
"$(dirname "$0")/../xh" -d -q get https://YOUR_DOMAIN/battery/$battery_percent

# Fetch the dashboard image
"$(dirname "$0")/../xh" -d -q -o "$1" get https://YOUR_DOMAIN/dash.png
