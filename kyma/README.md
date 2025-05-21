# Kyma deployment

## Requirements
- To deploy Cloud Active Defense on Kyma you first need either install Kyma on your local machine or use SAP BTP cloud
    - To install Kyma locally follow these instructions:
        - Install [k3d](https://k3d.io/v5.6.3/#installation)
        - Follow these steps before setting up Kyma: [Steps for local Kyma](https://github.com/kyma-project/api-gateway/issues/1133)
        - Install Kyma with [Kyma documentation](https://kyma-project.io/#/02-get-started/01-quick-install)(Mandatory modules are Istio and API Gateway)

    - To use Kyma in SAP BTP cloud follow these instructions:
        - [Create an account in SAP cloud](https://developers.sap.com/tutorials/btp-free-tier-account.html) (You can skip final steps from step 9)
        - [Enable Kyma](https://developers.sap.com/tutorials/cp-kyma-getting-started.html)
        - [Connect to remote cluster](https://developers.sap.com/tutorials/cp-kyma-download-cli.html)

- Install [helm](https://helm.sh/docs/intro/install/) to manage kubernetes configuration files


## 1. Controlpanel & Deployment manager

Run the `wizard` script to install the controlpanel & the deployment manager, from there you can manage Cloud Active Defense such as: deploy the proxy to secure your app, create and deploy new decoys, read the logs...

**Linux:**
```shell
bash ./wizard.sh
```
**Windows:**
```
./wizard.bat
```

## 2. Setup your cluster

This step is mandatory it will help the deployment manager to access your cluster to secure your app. This will create a `kubeconfig.yaml` file that you must upload to the controlpanel

To get the kubeconfig file run this command, it will create the file in `kyma` directory (This kubeconfig is available for 1 year)

**Linux:**
```shell
bash ./install.sh
```
**Windows:**
```shell
./install.bat
```

Now that you have the kubeconfig file you must upload it into the controlpanel dashbord. Go to `System` page and click `Upload kubeconfig`
![Controlpanel kubeconfig upload](../assets/controlpanel-upload-kubeconfig.png)

## 3. Secure your app with Cloud Active Defense

### Install demo app (optional)

This step is not necessary to the install, it is only a sample app for demo purpose

```shell
helm install myapp myapp
```

---

To secure your app with Cloud Active Defense you must install your app first. Once this and the cluster setup are done, go back to `System` page and look for your application.
First select the namespace with the select box and then click on the 'protected' switch for your application (deployment) in the list
![Controlpanel select app](../assets/controlpanel-select-app.png)


This step will install everything Cloud Active Defense needs on your cluster:
- A volume with a wasm file (For envoy proxy)
- A EnvoyFilter (The configuration for envoy proxy)
- The Telemetry module to get the proxy logs
- A LogPipeline to ship the logs to the controlpanel dashboard


Voila! Cloud Active Defense is now installed
You can add new decoys to start protecting your application!