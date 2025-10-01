# CLONING WEBSITE AS AN EXHAUST (experimental)

This feature allow you to clone your website as an exhaust server. The goal is to have a fake facade of your website, so everything before logging in into the website. Because the exhaust is only meant to exhaust hackers you won't be able to login.

This is still an experimental feature and still not implemented in the project.
Since this is experimental, it may not clone the full website and miss some pages, images, etc..

You are welcome to contribute to this "website cloning" script via pull requests or issues.

For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Requirements

- [Npm](npmjs.com)
- [Docker 🐳](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (you can do without, but this will make your life easier)

## Steps to clone

### 1. Set your website URL

Edit `.env` file in this directory to set your website URL

### 2. Start the script

Before you must install the packages to run the script:
```sh
npm install
```

To start the script just run:
```sh
node script.js
```

### 3. Start the server

Once the script is finished you can run this to start the server using your cloned website with docker:
```sh
docker compose up
```

You can access your exhaust app at: [http://localhost](http://localhost)
