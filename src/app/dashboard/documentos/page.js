"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/common/PageHeader";
import GlassCard from "../../../components/common/GlassCard";
import { Upload, FileText, AlertTriangle, CheckCircle, Clock, ShieldAlert, FileSearch, ArrowRight, X, Zap } from "lucide-react";
import { prepararConteudo, analisarDocumento } from "../../../lib/api";
import { detectarPeca, extrairNumerosCnj } from "../../../lib/pieceDetection";
import { useAuth } from "../../../context/AuthContext";
import { useCaseStore } from "../../../store/useCaseStore";
import { db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function DocumentosPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const casoAtivo = useCaseStore((state) => state.casoAtivo);
  const casoAtivoId = useCaseStore((state) => state.casoAtivoId);
  const setUltimaAnalise = useCaseStore((state) => state.setUltimaAnalise);
  
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Heurística rápida
  const [fastDetect, setFastDetect] = useState(null);
  
  // Resultado do backend
  const [analise, setAnalise] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setAnalise(null);
    setFastDetect(null);
    
    // Ler rapidamente como texto para heurística se for TXT/MD
    if (selectedFile.type === "text/plain" || selectedFile.name.endsWith(".md")) {
      const text = await selectedFile.text();
      setFastDetect({
        tipoPeca: detectarPeca(text),
        cnj: extrairNumerosCnj(text)
      });
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) return;
    if (!casoAtivoId) {
      alert("Selecione ou crie um Caso Ativo na tela de Casos antes de analisar um documento.");
      return;
    }
    
    setIsUploading(true);
    setIsAnalyzing(true);
    setProgress(20);
    
    try {
      // 1. Prepara conteúdo (converte pra base64 e texto se possível)
      const inputData = await prepararConteudo(file);
      setProgress(50);
      
      // 2. Envia pro backend
      const result = await analisarDocumento({
        conteudo: inputData.conteudo,
        texto: inputData.texto,
        casoId: casoAtivoId
      });
      setProgress(90);
      
      // 3. Salva no Firestore
      const escritorioId = userProfile?.escritorioId || "escritorio_principal";
      const docRef = await addDoc(collection(db, "analyses"), {
        casoId: casoAtivoId,
        escritorioId,
        nomeArquivo: file.name,
        resultado: result.analise, // Supondo que a API retorna em { analise: ... }
        createdAt: serverTimestamp()
      });
      
      setUltimaAnalise(docRef.id);
      setAnalise(result.analise);
      setProgress(100);
      
    } catch (err) {
      console.error(err);
      alert(err.message || "Falha na análise do documento");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      setProgress(0);
    }
  };

  return (
    <div className="documentos-page">
      <PageHeader 
        title="Análise de Documentos" 
        subtitle={casoAtivo ? `Caso Ativo: ${casoAtivo.titulo} (Área: ${casoAtivo.area})` : "Faça o upload de iniciais, petições ou evidências para Parecer Visual Automático."}
      />

      {!casoAtivoId && (
        <div className="alert-banner warning">
          <AlertTriangle size={20} />
          <span>Você não possui um <strong>Caso Ativo</strong> selecionado para vincular a esta análise. <button type="button" className="banner-link-btn" onClick={() => router.push("/dashboard/casos")}>Vincular Caso Agora</button></span>
        </div>
      )}

      {!analise && (
        <GlassCard className="upload-section">
          <div 
            className={`upload-dropzone ${file ? 'has-file' : ''}`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{display: 'none'}} 
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            
            {isUploading ? (
              <div className="upload-progress-container">
                <div className="spinner"></div>
                <h3>Analisando Documento...</h3>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p>O cérebro jurídico está extraindo as evidências e fatos.</p>
              </div>
            ) : file ? (
              <div className="file-ready">
                <FileText size={48} color="var(--action-primary)" />
                <h3>{file.name}</h3>
                <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                
                {fastDetect && (
                  <div className="fast-detect-badges">
                    {fastDetect.cnj.length > 0 && <span className="badge">CNJ Encontrado</span>}
                    {fastDetect.tipoPeca !== 'outro' && <span className="badge" style={{textTransform: 'capitalize'}}>{fastDetect.tipoPeca} detectada</span>}
                  </div>
                )}

                <div className="file-actions" onClick={e => e.stopPropagation()}>
                  <button className="cancel-btn" onClick={() => setFile(null)}>Remover</button>
                  <button className="analyze-btn" onClick={handleUploadAndAnalyze} disabled={!casoAtivoId}>
                    <Zap size={18} /> Iniciar Parecer IA
                  </button>
                </div>
              </div>
            ) : (
              <div className="upload-prompt">
                <Upload size={48} color="var(--ink-500)" />
                <h3>Clique ou arraste o documento aqui</h3>
                <p>Suporta PDF nativo, DOCX, TXT ou Markdown (Max 10MB)</p>
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* Renderização do Parecer Visual Estruturado */}
      {analise && (
        <div className="parecer-container">
          <div className="parecer-header">
            <h2>Parecer Visual: {file?.name}</h2>
            <button className="clear-btn" onClick={() => { setAnalise(null); setFile(null); }}>
              <X size={16} /> Nova Análise
            </button>
          </div>

          <div className="parecer-grid">
            {/* Triagem de Admissibilidade */}
            <GlassCard className="parecer-card admis-card">
              <h3>Triagem de Admissibilidade (Gate Check)</h3>
              <div className="admis-list">
                {analise.admissibilidade?.map((item, idx) => (
                  <div key={idx} className={`admis-item ${item.status.toLowerCase()}`}>
                    <div className="admis-icon">
                      {item.status === 'OK' && <CheckCircle size={20} />}
                      {item.status === 'ALERTA' && <AlertTriangle size={20} />}
                      {item.status === 'IMPEDITIVO' && <ShieldAlert size={20} />}
                    </div>
                    <div className="admis-content">
                      <strong>{item.fator}</strong>
                      <p>{item.justificativa}</p>
                    </div>
                  </div>
                )) || <p>Nenhum fator reportado.</p>}
              </div>
            </GlassCard>

            {/* Prazos Processuais */}
            <GlassCard className="parecer-card prazos-card">
              <h3>Prazos Processuais & Calendário</h3>
              {analise.prazos ? (
                <div className="prazos-content">
                  <div className="prazo-main">
                    <Clock size={32} color="var(--action-primary)" />
                    <div>
                      <span className="prazo-label">Vencimento Estimado</span>
                      <strong className="prazo-date">{analise.prazos.dataVencimento}</strong>
                    </div>
                  </div>
                  <p className="prazo-alerta">{analise.prazos.alertas}</p>
                </div>
              ) : <p>Sem prazos críticos identificados.</p>}
            </GlassCard>

            {/* Tabela de Evidências */}
            <GlassCard className="parecer-card evidencias-card" style={{ gridColumn: "1 / -1" }}>
              <h3>Tabela de Evidências (Fato → Prova → Folha)</h3>
              <div className="table-responsive">
                <table className="evidencias-table">
                  <thead>
                    <tr>
                      <th>Alegação / Fato</th>
                      <th>Meio de Prova Citado</th>
                      <th>Folha/ID</th>
                      <th>Força Probante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analise.evidencias?.map((ev, idx) => (
                      <tr key={idx}>
                        <td>{ev.fato}</td>
                        <td>{ev.prova}</td>
                        <td><span className="folha-badge">{ev.folha}</span></td>
                        <td>
                          <span className={`forca-badge ${ev.forca.toLowerCase()}`}>{ev.forca}</span>
                        </td>
                      </tr>
                    )) || <tr><td colSpan="4">Nenhuma evidência estruturada extraída.</td></tr>}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Matriz de Risco & Ataque */}
            <GlassCard className="parecer-card matriz-card">
              <h3>Superfície de Ataque Adversarial</h3>
              <ul className="riscos-list">
                {analise.riscos?.map((risco, idx) => (
                  <li key={idx}>
                    <ShieldAlert size={16} color="var(--status-danger)" />
                    <span>{risco}</span>
                  </li>
                )) || <li>Nenhum risco processual elevado identificado.</li>}
              </ul>
            </GlassCard>

            {/* Lacunas */}
            <GlassCard className="parecer-card lacunas-card">
              <h3>Lacunas do Caso (Missing Info)</h3>
              <ul className="lacunas-list">
                {analise.lacunas?.map((lacuna, idx) => (
                  <li key={idx}>
                    <FileSearch size={16} color="var(--status-warning)" />
                    <span>{lacuna}</span>
                  </li>
                )) || <li>Dossiê documental parece completo.</li>}
              </ul>
            </GlassCard>
          </div>

          <div className="parecer-actions">
            <button className="planejar-btn" onClick={() => router.push("/dashboard/peticoes")}>
              Planejar Peça para este Caso <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .documentos-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .alert-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .alert-banner.warning {
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }

        .alert-banner a {
          color: #f59e0b;
          text-decoration: underline;
        }

        .upload-section {
          padding: 4px; /* O GlassCard já tem padding, usamos a dropzone pra ocupar */
        }

        .upload-dropzone {
          border: 2px dashed var(--purple-600);
          border-radius: 12px;
          padding: 64px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          background: rgba(0,0,0,0.1);
        }

        .upload-dropzone:hover:not(.has-file) {
          background: rgba(59, 130, 246, 0.05);
          border-color: var(--action-primary);
        }

        .upload-prompt h3 {
          margin: 16px 0 8px;
          color: var(--ink-900);
        }

        .upload-prompt p {
          color: var(--ink-500);
          font-size: 0.9rem;
        }

        .file-ready {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .file-ready h3 {
          margin: 16px 0 4px;
          color: var(--ink-900);
        }

        .file-ready p {
          color: var(--ink-500);
          margin-bottom: 16px;
        }

        .fast-detect-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .fast-detect-badges .badge {
          background: var(--purple-100);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          color: var(--ink-900);
        }

        .file-actions {
          display: flex;
          gap: 16px;
        }

        .cancel-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--ink-500);
          cursor: pointer;
        }

        .analyze-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: var(--purple-600);
          color: #FFFFFF;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .analyze-btn:hover:not(:disabled) {
          background: var(--purple-700);
        }
        
        .analyze-btn:disabled {
          background: var(--line);
          color: var(--ink-500);
          cursor: not-allowed;
        }

        /* Progress */
        .upload-progress-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--line);
          border-top-color: var(--purple-600);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        .progress-bar {
          width: 100%;
          max-width: 400px;
          height: 8px;
          background: var(--canvas-subtle);
          border: 1px solid var(--line);
          border-radius: 4px;
          margin: 16px 0;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: var(--purple-600);
          transition: width 0.3s;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Parecer Visual */
        .parecer-container {
          animation: slideUp 0.4s ease-out;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .parecer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .parecer-header h2 {
          color: var(--ink-900);
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          color: var(--ink-700);
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .clear-btn:hover {
          background: var(--canvas-subtle);
        }

        .parecer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        .parecer-card {
          padding: 24px;
        }

        .parecer-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--ink-900);
          margin-bottom: 16px;
          border-bottom: 1px solid var(--line);
          padding-bottom: 8px;
        }

        /* Admissibilidade */
        .admis-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .admis-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: var(--canvas-subtle);
          border: 1px solid var(--line);
        }

        .admis-item.ok { border-left: 4px solid var(--status-success); }
        .admis-item.alerta { border-left: 4px solid var(--status-warning); }
        .admis-item.impeditivo { border-left: 4px solid var(--status-danger); }

        .admis-item.ok .admis-icon { color: var(--status-success); }
        .admis-item.alerta .admis-icon { color: var(--status-warning); }
        .admis-item.impeditivo .admis-icon { color: var(--status-danger); }

        .admis-content strong {
          display: block;
          color: var(--ink-900);
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .admis-content p {
          color: var(--ink-700);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        /* Prazos */
        .prazo-main {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .prazo-label {
          display: block;
          color: var(--ink-500);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .prazo-date {
          display: block;
          color: var(--ink-900);
          font-size: 1.5rem;
          font-weight: 800;
        }

        .prazo-alerta {
          background: var(--status-warning-bg);
          color: var(--status-warning);
          border: 1px solid rgba(217, 119, 6, 0.2);
          padding: 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        /* Tabela Evidencias */
        .table-responsive {
          overflow-x: auto;
        }

        .evidencias-table {
          width: 100%;
          border-collapse: collapse;
        }

        .evidencias-table th {
          text-align: left;
          padding: 12px;
          color: var(--ink-700);
          font-weight: 700;
          font-size: 0.85rem;
          border-bottom: 2px solid var(--line);
        }

        .evidencias-table td {
          padding: 12px;
          color: var(--ink-900);
          font-size: 0.9rem;
          border-bottom: 1px solid var(--line);
        }

        .folha-badge {
          background: var(--purple-100);
          color: var(--purple-900);
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: monospace;
          border: 1px solid rgba(91, 42, 134, 0.2);
        }

        .forca-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .forca-badge.alta { background: var(--status-success-bg); color: var(--status-success); }
        .forca-badge.media { background: var(--status-warning-bg); color: var(--status-warning); }
        .forca-badge.baixa { background: var(--status-danger-bg); color: var(--status-danger); }

        /* Listas Risco e Lacuna */
        .riscos-list, .lacunas-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .riscos-list li, .lacunas-list li {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          color: var(--ink-700);
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .parecer-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 32px;
        }

        .planejar-btn {
          background: var(--purple-600);
          color: #FFFFFF;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s;
        }

        .planejar-btn:hover {
          background: var(--purple-700);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(91, 42, 134, 0.25);
        }

        .alert-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 10px;
          margin-bottom: 24px;
          font-size: 0.95rem;
        }

        .alert-banner.warning {
          background: #FFFBEB;
          border: 1px solid #FDE68A;
          color: #92400E;
        }

        .banner-link-btn {
          margin-left: 8px;
          background: #7C3AED;
          color: #FFFFFF;
          border: none;
          padding: 6px 14px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .banner-link-btn:hover {
          background: #6D28D9;
        }
      `}</style>
    </div>
  );
}
