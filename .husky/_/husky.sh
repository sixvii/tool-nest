#!/bin/sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename "$0")"
  debug "running $hook_name"
  if [ -f ~/.huskyrc.sh ]; then
    . ~/.huskyrc.sh
  fi
  export readonly husky_skip_init=1
  sh -e "$0" "$@"
  exitCode=$?

  if [ $exitCode != 0 ]; then
    echo "husky - $hook_name hook exited with code $exitCode (error)"
  fi

  if [ "$husky_init" = "0" ]; then
    unset husky_skip_init
  fi

  exit $exitCode
fi
