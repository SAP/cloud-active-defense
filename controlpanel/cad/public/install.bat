@echo off
chcp 65001>nul
setlocal enabledelayedexpansion

:main
  echo.
  echo Setting up install 🧑‍🔧

  if not defined KUBECONFIG (
    call :ask_kubeconfig_path
  )

  call :installServiceAccount
  call :installClusterRole
  call :installClusterRoleBinding
  call :generate_kubeconfig

  endlocal
  exit /B

:ask_kubeconfig_path
  set /p kubeconfig_userInput_path="Please provide the full path of your kubeconfig: "
  if "!kubeconfig_userInput_path!"=="" (
    goto :ask_kubeconfig_path
  )
  if not exist "!kubeconfig_userInput_path!" (
    echo File doesn't exist
    goto :ask_kubeconfig_path
  )
  set KUBECONFIG=!kubeconfig_userInput_path!
  exit /B

:installServiceAccount
  for /f "tokens=* delims=" %%i in ('kubectl get serviceaccount ^| findstr remote-dm-sa') do set serviceAccount_exists=%%i
  if defined serviceAccount_exists (
    kubectl delete serviceaccount remote-dm-sa >nul
  ) else (
    echo Creating service account 🔧
  )
  kubectl create serviceaccount remote-dm-sa >nul
  kubectl label serviceaccount remote-dm-sa app.kubernetes.io/managed-by=deployment-manager-install>nul
  exit /B

:installClusterRole
  for /f "tokens=* delims=" %%i in ('kubectl get clusterrole ^| findstr remote-dm-cr') do set clusterRole_exists=%%i
  if not defined clusterRole_exists (
    echo Creating cluster role 🔧
    (
    echo apiVersion: rbac.authorization.k8s.io/v1
    echo kind: ClusterRole
    echo metadata:
    echo  name: remote-dm-cr
    echo rules:
    echo - verbs:
    echo    - create
    echo    - get
    echo   apiGroups:
    echo    - ''
    echo    - operator.kyma-project.io
    echo   resources:
    echo    - persistentvolumeclaims
    echo    - telemetries
    echo - verbs:
    echo    - create
    echo   apiGroups:
    echo    - batch
    echo    - ''
    echo    - telemetry.kyma-project.io
    echo   resources:
    echo    - jobs
    echo    - services
    echo    - logpipelines
    echo - verbs:
    echo    - create
    echo    - patch
    echo    - get
    echo   apiGroups:
    echo    - networking.istio.io
    echo    - ''
    echo   resources:
    echo    - envoyfilters
    echo    - secrets
    echo - verbs:
    echo    - get
    echo    - list
    echo   apiGroups:
    echo    - ''
    echo    - apps
    echo    - operator.kyma-project.io
    echo   resources:
    echo    - namespaces
    echo    - deployments
    echo    - kymas
    echo - verbs:
    echo    - patch
    echo   apiGroups:
    echo    - operator.kyma-project.io
    echo    - apps
    echo   resources:
    echo    - kymas
    echo    - deployments
    echo - verbs:
    echo    - list
    echo   apiGroups:
    echo    - batch
    echo   resources:
    echo    - jobs
    echo - verbs:
    echo    - deletecollection
    echo   apiGroups:
    echo    - batch
    echo    - ''
    echo    - networking.istio.io
    echo    - telemetry.kyma-project.io
    echo   resources:
    echo    - jobs
    echo    - pods
    echo    - envoyfilters
    echo    - services
    echo    - logpipelines
    echo    - secrets
    echo - verbs:
    echo    - delete
    echo   apiGroups:
    echo    - ''
    echo   resources:
    echo    - persistentvolumeclaims
    echo    - services
    ) | kubectl apply -f - >nul
    kubectl label clusterrole remote-dm-cr app.kubernetes.io/managed-by=deployment-manager-install >nul
  )
  exit /B

:installClusterRoleBinding
  for /f "tokens=* delims=" %%i in ('kubectl get clusterrolebinding ^| findstr remote-dm-crb') do set clusterRoleBinding_exists=%%i
  if not defined clusterRoleBinding_exists (
    echo Creating cluster role binding 🔧
    kubectl create clusterrolebinding remote-dm-crb --clusterrole=remote-dm-cr --serviceaccount=default:remote-dm-sa >nul
    kubectl label clusterrolebinding remote-dm-crb app.kubernetes.io/managed-by=deployment-manager-install >nul
  )
  exit /B

:requestToken
  for /f "tokens=* delims=" %%i in ('kubectl create token remote-dm-sa --duration=8766h') do set token=%%i
  if ERRORLEVEL 1 (
    echo Failed to create token, please check your service account and try again.
    exit 1
  ) else (
    set serviceAccount_token=%token%
  )
  exit /B

:generate_kubeconfig
  set serviceAccount_token=
  call :requestToken
  if not defined serviceAccount_token (
    echo Failed to create token, please check your service account and try again.
    exit 1
  )
  for /f "tokens=* delims=" %%c in ('kubectl config view --minify -o jsonpath^="{.contexts[0].context.cluster}"') do (
    set CLUSTER_NAME=%%c
  )
  if "%CLUSTER_NAME%"=="" (
      echo Error: Cannot generate kubeconfig
      exit /b 1
  )
  for /f "tokens=* delims=" %%s in ('kubectl config view --minify -o jsonpath^="{.clusters[0].cluster.server}"') do (
    set SERVER=%%s
  )
  if "%SERVER%"=="" (
      echo Error: Cannot generate kubeconfig
      exit /b 1
  )
  for /f "tokens=* delims=" %%a in ('kubectl config view --minify --raw -o jsonpath^="{.clusters[0].cluster.certificate-authority-data}"') do (
    set CA_DATA=%%a
  )
  if "%CA_DATA%"=="" (
      echo Error: Cannot generate kubeconfig
      exit /b 1
  )

  (
  echo apiVersion: v1
  echo kind: Config
  echo current-context: deployment-manager-token
  echo users:
  echo - name: deployment-manager-token
  echo   user:
  echo     token: %TOKEN%
  echo clusters:
  echo - name: %CLUSTER_NAME%
  echo   cluster:
  echo     certificate-authority-data: %CA_DATA%
  echo     server: %SERVER%
  echo contexts:
  echo - context:
  echo     cluster: %CLUSTER_NAME%
  echo     user: deployment-manager-token
  echo     namespace: default
  echo   name: deployment-manager-token
  ) > deployment-manager-kubeconfig.yaml
  
  echo Kubeconfig generated successfully! 🎉
  echo This kubeconfig is valid for 1 year, to renew it run the script again.
  echo You can either use it with deployment-manager API or upload it into Cloud Active Defense controlpanel (recommanded).
  exit /B 