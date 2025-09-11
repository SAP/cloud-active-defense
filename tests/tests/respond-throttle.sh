# Check if the decoy throttle the request once triggered

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
      }
    }
  }
}
EOF
)
# Configure global config
globalconfig=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "config": {
    "respond": [{
      "source": "ip, userAgent",
      "behavior": "throttle",
      "property": "10",
      "delay": "now",
      "duration": "10s"
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
sleep 3


# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Call it once first to trigger the alert and get blocklisted
curl -v -H "x-cloud-active-defense: ACTIVE" -s http://localhost:8000/ &>/dev/null

# Wait a little before next request
sleep 3
# Do relevant action(s)
curl --max-time 5 -v http://localhost:8000/ >$tempfile 2>&1

# Check if the response was throttled (in $tempfile)
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
curl -X PUT -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"pa_id\": \"$PROTECTEDAPP_ID\", \"config\": {}}" http://localhost:8050/config > /dev/null

