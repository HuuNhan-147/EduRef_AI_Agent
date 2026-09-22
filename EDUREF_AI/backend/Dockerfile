# Sử dụng Node.js 20 LTS phiên bản slim gọn nhẹ, ổn định cho Prisma
FROM node:20-slim

# Cài đặt OpenSSL cho Prisma ORM engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Sao chép package.json, package-lock.json và thư mục prisma trước
# (để postinstall của npm install có thể chạy prisma generate)
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt toàn bộ dependencies và tự động kích hoạt prisma generate
RUN npm install

# Sao chép toàn bộ mã nguồn backend
COPY . .

# Mở cổng mạng mặc định
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Khởi chạy server
CMD ["node", "server.js"]
