# test for injection in status code

# Configure decoys
config=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "decoy": {
    "decoy": {
      "key": "200"
    },
    "inject": {
      "store": {
        "inResponse": "/api",
        "as": "status"
      }
    }
  }
}
EOF
)

# Send the decoy configuration to the API
decoy_id=$(curl -X POST -s -H "Content-Type: application/json" -d "$config" http://localhost:8050/decoy | jq -r '.data.id')
curl -X PATCH -s -H "Content-Type: application/json" -d "{\"id\": \"${decoy_id}\", \"deployed\": true}" http://localhost:8050/decoy/state > /dev/null

# wait a few seconds for the proxy to read the new config
sleep 3


# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Do relevant action(s)
curl -v http://localhost:8000/api >$tempfile 2>&1

# Check INJECTION (in $tempfile)
status=$(grep "200 OK" $tempfile)

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
curl -X DELETE -s http://localhost:8050/decoy/$decoy_id > /dev/null

