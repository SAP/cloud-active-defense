@echo off

@pushd %~dp0
FINDSTR . > resources.yaml
kubectl apply -k .
del resources.yaml