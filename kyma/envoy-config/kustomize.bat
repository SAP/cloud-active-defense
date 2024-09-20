@echo off

@pushd %~dp0
FINDSTR . > resources.yaml
kubectl apply -k . > nul
del resources.yaml