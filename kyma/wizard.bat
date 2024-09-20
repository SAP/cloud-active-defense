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

  echo Looking for Configmanager 🔍
  helm list | findstr configmanager > nul
  if %errorlevel% equ 0 (
    echo Configmanager is already deployed ✅
  ) else (
    echo Configmanager is missing, deploying it 🚀
    helm install configmanager configmanager > nul
  )
  echo.

  echo Looking for Telemetry module 🔍
  kubectl get deployment telemetry-manager -n kyma-system | findstr telemetry-manager > nul 2> nul && kubectl get telemetry default -n kyma-system | findstr default > nul 2> nul
  if %errorlevel% equ 0 (
    echo Telemetry module is already added ✅
  ) else (
    echo Telemetry module is missing, adding it 📦️
    kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-manager.yaml > nul
    kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-default-cr.yaml -n kyma-system > nul
  )
  echo.

  echo Looking for Loki 🔍
  helm list | findstr telemetry > nul
  if %errorlevel% equ 0 (
    echo Loki is already deployed ✅
  ) else (
    echo Loki is missing, deploying it 🚀

    set loki_default_namespace=log-sink
    set /p loki_userInput_namespace="In what namespace to install loki (default: !loki_default_namespace!): "
    if not defined loki_userInput_namespace set loki_userInput_namespace=!loki_default_namespace!
    for /f "tokens=*" %%i in ('kubectl get clusterrole ^| findstr grafana-clusterrole') do set grafana_clusterrole=%%i
    if defined grafana_clusterrole (
      kubectl delete clusterrole grafana-clusterrole > nul
    )
    for /f "tokens=*" %%i in ('kubectl get clusterrolebinding ^| findstr grafana-clusterrolebinding') do set "grafana_clusterrolebinding=%%i"
    if defined grafana_clusterrolebinding (
      kubectl delete clusterrolebinding grafana-clusterrolebinding > nul
    )

    helm repo add grafana https://grafana.github.io/helm-charts > nul
    helm repo update > nul
    helm upgrade --install --create-namespace -n !loki_userInput_namespace! loki grafana/loki -f ./telemetry/loki-values.yaml > nul
    helm upgrade --install --create-namespace -n !loki_userInput_namespace! grafana grafana/grafana -f ./telemetry/grafana-values.yaml > nul

    echo namespace: "!loki_userInput_namespace!" > telemetry\values_tmp.yaml
    helm install -f telemetry/values_tmp.yaml telemetry telemetry > nul 2> nul
    del telemetry\values_tmp.yaml
    kubectl get secret -n !loki_userInput_namespace! grafana -o jsonpath="{.data.admin-password}" > temp.b64
    certutil -decode temp.b64 temp.txt > nul
    set /p decoded_password=<temp.txt

    set "jsonpath={.items[0].spec.hosts[0]}"
    for /F "delims=" %%i in ('kubectl get virtualservice -n !loki_userInput_namespace! -o jsonpath^="!jsonpath!"') do set "loki_url=%%i"
    
    echo To access loki dashboard, go to: !loki_url!
    echo Use these credentials: admin/!decoded_password!
    del temp.b64 temp.txt
  )
  echo.

  set app_default_namespace=demo-ns
  set /p app_userInput_namespace=In what namespace to install your app: 
  if not defined app_userInput_namespace set app_userInput_namespace=%app_default_namespace%

  echo Deploying wasm in %app_userInput_namespace% 🚀
  for /f "tokens=* delims=" %%A in ('helm list ^| findstr wasm-%app_userInput_namespace%') do set "wasmResult=%%A"
  if not "%wasmResult%"=="" (
    echo Wasm is already deployed ✅
  ) else (
    set init_default_image=ghcr.io/sap/init:latest
    set /p init_userInput_image="Specify if you want to use a custom image for wasm (Press enter to skip): "
    if not defined init_userInput_image set init_userInput_image=!init_default_image!
    (echo namespace: "%app_userInput_namespace%"
    echo initimage: "!init_userInput_image!") > wasm\values_tmp.yaml
    helm install -f wasm\values_tmp.yaml wasm-%app_userInput_namespace% wasm > nul
    del wasm\values_tmp.yaml
  )
  echo.

  call :ask_app_directory
  cmd /c exit 0
  if "%app_userInput_directory%"=="myapp" (
    echo Deploying myapp demo in %app_userInput_namespace% 🚀
    for /f "tokens=* delims=" %%A in ('helm list ^| findstr myapp-%app_userInput_namespace%') do set "myappResult=%%A"
    if not "!myappResult!"=="" (
      echo Myapp is already deployed ✅ 
    ) else (
      (echo replicaCount: 1
      echo namespace: "%app_userInput_namespace%"
      echo image: "ghcr.io/sap/myapp:latest") > myapp\values_tmp.yaml
      helm install -f myapp\values_tmp.yaml myapp-%app_userInput_namespace% myapp > nul
      del myapp\values_tmp.yaml
    )
  ) else (
    call :ask_deployment_name
    for /f "tokens=* delims=" %%A in ('helm list ^| findstr !app_userInput_deployment!-%app_userInput_namespace%') do set "deploymentResult=%%A"
    if "!deploymentResult!"=="" (
      echo Deploying !app_userInput_deployment! in %app_userInput_namespace% 🚀
      helm install !app_userInput_deployment!-%app_userInput_namespace% %app_userInput_directory% > nul
    ) else (
      echo Updating !app_userInput_deployment! in %app_userInput_namespace% 🔄️
      helm upgrade !app_userInput_deployment!-%app_userInput_namespace% %app_userInput_directory% > nul
    )
  )
  call :apply_envoyreconfig
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
    echo  - applyTo: CLUSTER
    echo    match:
    echo      context: SIDECAR_OUTBOUND
    echo    patch:
    echo      operation: ADD
    echo      value:
    echo        name: "configmanager"
    echo        type: STRICT_DNS
    echo        lb_policy: ROUND_ROBIN
    echo        load_assignment:
    echo          cluster_name: configmanager
    echo          endpoints:
    echo          - lb_endpoints:
    echo            - endpoint:
    echo                address:
    echo                  socket_address:
    echo                    address: configmanager-service
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
  kubectl wait --for=condition=complete job/init-job -n %app_userInput_namespace% > nul
  if %errorlevel% equ 0 (
    helm upgrade !app_userInput_deployment!-%app_userInput_namespace% %app_userInput_directory% --post-renderer .\envoy-config\temp\kustomize.bat --dry-run >nul
    rmdir /S /Q envoy-config\temp

    echo Done ✅
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