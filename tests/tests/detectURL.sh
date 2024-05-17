# test simple detection in URL (first README.md decoy)

# Configure decoys
config='
{
  "filters": [
    {
      "decoy": {
        "key": "forbidden"
      },
      "detect": {
        "seek": {
          "inRequest": ".*",
          "withVerb": "GET",
          "in": "url"
        },
        "alert": {
          "severity": "LOW",
          "whenSeen": true
        }
      }
    }
  ]
}
'

# connect to configmanager, update /data/cad-default.json
echo "$config" | docker exec -i configmanager sh -c 'cat > /data/cad-default.json'
# wait a few seconds for the proxy to read the new config
sleep 5

# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Do relevant action(s)
# trigger decoy by visiting /forbidden
tempfile=`bash ./uuidgen.sh`
curl -v http://localhost:8000/forbidden >$tempfile 2>&1
# give some time for the alert to be sent to the console

# Check DETECTION (in docker logs)
status=`docker-compose logs | grep '"DecoyKey":"forbidden",'`

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

