#!/bin/bash

consoleoutput=docker-compose-logs.txt

# Build test images
docker build -f myappDockerfile -t myapptest ../myapp/
docker build -f configmanagerDockerfile -t configmanagertest ../configmanager/
docker build -f proxyDockerfile -t proxytest ../proxy/

# Delete possible container conflicts
docker rm -f myapp
docker rm -f configmanager
docker rm -f proxy

# Start the application in demo mode
docker-compose up -d

# Wait for docker-compose to be ready (checking the logs)
while :; do
  status=`docker-compose logs | grep "wasm log: read new config"`
  if [ "$status" == "" ]; then
    sleep 1 # wait one second before checking again
  else
    break
  fi
done

# Give some time to Envoy to deploy the config
sleep 4

# Run all tests
for test_script in $(find ./tests -type f -name "*.sh")
do
  echo "NOW RUNNING TEST: $test_script"
  bash "$test_script"
done

# Done!
echo "ALL TESTS COMPLETED" 

# Cleanup
docker-compose down
rm $consoleoutput

