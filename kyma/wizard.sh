#!/bin/bash

set -o pipefail  # Prevent errors in a pipeline from being masked

main() {
  echo
  echo "Cloud Active Defense wizard 🧙‍♂️"
  echo "------------------------------"
  echo

  if [[ -z "${KUBECONFIG}" ]]; then
    ask_kubeconfig_path
  fi

  echo "Looking for controlpanel API 🔍"
  
  # Check if the controlpanel-api is listed
  cp_api_result=$(helm list --short | grep -w "controlpanel-api")
  
  if [ -z "$cp_api_result" ]; then
    install_controlpanel
  else
    # Check if controlpanel API deployment exists
    controlpanel_up=$(kubectl get deployment -n controlpanel | grep -w "controlpanel-api")
    
    if [ -z "$controlpanel_up" ]; then
      echo "Controlpanel API deployment is missing, please check deployment 🕵️"
    else
      # Check if controlpanel API is healthy
      controlpanel_health=$(kubectl get deployment controlpanel-api -n controlpanel -o jsonpath="{.status.availableReplicas}")
      
      if [ -z "$controlpanel_health" ] || [ "$controlpanel_health" -eq 0 ]; then
        echo "Controlpanel API is unhealthy, please check deployment 🤒"
      else
        echo "Controlpanel API is already deployed ✅"
      fi
    fi
  fi
  echo

  # Check if controlpanel-front is listed
  cp_front_result=$(helm list --short | grep -w "controlpanel-front")
  
  if [ -z "$cp_front_result" ]; then
    ask_controlpanel_front
  fi

  echo "Looking for Telemetry module 🔍"
  if ! kubectl get deployment -n kyma-system | grep -q telemetry-manager; then
    installTelemetry
  else
    echo "Telemetry module is already added ✅"
  fi
  echo

  echo "Looking for Loki 🔍"
  if (helm list | grep -q telemetry) && (helm list -A | grep -q loki-app) && (helm list -A | grep -q grafana-app); then
    echo "Loki is already deployed ✅"
  else
    installLoki
  fi
  echo

  app_default_namespace="demo-ns"
  read -p "In what namespace to install your app: " app_userInput_namespace
  app_userInput_namespace=${app_userInput_namespace:-$app_default_namespace}

  echo "Deploying wasm in ${app_userInput_namespace} 🚀"
  if helm list | grep -q -E "(^|[[:space:]])wasm-${app_userInput_namespace}([[:space:]]|$)"; then
    if kubectl get jobs -n "${app_userInput_namespace}" | grep -q init-job; then
      wasm_health=$(kubectl get job init-job -n "$app_userInput_namespace" -o jsonpath="{.status.conditions[?(@.status=='True')].type}")
      if echo "${wasm_health}" | grep -q "Complete"; then
        echo "Wasm is already deployed ✅"
      else
        echo "Wasm is unhealthy, redeploying it 🚑"
        installWasm
        echo "Done ✅"
      fi
    else
      echo "Wasm is unhealthy, redeploying it 🚑"
      installWasm
      echo "Done ✅"
    fi
  else
    if kubectl get namespace | grep -q -E "(^|[[:space:]])${app_userInput_namespace}([[:space:]]|$)"; then
      echo "Cannot install wasm, namespace '${app_userInput_namespace}'" already exists
      echo "exiting..."
      exit 1
    else
      installWasm
    fi
  fi
  echo

  ask_app_directory
  if [[ "${app_userInput_directory}" == "myapp" ]]; then
    echo "Deploying myapp demo in ${app_userInput_namespace} 🚀"
    if helm list | grep -q "myapp-${app_userInput_namespace}"; then
      if kubectl get deployments -n "${app_userInput_namespace}" 2>/dev/null | grep -q myapp; then
        myapp_health=$(kubectl get deployment myapp -n "${app_userInput_namespace}" -o jsonpath="{.status.availableReplicas}")
        if [[ ${myapp_health} == "" ]]; then
          echo "Myapp is unhealthy, redeploying it 🚑"
          cat <<EOF > myapp/values_tmp.yaml
replicaCount: 1
namespace: "${app_userInput_namespace}"
image: "ghcr.io/sap/myapp:latest"
EOF
          helm upgrade myapp-"${app_userInput_namespace}" myapp -f myapp/values_tmp.yaml > /dev/null
          rm myapp/values_tmp.yaml
          apply_envoyreconfig
        else
          echo "Myapp is already deployed ✅"
          app_userInput_deployment="myapp"
        fi
      fi
    else
      cat <<EOF > myapp/values_tmp.yaml
replicaCount: 1
namespace: "${app_userInput_namespace}"
image: "ghcr.io/sap/myapp:latest"
EOF
      helm install -f myapp/values_tmp.yaml "myapp-${app_userInput_namespace}" myapp > /dev/null
      rm myapp/values_tmp.yaml
      apply_envoyreconfig
    fi
  else
    ask_deployment_name
    if helm list | grep -q "${app_userInput_deployment}-${app_userInput_namespace}"; then
      if kubectl get deployments -n "${app_userInput_namespace}" > /dev/null 2>/dev/null | grep "${app_userInput_deployment}"; then
        app_health=$(kubectl get deployment "${app_userInput_deployment}" -n "${app_userInput_namespace}" -o jsonpath="{.status.availableReplicas}")
        if [[ ${app_health} == "" ]]; then
          echo "Cannot update, ${app_userInput_deployment} is unhealthy 🤒"
          echo "exiting..."
          exit 1
        else
          echo "Updating ${app_userInput_deployment} in ${app_userInput_namespace} 🔄️"
          helm upgrade "${app_userInput_deployment}-${app_userInput_namespace}" "${app_userInput_directory}" > /dev/null
          apply_envoyreconfig
        fi
      fi
    else
      echo "Deploying ${app_userInput_deployment} in ${app_userInput_namespace} 🚀"
      helm install "${app_userInput_deployment}-${app_userInput_namespace}" "${app_userInput_directory}" > /dev/null
      apply_envoyreconfig
    fi
  fi
  echo

  if ! helm list | grep -q "${app_userInput_deployment}-${app_userInput_namespace}-clone"; then
    askClone
  fi

  if ! helm list | grep -q "${app_userInput_deployment}-${app_userInput_namespace}-exhaust"; then
    askExhaust
  fi
  echo "Cloud Active Defense is deployed! 💫"
}

