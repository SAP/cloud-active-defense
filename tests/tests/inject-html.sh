# test for injection in html login page

# Configure decoys
config='
{
  "filters":[
  {
    "decoy": {
      "key": "system",
      "separator": "=",
      "value": "2",
      "string": "<input type=\"hidden\" name=\"system\" value=\"2\">\n      "
    },
    "inject": {
      "store": {
        "inResponse": "/login$",
        "withVerb": "GET",
        "as": "body",
        "at": {
          "method": "line",
          "property": "5"
        }
      }
    },
    "detect": {
      "seek": {
        "inRequest": "/login$",
        "withVerb": "POST",
        "in": "payload"
      },
      "alert": {
        "whenSeen": true,
        "severity": "HIGH"
      }
    }
  }
]}
'

# connect to configmanager, update /data/cad-default.json
echo "$config" | docker exec -i configmanager sh -c 'cat > /data/cad-default.json'
# wait a few seconds for the proxy to read the new config
sleep 5


# Start timing
start_time1=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Do relevant action(s)
curl -v http://localhost:8000/login >$tempfile 2>&1

# Check INJECTION (in $tempfile)
status=$(grep '<input type="hidden" name="system" value="2">' $tempfile)

echo -e "INJECTION:"
# Output result & time
if [ -z "$status" ]; then
  echo -e "\033[0;31mFAIL\033[0m"
else
  echo -e "\033[0;32mPASS\033[0m"
fi

check_1_time=$(date +%s.%N)
execution_time=$(echo "$check_1_time $start_time1" | awk '{print $1 - $2}')
echo "Execution time: $execution_time seconds"

start_time2=$(date +%s.%N)
# Do relevant action(s)
# trigger decoy by sending system=2 in payload
curl -v http://localhost:8000/login -d "system=2" >$tempfile 2>&1

# Check DETECTION (in docker logs)
status=`docker-compose logs | grep '"DecoyKey":"system"'`

echo -e "DETECTION:"
# Output result & time
if [ -z "$status" ]; then
  echo -e "\033[0;31mFAIL\033[0m"
else
  echo -e "\033[0;32mPASS\033[0m"
fi

check_2_time=$(date +%s.%N)
execution_time=$(echo "$check_2_time $start_time2" | awk '{print $1 - $2}')
echo "Execution time: $execution_time seconds"

# Cleanup
rm $tempfile
