FROM node:21-alpine
WORKDIR /app
RUN npm install express
RUN npm install hsts
COPY ./server.js /app/server.js
RUN mkdir /data
COPY ./data/cad-default.json /app/cad-default.json
COPY ./data/config-default.json /app/config-default.json
RUN mkdir -m 707 /data/blocklist
ADD https://raw.githubusercontent.com/SAP/cloud-active-defense/main/LICENSE /
LABEL org.opencontainers.image.licenses="APACHE-2.0"
LABEL org.opencontainers.image.auhors="cedric.hebert@sap.com"
LABEL org.opencontainers.image.source="https://github.com/SAP/cloud-active-defense/tree/main/configmanager"
USER nobody
CMD ["node", "server.js"]