ask_app_directory() {
  local app_default_directory="myapp"
  read -p "Please give the full path of your app directory (Press enter to install demo app): " app_userInput_directory
  app_userInput_directory=${app_userInput_directory:-$app_default_directory}
  if [[ ! -d "${app_userInput_directory}" ]]; then
    echo "The given path doesn't exist"
    ask_app_directory
  elif [[ ! -f "${app_userInput_directory}/Chart.yaml" ]]; then
    echo "Cannot find Chart.yaml file of your helm chart in '${app_userInput_directory}'"
    ask_app_directory
  elif [[ ! -d "${app_userInput_directory}/templates" ]]; then
    echo "Cannot find templates/ directory of your helm chart in '${app_userInput_directory}'"
    ask_app_directory
  elif [[ ! -f "${app_userInput_directory}/values.yaml" ]]; then
    echo "Cannot find values.yaml file of your helm chart in '${app_userInput_directory}'"
    ask_app_directory
  fi
}

ask_deployment_name() {
  read -p "What is the name of your deployment: " app_userInput_deployment
  if [[ -z "${app_userInput_deployment}" ]]; then
    echo "Please provide the name of your deployment"
    ask_deployment_name
  fi
}

ask_kubeconfig_path() {
  read -p "Please provide the full path of your kubeconfig: " kubeconfig_userInput_path
  if [[ -z "${kubeconfig_userInput_path}" || ! -f "${kubeconfig_userInput_path}" ]]; then
    echo "File doesn't exist"
    ask_kubeconfig_path
  fi
  export KUBECONFIG="${kubeconfig_userInput_path}"
}

