FROM node:21-alpine
WORKDIR /app
RUN npm install express
RUN npm install hsts
COPY ./server.js /app/server.js
RUN mkdir /data
COPY ./cad-default.json /data/cad-default.json
USER nobody
CMD ["node", "server.js"]
