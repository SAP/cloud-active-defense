FROM node:21

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .
ADD https://raw.githubusercontent.com/SAP/cloud-active-defense/main/LICENSE /
LABEL org.opencontainers.image.licenses="APACHE-2.0"
LABEL org.opencontainers.image.authors="cedric.hebert@sap.com"
LABEL org.opencontainers.image.source="https://github.com/SAP/cloud-active-defense/tree/main/deployment-manager"

EXPOSE 3000

CMD ["node", "server.js"]