apply_envoyreconfig() {
  if [[ -z "${app_userInput_deployment}" ]]; then
    app_userInput_deployment="myapp"
    app_userInput_directory="myapp"
    kubectl label deployment "${app_userInput_deployment}" -n "${app_userInput_namespace}" protects="${app_userInput_deployment}" --overwrite > /dev/null
  fi
  rm -rf envoy-config/temp 2>/dev/null
  mkdir -p envoy-config/temp
  envoy_apiKey=$(kubectl get secret -n controlpanel envoy-api-key-secret -o jsonpath="{.data.ENVOY_API_KEY}" | base64 --decode)
  cat <<EOF > envoy-config/temp/envoy-reconfig.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ${app_userInput_deployment}-cloudactivedefensefilter
  namespace: ${app_userInput_namespace}
spec:
  workloadSelector:
    labels:
      protects: ${app_userInput_deployment}
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.wasm
        typed_config:
          '@type': type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
          value:
            config:
              rootId: "my_root_id"
              vmConfig:
                code:
                  local:
                    filename: var/local/lib/wasm/sundew.wasm
                runtime: envoy.wasm.runtime.v8
                vmId: cad-filter
              configuration:
                '@type': type.googleapis.com/google.protobuf.StringValue
                value: |
                  {
                    "ENVOY_API_KEY": "${envoy_apiKey}"
                  }
  - applyTo: CLUSTER
    match:
      context: SIDECAR_OUTBOUND
    patch:
      operation: ADD
      value:
        name: "controlpanel-api"
        type: STRICT_DNS
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: controlpanel-api
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: controlpanel-api-service
                    port_value: 80
EOF

  cat <<EOF > envoy-config/temp/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${app_userInput_deployment}
  namespace: ${app_userInput_namespace}
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/userVolume: '{"sundew":{"persistentVolumeClaim":{"claimName":"wasm-data"}}}'
        sidecar.istio.io/userVolumeMount: '{"sundew":{"mountPath":"var/local/lib/wasm","readOnly":true}}'
EOF

  cat <<EOF > envoy-config/temp/kustomize.sh
#!/bin/bash
cat > envoy-config/temp/resources.yaml
kubectl kustomize envoy-config/temp
rm envoy-config/temp/resources.yaml
EOF
  chmod +x envoy-config/temp/kustomize.sh
  cp envoy-config/kustomization.yaml envoy-config/temp/kustomization.yaml

  echo "Waiting for wasm to be deployed... ⏳"
  kubectl wait --for=condition=complete job/init-job --timeout=10s -n "${app_userInput_namespace}" > /dev/null 2>/dev/null
  if [[ $? -eq 0 ]]; then
    helm upgrade "${app_userInput_deployment}-${app_userInput_namespace}" "${app_userInput_directory}" --post-renderer ./envoy-config/temp/kustomize.sh > /dev/null
    rm -rf envoy-config/temp
    echo "App successfully installed ✅"
    app_url=$(kubectl get virtualservice -n "${app_userInput_namespace}" -o jsonpath="{.items[0].spec.hosts[0]}" | grep "${app_userInput_deployment}")
    echo "To access your app, go to: ${app_url}"
  else
    echo "Something went wrong, wasm is unhealthy 🤒"
    read -p "Do you want to continue the install (Y/N) ? " wasm_health_userInput
    if [[ "$wasm_health_userInput" == "n" ]] || [[ "$wasm_health_userInput" == "N" ]]; then
      exit 1
    fi
  fi
}

askClone() {
  read -p "Do you want to install a clone app (Y/N) ? " clone_userInput
  case "${clone_userInput}" in
    [yY])
      installClone
      ;;
    [nN])
      return
      ;;
    *)
      askClone
      ;;
  esac
}

installClone() {
  echo "Deploying clone in ${app_userInput_namespace} 🚀"
  if [[ -z "${app_userInput_deployment}" || "${app_userInput_deployment}" == "myapp" ]]; then
    clone_userInput_image="ghcr.io/sap/clone:latest"
  else
    read -p "Please provide the image of your clone: " clone_userInput_image
  fi

  cat <<EOF > clone/values_tmp.yaml
replicaCount: 1
namespace: "${app_userInput_namespace}"
image: "${clone_userInput_image}"
deploymentName: "${app_userInput_deployment}"
EOF

  helm install -f clone/values_tmp.yaml "${app_userInput_deployment}-${app_userInput_namespace}-clone" clone > /dev/null

  rm -rf clone/envoy-config/temp 2>/dev/null
  mkdir -p clone/envoy-config/temp
  cat <<EOF > clone/envoy-config/temp/envoy-patch.yaml
- op: add
  path: "/spec/configPatches/-"
  value:
    applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: ADD
      value:
        name: clone_service
        domains:
        - "clone"
        routes:
        - match:
            prefix: "/"
          route:
            cluster: outbound|80||${app_userInput_deployment}-clone-service.${app_userInput_namespace}.svc.cluster.local
EOF

  cat <<EOF > clone/envoy-config/temp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- resources.yaml
patches:
  - path: envoy-patch.yaml
    target:
      group: networking.istio.io
      version: v1alpha3
      kind: EnvoyFilter
      name: ${app_userInput_deployment}-cloudactivedefensefilter
EOF

  cat <<EOF > clone/envoy-config/temp/kustomize.sh
#!/bin/bash
dir="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

kubectl get envoyfilter $app_userInput_deployment-cloudactivedefensefilter -n $app_userInput_namespace -o yaml > "\$dir/resources.yaml"
kubectl apply -k "\$dir"
rm -f "\$dir/resources.yaml"
EOF

  chmod +x clone/envoy-config/kustomize.sh

  clone/envoy-config/temp/kustomize.sh > /dev/null 2> /dev/null
  rm -rf clone/envoy-config/temp
  rm clone/values_tmp.yaml
}

