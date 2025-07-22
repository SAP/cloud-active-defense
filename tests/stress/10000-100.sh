# Time taken for 10000 requests, 100 injected decoy (replace) - each triggered 10 times

# Configure decoys
element=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "decoy": {
    "decoy": {
      "key": "somekey"
    },
    "inject": {
      "store": {
        "inResponse": "/1",
        "withVerb": "GET",
        "as": "body",
        "at": {
          "method": "replace",
          "property": "((.|\n)*)"
        }
      }
    }
  }
}
EOF
)

decoy_ids=()
# Loop through numbers from 1 to 100 and replace /1 with /<number> and create decoy
for ((i=1; i<=100; i++)); do
    modified_element=$(echo "$element" | sed "s/\/1/\/$i/")
    # Send the decoy configuration to the API
    decoy_id=$(curl -X POST -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "$modified_element" http://localhost:8050/decoy | jq -r '.data.id')
    curl -X PATCH -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"id\": \"${decoy_id}\", \"deployed\": true}" http://localhost:8050/decoy/state > /dev/null
    decoy_ids+=($decoy_id)
done

# wait a few seconds for the proxy to read the new config
sleep 3


# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Do relevant action(s)
# Query each decoy 100 times
for ((i=1; i<=100; i++)); do
  for ((j=1; j<=99; j++)); do
    curl -v "http://localhost:8000/$i" >/dev/null 2>&1
  done
  # on the 100th time, check that the decoy was properly injected
  curl -v "http://localhost:8000/$i" >$tempfile 2>&1
  # Check INJECTION (in $tempfile)
  status=$(grep "somekey" $tempfile)

  # Output result & time
  if [ -z "$status" ]; then
    echo -e "\033[0;31mFAIL\033[0m"
  else
    echo -e "\033[0;32mPASS\033[0m"
  fi
done

check_1_time=$(date +%s.%N)
execution_time=$(echo "$check_1_time $start_time" | awk '{print $1 - $2}')
echo "Execution time: $execution_time seconds"

# Cleanup
rm $tempfile
for id in "${decoy_ids[@]}"; do
  curl -X DELETE -s -H "Authorization: Bearer $KEYCLOAK_TOKEN" http://localhost:8050/decoy/$id > /dev/null
done
