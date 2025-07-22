FROM node:21 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build --prod

FROM nginx:1.28.0-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/cad/browser /usr/share/nginx/html
COPY replace-env.sh /docker-entrypoint.d/99-replace-env.sh

RUN chmod +x /docker-entrypoint.d/99-replace-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]