#!/bin/bash
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kubectl get envoyfilter test-myapp-cloudactivedefensefilter -n demo-ns -o yaml > "$dir/resources.yaml"
kubectl apply -k "$dir"
rm -f "$dir/resources.yaml"