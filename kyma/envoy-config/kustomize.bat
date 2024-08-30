@echo off

kubectl delete envoyfilter test-myapp-cloudactivedefensefilter -n ${NAMESPACE}

@pushd %~dp0
FINDSTR . > resources.yaml
kubectl apply -k .
del resources.yaml