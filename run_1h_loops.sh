#!/bin/bash

while true; do
  echo "Starting app..."
  yarn start &

  # Store the process ID of the last command executed (yarn start)
  app_pid=$!
  
  sleep 3600

  echo "Killing app with PID $app_pid"
  kill $app_pid

  echo "Restarting"
  sleep 5
done
