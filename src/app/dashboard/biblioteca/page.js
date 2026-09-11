"use client";

import { useState, useEffect } from "react";
import PageHeader from "../../../components/common/PageHeader";
import GlassCard from "../../../components/common/GlassCard";
import { Plus, Search, Filter, BookOpen, Edit2, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { AREA_LABELS, TIPOS_PECA } from "../../../lib/catalogo";

export default function BibliotecaPage() {
  const { userProfile } = useAuth();
  
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modeloEmEdicao, setModeloEmEdicao] = useState(null);
  const [form, setForm] = useState({
    titulo: "",
    area: "civil",
    tipoPeca: "peticao-inicial",
    conteudo: ""
  });

  const loadModelos = async () => {
    if (!userProfile?.escritorioId) return;
    setLoading(true);
    try {
      const q = query(collection(db, "templates"), where("escritorioId", "==", userProfile.escritorioId));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setModelos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModelos();
  }, [userProfile]);

  const handleOpenModal = (modelo = null) => {
    if (modelo) {
      setModeloEmEdicao(modelo.id);
      setForm({
        titulo: modelo.titulo,
        area: modelo.area,
        tipoPeca: modelo.tipoPeca,
        conteudo: modelo.conteudo
      });
    } else {
      setModeloEmEdicao(null);
      setForm({
        titulo: "",
        area: "civil",
        tipoPeca: "peticao-inicial",
        conteudo: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      if (modeloEmEdicao) {
        await updateDoc(doc(db, "templates", modeloEmEdicao), {
          ...form,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "templates"), {
          ...form,
          escritorioId: userProfile.escritorioId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      loadModelos();
    } catch (err) {
      console.error(err);
      alert("Falha ao salvar modelo");
    }
  };

  const handleExcluir = async (id) => {
    if (confirm("Tem certeza que deseja excluir esta tese/modelo?")) {
      try {
        await deleteDoc(doc(db, "templates", id));
        loadModelos();
      } catch (err) {
        console.error(err);
        alert("Falha ao excluir modelo");
      }
    }
  };

  return (
    <div className="biblioteca-page">
      <PageHeader 
        title="Biblioteca de Teses & Modelos" 
        subtitle="Suas teses cadastradas influenciam a redação de novas minutas pelo Cérebro IA."
        action={
          <button className="add-btn" onClick={() => handleOpenModal()}>
            <Plus size={20} /> Nova Tese/Modelo
          </button>
        }
      />

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input type="text" placeholder="Buscar modelo..." className="search-input" />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select className="filter-select">
            <option value="">Todas as Áreas</option>
            {Object.entries(AREA_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="modelos-grid">
        {loading ? (
          <div className="loading-state">Carregando biblioteca...</div>
        ) : modelos.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} />
            <p>Sua biblioteca está vazia.</p>
            <button onClick={() => handleOpenModal()}>Cadastrar Primeira Tese</button>
          </div>
        ) : (
          modelos.map(modelo => (
            <GlassCard key={modelo.id} className="modelo-card">
              <div className="modelo-header">
                <span className="area-badge">{AREA_LABELS[modelo.area] || modelo.area}</span>
                <div className="modelo-actions">
                  <button onClick={() => handleOpenModal(modelo)}><Edit2 size={16} /></button>
                  <button className="delete" onClick={() => handleExcluir(modelo.id)}><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="modelo-title">{modelo.titulo}</h3>
              <p className="modelo-tipo">{TIPOS_PECA.find(t => t.id === modelo.tipoPeca)?.nome || modelo.tipoPeca}</p>
              
              <div className="modelo-preview">
                {modelo.conteudo.substring(0, 120)}...
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{modeloEmEdicao ? "Editar Modelo" : "Novo Modelo / Tese"}</h2>
            <form onSubmit={handleSalvar}>
              <div className="form-group">
                <label>Título (Para sua organização)</label>
                <input 
                  type="text" 
                  required 
                  value={form.titulo}
                  onChange={e => setForm({...form, titulo: e.target.value})}
                  placeholder="Ex: Preliminar de Ilegitimidade Passiva (Telefonia)"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Área do Direito</label>
                  <select 
                    value={form.area}
                    onChange={e => setForm({...form, area: e.target.value})}
                  >
                    {Object.entries(AREA_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo de Peça (Opcional)</label>
                  <select 
                    value={form.tipoPeca}
                    onChange={e => setForm({...form, tipoPeca: e.target.value})}
                  >
                    <option value="">Aplicável a várias peças</option>
                    {TIPOS_PECA.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Conteúdo (O texto base que a IA deve utilizar)</label>
                <textarea 
                  rows="10"
                  required
                  value={form.conteudo}
                  onChange={e => setForm({...form, conteudo: e.target.value})}
                  placeholder="Cole aqui a jurisprudência, doutrina ou o esqueleto textual do seu modelo..."
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="save-btn">{modeloEmEdicao ? "Salvar Alterações" : "Salvar Modelo"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .biblioteca-page {
          max-width: 1400px;
          margin: 0 auto;
        }

        .add-btn {
          background: var(--action-primary);
          color: var(--ink-900);
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
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

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--ink-500);
        }

        .filter-select {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--line);
          padding: 8px 12px;
          border-radius: 6px;
          color: var(--ink-900);
          outline: none;
        }

        .modelos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        .modelo-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .modelo-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .area-badge {
          font-size: 0.75rem;
          background: rgba(59, 130, 246, 0.15);
          color: var(--action-primary);
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 600;
        }

        .modelo-actions {
          display: flex;
          gap: 8px;
        }

        .modelo-actions button {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--line);
          color: var(--ink-500);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
        }

        .modelo-actions button:hover {
          color: var(--ink-900);
          background: rgba(255,255,255,0.1);
        }

        .modelo-actions button.delete:hover {
          color: var(--status-danger);
          border-color: rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.1);
        }

        .modelo-title {
          font-size: 1.15rem;
          color: var(--ink-900);
          margin-bottom: 4px;
        }

        .modelo-tipo {
          font-size: 0.85rem;
          color: var(--ink-500);
          margin-bottom: 16px;
        }

        .modelo-preview {
          background: rgba(0,0,0,0.15);
          padding: 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          color: var(--ink-700);
          line-height: 1.5;
          margin-top: auto;
          white-space: pre-wrap;
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
          width: 700px;
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
