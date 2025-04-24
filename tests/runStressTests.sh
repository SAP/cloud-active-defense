#!/bin/bash

# Build test images
docker build -f myappDockerfile -t myapptest ../myapp/
docker build -f controlpanelapiDockerfile -t controlpanel-apitest ../controlpanel/api/
docker build -f proxyDockerfile -t proxytest ../proxy/
docker build -f cloneDockerfile -t clonetest ../clone/
docker build -f exhaustDockerfile -t exhausttest ../exhaust/

# Delete possible container conflicts
docker rm -f myapp
docker rm -f controlpanel-api
docker rm -f controlpanel-db
docker rm -f proxy
docker rm -f clone
docker rm -f exhaust
docker rm -f fluentbit

# Start the application in demo mode
docker-compose up -d

# Give some time to Envoy to deploy the config
sleep 4

# Get protected app id from controlpanel-api
protected_app_id=$(curl -s http://localhost:8050/protected-app | jq -r '.data[0].id')
export PROTECTEDAPP_ID="$protected_app_id"

# Run all tests
for test_script in $(find ./stress -type f -name "*.sh")
do
  echo "NOW RUNNING TEST: $test_script"
  bash "$test_script"
done

# Done!
echo "ALL TESTS COMPLETED" 

# Cleanup
docker-compose down

