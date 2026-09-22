# Multi-stage build cho Frontend React 18 + Vite
# Giai đoạn 1: Build source code bằng Node.js
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Hỗ trợ truyền biến môi trường Backend URL tại thời điểm build Docker
ARG VITE_API_URL=""
ARG VITE_SOCKET_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Build Vite SPA sang thư mục /app/dist
RUN npm run build

# Giai đoạn 2: Phục vụ bằng Nginx siêu nhẹ
FROM nginx:alpine

# Sao chép file build tĩnh vào thư mục phục vụ web của Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Cấu hình Nginx rewrite fallback về index.html cho Single Page Application
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
