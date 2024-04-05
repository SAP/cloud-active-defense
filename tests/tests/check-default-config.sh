# check if the default config is working
# (e.g. checks that the HTTP Response header 'x-cloud-active-defense' is set)

tempfile=`uuidgen -r`

# Do relevant action(s)
curl -v http://localhost:8000 >$tempfile 2>&1

# check INJECTION (in $tempfile)
status=`grep "< x-cloud-active-defense: ACTIVE" $tempfile`

# check DETECTION (in docker logs)

# output result
if [ "$status" == "" ]; then
  echo -e "\033[0;31mFAIL\033[0m"
else
  echo -e "\033[0;32mPASS\033[0m"
fi

# cleanup
rm $tempfile

