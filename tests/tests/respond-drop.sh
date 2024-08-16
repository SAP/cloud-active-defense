# Check if the decoy drop the request once triggered

# Configure decoys
config='
{
  "filters": [
    {
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
          "duration": "1h",
          "delay": "now"
        }]
      }
    }
  ]
}
'
# Configure global config
# Note that the respond part in the global config will be overrided by the 'local' decoy respond
globalconfig='
{
  "alert": {
    "session": {
      "in": "cookie",
      "key": "SESSION"
    },
    "respond": {
      "source": "ip, userAgent",
      "behavior": "clone",
      "duration": "forever",
      "delay": "now"
    }
  },
  "blocklistReload": 1
}
'

# connect to configmanager, update /data/cad-default.json and /data/config-default.json
echo "$config" | docker exec -i configmanager sh -c 'cat > /data/cad-default.json'
echo "$globalconfig" | docker exec -i configmanager sh -c 'cat > /data/config-default.json'
# wait a few seconds for the proxy to read the new config
sleep 5


# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Call it once first to trigger the alert and get blocklisted
curl -v --cookie SESSION=c32272b9-99d8-4687-b57e-a606952ae870 -H "x-cloud-active-defense: ACTIVE" -s http://localhost:8000/ &>/dev/null

# Wait a little before next request
sleep 2
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
# reseting banlist
echo '{"list":[]}' | docker exec -i configmanager sh -c 'cat > /data/blocklist/blocklist.json'
#reseting global config
echo "{}" | docker exec -i configmanager sh -c 'cat > /data/config-default.json'