askExhaust() {
  read -p "Do you want to install an exhaust app (Y/N) ? " exhaust_userInput
  case "${exhaust_userInput}" in
    [yY])
      installExhaust
      ;;
    [nN])
      return
      ;;
    *)
      askExhaust
      ;;
  esac
}

installExhaust() {
  echo "Deploying exhaust in ${app_userInput_namespace} 🚀"
  if [[ -z "${app_userInput_deployment}" || "${app_userInput_deployment}" == "myapp" ]]; then
    exhaust_userInput_image="ghcr.io/sap/exhaust:latest"
  else
    read -p "Please provide the image of your exhaust: " exhaust_userInput_image
  fi

  cat <<EOF > exhaust/values_tmp.yaml
replicaCount: 1
namespace: "${app_userInput_namespace}"
image: "${exhaust_userInput_image}"
deploymentName: "${app_userInput_deployment}"
EOF

  helm install -f exhaust/values_tmp.yaml "${app_userInput_deployment}-${app_userInput_namespace}-exhaust" exhaust > /dev/null

  rm -rf exhaust/envoy-config/temp 2>/dev/null
  mkdir -p exhaust/envoy-config/temp
  cat <<EOF > exhaust/envoy-config/temp/envoy-patch.yaml
- op: add
  path: "/spec/configPatches/-"
  value:
    applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: ADD
      value:
        name: exhaust_service
        domains:
        - "exhaust"
        routes:
        - match:
            prefix: "/"
          route:
            cluster: outbound|80||${app_userInput_deployment}-exhaust-service.${app_userInput_namespace}.svc.cluster.local
EOF

  cat <<EOF > exhaust/envoy-config/temp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- resources.yaml
patches:
  - path: envoy-patch.yaml
    target:
      group: networking.istio.io
      version: v1alpha3
      kind: EnvoyFilter
      name: ${app_userInput_deployment}-cloudactivedefensefilter
EOF

  cat <<EOF > exhaust/envoy-config/temp/kustomize.sh
#!/bin/bash
dir="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"

kubectl get envoyfilter $app_userInput_deployment-cloudactivedefensefilter -n $app_userInput_namespace -o yaml > "\$dir/resources.yaml"
kubectl apply -k "\$dir"
rm -f "\$dir/resources.yaml"
EOF

  chmod +x exhaust/envoy-config/temp/kustomize.sh

  exhaust/envoy-config/temp/kustomize.sh > /dev/null 2> /dev/null
  rm -rf exhaust/envoy-config/temp
  rm exhaust/values_tmp.yaml
}

