# test simple detection in URL (first README.md decoy)

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

# Do relevant action(s)
# connect to configmanager, update /data/cad-default.json
echo "$config" | docker exec -i configmanager sh -c 'cat > /data/cad-default.json'
# wait a few seconds for the proxy to read the new config
sleep 5

# trigger decoy by visiting /forbidden
tempfile=`uuidgen -r`
curl -v http://localhost:8000/forbidden >$tempfile 2>&1
# give some time for the alert to be sent to the console
sleep 2

# check INJECTION (in $tempfile)

# check DETECTION (in docker logs)
status=`docker-compose logs | grep '"DecoyKey": "forbidden",'`

# output result
if [ "$status" == "" ]; then
  echo -e "\033[0;31mFAIL\033[0m"
else
  echo -e "\033[0;32mPASS\033[0m"
fi

# cleanup
rm $tempfile

