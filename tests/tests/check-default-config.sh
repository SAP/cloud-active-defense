# check if the default config is working
# (e.g. checks that the HTTP Response header 'x-cloud-active-defense' is set)

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
    "inject": {
      "store": {
        "inResponse": ".*",
        "as": "header"
      }
    }
  }
}
EOF
)

# Send the decoy configuration to the API
decoy_id=$(curl -X POST -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "$config" http://localhost:8050/decoy | jq --raw-output '.data.id')
curl -X PATCH -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"id\": \"${decoy_id}\", \"deployed\": true}" http://localhost:8050/decoy/state > /dev/null

# wait a few seconds for the proxy to read the new config
sleep 3

# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Do relevant action(s)
curl -v http://localhost:8000 >$tempfile 2>&1

# Check INJECTION (in $tempfile)
status=$(grep "< x-cloud-active-defense: ACTIVE" $tempfile)

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

