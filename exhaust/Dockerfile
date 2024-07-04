FROM node:21-alpine
WORKDIR /usr/app
RUN npm install express
RUN npm install body-parser
RUN npm install cookie-parser
ADD myapp.js /usr/app/myapp.js
ADD files/script.js /usr/app/files/script.js
USER nobody
EXPOSE 4000
CMD [ "node", "myapp.js" ]
