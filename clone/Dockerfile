FROM node:21-alpine
WORKDIR /usr/app
RUN npm install express
RUN npm install body-parser
RUN npm install cookie-parser
ADD myapp.js /usr/app/myapp.js
ADD files/script.js /usr/app/files/script.js
ADD https://raw.githubusercontent.com/SAP/cloud-active-defense/main/LICENSE /
LABEL org.opencontainers.image.licenses="APACHE-2.0"
LABEL org.opencontainers.image.auhors="cedric.hebert@sap.com"
LABEL org.opencontainers.image.source="https://github.com/SAP/cloud-active-defense/tree/main/clone"
USER nobody
EXPOSE 2000
CMD [ "node", "myapp.js" ]
