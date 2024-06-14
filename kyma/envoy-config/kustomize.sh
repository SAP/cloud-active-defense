#!/bin/bash
cat > resources.yaml
kubectl kustomize
rm resources.yaml
