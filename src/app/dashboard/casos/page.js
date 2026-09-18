"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import GlassCard from "../../../components/common/GlassCard";
import PageHeader from "../../../components/common/PageHeader";
import { Plus, Search, Filter, Folder, ArrowLeft, Building2, Scale, Users, Gavel, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useCaseStore } from "../../../store/useCaseStore";

// Componente principal envelopado em Suspense devido ao useSearchParams
export default function CasosPage() {
  return (
    <Suspense fallback={<div>Carregando casos...</div>}>
      <CasosContent />
    </Suspense>
  );
}

function CasosContent() {
  const { userProfile, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const casoId = searchParams.get("id");

  const setCasoAtivo = useCaseStore((state) => state.setCasoAtivo);
  const casoAtivoId = useCaseStore((state) => state.casoAtivoId);

  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [casoAtual, setCasoAtual] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [novoCaso, setNovoCaso] = useState({
    titulo: "",
    area: "civel",
    polo: "autor",
    numeroCnj: "",
    comarcaVara: "",
    rito: "ordinario",
    valorCausa: "",
    teseCentral: "",
    status: "ativo"
  });

  useEffect(() => {
    async function loadCasos() {
      if (!userProfile?.escritorioId) return;
      try {
        setLoading(true);
        const q = query(
          collection(db, "cases"),
          where("escritorioId", "==", userProfile.escritorioId)
        );
        const snapshot = await getDocs(q);
        const casosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCasos(casosData);
      } catch (err) {
        console.error("Erro ao carregar casos:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCasos();
  }, [userProfile, isModalOpen]);

  useEffect(() => {
    async function loadCasoDetalhe() {
      if (!casoId || !userProfile?.escritorioId) return;
      try {
        setLoading(true);
        const ref = doc(db, "cases", casoId);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().escritorioId === userProfile.escritorioId) {
          setCasoAtual({ id: snap.id, ...snap.data() });
        } else {
          setCasoAtual(null);
        }
      } catch (err) {
        console.error("Erro ao carregar detalhe:", err);
      } finally {
        setLoading(false);
      }
    }

    if (casoId) {
      loadCasoDetalhe();
    } else {
      setCasoAtual(null);
    }
  }, [casoId, userProfile]);

  const formatarCnj = (value) => {
    return value.replace(/\D/g, "")
      .replace(/^(\d{7})(\d)/, "$1-$2")
      .replace(/-(\d{2})(\d)/, "-$1.$2")
      .replace(/\.(\d{4})(\d)/, ".$1.$2")
      .replace(/\.(\d{1})(\d)/, ".$1.$2")
      .replace(/\.(\d{2})(\d)/, ".$1.$2")
      .replace(/\.(\d{4})$/, ".$1");
  };

  const handleCriarCaso = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Sessão não encontrada. Faça login novamente.");
      return;
    }
    const escritorioId = userProfile?.escritorioId || "escritorio_principal";
    try {
      const docRef = await addDoc(collection(db, "cases"), {
        ...novoCaso,
        escritorioId,
        criadoPor: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      router.push(`/dashboard/casos?id=${docRef.id}`);
    } catch (err) {
      console.error("Erro ao criar caso:", err);
      alert("Falha ao criar o caso: " + (err.message || "Erro desconhecido."));
    }
  };

  const selecionarCasoAtivo = () => {
    if (casoAtual) {
      setCasoAtivo(casoAtual);
    }
  };

  const irParaPeticoes = () => {
    if (casoAtual) {
      setCasoAtivo(casoAtual);
      router.push("/dashboard/peticoes");
    }
  };

  const irParaDocumentos = () => {
    if (casoAtual) {
      setCasoAtivo(casoAtual);
      router.push("/dashboard/documentos");
    }
  };

  // Visão Detalhe (Ficha do Caso)
  if (casoId) {
    if (loading) return <div className="loading-state">Carregando detalhes...</div>;
    if (!casoAtual) return <div className="error-state">Caso não encontrado ou sem permissão.</div>;

    const isActiveSession = casoAtivoId === casoAtual.id;

    return (
      <div className="caso-detalhe-page">
        <button className="back-btn" onClick={() => router.push("/dashboard/casos")}>
          <ArrowLeft size={16} /> Voltar para a Lista
        </button>
        
        <PageHeader 
          title={casoAtual.titulo} 
          subtitle={`Cadastrado em ${casoAtual.createdAt?.toDate ? casoAtual.createdAt.toDate().toLocaleDateString('pt-BR') : 'recente'}`}
          actions={
            <div className="header-buttons">
              <button 
                className={`action-btn ${isActiveSession ? 'active' : 'primary'}`}
                onClick={selecionarCasoAtivo}
              >
                {isActiveSession ? <><CheckCircle size={18}/> Caso Ativo na Sessão</> : <><Scale size={18}/> Definir como Caso Ativo</>}
              </button>
              <button 
                className="action-btn secondary"
                onClick={irParaPeticoes}
              >
                <Gavel size={18}/> Elaborar Petição
              </button>
              <button 
                className="action-btn secondary"
                onClick={irParaDocumentos}
              >
                <Folder size={18}/> Analisar Documento
              </button>
            </div>
          }
        />

        <div className="ficha-grid">
          <GlassCard className="info-card">
            <h3>Dados Processuais</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Número CNJ</span>
                <span className="info-value highlight">{casoAtual.numeroCnj || 'Não informado'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Área do Direito</span>
                <span className="info-value" style={{textTransform: 'capitalize'}}>{casoAtual.area}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Comarca / Vara</span>
                <span className="info-value">{casoAtual.comarcaVara}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Rito Processual</span>
                <span className="info-value" style={{textTransform: 'capitalize'}}>{casoAtual.rito}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Valor da Causa</span>
                <span className="info-value">{casoAtual.valorCausa || 'Inestimável'}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="info-card">
            <h3>Tática e Estratégia</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Nosso Polo</span>
                <span className="info-value badge">{casoAtual.polo}</span>
              </div>
              <div className="info-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="info-label">Tese Central</span>
                <p className="info-text">{casoAtual.teseCentral || 'Nenhuma tese definida ainda.'}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        <style jsx>{`
          .caso-detalhe-page {
            max-width: 1200px;
            margin: 0 auto;
          }
          .back-btn {
            background: none;
            border: none;
            color: var(--ink-500);
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            margin-bottom: 24px;
            transition: color 0.2s;
          }
          .back-btn:hover {
            color: var(--action-primary);
          }
          .header-buttons {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .action-btn {
            padding: 10px 18px;
            border-radius: 8px;
            border: none;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
            transition: all 0.2s;
          }
          .action-btn.primary {
            background: #7C3AED;
            color: #FFFFFF !important;
            box-shadow: 0 2px 4px rgba(124, 58, 237, 0.2);
          }
          .action-btn.primary:hover {
            background: #6D28D9;
          }
          .action-btn.active {
            background: #ECFDF5;
            color: #059669 !important;
            border: 1px solid #10B981;
          }
          .action-btn.secondary {
            background: #F8FAFC;
            color: #334155 !important;
            border: 1px solid #CBD5E1;
          }
          .action-btn.secondary:hover {
            background: #F1F5F9;
            color: #0F172A !important;
          }
          .ficha-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 32px;
          }
          .info-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 16px;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }
          .info-item:last-child {
            border-bottom: none;
          }
          .info-label {
            color: var(--ink-500);
            font-size: 0.85rem;
          }
          .info-value {
            color: var(--ink-900);
            font-weight: 600;
          }
          .info-value.highlight {
            color: var(--action-primary);
            font-family: monospace;
            font-size: 1rem;
          }
          .info-value.badge {
            background: var(--purple-100);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8rem;
            text-transform: uppercase;
          }
          .info-text {
            color: var(--ink-700);
            font-size: 0.95rem;
            line-height: 1.5;
            margin-top: 8px;
            background: rgba(0,0,0,0.2);
            padding: 12px;
            border-radius: 8px;
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  // Visão Lista
  return (
    <div className="casos-page">
      <PageHeader 
        title="Casos e Processos" 
        subtitle="Gerencie seus casos para análise e elaboração de minutas."
        action={
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> Novo Caso
          </button>
        }
      />

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Buscar por título ou CNJ..." className="search-input" />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select className="filter-select">
            <option value="">Todas as Áreas</option>
            <option value="civil">Cível</option>
            <option value="trabalhista">Trabalhista</option>
            <option value="penal">Penal</option>
          </select>
          <select className="filter-select">
            <option value="">Qualquer Polo</option>
            <option value="autor">Polo Ativo (Autor)</option>
            <option value="reu">Polo Passivo (Réu)</option>
          </select>
        </div>
      </div>

      <div className="casos-grid">
        {loading ? (
          <div className="loading-state">Carregando...</div>
        ) : casos.length === 0 ? (
          <div className="empty-state">
            <Folder size={48} />
            <p>Nenhum caso cadastrado.</p>
            <button onClick={() => setIsModalOpen(true)}>Criar meu primeiro caso</button>
          </div>
        ) : (
          casos.map(caso => {
            const isCardActive = casoAtivoId === caso.id;
            return (
              <GlassCard key={caso.id} className={`caso-card ${isCardActive ? 'card-active' : ''}`}>
                <div className="caso-header">
                  <span className={`status-badge ${caso.status === 'ativo' ? 'active' : ''}`}>{caso.status}</span>
                  {isCardActive && (
                    <span className="badge-active-tag">
                      <CheckCircle size={12} /> Ativo na Sessão
                    </span>
                  )}
                  <span className="polo-badge">{caso.polo}</span>
                </div>
                <h3 className="caso-title">{caso.titulo}</h3>
                <p className="caso-cnj">{caso.numeroCnj || "Sem número CNJ"}</p>
                
                <div className="caso-footer">
                  <span className="area-tag">{caso.area}</span>
                  <div className="card-btn-group">
                    <button 
                      type="button"
                      className={`btn-card-activate ${isCardActive ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCasoAtivo(caso);
                      }}
                    >
                      {isCardActive ? '✓ Ativo' : 'Ativar Caso'}
                    </button>
                    <button className="view-btn" onClick={() => router.push(`/dashboard/casos?id=${caso.id}`)}>
                      Ver Ficha <ArrowLeft size={16} style={{transform: 'rotate(180deg)'}} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Novo Caso</h2>
            <form onSubmit={handleCriarCaso}>
              <div className="form-group">
                <label>Título do Caso (Ex: Silva vs Empresa X)</label>
                <input 
                  type="text" 
                  required 
                  value={novoCaso.titulo}
                  onChange={e => setNovoCaso({...novoCaso, titulo: e.target.value})}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Número CNJ</label>
                  <input 
                    type="text" 
                    placeholder="0000000-00.0000.0.00.0000"
                    value={novoCaso.numeroCnj}
                    onChange={e => setNovoCaso({...novoCaso, numeroCnj: formatarCnj(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Comarca / Vara</label>
                  <input 
                    type="text" 
                    value={novoCaso.comarcaVara}
                    onChange={e => setNovoCaso({...novoCaso, comarcaVara: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Área do Direito</label>
                  <select 
                    value={novoCaso.area}
                    onChange={e => setNovoCaso({...novoCaso, area: e.target.value})}
                  >
                    <option value="civil">Cível</option>
                    <option value="trabalhista">Trabalhista</option>
                    <option value="penal">Penal</option>
                    <option value="familia">Família</option>
                    <option value="consumidor">Consumidor</option>
                    <option value="tributario">Tributário</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Polo de Atuação</label>
                  <select 
                    value={novoCaso.polo}
                    onChange={e => setNovoCaso({...novoCaso, polo: e.target.value})}
                  >
                    <option value="autor">Polo Ativo (Autor/Exequente)</option>
                    <option value="reu">Polo Passivo (Réu/Executado)</option>
                    <option value="terceiro">Terceiro Interessado</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Tese Central (Resumo Estratégico)</label>
                <textarea 
                  rows="3"
                  value={novoCaso.teseCentral}
                  onChange={e => setNovoCaso({...novoCaso, teseCentral: e.target.value})}
                  placeholder="Ex: Aplicação do CDC com inversão do ônus da prova devido à hipossuficiência técnica..."
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="save-btn">Criar Caso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .casos-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .add-btn {
          background: #7C3AED;
          color: #FFFFFF !important;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.2s;
          box-shadow: 0 2px 6px rgba(124, 58, 237, 0.25);
        }

        .add-btn:hover {
          background: #6D28D9;
        }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--purple-900);
          padding: 16px 24px;
          border-radius: 12px;
          margin-bottom: 24px;
          border: 1px solid var(--line);
        }

        .search-box {
          position: relative;
          width: 350px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--ink-500);
        }

        .search-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--line);
          padding: 10px 10px 10px 40px;
          border-radius: 8px;
          color: var(--ink-900);
          outline: none;
        }

        .search-input:focus {
          border-color: var(--action-primary);
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--ink-500);
        }

        .filter-select {
          background: #FFFFFF;
          border: 1px solid var(--line);
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--ink-900);
          outline: none;
          cursor: pointer;
        }

        .casos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .caso-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          border: 1px solid var(--line);
        }
        
        .caso-card:hover {
          transform: translateY(-4px);
        }

        .caso-card.card-active {
          border: 2px solid #10B981;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.15);
        }

        .caso-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 6px;
          background: var(--canvas-subtle);
          color: var(--ink-700);
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: var(--status-success-bg);
          color: var(--status-success);
          font-weight: 700;
        }

        .badge-active-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          background: #ECFDF5;
          color: #059669;
          border: 1px solid #10B981;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .polo-badge {
          font-size: 0.75rem;
          font-weight: 700;
          background: var(--purple-100);
          color: var(--purple-800);
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .caso-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--ink-900);
          margin-bottom: 8px;
        }

        .caso-cnj {
          font-family: monospace;
          color: var(--ink-500);
          font-size: 0.85rem;
          margin-bottom: 24px;
        }

        .caso-footer {
          margin-top: auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }

        .card-btn-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-card-activate {
          background: #7C3AED;
          color: #FFFFFF !important;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-card-activate:hover {
          background: #6D28D9;
        }

        .btn-card-activate.active {
          background: #ECFDF5;
          color: #059669 !important;
          border: 1px solid #10B981;
          cursor: default;
        }

        .area-tag {
          font-size: 0.8rem;
          background: var(--purple-100);
          color: var(--purple-900);
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 12px;
          text-transform: capitalize;
        }

        .view-btn {
          background: none;
          border: none;
          color: var(--purple-600);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          font-weight: 700;
          transition: color 0.2s;
        }

        .view-btn:hover {
          color: var(--purple-700);
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px;
          color: var(--ink-500);
          background: #FFFFFF;
          border-radius: 12px;
          border: 1px dashed var(--line);
        }
        
        .empty-state button {
          margin-top: 16px;
          background: var(--purple-600);
          border: none;
          color: #FFFFFF;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #FFFFFF;
          width: 600px;
          max-width: 90%;
          border-radius: 16px;
          padding: 32px;
          border: 1px solid var(--line);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
        }

        .modal-content h2 {
          color: var(--ink-900);
          font-weight: 800;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--ink-700);
          margin-bottom: 6px;
        }

        .form-group input, .form-group select, .form-group textarea {
          background: #FFFFFF;
          border: 1px solid var(--line);
          padding: 10px;
          border-radius: 8px;
          color: var(--ink-900);
          font-family: inherit;
        }

        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none;
          border-color: var(--purple-600);
          box-shadow: 0 0 0 2px rgba(91, 42, 134, 0.15);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .cancel-btn {
          background: none;
          border: 1px solid var(--line);
          color: var(--ink-700);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        
        .cancel-btn:hover {
          background: var(--canvas-subtle);
        }

        .save-btn {
          background: var(--purple-600);
          border: none;
          color: #FFFFFF;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
        }

        .save-btn:hover {
          background: var(--purple-700);
        }
      `}</style>
    </div>
  );
}
