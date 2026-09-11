import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mammoth from "mammoth";
import { adminAuth, adminDb } from "./functions/lib/firebase-admin.js";
import { carregarContextoDoCaso } from "./functions/lib/caso-loader.js";
import {
  analisarDocumento,
  planejarPeca,
  redigirPeca,
  revisarPeca,
  conferirChecklist
} from "./functions/skills/index.js";

dotenv.config({ path: "./functions/.env" }); // Load from functions/.env if exists

const app = express();
const PORT = process.env.PORT || 8080;

// CORS flexível (para GitHub Pages e localhost)
const origensPermitidas = process.env.ORIGENS_PERMITIDAS 
  ? process.env.ORIGENS_PERMITIDAS.split(',') 
  : ['http://localhost:3000', /https:\/\/.*\.github\.io/];

app.use(cors({
  origin: origensPermitidas,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: "50mb" }));

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sessão não encontrada" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth().verifyIdToken(token);
    req.user = decodedToken;
    
    // Obter dados do usuário no Firestore para preencher identidade
    const userDoc = await adminDb().collection("users").doc(req.user.uid).get();
    if (userDoc.exists) {
      req.identidade = {
        uid: req.user.uid,
        escritorioId: userDoc.data().escritorioId,
        escritorioNome: userDoc.data().companyName || "Escritório Local"
      };
    } else {
      req.identidade = { uid: req.user.uid, escritorioId: "local", escritorioNome: "Escritório Local" };
    }
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: "Sessão expirada" });
  }
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", mode: "docker-local" });
});

app.post("/parseFile", authenticate, async (req, res) => {
  try {
    const { nomeArquivo, base64 } = req.body;
    if (!base64) return res.status(400).json({ error: "Falta base64" });

    const buffer = Buffer.from(base64, "base64");
    const nome = nomeArquivo.toLowerCase();
    let texto = "";

    if (nome.endsWith(".docx")) {
      const resultado = await mammoth.extractRawText({ buffer });
      texto = resultado.value;
    } else if (nome.endsWith(".txt") || nome.endsWith(".md")) {
      texto = buffer.toString("utf-8");
    } else {
      return res.status(415).json({ error: "Envie DOCX, TXT ou MD." });
    }

    if (!texto?.trim()) {
      return res.status(422).json({ error: "Não foi possível extrair texto." });
    }

    res.json({ texto, caracteres: texto.length, nomeArquivo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/analisar", authenticate, async (req, res) => {
  try {
    const { conteudo, area, casoId, caso: casoPayload, objetivo, analisePrevia } = req.body;
    
    let caso = casoPayload || null;
    if (casoId) {
      const doc = await adminDb().collection("cases").doc(casoId).get();
      if (!doc.exists) return res.status(404).json({ error: "Caso não encontrado" });
      if (doc.data().escritorioId !== req.identidade.escritorioId) {
        return res.status(403).json({ error: "Caso não pertence a este escritório" });
      }
      caso = { id: doc.id, ...doc.data() };
    }

    const analise = await analisarDocumento(req.identidade.escritorioNome, conteudo, {
      area: caso?.area || area,
      caso,
      objetivo,
      analisePrevia
    });

    res.json({ success: true, analise });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/planejar", authenticate, async (req, res) => {
  try {
    const contexto = await carregarContextoDoCaso(req.body, req.identidade.escritorioId);
    if (contexto.erro) return res.status(contexto.status).json({ error: contexto.erro });

    const plano = await planejarPeca(req.identidade.escritorioNome, contexto.dados);
    res.json({ success: true, plano });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/redigir", authenticate, async (req, res) => {
  try {
    const contexto = await carregarContextoDoCaso(req.body, req.identidade.escritorioId);
    if (contexto.erro) return res.status(contexto.status).json({ error: contexto.erro });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");

    try {
      for await (const pedaco of redigirPeca(req.identidade.escritorioNome, contexto.dados, req.body.plano)) {
        res.write(pedaco);
      }
      res.end();
    } catch (streamError) {
      console.error("[redigir stream error]:", streamError);
      res.write(`\n\n[ERRO NA GERAÇÃO: ${streamError.message}]`);
      res.end();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/revisar", authenticate, async (req, res) => {
  try {
    const { textoGerado: texto, tipoPeca, area, caso, fontes } = req.body; // body map pode ser diferente, checando: "textoGerado" foi enviado pelo front
    
    // Suportar front enviando 'textoGerado' ou 'texto'
    const textoDoc = texto || req.body.texto;
    
    const checklist = tipoPeca ? conferirChecklist(textoDoc, tipoPeca) : null;
    const revisao = await revisarPeca(req.identidade.escritorioNome, textoDoc, { area, tipoPeca, caso, fontes });

    res.json({ success: true, checklist, revisao });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Local Server] Rodando na porta ${PORT}`);
});
