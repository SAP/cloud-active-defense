# Time taken for 10000 requests sent directly to myapp (e.g. not through Envoy)

# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Do relevant action(s)
for ((i=1; i<=9999; i++)); do
  curl -v http://localhost:3000/ >/dev/null 2>&1
done
# Check in the 1000th iteration that myapp is properly running
curl -v http://localhost:3000/ >$tempfile 2>&1

# Check INJECTION (in $tempfile)
status=$(grep "Welcome" $tempfile)

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