installLoki() {
  echo "Loki is missing, deploying it 🚀"

  loki_default_namespace="log-sink"
  read -p "In what namespace to install loki (default: ${loki_default_namespace}): " loki_userInput_namespace
  loki_userInput_namespace=${loki_userInput_namespace:-$loki_default_namespace}

  if kubectl get clusterrole | grep grafana-app-clusterrole > /dev/null; then
    kubectl delete clusterrole grafana-app-clusterrole > /dev/null
  fi

  if kubectl get clusterrolebinding | grep grafana-app-clusterrolebinding > /dev/null; then
    kubectl delete clusterrolebinding grafana-app-clusterrolebinding > /dev/null
  fi

  if kubectl get clusterrole | grep loki-app-clusterrole > /dev/null; then
    kubectl delete clusterrole loki-app-clusterrole > /dev/null
  fi

  if kubectl get clusterrolebinding | grep loki-app-clusterrolebinding > /dev/null; then
    kubectl delete clusterrolebinding loki-app-clusterrolebinding > /dev/null
  fi

  helm repo add grafana https://grafana.github.io/helm-charts > /dev/null
  helm repo update > /dev/null
  helm upgrade --install --create-namespace -n "${loki_userInput_namespace}" loki-app grafana/loki -f ./telemetry/loki-values.yaml > /dev/null
  helm upgrade --install --create-namespace -n "${loki_userInput_namespace}" grafana-app grafana/grafana -f ./telemetry/grafana-values.yaml > /dev/null

  echo "namespace: \"${loki_userInput_namespace}\"" > telemetry/values_tmp.yaml
  helm install -f telemetry/values_tmp.yaml telemetry telemetry > /dev/null 2>/dev/null
  rm telemetry/values_tmp.yaml

  sleep 2
  secret=$(kubectl get secret -n "${loki_userInput_namespace}" grafana-app -o jsonpath="{.data.admin-password}")
  decoded_password=$(echo "${secret}" | base64 --decode)

  loki_url=$(kubectl get virtualservice -n "${loki_userInput_namespace}" -o jsonpath="{.items[0].spec.hosts[0]}")
  echo "To access loki dashboard, go to: ${loki_url}"
  echo "Use these credentials: admin/${decoded_password}"
}
installTelemetry() {
  echo "Telemetry module is missing, adding it 📦️"
  kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-manager.yaml > /dev/null
  kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-default-cr.yaml -n kyma-system > /dev/null
  if ! kubectl get kyma default -n kyma-system -o jsonpath="{.spec.modules}" | grep -q 'telemetry'; then
    kubectl patch kyma default -n kyma-system --type=json -p='[{"op": "add", "path": "/spec/modules/-", "value": {"name": "telemetry"}}]' > /dev/null
  fi
}
installWasm(){
  init_default_image="ghcr.io/sap/init:latest"
  read -p "Specify if you want to use a custom image for wasm (Press enter to skip): " init_userInput_image
  init_userInput_image=${init_userInput_image:-$init_default_image}
  
  wasm_health=$(kubectl get job init-job -n "${app_userInput_namespace}" -o jsonpath="{.status.succeeded}" 2>/dev/null)
  if kubectl get jobs -n "${app_userInput_namespace}" 2>/dev/null | grep -q init-job && [[ "${wasm_health}" == "" ]]; then
    kubectl delete job init-job -n "${app_userInput_namespace}" > /dev/null
  fi
  cat <<EOF > wasm/values_tmp.yaml
namespace: "${app_userInput_namespace}"
initimage: "${init_userInput_image}"
EOF

  helm upgrade --install -f wasm/values_tmp.yaml "wasm-${app_userInput_namespace}" wasm > /dev/null
  rm wasm/values_tmp.yaml
}
install_controlpanel() {
  echo "Deploying Controlpanel API 🚀"

  cluster_link=$(kubectl config view --minify -o jsonpath="{.clusters[0].cluster.server}")
  front_url=${cluster_link//api/controlpanel-front}

  read -p "Please provide the username for the database: " db_userInput_user
  read -sp "Please provide the password for the database: " db_userInput_password
  echo
  
  if [[ -z "$db_userInput_user" ]]; then
    db_user=$(generate_random_string 10)
    echo "Username generated: $db_user"
  else
    db_user=$db_userInput_user
  fi
  if [[ -z "$db_userInput_password" ]]; then
    db_password=$(generate_random_string 30)
    echo "Password generated: $db_password"
  else
    db_password=$db_userInput_password
  fi

  envoy_apiKey=$(generate_random_string 65)
  fluentbit_apiKey=$(generate_random_string 65)

  cat <<EOF > controlpanel-api/values_tmp.yaml
replicaCount: 1
namespace: controlpanel
image: "ghcr.io/sap/controlpanel-api:latest"
db_port: 5432
db_host: "controlpanel-db-service"
controlpanel_front_url: "$front_url"
db_user: "$db_user"
db_password: "$db_password"
envoyApiKey: "$envoy_apiKey"
fluentbitApiKey: "$fluentbit_apiKey"
EOF

  helm install -f controlpanel-api/values_tmp.yaml controlpanel-api controlpanel-api > /dev/null
  rm controlpanel-api/values_tmp.yaml
}

ask_controlpanel_front() {
  while true; do
    read -p "Do you want to install controlpanel dashboard (Y/N)? " front_userInput
    case $front_userInput in
      [nN])
        return
        ;;
      [yY])
        install_controlpanel_front
        break
        ;;
      *)
        echo "Please answer Y or N."
        ;;
    esac
  done
}

install_controlpanel_front() {
 echo "Deploying controlpanel dashboard 🚀"
 cluster_link=$(kubectl config view --minify -o jsonpath="{.clusters[0].cluster.server}")
  api_url=${cluster_link//api/controlpanel-api}

  cat <<EOF > controlpanel-front/values_tmp.yaml
replicaCount: 1
namespace: controlpanel
image: "ghcr.io/sap/controlpanel-frontend:latest"
controlpanel_api_url: "$api_url"
EOF

  helm upgrade --install -f controlpanel-front/values_tmp.yaml controlpanel-front controlpanel-front > /dev/null
  rm controlpanel-front/values_tmp.yaml
}
generate_random_string() {
  local length=$1
  local charset="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  local random_string=""
  for (( i=0; i<length; i++ )); do
    local random_index=$((RANDOM % ${#charset}))
    random_string+="${charset:$random_index:1}"
  done
  echo "$random_string"
}
main