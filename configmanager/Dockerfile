FROM node:21-alpine
WORKDIR /app
RUN npm install express
RUN npm install hsts
COPY ./server.js /app/server.js
RUN mkdir /data
COPY ./cad-default.json /app/cad-default.json
COPY ./config-default.json /app/config-default.json
USER nobody
CMD ["node", "server.js"]
