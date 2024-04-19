# test body injection with whenTrue condition in cookie

# Configure decoys
config='
{
  "filters": [
    {
      "decoy": {
        "key": "dummy",
        "string": "<!-- <a href='\''/admin'\''>Admin panel</a> -->"
      },
      "inject": {
        "store": {
          "inResponse": ".*",
          "as": "body",
          "at": {
            "method": "before",
            "property": "</body>"
          },
          "whenTrue": [
            {
              "key": "SESSION",
              "value": ".*",
              "in": "cookie"
            }
          ]
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
curl -v --cookie "SESSION=c32272b9-99d8-4687-b57e-a606952ae870" http://localhost:8000/ >$tempfile 2>&1

# Check INJECTION (in $tempfile)
status=$(grep "<!-- <a href='/admin'>Admin panel</a> -->" $tempfile)

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

