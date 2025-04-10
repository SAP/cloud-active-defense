@echo off
chcp 65001>nul
setlocal enabledelayedexpansion

:main
  echo.
  echo Cloud Active Defense wizard 🧙‍♂️
  echo ------------------------------
  echo.

  if not defined KUBECONFIG (
    call :ask_kubeconfig_path
  )

  echo Looking for controlpanel API 🔍
  for /f "tokens=* delims=" %%i in ('helm list ^| findstr controlpanel-api 2^> nul') do set cp_api_result=%%i
  if not defined cp_api_result (
    call :installControlpanel
  ) else (
    for /f "tokens=* delims=" %%i in ('kubectl get deployment -n controlpanel ^| findstr controlpanel-api') do set controlpanel_up=%%i
    if not defined controlpanel_up (
      echo Controlpanel API deployment is missing, please check deployment 🕵️
    ) else (
      for /f "tokens=* delims=" %%i in ('kubectl get deployment controlpanel-api -n controlpanel -o jsonpath^="{.status.availableReplicas}"') do set controlpanel_health=%%i
      if not defined controlpanel_health (
        echo Controlpanel API is unhealthy, please check deployment 🤒
      ) else (
        echo Controlpanel API is already deployed ✅
      )
    )
  )
  echo.

  for /f "tokens=* delims=" %%i in ('helm list ^| findstr controlpanel-front 2^> nul') do set "cp_front_result=%%i"
  if not defined cp_front_result (
    call :askControlpanelFront
  )

  echo Looking for deployment manager 🔍
  for /f "tokens=* delims=" %%i in ('helm list ^| findstr deployment-manager 2^> nul') do set dm_result=%%i
  if not defined dm_result (
    call :installDeploymentManager
  ) else (
    for /f "tokens=* delims=" %%i in ('kubectl get deployment deployment-manager -n controlpanel') do set deployment_manager_up=%%i
    if not defined deployment_manager_up (
      echo Deployment manager deployment is missing, please check deployment 🕵️
    ) else (
      for /f "tokens=* delims=" %%i in ('kubectl get deployment deployment-manager -n controlpanel -o jsonpath^="{.status.availableReplicas}"') do set deployment_manager_health=%%i
      if not defined deployment_manager_health (
        echo Deployment manager is unhealthy, please check deployment 🤒
      ) else (
        echo Deployment manager is already deployed ✅
      )
    )
  )
  echo.
  echo Cloud Active defense is deployed! 💫

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
:installControlpanel
  echo Deploying Controlpanel API 🚀
  for /f "tokens=* delims=" %%i in ('kubectl config view --minify -o jsonpath^="{.clusters[0].cluster.server}"') do set "cluster_link=%%i"
  set "front_url=%cluster_link:api=controlpanel-front%"
  set /p "db_userInput_user=Please provide the username for the database: "
  set /p "db_userInput_password=Please provide the password for the database: "
  
  if "!db_userInput_user!"=="" (
    call :generate_random_string 10 db_user
    echo Username generated: !db_user!
  ) else (
    set "db_user=!db_userInput_user: =!"
  )
  if "!db_userInput_password!"=="" (
    call :generate_random_string 30 db_password
    echo Password generated: !db_password!
  ) else (
    set "db_password=!db_userInput_password: =!"
  )

  call :generate_random_string 65 envoy_apiKey
  call :generate_random_string 65 fluentbit_apiKey

  (echo replicaCount: 1
  echo namespace: controlpanel
  echo image: "ghcr.io/sap/controlpanel-api:latest"
  echo db_port: 5432
  echo db_host: "controlpanel-db-service"
  echo controlpanel_front_url: "!front_url!"
  echo db_user: !db_user!
  echo db_password: !db_password!
  echo envoyApiKey: !envoy_apiKey!
  echo fluentbitApiKey: !fluentbit_apiKey!
  ) > controlpanel-api\values_tmp.yaml

  helm install -f controlpanel-api\values_tmp.yaml controlpanel-api controlpanel-api > nul
  del controlpanel-api\values_tmp.yaml
  exit /B
:askControlpanelFront
  set /p front_userInput=Do you want to install controlpanel dashboard (Y/N) ? 
  if "%front_userInput%"=="n" (
    exit /B
  ) else if "%front_userInput%"=="N" (
    exit /B
  ) else if "%front_userInput%"=="y" (
    call :installControlpanelFront
  ) else if "%front_userInput%"=="Y" (
    call :installControlpanelFront
  ) else (
    call :askControlpanelFront
  )
  echo.
  exit /B
:installControlpanelFront
  echo Deploying controlpanel dashboard 🚀
  for /f "tokens=* delims=" %%i in ('kubectl config view --minify -o jsonpath^="{.clusters[0].cluster.server}"') do set "cluster_link=%%i"
  set "api_url=%cluster_link:api=controlpanel-api%"
  (echo replicaCount: 1
  echo namespace: controlpanel
  echo image: "ghcr.io/sap/controlpanel-frontend:latest"
  echo controlpanel_api_url: "%api_url%"
  ) > controlpanel-front\values_tmp.yaml

  helm upgrade --install -f controlpanel-front\values_tmp.yaml controlpanel-front controlpanel-front > nul
  del controlpanel-front\values_tmp.yaml
  exit /B
:generate_random_string
  setlocal enabledelayedexpansion
  set "charset=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  set "random_string="
  set /a length=%1
  for /l %%i in (1,1,!length!) do (
      set /a index=!random! %% 62
      for %%j in (!index!) do set "random_string=!random_string!!charset:~%%j,1!"
  )
  endlocal & set "%2=%random_string%"
  exit /b
:installDeploymentManager
  echo Deploying Deployment manager 🚀
  helm install deployment-manager deployment-manager > nul
  exit /B