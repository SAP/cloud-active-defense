# Check if the decoy drop the request once triggered

# Configure decoys
config=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "decoy": {
    "decoy": {
      "key": "x-cloud-active-defense",
      "separator": "=",
      "value": "ACTIVE"
    },
    "detect": {
      "seek": {
        "inRequest": ".*",
        "in": "header" 
      },
      "alert": {
        "severity": "HIGH",
        "whenComplete": true
      },
      "respond": [{
        "source": "ip, session",
        "behavior": "drop",
        "duration": "7s",
        "delay": "now"
      }]
    }
  }
}
EOF
)
# Configure global config
# Note that the respond part in the global config will be overrided by the 'local' decoy respond
globalconfig=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "config": {
    "alert": {
      "session": {
        "in": "cookie",
        "key": "SESSION"
      }
    },
    "respond": [{
      "source": "ip, userAgent",
      "behavior": "divert",
      "duration": "forever",
      "delay": "now"
    }],
    "blocklistReload": 1,
    "configReload": 1
  }
}
EOF
)

# Send the decoy configuration to the API
decoy_id=$(curl -X POST -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "$config" http://localhost:8050/decoy | jq -r '.data.id')
curl -X PATCH -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"id\": \"${decoy_id}\", \"deployed\": true}" http://localhost:8050/decoy/state > /dev/null
# Send the global configuration to the API
curl -X PUT -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "$globalconfig" http://localhost:8050/config > /dev/null
# wait a few seconds for the proxy to read the new config
sleep 5


# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Call it once first to trigger the alert and get blocklisted
curl -v --cookie SESSION=c32272b9-99d8-4687-b57e-a606952ae870 -H "x-cloud-active-defense: ACTIVE" -s http://localhost:8000/ &>/dev/null

# Wait a little before next request
sleep 3
# Do relevant action(s)
curl -v --max-time 5 --cookie SESSION=c32272b9-99d8-4687-b57e-a606952ae870 http://localhost:8000/ >$tempfile 2>&1

# Check if the response was dropped (in $tempfile)
status=$(grep "Operation timed out" $tempfile)

# Output result & time
if [ -z "$status" ]; then
  echo -e "\033[0;31mFAIL\033[0m"
else
  echo -e "\033[0;32mPASS\033[0m"
fi

check_1_time=$(date +%s.%N)
execution_time=$(echo "$check_1_time $start_time" | awk '{print $1 - $2}')
echo "Execution time: $execution_time seconds"

# Cleanup
rm $tempfile
curl -X DELETE -s -H "Authorization: Bearer $KEYCLOAK_TOKEN" http://localhost:8050/decoy/$decoy_id > /dev/null
curl -X PUT -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"pa_id\": \"$PROTECTEDAPP_ID\", \"config\": {}" http://localhost:8050/config > /dev/null

