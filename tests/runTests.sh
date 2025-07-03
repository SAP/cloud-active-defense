#!/bin/bash

# Build test images
docker build -f myappDockerfile -t myapptest ../myapp/
docker build -f controlpanelapiDockerfile -t controlpanel-apitest ../controlpanel/api/
docker build -f proxyDockerfile -t proxytest ../proxy/
docker build -f cloneDockerfile -t clonetest ../clone/
docker build -f exhaustDockerfile -t exhausttest ../exhaust/
docker build -f keycloakDockerfile -t keycloaktest ../keycloak/

# Delete possible container conflicts
docker rm -f myapp
docker rm -f controlpanel-api
docker rm -f controlpanel-db
docker rm -f proxy
docker rm -f clone
docker rm -f exhaust
docker rm -f fluentbit
docker rm -f keycloak

# Start the application in demo mode
docker-compose up -d

# Give some time to Envoy to deploy the config and keycloak to start
sleep 60

# Create test customer
curl -s -X POST http://localhost:8050/customer -H "Content-Type: application/json" -H "Authorization: Q4nV2xJ7pL9sT8wZ1yK5bM3cR6gH0fD2uS8eA4vN7qX5mP1zW6oB9tY3lC0rF2hG8k" -d '{"name": "test@test.com"}' > /dev/null

keycloak_token=$(docker exec controlpanel-api curl -s -X POST http://host.docker.internal:8080/realms/cad/protocol/openid-connect/token -H 'content-type: application/x-www-form-urlencoded' -d 'client_id=cad' -d 'username=test&password=test&grant_type=password' | jq --raw-output '.access_token')
export KEYCLOAK_TOKEN="$keycloak_token"

# Get protected app id from controlpanel-api
protected_app_id=$(curl -s -H "Authorization: Bearer $KEYCLOAK_TOKEN" http://localhost:8050/protected-app | jq --raw-output '.data[0].id')
export PROTECTEDAPP_ID="$protected_app_id"

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

