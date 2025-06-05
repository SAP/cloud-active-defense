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

## 1. Setup install
Before installing, you want to change some values in [values.yaml](./values.yaml)
The values.yaml file is where all the variables are stored for the install and where you will have to set the missing ones

### For global:
You will have to set
- `db_user` with the database user you want, a default one will be set if not changed
- `db_password` with a secure password, a default one will be set if not changed (**not recommended**)
- `kyma_domain` with the correct kyma domain provided (e.g. `c-28e44bf.kyma.ondemand.com`)

### For controlpanel_api:
You will only have to set
- `deploymentmanager_db_password` with a secure password, a default one will be set if not changed (**not recommended**)
Please use the same password set for deployment-manager chart (if already set)

## 2. Install

Now that you set all the values, you only have to run this to install everything at once:
```shell
helm install controlpanel .
```

You can also install each helm chart separately to have more control over it, but it is not necessary
To do that you must set all the values specified before but in it's own helm chart values