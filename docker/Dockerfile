FROM node:20-alpine

WORKDIR /app

# Copiar dependências da pasta functions
COPY functions/package*.json ./functions/
RUN cd functions && npm install

# Instalar pacotes para o servidor express
RUN npm install express cors dotenv mammoth firebase-admin

# Copiar o restante das functions
COPY functions/ ./functions/

# Copiar script do servidor express
COPY docker/server.mjs ./

# Opcional: Variáveis de ambiente default
ENV PORT=8080
EXPOSE 8080

# Executar o build da base doutrinária e iniciar o servidor
CMD sh -c "npm --prefix functions run build:base && node server.mjs"
