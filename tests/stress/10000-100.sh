# Time taken for 10000 requests, 100 injected decoy (replace) - each triggered 10 times

# Configure decoys
element='
{
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
'

# Create an array to store the modified elements
declare -a elements

# Loop through numbers from 1 to 100 and replace /1 with /<number>
for ((i=1; i<=100; i++)); do
    modified_element=$(echo "$element" | sed "s/\/1/\/$i/")
    elements+=("$modified_element")
done

# Initialize the decoys variable
config="{  \"filters\": ["

for ((i=0; i<${#elements[@]}; i++)); do
    # Add a comma between elements except for the last one
    if [ $i -eq $((${#elements[@]} - 1)) ]; then
        config+="$(printf '%s' "${elements[$i]}")"
    else
        config+="$(printf '%s' "${elements[$i]}"),"
    fi
done

config+="]}"

# connect to configmanager, update /data/cad-default.json
echo "$config" | docker exec -i configmanager sh -c 'cat > /data/cad-default.json'
# wait a few seconds for the proxy to read the new config
sleep 5


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

