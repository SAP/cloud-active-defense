FROM node:21-alpine
WORKDIR /app
RUN npm install express
RUN npm install hsts
COPY ./server.js /app/server.js
RUN mkdir /data
RUN mkdir -m 707 /data/blocklist
USER nobody
CMD ["node", "server.js"]
