#!/bin/bash
cat > envoy-config/resources.yaml
kubectl kustomize envoy-config
rm envoy-config/resources.yaml
