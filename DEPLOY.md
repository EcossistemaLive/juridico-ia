# Deploy e infraestrutura — Jurídico IA

Herda a infraestrutura do RecrutaAI (Netlify + Firebase) com três diferenças que
não são opcionais neste produto.

## 1. O que muda em relação ao RecrutaAI

| Item | RecrutaAI | Aqui | Por quê |
|---|---|---|---|
| Isolamento de dados | por usuário (`userId`) | por escritório (`escritorioId`) | vários advogados trabalham no mesmo caso |
| Papel do usuário | e-mail no código | custom claims do Firebase Auth | mudar privilégio não pode exigir deploy |
| Auth das rotas de API | formato do token | `verifyIdToken()` no Admin SDK | as rotas guardam material sob sigilo |
| Master admin | lê tudo | não lê caso de cliente | sigilo profissional (art. 34, VII, EOAB) |
| Firestore no servidor | SDK cliente | Admin SDK | o SDK cliente roda sem contexto de auth no servidor |
| Região | qualquer | `southamerica-east1` | LGPD e resposta a pergunta de sócio |

## 2. Firebase

1. Crie o projeto (sugestão: `juridico-ia-live`) e o Firestore em **southamerica-east1**.
2. Authentication: habilite **E-mail/senha**. Adicione o domínio do Netlify em *Authorized domains*.
3. Aplique as regras: `firebase deploy --only firestore:rules`.
4. Gere a conta de serviço em *Configurações > Contas de serviço* e preencha
   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`.
5. Índices compostos necessários (o console sugere na primeira consulta):
   - `analyses`: `escritorioId` ASC + `casoId` ASC + `criadoEm` DESC
   - `templates`: `escritorioId` ASC + `area` ASC
   - `cases`: `escritorioId` ASC + `atualizadoEm` DESC
   - `petitions`: `escritorioId` ASC + `casoId` ASC + `criadoEm` DESC

## 3. Custom claims — o bootstrap

Papel e escritório vivem nas claims, não no código. O primeiro admin precisa ser
gravado uma vez, por script, com o Admin SDK:

```js
import { definirClaims } from "./src/lib/firebase-admin.js";
await definirClaims("<uid>", { role: "admin", escritorioId: "mlp", escritorioNome: "MLP Advogados" });
```

Depois disso o usuário precisa renovar o token (`getIdToken(true)`) para as claims
valerem. Papéis previstos: `plataforma_admin`, `admin` (do escritório), `advogado`,
`secretaria`.

## 4. Coleções

```
users        perfil, vínculo com escritório (papel real vem das claims)
escritorios  configuração do tenant: overlays de foro e estilo, plano, limites
cases        caso: partes, polo, área, rito, comarca, número CNJ, tese central
documents    documentos dos autos, metadados e referência no Storage
analyses     saída do doc-analyst (registro imutável do que a IA produziu)
petitions    minutas e versões, com estado de revisão humana
templates    biblioteca de modelos e teses do escritório
audit        trilha de acesso — gravada só pelo servidor
```

## 5. Netlify

Mesmo `netlify.toml` do RecrutaAI. Variáveis de ambiente: as do `.env.example`.
Atenção a duas:

- `FIREBASE_PRIVATE_KEY` precisa manter os `\n` escapados no painel do Netlify.
- `ANTHROPIC_API_KEY` **nunca** com prefixo `NEXT_PUBLIC_` — isso a publicaria no
  bundle do navegador.

`npm run build` roda `build:base` antes do `next build`, que regenera a base
jurídica a partir de `referencias/`. Se essa pasta não for versionada, o build
falha — mantenha-a no repositório ou ajuste o script.

## 6. Storage

Documentos dos autos vão para o Firebase Storage sob `escritorios/{escritorioId}/casos/{casoId}/`,
com regras espelhando as do Firestore. Enquanto o Storage não estiver configurado,
o upload funciona em memória (documento vai direto para a API e não é guardado) —
o que é aceitável no piloto e precisa ser resolvido antes de vender retenção.
