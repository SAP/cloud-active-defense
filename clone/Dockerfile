FROM node:21-alpine
WORKDIR /usr/app
RUN npm install express
RUN npm install body-parser
RUN npm install cookie-parser
ADD myapp.js /usr/app/myapp.js
USER nobody
EXPOSE 2000
CMD [ "node", "myapp.js" ]
