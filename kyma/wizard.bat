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
  echo Looking for Telemetry module 🔍
  for /f "tokens=* delims=" %%i in ('kubectl get deployment -n kyma-system ^| findstr telemetry-manager') do set telemetry_deployment=%%i
  if not defined telemetry_deployment (
    call :installTelemetry
  ) else (
    echo Telemetry module is already added ✅
  )
  echo.

  echo Looking for Loki 🔍
  for /f "tokens=*" %%i in ('helm list ^| findstr telemetry') do set loki_helm=%%i
  for /f "tokens=* delims=" %%i in ('helm list -A ^| findstr loki-app') do set loki_app=%%i
  for /f "tokens=* delims=" %%i in ('helm list -A ^| findstr grafana-app') do set grafana_app=%%i
  if defined loki_helm (
    if defined loki_app (
      if defined grafana_app (
        echo Loki is already deployed ✅
      ) else (
        call :installLoki
      )
    ) else (
      call :installLoki
    )
  ) else (
    call :installLoki
  )
  echo.

  set app_default_namespace=demo-ns
  set /p app_userInput_namespace=In what namespace to install your app: 
  if not defined app_userInput_namespace set app_userInput_namespace=%app_default_namespace%

  echo Deploying wasm in %app_userInput_namespace% 🚀
  for /f "tokens=* delims=" %%A in ('helm list ^| findstr "\<wasm-%app_userInput_namespace%\>"') do set "wasmResult=%%A"
  if defined wasmResult (
    for /f "tokens=* delims=" %%i in ('kubectl get jobs -n %app_userInput_namespace% ^| findstr init-job') do set "wasm_up=%%i"
    if defined wasm_up (
      for /f "tokens=* delims=" %%i in ('kubectl get job init-job -n %app_userInput_namespace% -o jsonpath^="{.status.conditions[?(@.status==\"True\")].type}"') do set "wasm_health=%%i"
      for %%c in (!wasm_health!) do (
        if "%%c" == "Complete" (
          set "isComplete=true"
        )
      )
      if "!isComplete!" == "true" (
        echo Wasm is already deployed ✅
      ) else (
        echo Wasm is unhealthy, redeploying it 🚑
        call :installWasm
        echo Done ✅
      )
    ) else (
      echo Wasm is unhealthy, redeploying it 🚑
      call :installWasm
      echo Done ✅
    )
  ) else (
    for /f "tokens=* delims=" %%i in ('kubectl get namespace ^| findstr "\<%app_userInput_namespace%\>"') do set "namespace_exists=%%i"
    if defined namespace_exists (
      echo Cannot install wasm, namespace "%app_userInput_namespace%" already exists.
      echo Exiting...
      exit /b
    ) else (
      call :installWasm
    )
  )
  echo.

  call :ask_app_directory
  cmd /c exit 0
  if "%app_userInput_directory%"=="myapp" (
    echo Deploying myapp demo in %app_userInput_namespace% 🚀
    for /f "tokens=* delims=" %%A in ('helm list ^| findstr myapp-%app_userInput_namespace%') do set "myappResult=%%A"
    if not "!myappResult!"=="" (
      for /f "tokens=* delims=" %%i in ('kubectl get deployments -n %app_userInput_namespace% ^| findstr myapp') do set myapp_up=%%i
      if defined myapp_up (
        for /f "tokens=* delims=" %%i in ('kubectl get deployment myapp -n %app_userInput_namespace% -o jsonpath^="{.status.availableReplicas}"') do set myapp_health=%%i
        if "!myapp_health!" == "" (
          echo Myapp is unhealthy, redeploying it 🚑
          (echo replicaCount: 1
          echo namespace: %app_userInput_namespace%
          echo image: "ghcr.io/sap/myapp:latest"
          ) > myapp\values_tmp.yaml
          helm upgrade myapp-%app_userInput_namespace% myapp -f myapp\values_tmp.yaml > nul
          del myapp\values_tmp.yaml
          call :apply_envoyreconfig
        ) else (
          echo Myapp is already deployed ✅
          set app_userInput_deployment=myapp
        )
      )
    ) else (
      (echo replicaCount: 1
      echo namespace: "%app_userInput_namespace%"
      echo image: "ghcr.io/sap/myapp:latest") > myapp\values_tmp.yaml
      helm install -f myapp\values_tmp.yaml myapp-%app_userInput_namespace% myapp > nul
      del myapp\values_tmp.yaml
      call :apply_envoyreconfig
    )
  ) else (
    call :ask_deployment_name
    for /f "tokens=* delims=" %%A in ('helm list ^| findstr !app_userInput_deployment!-%app_userInput_namespace%') do set "deploymentResult=%%A"
    if "!deploymentResult!"=="" (
      for /f "tokens=* delims=" %%i in ('kubectl get deployments -n %app_userInput_namespace% ^| findstr %app_userInput_deployment%') do set deployment_up=%%i
      if defined deployment_up (
        for /f "tokens=* delims=" %%i in ('kubectl get deployment %app_userInput_deployment% -n %app_userInput_namespace% -o jsonpath^="{.status.availableReplicas}") do set deployment_health=%%i
        if "%deployment_health%" == "" (
          echo Cannot update, %app_userInput_deployment% is unhealthy 🤒
          echo exiting...
          exit 1
        ) else (
          echo Updating !app_userInput_deployment! in %app_userInput_namespace% 🔄️
          helm upgrade !app_userInput_deployment!-%app_userInput_namespace% %app_userInput_directory% > nul
          call :apply_envoyreconfig
        )
      )
    ) else (
      echo Deploying !app_userInput_deployment! in %app_userInput_namespace% 🚀
      helm install !app_userInput_deployment!-%app_userInput_namespace% %app_userInput_directory% > nul
      call :apply_envoyreconfig
    )
  )
  echo.
  for /f "tokens=*" %%A in ('helm list ^| findstr !app_userInput_deployment!-%app_userInput_namespace%-clone') do set "cloneResult=%%A"
  if not defined cloneResult (
    call :askClone
  )

  for /f "tokens=*" %%A in ('helm list ^| findstr !app_userInput_deployment!-%app_userInput_namespace%-exhaust') do set "exhaustResult=%%A"
  if not defined exhaustResult (
    call :askExhaust
  )
  echo Cloud Active defense is deployed! 💫

  endlocal
  exit /B

:ask_app_directory
  set app_default_directory=myapp
  set /p app_userInput_directory="Please give the full path of your app directory (Press enter to install demo app): "
  if not defined app_userInput_directory (
    set app_userInput_directory=%app_default_directory%
  ) else (
    if not exist "%app_userInput_directory%" (
      echo The given path doesn't exist
      call :ask_app_directory
    ) else (
      if not exist "%app_userInput_directory%\Chart.yaml" (
        echo Cannot find Chart.yaml file of your helm chart in "%app_userInput_directory%"
        call :ask_app_directory
      ) else (
        if not exist "%app_userInput_directory%\templates" (
          echo Cannot find templates/ directory of your helm chart in "%app_userInput_directory%"
          call :ask_app_directory
        ) else (
          if not exist "%app_userInput_directory%\values.yaml" (
            echo Cannot find values.yaml of your helm chart in "%app_userInput_directory%"
            call :ask_app_directory
          )
        )
      )
    )
  )
  exit /B
:ask_deployment_name
  set /p app_userInput_deployment="What is the name of your deployment: "
  if "!app_userInput_deployment!"=="" (
    echo Please provide the name of your deployment
    goto :ask_deployment_name
  )
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

:apply_envoyreconfig
  if not defined app_userInput_deployment (
    set app_userInput_deployment=myapp
    set app_userInput_directory=myapp
    kubectl label deployment !app_userInput_deployment! -n %app_userInput_namespace% protects=!app_userInput_deployment! --overwrite > nul
  )
  if exist envoy-config\temp (
    rmdir /S /Q envoy-config\temp > nul
  )
  mkdir envoy-config\temp
  for /f "tokens=*" %%i in ('kubectl get secret -n controlpanel envoy-api-key-secret -o jsonpath^="{.data.ENVOY_API_KEY}"') do set encodedKey=%%i
  echo %encodedKey% > temp.b64
  for /f "tokens=* delims=" %%i in ('powershell -Command "[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((Get-Content -Raw -Path 'temp.b64')))"') do set envoy_apiKey=%%i
  del temp.b64
  (
    echo apiVersion: networking.istio.io/v1alpha3
    echo kind: EnvoyFilter
    echo metadata:
    echo  name: %app_userInput_deployment%-cloudactivedefensefilter
    echo  namespace: %app_userInput_namespace%
    echo spec:
    echo  workloadSelector:
    echo    labels:
    echo      protects: %app_userInput_deployment%
    echo  configPatches:
    echo  - applyTo: HTTP_FILTER
    echo    match:
    echo      context: SIDECAR_INBOUND
    echo      listener:
    echo        filterChain:
    echo          filter:
    echo            name: envoy.filters.network.http_connection_manager
    echo            subFilter:
    echo              name: envoy.filters.http.router
    echo    patch:
    echo      operation: INSERT_BEFORE
    echo      value:
    echo        name: envoy.filters.http.wasm
    echo        typed_config:
    echo            '@type': type.googleapis.com/udpa.type.v1.TypedStruct
    echo            type_url: type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
    echo            value:
    echo              config:
    echo                rootId: "my_root_id"
    echo                vmConfig:
    echo                  code:
    echo                    local:
    echo                      filename: var/local/lib/wasm/sundew.wasm
    echo                  runtime: envoy.wasm.runtime.v8
    echo                  vmId: cad-filter
    echo                configuration:
    echo                  '@type': type.googleapis.com/google.protobuf.StringValue
    echo                  value: ^|
    echo                    {
    echo                      "ENVOY_API_KEY": "!envoy_apiKey!"
    echo                    }
    echo  - applyTo: CLUSTER
    echo    match:
    echo      context: SIDECAR_OUTBOUND
    echo    patch:
    echo      operation: ADD
    echo      value:
    echo        name: "controlpanel-api"
    echo        type: STRICT_DNS
    echo        lb_policy: ROUND_ROBIN
    echo        load_assignment:
    echo          cluster_name: controlpanel-api
    echo          endpoints:
    echo          - lb_endpoints:
    echo            - endpoint:
    echo                address:
    echo                  socket_address:
    echo                    address: controlpanel-api-service
    echo                    port_value: 80
  ) > envoy-config\temp\envoy-reconfig.yaml
  (
    echo apiVersion: apps/v1
    echo kind: Deployment
    echo metadata:
    echo   name: !app_userInput_deployment!
    echo   namespace: %app_userInput_namespace%
    echo spec:
    echo   template:
    echo     metadata:
    echo       annotations:
    echo         sidecar.istio.io/userVolume: '{"sundew":{"persistentVolumeClaim":{"claimName":"wasm-data"}}}'
    echo         sidecar.istio.io/userVolumeMount: '{"sundew":{"mountPath":"var/local/lib/wasm","readOnly":true}}'
  ) > envoy-config/temp/resources-patch.yaml
  copy envoy-config\kustomize.bat envoy-config\temp\kustomize.bat > nul
  copy envoy-config\kustomization.yaml envoy-config\temp\kustomization.yaml > nul
  echo Waiting for wasm to be deployed... ⏳
  kubectl wait --for=condition=complete job/init-job --timeout=10s -n %app_userInput_namespace% > nul 2> nul
  if %errorlevel% equ 0 (
    helm upgrade !app_userInput_deployment!-%app_userInput_namespace% %app_userInput_directory% --post-renderer .\envoy-config\temp\kustomize.bat --dry-run >nul
    rmdir /S /Q envoy-config\temp

    echo App successfully installed ✅
    for /F "delims=" %%i in ('kubectl get virtualservice -n %app_userInput_namespace% -o jsonpath^="{.items[0].spec.hosts[0]}" ^| findstr !app_userInput_deployment!') do set "app_url=%%i"
    echo To access your app, go to: !app_url!
  ) else (
    echo Something went wrong, wasm is unhealthy 🤒
    set /p wasm_health_userInput="Do you want to continue the install (Y/N) ? "
    if "!wasm_health_userInput!"=="n" (
      exit 1
    ) else if "!wasm_health_userInput!"=="N" (
      exit 1
    )
  )
  exit /B
:askClone
  set /p clone_userInput=Do you want to install a clone app (Y/N) ? 
  if "%clone_userInput%"=="n" (
    exit /B
  ) else if "%clone_userInput%"=="N" (
    exit /B
  ) else if "%clone_userInput%"=="y" (
    call :installClone
  ) else if "%clone_userInput%"=="Y" (
    call :installClone
  ) else (
    call :askClone
  )
  echo.
  exit /B
:installClone
  echo Deploying clone in %app_userInput_namespace% 🚀
  if not defined app_userInput_deployment (
      set app_userInput_deployment=myapp
      set clone_userInput_image=ghcr.io/sap/clone:latest
    ) else if "!app_userInput_deployment!"=="myapp" (
      set clone_userInput_image=ghcr.io/sap/clone:latest
    ) else (
      set /p clone_userInput_image="Please provide the image of your clone: "
    )
    (echo replicaCount: 1
    echo namespace: "%app_userInput_namespace%"
    echo image: "%clone_userInput_image%"
    echo deploymentName: "!app_userInput_deployment!") > clone\values_tmp.yaml

    helm install -f clone\values_tmp.yaml !app_userInput_deployment!-%app_userInput_namespace%-clone clone > nul

    if exist clone\envoy-config\temp (
      rmdir /S /Q clone\envoy-config\temp > nul
    )
    mkdir clone\envoy-config\temp
    (
      echo - op: add
      echo   path: "/spec/configPatches/-"
      echo   value:
      echo     applyTo: VIRTUAL_HOST
      echo     match:
      echo       context: SIDECAR_INBOUND
      echo     patch:
      echo       operation: ADD
      echo       value:
      echo         name: clone_service
      echo         domains:
      echo         - "clone"
      echo         routes:
      echo         - match:
      echo             prefix: "/"
      echo           route:
      echo             cluster: outbound^|80^|^|!app_userInput_deployment!-clone-service.%app_userInput_namespace%.svc.cluster.local
    ) > clone\envoy-config\temp\envoy-patch.yaml
    (
      echo apiVersion: kustomize.config.k8s.io/v1beta1
      echo kind: Kustomization
      echo resources:
      echo - resources.yaml
      echo patches:
      echo   - path: envoy-patch.yaml
      echo     target:
      echo       group: networking.istio.io
      echo       version: v1alpha3
      echo       kind: EnvoyFilter
      echo       name: !app_userInput_deployment!-cloudactivedefensefilter

    ) > clone\envoy-config\temp\kustomization.yaml
    (
      echo @echo off
      echo set dir=%~dp0
      echo kubectl get envoyfilter !app_userInput_deployment!-cloudactivedefensefilter -n %app_userInput_namespace% -o yaml ^> %%dir%%\clone\envoy-config\temp\resources.yaml
      echo kubectl apply -k %%dir%%\clone\envoy-config\temp
      echo del "%%dir%%\clone\envoy-config\temp\resources.yaml"
    ) > clone\envoy-config\temp\kustomize.bat

    call .\clone\envoy-config\temp\kustomize.bat > nul 2> nul
    rmdir /S /Q clone\envoy-config\temp
    del clone\values_tmp.yaml
  exit /B

:askExhaust
  set /p exhaust_userInput=Do you want to install an exhaust app (Y/N) ? 
  if "%exhaust_userInput%"=="n" (
    exit /B
  ) else if "%exhaust_userInput%"=="N" (
    exit /B
  ) else if "%exhaust_userInput%"=="y" (
    call :installExhaust
  ) else if "%exhaust_userInput%"=="Y" (
    call :installExhaust
  ) else (
    call :askExhaust
  )
  echo.
  exit /B
:installExhaust
  echo Deploying exhaust in %app_userInput_namespace% 🚀
  if not defined app_userInput_deployment (
      set app_userInput_deployment=myapp
      set exhaust_userInput_image=ghcr.io/sap/exhaust:latest
    ) else if "!app_userInput_deployment!"=="myapp" (
      set exhaust_userInput_image=ghcr.io/sap/exhaust:latest
    ) else (
      set /p exhaust_userInput_image="Please provide the image of your exhaust: "
    )
    (echo replicaCount: 1
    echo namespace: "%app_userInput_namespace%"
    echo image: "%exhaust_userInput_image%"
    echo deploymentName: "!app_userInput_deployment!") > exhaust\values_tmp.yaml

    helm install -f exhaust\values_tmp.yaml !app_userInput_deployment!-%app_userInput_namespace%-exhaust exhaust > nul

    if exist exhaust\envoy-config\temp (
      rmdir /S /Q exhaust\envoy-config\temp > nul
    )
    mkdir exhaust\envoy-config\temp
    (
      echo - op: add
      echo   path: "/spec/configPatches/-"
      echo   value:
      echo     applyTo: VIRTUAL_HOST
      echo     match:
      echo       context: SIDECAR_INBOUND
      echo     patch:
      echo       operation: ADD
      echo       value:
      echo         name: exhaust_service
      echo         domains:
      echo         - "exhaust"
      echo         routes:
      echo         - match:
      echo             prefix: "/"
      echo           route:
      echo             cluster: outbound^|80^|^|!app_userInput_deployment!-exhaust-service.%app_userInput_namespace%.svc.cluster.local
    ) > exhaust\envoy-config\temp\envoy-patch.yaml
    (
      echo apiVersion: kustomize.config.k8s.io/v1beta1
      echo kind: Kustomization
      echo resources:
      echo - resources.yaml
      echo patches:
      echo   - path: envoy-patch.yaml
      echo     target:
      echo       group: networking.istio.io
      echo       version: v1alpha3
      echo       kind: EnvoyFilter
      echo       name: !app_userInput_deployment!-cloudactivedefensefilter

    ) > exhaust\envoy-config\temp\kustomization.yaml
    (
      echo @echo off
      echo set dir=%~dp0
      echo kubectl get envoyfilter !app_userInput_deployment!-cloudactivedefensefilter -n %app_userInput_namespace% -o yaml ^> %%dir%%\exhaust\envoy-config\temp\resources.yaml
      echo kubectl apply -k %%dir%%\exhaust\envoy-config\temp
      echo del "%%dir%%\exhaust\envoy-config\temp\resources.yaml"
    ) > exhaust\envoy-config\temp\kustomize.bat

    call .\exhaust\envoy-config\temp\kustomize.bat > nul 2> nul
    rmdir /S /Q exhaust\envoy-config\temp
    del exhaust\values_tmp.yaml
  exit /B
:installLoki
  echo Loki is missing, deploying it 🚀

  set loki_default_namespace=log-sink
  set /p loki_userInput_namespace="In what namespace to install loki (default: !loki_default_namespace!): "

  if not defined loki_userInput_namespace set loki_userInput_namespace=!loki_default_namespace!
  for /f "tokens=*" %%i in ('kubectl get clusterrole ^| findstr grafana-app-clusterrole') do set grafana_clusterrole=%%i
  if defined grafana_clusterrole (
    kubectl delete clusterrole grafana-app-clusterrole > nul
  )
  for /f "tokens=*" %%i in ('kubectl get clusterrolebinding ^| findstr grafana-app-clusterrolebinding') do set "grafana_clusterrolebinding=%%i"
  if defined grafana_clusterrolebinding (
    kubectl delete clusterrolebinding grafana-app-clusterrolebinding > nul
  )
  for /f "tokens=*" %%i in ('kubectl get clusterrole ^| findstr loki-app-clusterrole') do set loki_clusterrole=%%i
  if defined loki_clusterrole (
    kubectl delete clusterrole loki-app-clusterrole > nul
  )
  for /f "tokens=*" %%i in ('kubectl get clusterrolebinding ^| findstr loki-app-clusterrolebinding') do set "loki_clusterrolebinding=%%i"
  if defined loki_clusterrolebinding (
    kubectl delete clusterrolebinding loki-app-clusterrolebinding > nul
  )

  helm repo add grafana https://grafana.github.io/helm-charts > nul
  helm repo update > nul
  helm upgrade --install --create-namespace -n !loki_userInput_namespace! loki-app grafana/loki -f ./telemetry/loki-values.yaml > nul
  helm upgrade --install --create-namespace -n !loki_userInput_namespace! grafana-app grafana/grafana -f ./telemetry/grafana-values.yaml > nul

  echo namespace: "!loki_userInput_namespace!" > telemetry\values_tmp.yaml
  helm install -f telemetry/values_tmp.yaml telemetry telemetry > nul 2> nul
  del telemetry\values_tmp.yaml

  timeout /t 2 /nobreak > nul
  kubectl get secret -n !loki_userInput_namespace! grafana-app -o jsonpath="{.data.admin-password}" > temp.b64
  certutil -decode temp.b64 temp.txt > nul
  set /p decoded_password=<temp.txt

  for /F "delims=" %%i in ('kubectl get virtualservice -n !loki_userInput_namespace! -o jsonpath^="{.items[0].spec.hosts[0]}"') do set "loki_url=%%i"
  
  echo To access loki dashboard, go to: !loki_url!
  echo Use these credentials: admin/!decoded_password!
  del temp.b64 temp.txt
  exit /B
:installTelemetry
  echo Telemetry module is missing, adding it 📦️
  kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-manager.yaml > nul
  kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-default-cr.yaml -n kyma-system > nul
  for /f "tokens=* delims=" %%i in ('kubectl get kyma default -n kyma-system -o jsonpath^="{.spec.modules}" ^| findstr telemetry') do set telemetry_module=%%i
  if not defined telemetry_module (
    set "json_patch=[{\"op\":\"add\",\"path\":\"/spec/modules/-\",\"value\":{\"name\":\"telemetry\"}}]"
    kubectl patch kyma default -n kyma-system --type=json --patch=!json_patch! > nul
  )
  exit /B

:installWasm
  set init_default_image=ghcr.io/sap/init:latest
  set /p init_userInput_image="Specify if you want to use a custom image for wasm (Press enter to skip): "
  if not defined init_userInput_image set init_userInput_image=!init_default_image!
  for /f "tokens=* delims=" %%i in ('kubectl get jobs -n !app_userInput_namespace! 2^>nul ^| findstr init-job') do set wasm_up=%%i
  if defined wasm_up (
    for /f "tokens=* delims=" %%i in ('kubectl get jobs init-job -n !app_userInput_namespace! -o jsonpath^="{.status.succeeded}" 2^> nul') do set wasm_health=%%i
    if "%wasm_health%" == "" (
      kubectl delete job init-job -n !app_userInput_namespace! > nul
    )
  )
  
  (echo namespace: "%app_userInput_namespace%"
  echo initimage: "!init_userInput_image!") > wasm\values_tmp.yaml
  helm upgrade --install -f wasm\values_tmp.yaml wasm-%app_userInput_namespace% wasm > nul
  del wasm\values_tmp.yaml
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
  echo.
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