FROM node:22-alpine AS build

WORKDIR /app

COPY web/package.json web/package-lock.json /app/web/
RUN npm ci --prefix /app/web

COPY web/ /app/web/
COPY docs /app/docs

WORKDIR /app/web
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
