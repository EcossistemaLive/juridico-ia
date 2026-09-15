"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import GlassCard from "../../../components/common/GlassCard";
import PageHeader from "../../../components/common/PageHeader";
import { useAuth } from "../../../context/AuthContext";
import { useCaseStore } from "../../../store/useCaseStore";
import { AREA_LABELS, tiposPorGrupo, TIPOS_PECA } from "../../../lib/catalogo";
import { planejarPeca, redigirPeca, revisarPeca } from "../../../lib/api";
import { Scale, CheckCircle, ShieldAlert, ArrowRight, Play, Edit3, Download, Search, Settings, AlertTriangle } from "lucide-react";
import { Document, Packer, Paragraph, TextRun } from "docx";

export default function PeticoesPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const casoAtivo = useCaseStore(state => state.casoAtivo);
  
  // Passo atual: 1(Config), 2(Plano), 3(Redação), 4(Revisão)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Configs
  const [area, setArea] = useState(casoAtivo?.area || "civil");
  const [tipoPeca, setTipoPeca] = useState("peticao-inicial");
  
  // Resultados API
  const [plano, setPlano] = useState(null);
  const [textoGerado, setTextoGerado] = useState("");
  const [revisao, setRevisao] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (casoAtivo?.area && step === 1) {
      setArea(casoAtivo.area);
    }
  }, [casoAtivo]);

  const handlePlanejar = async () => {
    if (!casoAtivo) {
      alert("Selecione um Caso Ativo na tela de Casos primeiro.");
      return;
    }
    setLoading(true);
    const escritorioId = userProfile?.escritorioId || "escritorio_principal";
    try {
      const tipo = TIPOS_PECA.find(t => t.id === tipoPeca);
      const res = await planejarPeca({
        casoId: casoAtivo.id,
        escritorioId,
        area,
        tipoPeca: tipo.nome
      });
      setPlano(res.plano);
      setStep(2);
    } catch (err) {
      alert(err.message || "Erro no planejamento");
    } finally {
      setLoading(false);
    }
  };

  const handleRedigir = async () => {
    if (!plano?.pode_redigir) {
      alert("A redação está bloqueada devido a pendências no planejamento.");
      return;
    }
    setStep(3);
    setTextoGerado(""); // Limpa pra começar o stream
    const escritorioId = userProfile?.escritorioId || "escritorio_principal";
    try {
      const tipo = TIPOS_PECA.find(t => t.id === tipoPeca);
      await redigirPeca({
        casoId: casoAtivo.id,
        plano,
        escritorioId,
        area,
        tipoPeca: tipo.nome
      }, (chunk, completo) => {
        setTextoGerado(completo);
      });
    } catch (err) {
      alert("Erro na geração: " + err.message);
    }
  };

  const handleRevisar = async () => {
    setLoading(true);
    const escritorioId = userProfile?.escritorioId || "escritorio_principal";
    try {
      const tipo = TIPOS_PECA.find(t => t.id === tipoPeca);
      const res = await revisarPeca({
        casoId: casoAtivo.id,
        textoGerado,
        tipoPeca: tipo.nome,
        escritorioId
      });
      setRevisao(res.revisao);
      setStep(4);
    } catch (err) {
      alert(err.message || "Erro na revisão");
    } finally {
      setLoading(false);
    }
  };

  const exportDocx = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: textoGerado.split('\n').map(linha => new Paragraph({
          children: [new TextRun({ text: linha, font: "Arial", size: 24 })],
          spacing: { after: 200 }
        }))
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minuta-${tipoPeca}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grupos = tiposPorGrupo();

  if (!casoAtivo) {
    return (
      <div className="peticoes-page">
        <PageHeader title="Petições & Minutas" subtitle="Drafting inteligente de peças processuais" />
        <GlassCard className="empty-state">
          <Scale size={48} color="var(--ink-500)" />
          <h3>Nenhum Caso Ativo</h3>
          <p>Você precisa selecionar um processo em que vai atuar.</p>
          <button className="primary-btn" onClick={() => router.push("/dashboard/casos")}>
            Ir para Casos
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="peticoes-page">
      <div className="header-actions">
        <PageHeader 
          title="Redação de Peça" 
          subtitle={`Caso Ativo: ${casoAtivo.titulo} (CNJ: ${casoAtivo.numeroCnj || 'N/A'})`}
        />
        <div className="stepper">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>Config</div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>Plano Tático</div>
          <div className="step-line"></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>Redação</div>
          <div className="step-line"></div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>Auditoria</div>
        </div>
      </div>

      {/* Passo 1: Configuração */}
      {step === 1 && (
        <GlassCard className="step-content">
          <h3>Definição da Peça</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Área do Direito</label>
              <select value={area} onChange={e => setArea(e.target.value)}>
                {Object.entries(AREA_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Tipo de Peça</label>
              <select value={tipoPeca} onChange={e => setTipoPeca(e.target.value)}>
                {Object.entries(grupos).map(([grupo, tipos]) => (
                  <optgroup key={grupo} label={grupo}>
                    {tipos.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="step-actions">
            <button className="primary-btn" onClick={handlePlanejar} disabled={loading}>
              {loading ? "Desenhando Plano..." : "Desenhar Esqueleto da Peça"} <ArrowRight size={18} />
            </button>
          </div>
        </GlassCard>
      )}

      {/* Passo 2: Planejamento */}
      {step === 2 && plano && (
        <div className="plano-container">
          <GlassCard className="plano-card">
            <div className="plano-header">
              <h3>Plano Tático: Silogismo & Estrutura</h3>
              {plano.pode_redigir ? (
                <div className="badge ok"><CheckCircle size={16}/> Autorizado para Redação</div>
              ) : (
                <div className="badge bloqueado"><ShieldAlert size={16}/> Bloqueado - Faltam Elementos</div>
              )}
            </div>

            <div className="plano-body">
              <div className="plano-section">
                <h4>Premissa Maior (Fundamento Jurídico)</h4>
                <p>{plano.premissaMaior}</p>
              </div>
              <div className="plano-section">
                <h4>Premissa Menor (Fatos do Caso)</h4>
                <p>{plano.premissaMenor}</p>
              </div>
              <div className="plano-section">
                <h4>Conclusão (Pedidos)</h4>
                <p>{plano.conclusaoPedidos}</p>
              </div>

              {!plano.pode_redigir && plano.pendencias && (
                <div className="alert-box error">
                  <strong>Pendências que impedem a redação:</strong>
                  <ul>
                    {plano.pendencias.map((pend, i) => <li key={i}>{pend}</li>)}
                  </ul>
                  <button className="secondary-btn" onClick={() => router.push(`/dashboard/documentos?id=${casoAtivo.id}`)}>
                    Saneamento: Enviar mais Documentos
                  </button>
                </div>
              )}
            </div>

            <div className="step-actions">
              <button className="secondary-btn" onClick={() => setStep(1)}>Voltar</button>
              <button 
                className="primary-btn" 
                onClick={handleRedigir} 
                disabled={!plano.pode_redigir}
              >
                <Play size={18} /> Iniciar Redação IA (Streaming)
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Passo 3: Redação em Streaming */}
      {step === 3 && (
        <GlassCard className="editor-card">
          <div className="editor-header">
            <h3>Editor Interativo</h3>
            <div className="editor-tools">
              <button className="primary-btn" onClick={handleRevisar} disabled={loading || !textoGerado}>
                {loading ? "Auditando..." : "Submeter à Auditoria"} <ShieldAlert size={18} />
              </button>
            </div>
          </div>
          
          <div className="editor-wrapper">
            <textarea 
              ref={editorRef}
              className="texto-editor"
              value={textoGerado}
              onChange={(e) => setTextoGerado(e.target.value)}
              placeholder="A IA está redigindo a peça..."
            />
          </div>
        </GlassCard>
      )}

      {/* Passo 4: Revisão & Exportação */}
      {step === 4 && revisao && (
        <div className="revisao-container">
          <GlassCard className="revisao-card">
            <h3>Auditoria Adversarial</h3>
            
            <div className="achados-list">
              {revisao.achados?.map((achado, idx) => (
                <div key={idx} className={`achado-item ${achado.gravidade.toLowerCase()}`}>
                  <div className="achado-icon">
                    {achado.gravidade === 'critico' && <ShieldAlert size={20} />}
                    {achado.gravidade === 'alto' && <AlertTriangle size={20} />}
                    {achado.gravidade === 'medio' && <Search size={20} />}
                  </div>
                  <div className="achado-content">
                    <strong>{achado.titulo}</strong>
                    <p>{achado.descricao}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button className="secondary-btn" onClick={() => setStep(3)}>
                <Edit3 size={18} /> Voltar ao Editor
              </button>
              <button className="primary-btn" onClick={exportDocx}>
                <Download size={18} /> Exportar DOCX Final
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      <style jsx>{`
        .peticoes-page {
          max-width: 1200px;
          margin: 0 auto;
          padding-bottom: 64px;
        }

        .header-actions {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .stepper {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.2);
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--line);
        }

        .step {
          font-size: 0.8rem;
          color: var(--ink-500);
          font-weight: 600;
        }

        .step.active {
          color: var(--action-primary);
        }

        .step-line {
          width: 20px;
          height: 2px;
          background: var(--line);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px;
          text-align: center;
        }

        .empty-state h3 {
          margin: 16px 0 8px;
          color: var(--ink-900);
        }

        .empty-state p {
          color: var(--ink-500);
          margin-bottom: 24px;
        }

        .primary-btn {
          background: var(--purple-600);
          color: #FFFFFF;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .primary-btn:hover:not(:disabled) {
          background: var(--purple-700);
        }

        .primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .secondary-btn {
          background: #FFFFFF;
          border: 1px solid var(--line);
          color: var(--ink-700);
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }

        .secondary-btn:hover {
          background: var(--canvas-subtle);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin: 24px 0;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--ink-700);
        }

        .form-group select {
          background: #FFFFFF;
          border: 1px solid var(--line);
          padding: 12px;
          border-radius: 8px;
          color: var(--ink-900);
          font-size: 1rem;
        }

        .step-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
        }

        .plano-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .badge.ok { background: var(--status-success-bg); color: var(--status-success); }
        .badge.bloqueado { background: var(--status-danger-bg); color: var(--status-danger); }

        .plano-section {
          background: var(--canvas-subtle);
          border: 1px solid var(--line);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .plano-section h4 {
          color: var(--ink-700);
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }

        .plano-section p {
          color: var(--ink-900);
          line-height: 1.5;
        }

        .alert-box.error {
          background: var(--status-danger-bg);
          border: 1px solid rgba(220, 38, 38, 0.3);
          padding: 16px;
          border-radius: 8px;
          color: var(--status-danger);
          margin-top: 24px;
        }

        .alert-box ul {
          margin: 12px 0 16px 20px;
        }

        .editor-card {
          display: flex;
          flex-direction: column;
          height: 70vh;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .editor-wrapper {
          flex: 1;
          display: flex;
        }

        .texto-editor {
          width: 100%;
          flex: 1;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 24px;
          color: var(--ink-900);
          font-family: inherit;
          font-size: 1rem;
          line-height: 1.6;
          resize: none;
        }

        .texto-editor:focus {
          outline: none;
          border-color: var(--purple-600);
          box-shadow: 0 0 0 2px rgba(91, 42, 134, 0.15);
        }

        .achados-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 24px;
        }

        .achado-item {
          display: flex;
          gap: 16px;
          padding: 16px;
          border-radius: 8px;
          background: var(--canvas-subtle);
          border: 1px solid var(--line);
        }

        .achado-item.critico { border-left: 4px solid var(--status-danger); }
        .achado-item.alto { border-left: 4px solid #ea580c; }
        .achado-item.medio { border-left: 4px solid var(--status-warning); }

        .achado-item.critico .achado-icon { color: var(--status-danger); }
        .achado-item.alto .achado-icon { color: #ea580c; }
        .achado-item.medio .achado-icon { color: var(--status-warning); }

        .achado-content strong {
          display: block;
          color: var(--ink-900);
          font-weight: 700;
          margin-bottom: 4px;
        }

        .achado-content p {
          color: var(--ink-700);
          font-size: 0.9rem;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
