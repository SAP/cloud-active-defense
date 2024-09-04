#!/bin/bash
kubectl get envoyfilter test-myapp-cloudactivedefensefilter -n cad -o yaml > resources.yaml
kubectl kustomize
rm resources.yaml
