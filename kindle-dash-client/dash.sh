#!/usr/bin/env sh

#####
## This is a slightly modified version of the original dash.sh script in https://github.com/pascalw/kindle-dash
## Permalink: https://github.com/pascalw/kindle-dash/blob/main/src/dash.sh
## It was originally written by Pascal Widdershoven (https://github.com/pascalw)
#####

DEBUG=${DEBUG:-false}
ISKINDLE4NT=${ISKINDLE4NT:-false}
[ "$DEBUG" = true ] && set -x

DIR="$(dirname "$0")"
DASH_PNG="$DIR/dash.png"
FETCH_DASHBOARD_CMD="$DIR/local/fetch-dashboard.sh"
LOW_BATTERY_CMD="$DIR/local/low-battery.sh"

REFRESH_SCHEDULE=${REFRESH_SCHEDULE:-"*/1 5-23 * * *"}
FULL_DISPLAY_REFRESH_RATE=${FULL_DISPLAY_REFRESH_RATE:-0}
SLEEP_SCREEN_INTERVAL=${SLEEP_SCREEN_INTERVAL:-3600}

RTC=/sys/devices/platform/mxc_rtc.0/wakeup_enable

LOW_BATTERY_REPORTING=${LOW_BATTERY_REPORTING:-true}
LOW_BATTERY_THRESHOLD_PERCENT=${LOW_BATTERY_THRESHOLD_PERCENT:-15}

num_refresh=0

log() {
    echo "[$(date -u)] $1"
}

init() {
  if [ -z "$TIMEZONE" ] || [ -z "$REFRESH_SCHEDULE" ]; then
    log "Missing required configuration."
    log "Timezone: ${TIMEZONE:-(not set)}."
    log "Schedule: ${REFRESH_SCHEDULE:-(not set)}."
    exit 1
  fi

  log "Starting dashboard with $REFRESH_SCHEDULE refresh..."

  #stop framework
  if [ "$ISKINDLE4NT" = true ]; then
      /etc/init.d/framework stop #kindle NT4 code
  else
      stop framework
      stop lab126_gui #code for kindle paperwhite3
  fi

  initctl stop webreader >/dev/null 2>&1
  echo powersave >/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
  lipc-set-prop com.lab126.powerd preventScreenSaver 1
}

refresh_dashboard() {
  log "Refreshing dashboard"
  "$DIR/wait-for-wifi.sh" "$WIFI_TEST_IP"

  "$FETCH_DASHBOARD_CMD" "$DASH_PNG"
  fetch_status=$?

  if [ "$fetch_status" -ne 0 ]; then
    log "Not updating screen, fetch-dashboard returned $fetch_status"
    return 1
  fi

  if [ "$num_refresh" -eq "$FULL_DISPLAY_REFRESH_RATE" ]; then
    num_refresh=0

    # trigger a full refresh once in every 4 refreshes, to keep the screen clean
    log "Full screen refresh"
    /usr/sbin/eips -f -g "$DASH_PNG"
  else
    log "Partial screen refresh"
    /usr/sbin/eips -g "$DASH_PNG"
  fi

  num_refresh=$((num_refresh + 1))
}

log_battery_stats() {
  battery_level=$(gasgauge-info -c)
  battery_mah=$(gasgauge-info -m)
  log "Battery level: $battery_level, $battery_mah"

  if [ "$LOW_BATTERY_REPORTING" = true ]; then
    battery_level_numeric=${battery_level%?}
    if [ "$battery_level_numeric" -le "$LOW_BATTERY_THRESHOLD_PERCENT" ]; then
      "$LOW_BATTERY_CMD" "$battery_level_numeric"
    fi
  fi
}

rtc_sleep() {
  duration=$1

  if [ "$DEBUG" = true ]; then
    sleep "$duration"
  else
    rtcwake -d /dev/rtc1 -m no -s "$duration"
    echo "mem" >/sys/power/state
  fi
}

main_loop() {
  while true; do
    log "Woke up, refreshing dashboard"
    log_battery_stats

    next_wakeup_secs=$("$DIR/next-wakeup" --schedule="$REFRESH_SCHEDULE" --timezone="$TIMEZONE")

    refresh_dashboard

    # take a bit of time before going to sleep, so this process can be aborted
    sleep 10

    log "Going to sleep, next wakeup in ${next_wakeup_secs}s"
    rtc_sleep "$next_wakeup_secs"
  done
}

init
main_loop