FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
<<<<<<< Updated upstream
=======
ARG REACT_APP_API_URL=http://localhost:6080
ENV REACT_APP_API_URL=$REACT_APP_API_URL
>>>>>>> Stashed changes
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
