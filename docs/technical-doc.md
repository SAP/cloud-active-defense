# Cloud Active Defense

## Envoy
Envoy is a reverse proxy. Upon start, it reads the envoy.yaml config file, which loads the cloud-active-defense.wasm plugin located in `proxy/wasm/`. This plugin requests its decoy configuration from the **Controlpanel API** and injects the specified decoys in the protected app (example: **Myapp**); it can also detect malicious behavior from this decoy configuration.

When Envoy is requesting its decoy config, it needs to pass 2 parameters to the **Controlpanel API** endpoint to fetch the correct config. These two parameters are `namespace` and `application` and are mandatory.

When a malicious behavior is detected, an alert log is sent to the console and the related blocklist actions to the triggered decoy. All of these alerts are fetched by **FluentBit**, which sends them to the **Controlpanel API** and stores them.

The plugin also requests a global config of the application (at the same time as the decoy config) and requests or sends the blocklist of detected malicious sources and performs the specified action in the blocklist.

All **Controlpanel API** endpoints related to Envoy are located at `localhost:8050/configmanager/`; more endpoint documentation can be found in the **Controlpanel API** at [`localhost:8050/api-docs`](http://localhost:8050/api-docs).

### Build

After changes in the Go code, the WASM file must be rebuilt by running these commands in the `proxy/wasm/` directory:
```sh
go mod tidy
tinygo build -o ./cloud-active-defense.wasm -scheduler=none -target=wasi ./main.go
```

For more information, take a look at the wiki: [Build - Wiki](https://github.com/SAP/cloud-active-defense/wiki/Build)

### Envoy config

The app that is protected is referenced in the Envoy config. You can find it in the `clusters` array with the name `web_service`.

In the Envoy config, a variable is set: the Envoy API key (`ENVOY_API_KEY`). This API key is used in the requests to the **Controlpanel API** to fetch the decoy config. This API key must be manually set in the Docker Compose version and auto-generated in the Kyma version.

### Docker Compose

In the Docker Compose version, Envoy is inside a container and redirects requests to the referenced application set in the `cluster` array with the name `web_service`. If a different application needs to be protected, you can change the `address` and `port` values to match the desired application.

In this version, the variable `ENVOY_API_KEY` must be manually set in the Envoy config before building the image or starting Docker Compose. This API key can be anything, but a random 32-character string would be best. You must also set the same API key in the **Controlpanel API**. You can set that directly in the `docker-compose.yaml` file in the `controlpanel-api` service inside environment variables (`ENVOY_API_KEY`).

When Envoy is requesting its decoy config and is running on Docker Compose, the two parameters in the **Controlpanel API** endpoint will both have the value `'default'`, because the Docker Compose version cannot have multiple protected applications. So in this case, it is called 'default'.

### Kyma

In the Kyma version, Envoy is in a sidecar attached to the protected application pod. When a request is made to the application, the traffic passes first through the sidecar. This sidecar is automatically installed in the pod via the **Deployment Manager**. All **Deployment Manager** API endpoints related to Envoy are located at `/envoy/`; more endpoint documentation can be found in the **Deployment Manager** API at `/api-docs`.

In this version, the Envoy config is automatically deployed by the **Deployment Manager** and set with the related information (protected application, variables, clone or exhaust if needed). The variable `ENVOY_API_KEY` is also automatically set in the Envoy config as well as in the **Controlpanel API**.

Envoy can be deployed in multiple applications in the same Kyma cluster; the **Deployment Manager** and the **Controlpanel API** are also able to manage all of them.

When Envoy is requesting its decoy config and is running on Kyma, the two parameters in the **Controlpanel API** endpoint will have values related to where the protected application is deployed on Kyma (Kubernetes). So the first parameter `namespace` will be the current namespace of the application, and the second parameter `application` will be the deployment name of the application. These parameters are automatically fetched and set in the Envoy config by the **Deployment Manager**.

## Controlpanel API
This API will be the decoy manager for **Envoy**, but will also store the decoys and logs in its database, manage "customers" when deployed on Kubernetes, and manage other configurations for different applications. It can be connected to the **Controlpanel Dashboard**.

Authentication in the **Controlpanel API** is managed by **Keycloak**, but some endpoints are protected by API keys (**Envoy**, **FluentBit**, and **Deployment Manager**). Middlewares are built in the API to verify these API keys and their authorizations (`controlpanel/api/middleware`).

All **Controlpanel API** endpoint documentation can be found in the **Controlpanel API** at [`localhost:8050/api-docs`](http://localhost:8050/api-docs).

### Envoy
**Envoy** will send a GET request to the API a few times per minute and update its config accordingly. If running on Docker Compose, 'namespace' and 'application' will both be `default`, thus **Envoy** will always fetch the content of the default config. If running on Kyma, 'namespace' and 'application' will be properly set (with app namespace and deployment name), allowing you to define one configuration per application per namespace.

### Keycloak
The **Controlpanel API** also uses **Keycloak** middleware to secure API routes with an API key generated by the **Keycloak** instance. **Keycloak** mainly manages authentication in the **Controlpanel API** and in the **Controlpanel Dashboard** as well.

The authentication rules of **Keycloak** are located in the **Keycloak** app; you can manage them by logging in to the dashboard: [Keycloak dashboard](http://localhost:8080/admin)

### FluentBit
**FluentBit** will send logs that it fetches from the **Envoy** proxy (alerts, system logs, etc.) to the API (authentication is managed by a **FluentBit** API key). The **Controlpanel API** will then store all these logs in the database.

### Development
For development and debugging, a development image is available. This image works the same as the production one, but it updates the code in real time. This image is not for production use!

### Docker Compose
In this version, a few variables must be changed:
- `POSTGRES_USER`: By default, the value is `'postgres'`, but for security reasons, you should change that to a more secure username. Also, this variable **must** match the Postgres user that has been set in the **Controlpanel DB** in order to connect to the database.
- `POSTGRES_PASSWORD`: Same as `POSTGRES_USER`, the value **must** match the password set in the **Controlpanel DB** (set a secure password).
- `ENVOY_API_KEY`: This variable is mandatory to connect **Envoy** to the **Controlpanel API**. It must match the already set API key in the **Envoy** config as documented in the [Envoy section](#envoy-config).
- `FLUENTBIT_API_KEY`: This variable is mandatory to connect **FluentBit** and thus fetch all the logs from **Envoy** and to also connect the **Controlpanel API** and ship the logs. It must match the already set API key in the **FluentBit** environment variables.
- `KEYCLOAK_API_KEY`: This variable is mandatory to connect to **Keycloak**. It must match the already set API key in the **Keycloak** environment variables. If you don't connect it, the **Controlpanel API** will simply not be accessible.

### Kyma 
In this version, the **Controlpanel API** will also need a new service, the **Deployment Manager**, that will help to deploy the **Envoy** config for your app and more generally manage your protected apps.

In order to make the **Deployment Manager** work with the database, the **Controlpanel API** will automatically create a new user in the DB. This user will always have `'deployment_manager'` as the username and will use the preset DB password in the Helm chart (or use `'deployment_manager'` by default). Once this is done, the **Deployment Manager** will also automatically generate the API key for **Keycloak** and store it both in the database and in a Secret.

#### Environment variables to edit
- `deploymentmanager_db_password`: To set a secure password for the **Deployment Manager**.
- `kyma_domain`: To access your app from the internet (more information in the Kyma documentation).

## Controlpanel Dashboard
The **Controlpanel Dashboard** (frontend) is where you can control and manage the decoys you set and have a better view of the alerts sent by **FluentBit**. This **Controlpanel Dashboard** provides a way to add/modify, enable, or disable a decoy and display the decoys in a list. You can also deploy the **Envoy** proxy from there if Cloud Active Defense is running on Kyma.

### Build
If you want to manually build the frontend for production-ready code (automatically done by the Dockerfile), you can run this command in the `controlpanel/cad` directory:
```sh
npm run build --prod
```

This will create a `dist/` folder with all necessary resources to run the app.

### Controlpanel API
The Controlpanel dashboard is connected to the **Controlpanel API** and fetches its data to display it.

### Keycloak
The **Controlpanel Dashboard** also uses **Keycloak** to manage user authentication. When reaching the dashboard, it will redirect you to **Keycloak** to allow you to either:
- log in with an account
- register and create a new account (and create a new 'customer' in the API)

After logging in, **Keycloak** will automatically manage authentication to the API with its own signed JWT.

### Development
For development and debugging, a development image is available. This image works the same as the production one, but it updates the code in real time. This image is not for production use!

## Controlpanel DB
The **Controlpanel DB** is where everything is stored (decoys, logs, customers, applications, etc.).
It is only connected to the **Controlpanel API** with full access and the **Deployment Manager** with only access to the customer table (defined by a custom user, see [Controlpanel API>Kyma](#kyma-1)).

The database is managed by the `sequelize` package in the **Controlpanel API**. If something needs to be changed in the database (table, index, column, etc.), change it in the **Controlpanel API** `/models` directory.

The database schema (just for documentation purposes) is available in `controlpanel/db`.

### Docker Compose
In this version, you want to change 2 variables:
- `POSTGRES_PASSWORD`: Change this variable for security reasons with a secure password. Also, you **must** make the same variable in the **Controlpanel API** match what you set in order to make the **Controlpanel API** connect to the database.
- `POSTGRES_USER`: (same as `POSTGRES_PASSWORD`), the value must match the one set in the **Controlpanel API**.

### Kyma
In this version, the database user and password are automatically generated and set for both the **Controlpanel DB** and **Controlpanel API** if not manually set. These credentials are stored in a Secret.
You can manually set these variables if you want/need to.

## Keycloak
**Keycloak** is an open-source software product to allow single sign-on with identity and access management aimed at modern applications and services. It will manage users for accessing both the **Controlpanel Dashboard** and **Controlpanel API**. API routes are all protected with a JWT provided and managed by **Keycloak**, avoiding broken access control and preventing anyone from reading or changing decoys for an application without proper authorization.

**Keycloak** uses a configuration file loaded at startup to set all necessary settings and create the realm (configuration for one app). All of these settings are also accessible in the [Keycloak dashboard](http://localhost:8080/admin). You can connect to the dashboard only with the admin credentials.

If you want to secure the app by default by removing the registration (set by default in the **Keycloak** realm config), you can either set it to false in the config file:
```yaml
"registrationAllowed": true
```
or edit it in the Keycloak admin dashboard:
- First, select the `cad` realm in `Managed realms`
- Then go to `Realm settings`->`Login`
- And turn off the `User registration` setting

### Event listener
The event listener is a powerful feature that allows developers to respond to various events occurring within **Keycloak**, such as user logins, logouts, and other authentication-related actions. By implementing a custom event listener, you can extend **Keycloak**'s functionality to meet specific application needs.

For our use case, we used it to listen when a user registers to **Keycloak** and create a 'customer' in the **Controlpanel API**. This way, we also have a reference of each user in our own database, and from this, we can associate protected applications from Cloud Active Defense to a specific 'customer' (user).

#### Build
After changes in the code, you must rebuild it and generate a new `.jar` for **Keycloak**.
You can rebuild the listener by running this command:
```sh
mvn clean install
```
This will regenerate the `.jar`, then the **Keycloak** Dockerfile will add it to the image.

### Keycloak DB
**Keycloak** has its own database to store its config, users, different settings, etc. It completely manages the database; you don't have anything to change.

### Docker Compose
In this version, a few variables must be changed:
- `KC_BOOTSTRAP_ADMIN_USERNAME`: This will be the username to connect to the **Keycloak** admin panel. By default, the value is `'admin'`, but for security reasons, you should change that to a more secure username.
- `KC_BOOTSTRAP_ADMIN_PASSWORD`: This will be the password to connect to the **Keycloak** admin panel. For security reasons, please set a secure password.
- `KC_DB_USERNAME`: By default, the value is `'keycloak'`, but for security reasons, you should change that to a more secure username. Also, this variable **must** match the **Keycloak DB** user that has been set in the **Keycloak DB** in order to connect to the database.
- `KC_DB_PASSWORD`: Same as `KC_DB_USERNAME`, the value **must** match the password set in the **Keycloak DB** (set a secure password).
- `KEYCLOAK_API_KEY`: This variable is mandatory to make other applications connect to **Keycloak**. It must match the already set API key in the **Controlpanel API**. If you don't connect it, the **Controlpanel API** and **Controlpanel Dashboard** will simply not be accessible.

Also, a few variables must be changed in the Keycloak database:
- `POSTGRES_PASSWORD`: Change this variable for security reasons with a secure password. Also, you **must** make the same variable in **Keycloak** match what you set in order to make **Keycloak** connect to the database.
- `POSTGRES_USER`: (same as `POSTGRES_PASSWORD`), the value must match the one set in **Keycloak**.

## FluentBit
Alerts raised by **Envoy** are sent to its console log. By configuring 'fluentd' as a logging driver, these alerts are sent to a **FluentBit** container. **FluentBit** can be seen as a pipe which can collect and forward data. By default, **FluentBit** will display the collected data to its own console log and send it to the **Controlpanel API**. **FluentBit** can be configured to forward these logs to your favorite monitoring tool, such as Splunk, Loki, or Elasticsearch. Please refer to fluentbit.io for details.

### Envoy
**FluentBit** is configured to fetch all logs from **Envoy** with a specific format (JSON-formatted logs with a type property with either 'alert', 'event', 'system', or 'debug' value).

### Controlpanel API
All fetched logs are parsed into a less complex format and then are logged in the **FluentBit** console and shipped to the **Controlpanel API** to be stored in the database.

### Docker Compose
In this version, **FluentBit** listens to all service logs but only takes the ones in the expected format (JSON-formatted logs with a type property with either 'alert', 'event', 'system', or 'debug' value).
You also need to change a variable:
- `FLUENTBIT_API_KEY`: This variable is mandatory to connect **FluentBit** and thus fetch all the logs from **Envoy** and to also connect the **Controlpanel API** and ship the logs. It must match the already set API key in the **Controlpanel API**.

### Kyma
In this version, we are using an equivalent of **FluentBit**: the Telemetry Kyma module. This module is automatically configured by the **Deployment Manager**, as well as the `FLUENTBIT_API_KEY`, which is automatically generated and stored in a Secret.

## Myapp
**Myapp** is a demo application which can be used to test how decoys work. It is a simplistic web application with the following features:

- **GET /**: The front page, displays 'welcome' if you're not authenticated. Displays a static 'dashboard' page otherwise.
- **GET /login**: A form displaying a login field, a password field, and a submit button.
- **POST /login**: Checks if username is 'bob@myapp.com' and password is 'bob'. If not, it sends an error message. If yes, it authenticates by setting a (hardcoded) 'SESSION' cookie.
- **Logout**: There is no logout mechanism. Delete the SESSION cookie to log out.

## Deployment Manager
The **Deployment Manager** will manage all deployments of the **Envoy** proxy in the client cluster, the **FluentBit** pipeline to ship the logs to the **Controlpanel API**, and the API key secrets. The purpose of the **Deployment Manager** is only for Kyma. There is no Docker Compose version since this is only made to manage deployments on Kyma clusters.

### Controlpanel API
In order to make the **Deployment Manager** work with the database, the **Controlpanel API** will automatically create a new user in the DB. This user will always have `'deployment_manager'` as the username and will use the preset DB password in the Helm chart (or use `'deployment_manager'` by default). Please edit this password to use a secure one.

### Controlpanel DB
For security reasons, the **Deployment Manager** is restricted in its access to the database. It only has access to the 'customer' table since that's the only one it uses.

## Troubleshooting

### DNS_PROBE_FINISHED_NXDOMAIN
When you want to access the **Controlpanel Dashboard**, you may see this error. This is a *hosts* issue; Docker doesn't have the correct IP address in the `hosts` file.
To fix that, you need to:
- Run in a terminal ```ipconfig```
- Copy your current IPv4 address (e.g., 10.55.141.72)
- Open the `hosts` file
- Replace the IP listed next to `host.docker.internal` with the copied address
- Save the file with admin rights
Then, if you try to connect again, it should work.