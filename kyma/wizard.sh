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

  echo "Looking for deployment manager 🔍"

  if ! helm list | grep -q deployment-manager; then
    installDeploymentManager
  else
    if ! kubectl get deployment deployment-manager -n controlpanel &>/dev/null; then
      echo "Deployment manager deployment is missing, please check deployment 🕵️"
    else
      deployment_manager_health=$(kubectl get deployment deployment-manager -n controlpanel -o jsonpath="{.status.availableReplicas}")
      if [[ -z "$deployment_manager_health" || "$deployment_manager_health" -le 0 ]]; then
        echo "Deployment manager is unhealthy, please check deployment 🤒"
      else
        echo "Deployment manager is already deployed ✅"
      fi
    fi
  fi

  echo "Cloud Active Defense is deployed! 💫"
}

ask_kubeconfig_path() {
  read -p "Please provide the full path of your kubeconfig: " kubeconfig_userInput_path
  if [[ -z "${kubeconfig_userInput_path}" || ! -f "${kubeconfig_userInput_path}" ]]; then
    echo "File doesn't exist"
    ask_kubeconfig_path
  fi
  export KUBECONFIG="${kubeconfig_userInput_path}"
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

  deployment_manager_db_password=$(generate_random_string 30)

  cat <<EOF > controlpanel-api/values_tmp.yaml
namespace: "controlpanel"
controlpanel:
  replicaCount: 1
  image: "ghcr.io/sap/controlpanel-api:latest"
  front_url: "$front_url"
  deployment_manager_url: http://deployment-manager-service
  db_user: "$db_user"
  db_password: "$db_password"
deployment_manager:
  image: "ghcr.io/sap/deployment-manager:latest"
  db_password: "$deployment_manager_db_password"
db_port: 5432
db_host: controlpanel-db-service
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
installDeploymentManager() {
  echo "Deploying Deployment manager 🚀"
  helm install deployment-manager deployment-manager > /dev/null
}
main