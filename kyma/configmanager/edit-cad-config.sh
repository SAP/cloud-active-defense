#!/bin/bash

# This script is for editing the config for Cloud Active Defense
# It requires kubectl to connect to a Kubernetes cluster

# Function to display help message
show_help() {
  echo "Edit the config for Cloud Active Defense"
  echo "Specify the NAMESPACE and DEPLOYMENT of your app, if none are specified the default config will be edited"
  echo "Edit the cad-config.json file to send your changes to configmanager (Changes will overwrite previous config)"
  echo
  echo "Usage:"
  echo "   ./edit-cad-config.sh NAMESPACE DEPLOYMENT"
  exit 0
}

# Checking for help argument
if [[ "$1" == "-h" ]]; then
  show_help
fi

# Checking if KUBECONFIG is set
if [ -z "${KUBECONFIG}" ]; then
  echo "Please set KUBECONFIG to connect to the cluster"
  echo "Example:"
  echo "   export KUBECONFIG=PATH/TO/FILE"
  exit 1
fi

# Initialize variables
dir=$(dirname "$0")
namespace="unknown"
deployment="unknown"

# Checking namespace argument
if [[ -n "$1" ]]; then
  if ! kubectl get ns | grep -q "$1"; then
    echo "Namespace doesn't exist, exiting... 🚪"
    exit 1
  fi
  namespace="$1"
fi

# Checking deployment argument
if [[ -n "$2" ]]; then
  if ! kubectl get deployment -n "$1" | grep -q "$2"; then
    echo "Deployment doesn't exist, exiting... 🚪"
    exit 1
  fi
  deployment="$2"
else
  if [[ -n "$1" ]]; then
    echo "Deployment name is missing, editing default config... 🔧"
  fi
fi

# Reading content of cad-config.json
filename="$dir"/cad-config.json
content=$(<"$filename")

# Creating cad-job.yaml
cat <<EOF > "$dir"/cad-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: edit-decoys
  namespace: config-ns
spec:
  template:
    spec:
      containers:
      - name: curl
        image: curlimages/curl
        command: ['sh', '-c', 'curl -X POST configmanager-service/namespace/deployment -H "Content-Type: application/json" -d ''${content}''']
      restartPolicy: Never
EOF

# Applying the job
kubectl apply -f "$dir"/cad-job.yaml > /dev/null

# Waiting for the job to complete
sleep 2

# Checking the job logs for success message
if kubectl logs -l job-name=edit-decoys -n config-ns | grep -q "Config updated"; then
  echo "Updated decoys configuration 💫"
else
  echo "Something went wrong when editing the config ⚠️"
fi

# Deleting the job
kubectl delete job edit-decoys -n config-ns > /dev/null