@echo off
set dir=%~dp0

kubectl get envoyfilter test-myapp-cloudactivedefensefilter -n demo-ns -o yaml > %dir%/resources.yaml
kubectl apply -k %dir%
del "%dir%/resources.yaml"