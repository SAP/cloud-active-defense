# Time taken for 10000 requests, 1 injected decoy (replace) but 0 trigger (except for last one)

# Configure decoys
config='
{
  "filters": [
    {
      "decoy": {
        "key": "admin1234"
      },
      "inject": {
        "store": {
          "inResponse": "/robots.txt",
          "withVerb": "GET",
          "as": "body",
          "at": {
            "method": "replace",
            "property": "((.|\n)*)"
          }
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
for ((i=1; i<=9999; i++)); do
  curl -v http://localhost:8000/ >/dev/null 2>&1
done
# Check in the 1000th iteration that the decoy is properly injected
curl -v http://localhost:8000/robots.txt >$tempfile 2>&1

# Check INJECTION (in $tempfile)
status=$(grep "admin1234" $tempfile)

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

