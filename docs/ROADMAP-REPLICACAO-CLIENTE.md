# Roadmap de Replicação e Implantação — Jurídico IA

Este documento contém o passo a passo completo, detalhado e à prova de falhas para instalar, configurar e colocar em produção o ecossistema **Jurídico IA** na máquina ou infraestrutura de um cliente (escritório de advocacia ou advogado autônomo).

---

## 1. Visão Geral da Arquitetura

O sistema opera no modelo **Híbrido Distribuído**:
- **Front-end**: Interface web estática hospedada com segurança (ex.: GitHub Pages ou CDN local), sem custo de servidor e acessível de qualquer dispositivo.
- **Back-end Local (On-Premise)**: Servidor Node.js (`server.mjs`) rodando na máquina do cliente ou servidor local, processando documentos com Mammoth e orquestrando as chamadas forenses da Anthropic.
- **Túnel Seguro (Cloudflare Tunnel)**: Expõe a porta local (`8081`) para uma URL pública HTTPS com certificado TLS gratuito, permitindo que a interface web envie requisições ao backend sem necessidade de IP fixo ou abertura de portas no roteador/firewall do cliente.

```mermaid
flowchart LR
    A["Navegador do Advogado<br/>(GitHub Pages HTTPS)"] -->|"Requisição Forense HTTPS"| B["Cloudflare Edge<br/>(trycloudflare.com)"]
    B -->|"Túnel Criptografado (QUIC)"| C["cloudflared.exe<br/>(Máquina do Cliente)"]
    C -->|"Proxy Local (Porta 8081)"| D["server.mjs<br/>(Node.js Express)"]
    D -->|"Skills Jurídicas & Base Doutrinária"| E["API Claude (Anthropic)<br/>(Sonnet / Opus)"]
    A <-->|"Autenticação & Dados"| F["Firebase / Firestore"]
```

---

## 2. Pré-requisitos na Máquina do Cliente

Antes de iniciar a instalação no computador do cliente, garanta que os seguintes itens estejam presentes:

