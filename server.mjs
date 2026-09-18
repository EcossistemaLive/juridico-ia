import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import { adminAuth, adminDb } from './functions/lib/firebase-admin.js';
import { carregarContextoDoCaso } from './functions/lib/caso-loader.js';
import {
  analisarDocumento,
  planejarPeca,
  redigirPeca,
  revisarPeca,
  conferirChecklist
} from './functions/skills/index.js';

// Carrega variáveis do .env da raiz ou functions/.env
dotenv.config();
dotenv.config({ path: './functions/.env' });

const app = express();
const PORT = process.env.PORT || 8081;

// CORS total para GitHub Pages, localhost e túneis
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '50mb' }));

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessão não encontrada' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    let decodedToken = null;
    try {
      decodedToken = await adminAuth().verifyIdToken(token);
    } catch (tokenErr) {
      console.warn('[Auth] verifyIdToken erro:', tokenErr.message);
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente no sistema.' });
    }

    req.user = decodedToken;
    
    // Obter dados do usuário no Firestore com fallback seguro
    try {
      const userDoc = await adminDb().collection('users').doc(req.user.uid).get();
      if (userDoc.exists) {
        req.identidade = {
          uid: req.user.uid,
          escritorioId: userDoc.data().escritorioId || req.body?.escritorioId || 'escritorio_principal',
          escritorioNome: userDoc.data().companyName || 'Escritório Jurídico'
        };
      } else {
        req.identidade = { 
          uid: req.user.uid, 
          escritorioId: req.body?.escritorioId || 'escritorio_principal', 
          escritorioNome: 'Escritório Jurídico' 
        };
      }
    } catch (dbErr) {
      console.warn('[Auth] Firestore inacessível no backend local, usando fallback:', dbErr.message);
      req.identidade = { 
        uid: req.user.uid, 
        escritorioId: req.body?.escritorioId || 'escritorio_principal', 
        escritorioNome: 'Escritório Jurídico' 
      };
    }

    next();
  } catch (error) {
    console.error('Auth error geral:', error);
    res.status(401).json({ error: 'Sessão inválida' });
  }
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mode: 'local-server',
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    timestamp: new Date().toISOString() 
  });
});

app.post('/parseFile', authenticate, async (req, res) => {
  try {
    const { nomeArquivo, base64 } = req.body;
    if (!base64) return res.status(400).json({ error: 'Falta base64' });

    const buffer = Buffer.from(base64, 'base64');
    const nome = (nomeArquivo || '').toLowerCase();
    let texto = '';

    if (nome.endsWith('.docx')) {
      const resultado = await mammoth.extractRawText({ buffer });
      texto = resultado.value;
    } else if (nome.endsWith('.txt') || nome.endsWith('.md')) {
      texto = buffer.toString('utf-8');
    } else {
      return res.status(415).json({ error: 'Envie DOCX, TXT ou MD.' });
    }

    if (!texto?.trim()) {
      return res.status(422).json({ error: 'Não foi possível extrair texto.' });
    }

    res.json({ texto, caracteres: texto.length, nomeArquivo });
  } catch (err) {
    console.error('[parseFile error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/analisar', authenticate, async (req, res) => {
  try {
    const { conteudo, area, casoId, caso: casoPayload, objetivo, analisePrevia } = req.body;
    let caso = casoPayload || null;

    if (casoId && !caso) {
      try {
        const doc = await adminDb().collection('cases').doc(casoId).get();
        if (doc.exists) {
          caso = { id: doc.id, ...doc.data() };
        }
      } catch (err) {
        console.warn('[analisar] Firestore cases lookup warning:', err.message);
      }
    }

    const analise = await analisarDocumento(req.identidade.escritorioNome, conteudo, {
      area: caso?.area || area,
      caso,
      objetivo,
      analisePrevia
    });

    res.json({ success: true, analise });
  } catch (err) {
    console.error('[analisar error]:', err);
    const status = err.message?.includes('Entrada rejeitada') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.post('/planejar', authenticate, async (req, res) => {
  try {
    const contexto = await carregarContextoDoCaso(req.body, req.identidade.escritorioId);
    if (contexto.erro) return res.status(contexto.status).json({ error: contexto.erro });

    const plano = await planejarPeca(req.identidade.escritorioNome, contexto.dados);
    res.json({ success: true, plano });
  } catch (err) {
    console.error('[planejar error]:', err);
    const status = err.message?.includes('Entrada rejeitada') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.post('/redigir', authenticate, async (req, res) => {
  try {
    const contexto = await carregarContextoDoCaso(req.body, req.identidade.escritorioId);
    if (contexto.erro) return res.status(contexto.status).json({ error: contexto.erro });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const pedaco of redigirPeca(req.identidade.escritorioNome, contexto.dados, req.body.plano)) {
        res.write(pedaco);
      }
      res.end();
    } catch (streamError) {
      console.error('[redigir stream error]:', streamError);
      res.write(`\n\n[ERRO NA GERAÇÃO: ${streamError.message}]`);
      res.end();
    }
  } catch (err) {
    console.error('[redigir error]:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/revisar', authenticate, async (req, res) => {
  try {
    const { textoGerado: texto, tipoPeca, area, caso, fontes } = req.body;
    const textoDoc = texto || req.body.texto;
    
    const checklist = tipoPeca ? conferirChecklist(textoDoc, tipoPeca) : null;
    const revisao = await revisarPeca(req.identidade.escritorioNome, textoDoc, { area, tipoPeca, caso, fontes });

    res.json({ success: true, checklist, revisao });
  } catch (err) {
    console.error('[revisar error]:', err);
    const status = err.message?.includes('Entrada rejeitada') ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Servidor Local Jurídico IA] Ativo na porta ${PORT}`);
  console.log(`[Healthcheck]: http://localhost:${PORT}/health`);
});
