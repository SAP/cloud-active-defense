FROM node:21-alpine
WORKDIR /app
COPY . /app
RUN npm install
USER nobody
EXPOSE 8050
CMD [ "node", "server.js" ]