1. **Sistema Operacional**: Windows 10/11 (64-bit) ou Windows Server.
2. **Node.js**: Versão 20 LTS ou superior instalada ([nodejs.org](https://nodejs.org/)).
   - Verifique no terminal:
     ```powershell
     node -v
     npm -v
     ```
3. **Git**: Git para Windows instalado ([git-scm.com](https://git-scm.com/)).
4. **Chave de API Anthropic**:
   - Conta ativa com saldo/créditos em [console.anthropic.com](https://console.anthropic.com/).
   - Chave no formato `sk-ant-api03-...`.

---

## 3. Passo a Passo de Instalação no Cliente

### Passo 3.1: Obter o Projeto
No terminal da máquina do cliente, clone o repositório em uma pasta dedicada (ex.: `C:\JuridicoIA`):

```powershell
git clone https://github.com/EcossistemaLive/juridico-ia.git C:\JuridicoIA
cd C:\JuridicoIA
```
*(Se preferir entregar via pendrive/ZIP, basta descompactar a pasta completa `juridico-ia` mantendo a estrutura de arquivos).*

### Passo 3.2: Instalação das Dependências
Instale as dependências do servidor e das skills forenses:

```powershell
cmd.exe /c npm install
cmd.exe /c npm --prefix functions install
```

### Passo 3.3: Compilar a Base Jurídica Local
Gere os módulos consolidados de doutrina e catalogo forense:

```powershell
cmd.exe /c npm run functions:base
cmd.exe /c npm run build:catalogo
```

---

## 4. Configuração das Variáveis de Ambiente (`.env`)

Na raiz do projeto (`C:\JuridicoIA`), crie ou edite o arquivo `.env`:

```env
# Porta do Servidor Local
PORT=8081

# Projeto Firebase (para autenticação dos advogados)
FIREBASE_PROJECT_ID=daily-catholic-meditation

# Chave de Inteligência Artificial da Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-SUA_CHAVE_DO_CLIENTE_AQUI
```

> [!IMPORTANT]
> A chave `ANTHROPIC_API_KEY` fica **apenas** dentro deste arquivo `.env` na máquina do cliente. Ela nunca é exposta no navegador nem enviada para o GitHub.

---

## 5. Inicialização e Conexão do Túnel Cloudflare

### Passo 5.1: Obter o Binário do `cloudflared`
Se o arquivo `cloudflared.exe` não estiver na pasta raiz, baixe a versão oficial do Windows diretamente:

```powershell
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "cloudflared.exe"
```

### Passo 5.2: Iniciar os Serviços
Dê um duplo clique no arquivo:
**`iniciar-backend.bat`**

O script abrirá duas janelas do prompt:
1. **Janela 1 (Servidor)**: Mostrará `[Servidor Local Jurídico IA] Ativo na porta 8081`.
2. **Janela 2 (Túnel Cloudflare)**: Conectará à rede Cloudflare e exibirá uma URL pública no formato:
   ```text
   https://nome-aleatorio.trycloudflare.com
   ```

### Passo 5.3: Vincular a URL ao Front-End
Com a URL do túnel copiada (ex: `https://nome-aleatorio.trycloudflare.com`):

- **Opção A (Se o cliente usa o GitHub Pages oficial)**:
  Basta atualizar a variável `NEXT_PUBLIC_API_BASE_URL` no repositório GitHub via CLI:
  ```powershell
  gh variable set NEXT_PUBLIC_API_BASE_URL --body "https://nome-aleatorio.trycloudflare.com" --repo EcossistemaLive/juridico-ia
  gh workflow run deploy-pages.yml --repo EcossistemaLive/juridico-ia
  ```

- **Opção B (Túnel Fixo / Domínio Próprio do Escritório - Recomendado para Clientes)**:
  Para o cliente ter uma URL fixa que nunca muda mesmo se reiniciar a máquina, configure um Named Tunnel gratuito na conta Cloudflare do cliente:
  ```powershell
  .\cloudflared.exe tunnel login
  .\cloudflared.exe tunnel create juridico-backend
  .\cloudflared.exe tunnel route dns juridico-backend api.escritorio.com.br
  .\cloudflared.exe tunnel run --url http://localhost:8081 juridico-backend
  ```
  Assim, a URL da API será sempre `https://api.escritorio.com.br` de forma permanente.

---

## 6. Automatização como Serviço do Windows (Execução 24/7 em Segundo Plano)

Para que o cliente não precise abrir janelas pretas do terminal todos os dias, configure o backend e o túnel para iniciarem automaticamente com o Windows usando o **NSSM** (Non-Sucking Service Manager) ou o recurso nativo do Cloudflare:

### 6.1 Instalar o Cloudflare Tunnel como Serviço do Windows:
```powershell
.\cloudflared.exe service install
Start-Service cloudflared
```

### 6.2 Instalar o Servidor Node como Serviço do Windows (via PM2):
```powershell
npm install -g pm2 pm2-windows-service
pm2 start server.mjs --name "juridico-backend"
pm2 save
pm2-service-install
```

---

## 7. Checklist de Validação no Cliente

Antes de entregar o sistema pronto para a equipe do cliente, valide os seguintes pontos:

| Item | Ação de Teste | Resultado Esperado |
| :--- | :--- | :--- |
| **1. Healthcheck Local** | Acessar `http://localhost:8081/health` | `{"status":"ok","anthropicConfigured":true}` |
| **2. Healthcheck Túnel** | Acessar `https://<URL_DO_TUNEL>/health` | Resposta JSON idêntica com certificado SSL válido |
| **3. Login & Sessão** | Acessar a aplicação web e logar com o e-mail do advogado | Acessa o Dashboard com o nome do escritório |
| **4. Cadastro de Caso** | Cadastrar um caso de teste na aba "Casos" | Caso salvo e botão "Definir como Caso Ativo" funcional |
| **5. Desenho de Peça** | Na aba "Petições", clicar em "Desenhar Esqueleto da Peça" | Plano tático silogístico gerado em ~15 a 25 segundos |
| **6. Redação IA** | Clicar em "Iniciar Redação IA" | Texto forense gerado em tempo real via streaming |
| **7. Auditoria & DOCX** | Executar a revisão adversarial e baixar minuta Word | Arquivo `.docx` baixado e formatado |

---

## 8. Troubleshooting Rápido para Suporte ao Cliente

- **Erro `Failed to fetch`**:
  - *Causa*: O servidor local `server.mjs` ou o túnel `cloudflared` foram fechados na máquina.
  - *Solução*: Executar novamente `iniciar-backend.bat`.

- **Erro `401 Sessão expirada`**:
  - *Causa*: O token do Firebase no navegador expirou.
  - *Solução*: Fazer logout e login novamente na barra lateral.

- **Erro `Créditos insuficientes` ou `Invalid API Key`**:
  - *Causa*: A chave no `.env` está sem saldo ou expirou no console da Anthropic.
  - *Solução*: Adicionar créditos em [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing) e reiniciar o `server.mjs`.

- **Bloqueio de Peça ("Faltam Elementos")**:
  - *Causa*: O caso cadastrado não possui fatos narrados suficientes ou documentos comprobatórios mínimos.
  - *Solução*: O sistema é estritamente forense e cumpre a diretriz constitucional de não inventar dados. O advogado deve adicionar os fatos/documentos no caso para desbloquear a redação.
