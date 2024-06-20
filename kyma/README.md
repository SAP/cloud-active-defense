# Kyma deployment

## Requirements
- To deploy Cloud Active Defense on Kyma you first need either install Kyma on your local machine or use The SAP cloud
    - To install Kyma locally follow [Kyma documentation](https://kyma-project.io/#/02-get-started/01-quick-install)

    - To use Kyma in SAP cloud follow these instructions:
        - [Create an account in SAP cloud](https://developers.sap.com/tutorials/btp-free-tier-account.html) (You can skip final steps from step 9)
        - [Enable Kyma](https://developers.sap.com/tutorials/cp-kyma-getting-started.html)
        - [Connect to remote cluster](https://developers.sap.com/tutorials/cp-kyma-download-cli.html)

- Install helm to manage kubernetes configuration files

If you wish to build and use your own images of the project follow the instructions in each steps


## 1. MyApp

In `values.yaml` you first need to replace the values of `gateway` with the kyma host, you can find it with the api server URL (i.e. `https://api.`==c-8024eca==`.kyma.ondemand.com/`) and if needed the image of myapp in `image` (by defaut it uses the image on github registry)

If you wish to use your own image of myapp, go to `myapp/` directory from the root of the project and build the Dockerfile inside

Then run `helm install myapp ./myapp`

If everything went good, you should be able to navigate to myapp with the link provided in `Api Rules`

## 2. Configmanager

The only thing to replace in `values.yaml` is `configimage` with configmanager image

Also modify the `cad-default.json` with your decoys config or keep the default one

If you wish to use your own image of configmanager, go to `configmanager/` directory from the root of the project and build the Dockerfile inside

Then run ```helm install configmanager ./configmanager```

## 3. Wasm

Same as before you have to replace `initimage` in `values.yaml` with the init image that you can create with the given Dockerfile

If you wish to use your own image of the proxy, build the Dockerfile from `wasm/` directory 

Then run `helm install wasm ./wasm`

## 4. Envoy config

In `envoy-reconfig.yaml` you will have to change few values:

- First you can change `metadata.name` to make it more understable based on your configuration
- Change `metadata.namespace` with the same namespace for steps 1 and 2
- Replace the value in `spec.workloadSelector.labels.app` with the name of your app in step 1
- Change the json at line 32 in `value` with your deployment name and namespace in step 1

Also change `name` and `namespace` in `resources-patch.yaml` so it match step 1 and the previous json

Then run the following command:

For linux:
`helm upgrade myapp ./myapp --post-renderer ./kustomize.sh`
For windows:
`helm upgrade myapp ./myapp --post-renderer ./kustomize.bat`

## 5. Collect logs

To collect logs from the Cloud active defense you have 2 choices: You can either use Fluentbit or Telemetry

- ### Fluentbit

If you wish to connect fluentbit to the proxy to collect alerts logs, go to fluentbit directory, edit the `namespace` value in `values.json`

And set the output in `fluent-bit.conf`, by default it displays the collected logs in fluentbit's console

Then run `helm install fluent ./fluentbit`
___

- ### Telemetry

If you wish to use telemetry instead, first install Telemetry module to Kyma:
```shell
kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-manager.yaml
kubectl apply -f https://github.com/kyma-project/telemetry-manager/releases/latest/download/telemetry-default-cr.yaml -n kyma-system
```

Go to telemetry directory and edit the `namespace` and `appnamespace` (correspond to the namespace where you deployed your app) values in `values.json`

Then run `helm install telemetry ./telemetry`

Now you can see logs in the log-sink pod console

This is just a test, what the pipeline does is sending collected logs to a fluentbit pod that just display them in the console
Different output to the pipeline can be set, see [telemetry documentation](https://kyma-project.io/#/telemetry-manager/user/README)