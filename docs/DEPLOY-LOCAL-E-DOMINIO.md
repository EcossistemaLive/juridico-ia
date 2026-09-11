# Guia de Deploy: Servidor Local Docker & Front no GitHub Pages

O Jurídico IA foi desenhado para rodar a interface (Front-End) gratuitamente no GitHub Pages e o cérebro (Cloud Functions / Express) em um servidor Node.js ou Cloud Functions v2.

Como o GitHub Pages roda exclusivamente em **HTTPS**, qualquer tentativa de chamar um backend rodando em `http://localhost:8080` será bloqueada pelos navegadores devido à política de **Mixed Content** (Conteúdo Misto).

Para testar seu backend Docker local integrado ao GitHub Pages público, você precisará expor seu localhost através de um túnel HTTPS seguro.

## Passo 1: Subir o Servidor Local (Docker)

1. Tenha o **Docker Desktop** rodando na sua máquina Windows (com integração WSL2 ativada, se aplicável).
2. Na raiz do projeto, execute:
   ```bash
   docker compose up -d
   ```
3. O servidor estará rodando em `http://localhost:8080`.
4. Teste a saúde do servidor acessando `http://localhost:8080/health`.

## Passo 2: Contornar o Mixed Content com Túnel HTTPS

Para o front no GitHub Pages enxergar seu backend local, use o **Cloudflare Tunnel** (recomendado e gratuito) ou o **ngrok**.

### Opção A: Usando o Pinggy (Mais rápido, sem instalar nada)
No seu terminal bash/wsl ou powershell (com ssh client):
```bash
ssh -p 443 -R0:localhost:8080 a.pinggy.io
```
Isso gerará uma URL como `https://rxnny-xx-xx-xx-xx.a.free.pinggy.link`. Copie esta URL HTTPS.

### Opção B: Usando ngrok
Se tiver o ngrok instalado:
```bash
ngrok http 8080
```
Copie a URL `https://xxxx-xxx-xxx.ngrok-free.app`.

## Passo 3: Configurar o Front-End

1. No seu repositório no GitHub, vá em **Settings > Secrets and variables > Actions**.
2. Adicione ou edite uma *Repository Variable* chamada `NEXT_PUBLIC_API_BASE_URL`.
3. Cole a URL HTTPS gerada pelo seu túnel (sem a barra `/` no final).
4. Rode a GitHub Action de Deploy Pages novamente.

Agora o seu front no GitHub Pages se comunicará de forma criptografada com o seu servidor rodando no Docker da sua máquina.

## Passo 4: Migrando para Domínio Próprio

Para subir este sistema em produção (sem a necessidade de túneis provisórios):
1. **Front-End**: Configure um domínio customizado (ex: `app.seuescritorio.com.br`) diretamente no painel do GitHub Pages. O GitHub gerencia o certificado SSL/TLS (HTTPS) automaticamente.
2. **Back-End (API)**:
   - Publique as pastas `functions/` em uma VPS (Hostinger, DigitalOcean, Hetzner, etc).
   - Use o `docker-compose.yml` para levantar o servidor na VPS.
   - Configure um **Nginx Server Block** ou **Caddy** atuando como Proxy Reverso para a porta 8080, providenciando certificado HTTPS via Let's Encrypt.
   - Atualize a `NEXT_PUBLIC_API_BASE_URL` no repositório para o subdomínio da sua API (ex: `https://api.seuescritorio.com.br`).

Desta forma, todo o tráfego da aplicação permanecerá estritamente em HTTPS, em compliance com os padrões modernos de segurança.
