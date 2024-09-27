@echo off
chcp 65001>nul
setlocal enabledelayedexpansion

set dir=%~dp0
set namespace=unknown
set deployment=unknown

if "%1"=="-h" (
  echo Edit the config for Cloud Active Defense
  echo Specify the NAMESPACE and DEPLOYMENT of your app, if none are specify the default config will be edited
  echo Edit the cad-config.json file to send your changes to configmanager ^(Changes will overwrite previous config^)
  echo.
  echo Usage:
  echo    ./edit-cad-config.bat NAMESPACE DEPLOYMENT
  exit
)

if not defined KUBECONFIG (
  echo Please set KUBECONFIG to connect to the cluster
  echo Example:
  echo    $ENV:KUBECONFIG="PATH\TO\FILE"
  exit
)

if not "%1"=="" (
  for /f "tokens=* delims=" %%A in ('kubectl get ns ^| findstr %1') do set "namespaceResult=%%A"
  if not defined namespaceResult (
    echo Namespace doesn't exists, exiting... 🚪
    exit
  )
  set namespace=%1
)
if not "%2"=="" (
  for /f "tokens=* delims=" %%A in ('kubectl get deployment -n %1 ^| findstr %2') do set "deploymentResult=%%A"
  if not defined deploymentResult (
    echo Deployment doesn't exists, exiting... 🚪
    exit
  )
  set deployment=%2
) else (
  if not "%1"=="" (
    echo Deployment name is missing, editing default config... 🔧
  )
)
set filename=%dir%\cad-config.json
set "content="
for /f "delims=" %%i in (%filename%) do set "content=!content! %%i"
(
  echo apiVersion: batch/v1
  echo kind: Job
  echo metadata:
  echo  name: edit-decoys
  echo  namespace: config-ns
  echo spec:
  echo  template:
  echo   spec:
  echo    containers:
  echo    - name: curl
  echo      image: curlimages/curl
  echo      command: ['sh', '-c', 'curl -X POST configmanager-service/namespace/deployment -H "Content-Type: application/json" -d ''!content!''']
  echo    restartPolicy: Never
) > %dir%\cad-job.yaml
kubectl apply -f %dir%\cad-job.yaml > nul
del %dir%\cad-job.yaml

timeout /t 2 /nobreak > nul
for /f "tokens=*" %%i in ('kubectl logs -l job-name^=edit-decoys -n config-ns ^| findstr "Config updated"') do set editResult=%%i
if not defined editResult (
  echo Something went wrong when editing the config ⚠️
) else (
  echo Updated decoys configuration 💫
)
kubectl delete job edit-decoys -n config-ns > nul
endlocal