#!/bin/bash

main() {
  echo
  echo "Setting up install 🧑‍🔧"

  if [[ -z "${KUBECONFIG}" ]]; then
    ask_kubeconfig_path
  fi

  installServiceAccount
  installClusterRole
  installClusterRoleBinding
  generate_kubeconfig
}

ask_kubeconfig_path() {
  while true; do
    echo -n "Please provide the full path of your kubeconfig: "
    read -r kubeconfig_userInput_path
    if [[ -z "$kubeconfig_userInput_path" ]]; then
      continue
    fi
    if [[ ! -f "$kubeconfig_userInput_path" ]]; then
      echo "File doesn't exist."
      continue
    fi
    export KUBECONFIG="$kubeconfig_userInput_path"
    break
  done
}

installServiceAccount() {
  if kubectl get serviceaccount | grep -q deployment-manager; then
    echo "Deleting existing service account"
    kubectl delete serviceaccount deployment-manager > /dev/null
  else
    echo "Creating service account 🔧"
  fi
  kubectl create serviceaccount deployment-manager > /dev/null
  kubectl label serviceaccount deployment-manager app.kubernetes.io/managed-by=deployment-manager-install > /dev/null
}

installClusterRole() {
  if ! kubectl get clusterrole | grep -q deployment-manager; then
    echo "Creating cluster role 🔧"
    kubectl apply -f - <<EOF > /dev/null
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-manager
rules:
- verbs:
   - create
   - get
  apiGroups:
   - ''
   - operator.kyma-project.io
  resources:
   - persistentvolumeclaims
   - telemetries
- verbs:
   - create
  apiGroups:
   - batch
   - ''
   - telemetry.kyma-project.io
  resources:
   - jobs
   - services
   - logpipelines
- verbs:
   - create
   - patch
   - get
  apiGroups:
   - networking.istio.io
   - ''
  resources:
   - envoyfilters
   - secrets
- verbs:
   - get
   - list
  apiGroups:
   - ''
   - apps
   - operator.kyma-project.io
  resources:
   - namespaces
   - deployments
   - kymas
- verbs:
   - patch
  apiGroups:
   - operator.kyma-project.io
   - apps
  resources:
   - kymas
   - deployments
EOF
    kubectl label clusterrole deployment-manager app.kubernetes.io/managed-by=deployment-manager-install > /dev/null
  fi
}

installClusterRoleBinding() {
  if ! kubectl get clusterrolebinding | grep -q deployment-manager-binding; then
    echo "Creating cluster role binding 🔧"
    kubectl create clusterrolebinding deployment-manager-binding --clusterrole=deployment-manager --serviceaccount=default:deployment-manager > /dev/null
    kubectl label clusterrolebinding deployment-manager-binding app.kubernetes.io/managed-by=deployment-manager-install > /dev/null
  fi
}

requestToken() {
  token=$(kubectl create token deployment-manager --duration=8766h)
  if [[ $? -ne 0 ]]; then
    echo "Failed to create token, please check your service account and try again."
    exit 1
  fi
  export serviceAccount_token="$token"
}

generate_kubeconfig() {
  requestToken
  if [[ -z "${serviceAccount_token:-}" ]]; then
    echo "Failed to create token, please check your service account and try again."
    exit 1
  fi

  TOKEN="${serviceAccount_token}"
  CLUSTER_NAME=$(kubectl config view --minify -o jsonpath="{.contexts[0].context.cluster}")
  SERVER=$(kubectl config view --minify -o jsonpath="{.clusters[0].cluster.server}")
  CA_DATA=$(kubectl config view --minify --raw -o jsonpath="{.clusters[0].cluster.certificate-authority-data}")

  if [[ -z "$TOKEN" || -z "$CLUSTER_NAME" || -z "$SERVER" || -z "$CA_DATA" ]]; then
    echo "Error: Cannot generate kubeconfig"
    exit 1
  fi
  
  cat <<EOF > kubeconfig.yaml
apiVersion: v1
kind: Config
current-context: deployment-manager-token
users:
- name: deployment-manager-token
  user:
    token: $TOKEN
clusters:
- name: $CLUSTER_NAME
  cluster:
    certificate-authority-data: $CA_DATA
    server: $SERVER
contexts:
- context:
    cluster: $CLUSTER_NAME
    user: deployment-manager-token
    namespace: default
  name: deployment-manager-token
EOF

  echo "Kubeconfig generated successfully! 🎉"
  echo "This kubeconfig is valid for 1 year, to renew it run the script again."
  echo "You can either use it with deployment-manager API or upload it into Cloud Active Defense controlpanel (recommanded)."
}

main