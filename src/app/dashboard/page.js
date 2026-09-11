"use client";

import { useState, useEffect } from "react";
import GlassCard from "../../components/common/GlassCard";
import StatCard from "../../components/common/StatCard";
import { Plus, TrendingUp, Scale, Calendar, FileText, ArrowRight, Zap, Target, Info, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";

export default function DashboardHome() {
  const { userProfile, user } = useAuth();
  const [stats, setStats] = useState({
    casos: 0,
    documentos: 0,
    minutas: 0,
    prazos: 0
  });

  useEffect(() => {
    async function fetchStats() {
      if (user?.uid && userProfile?.escritorioId) {
        try {
          // Aqui no futuro podemos buscar do Firestore. Por enquanto, valores mocados ou queries básicas.
          // const qCasos = query(collection(db, "cases"), where("escritorioId", "==", userProfile.escritorioId));
          // const snapshot = await getCountFromServer(qCasos);
          setStats({
            casos: 12,
            documentos: 45,
            minutas: 3,
            prazos: 2
          });
        } catch (e) {
          console.error("Error fetching stats:", e);
        }
      }
    }
    fetchStats();
  }, [user, userProfile]);

  return (
    <div className="modern-dashboard">
      {/* Header Section */}
      <div className="dashboard-hero">
        <div className="hero-content">
          <h1>Olá, <span className="highlight">{userProfile?.name || "Advogado(a)"}</span> 👋</h1>
          <p>Seu centro de comando para inteligência processual</p>
        </div>
        <div className="quick-actions">
          <Link href="/dashboard/casos" className="action-btn primary">
            <Plus size={20} />
            <span>Novo Caso</span>
          </Link>
          <Link href="/dashboard/documentos" className="action-btn secondary">
            <FileText size={20} />
            <span>Analisar Documento</span>
          </Link>
          <Link href="/dashboard/peticoes" className="action-btn secondary">
            <Scale size={20} />
            <span>Redigir Peça</span>
          </Link>
        </div>
      </div>

      {/* Guia de Fluxo da Plataforma */}
      <div className="platform-workflow-banner">
        <div className="workflow-title-row">
          <Info size={20} color="var(--purple-600)" />
          <h3>Como Funciona o Fluxo Jurídico IA</h3>
        </div>
        <div className="workflow-steps-grid">
          <div className="workflow-step-card">
            <span className="step-badge">1</span>
            <h4>Triagem & Admissibilidade</h4>
            <p>Faça o upload da inicial/documentos para verificar decadência, prescrição, tempestividade e competência automaticamente.</p>
          </div>
          <div className="workflow-step-card">
            <span className="step-badge">2</span>
            <h4>Evidências & Fato/Folha</h4>
            <p>O cérebro extrai as alegações e cruza com as provas, montando uma tabela rastreável (Fato → Prova → Folha).</p>
          </div>
          <div className="workflow-step-card">
            <span className="step-badge">3</span>
            <h4>Planejamento Silogístico</h4>
            <p>A IA desenha o esqueleto da peça baseada na lei e na tese central, bloqueando a redação caso falte algum elemento chave.</p>
          </div>
          <div className="workflow-step-card">
            <span className="step-badge">4</span>
            <h4>Redação & Auditoria Adversarial</h4>
            <p>A minuta é gerada em tempo real com auditoria de riscos, simulando os ataques da parte contrária antes do protocolo.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          variant="briefcase"
          icon={<Scale size={24} />}
          value={stats.casos}
          label="Total de Casos Ativos"
          trend={0}
        />

        <StatCard
          variant="users"
          icon={<FileText size={24} />}
          value={stats.documentos}
          label="Documentos Analisados"
          trend={0}
        />

        <StatCard
          variant="calendar"
          icon={<CheckCircle size={24} />}
          value={stats.minutas}
          label="Minutas em Elaboração"
        />

        <StatCard
          variant="target"
          icon={<Calendar size={24} />}
          value={stats.prazos}
          label="Prazos Críticos (7 dias)"
        />
      </div>

      {/* Main Content Grid */}
      <div className="content-grid">
        {/* Parecer Visual Card */}
        <GlassCard className="feature-card ai-card">
          <div className="card-header">
            <div className="card-icon">
              <Zap size={28} />
            </div>
            <div className="status-badge active">
              <span className="pulse-dot"></span>
              Ativo
            </div>
          </div>
          <h3>Parecer Visual Estruturado</h3>
          <p>Obtenha uma análise imediata dos riscos processuais e admissibilidade ao receber um caso.</p>
          <Link href="/dashboard/documentos" className="card-action">
            Iniciar Parecer
            <ArrowRight size={18} />
          </Link>
        </GlassCard>

        {/* Petição Inteligente Card */}
        <GlassCard className="feature-card job-card">
          <div className="card-header">
            <div className="card-icon">
              <Target size={28} />
            </div>
          </div>
          <h3>Draft de Peças</h3>
          <p>Acesse o motor gerador que garante foco cirúrgico na doutrina e coerência fática.</p>
          <Link href="/dashboard/peticoes" className="card-action">
            Acessar Drafting
            <ArrowRight size={18} />
          </Link>
        </GlassCard>

        {/* Biblioteca Card */}
        <GlassCard className="feature-card pipeline-card">
          <div className="card-header">
            <div className="card-icon">
              <Shield size={28} />
            </div>
          </div>
          <h3>Biblioteca e Modelos</h3>
          <p>Centralize suas próprias teses para influenciar diretamente a geração de minutas da IA.</p>
          <Link href="/dashboard/biblioteca" className="card-action">
            Ver Biblioteca
            <ArrowRight size={18} />
          </Link>
        </GlassCard>
      </div>

      <style jsx>{`
        .modern-dashboard {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0;
        }

        /* Hero Section */
        .dashboard-hero {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(30, 41, 59, 0.5) 100%);
          border-radius: 20px;
          padding: 36px 40px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid var(--line);
        }

        /* Platform Workflow Banner */
        .platform-workflow-banner {
          background: var(--ink-900);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 32px;
        }

        .workflow-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .workflow-title-row h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--ink-900);
          margin: 0;
        }

        .workflow-steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .workflow-step-card {
          background: var(--purple-100);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 16px;
          position: relative;
        }

        .step-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--purple-600);
          color: var(--ink-900);
          font-weight: 800;
          font-size: 0.8rem;
          margin-bottom: 10px;
        }

        .workflow-step-card h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--ink-900);
          margin-bottom: 6px;
        }

        .workflow-step-card p {
          font-size: 0.82rem;
          color: var(--ink-500);
          line-height: 1.5;
          margin: 0;
        }

        .hero-content h1 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 8px;
          color: var(--ink-900);
        }

        .hero-content .highlight {
          color: var(--action-primary);
        }

        .hero-content p {
          font-size: 1.1rem;
          opacity: 0.7;
          color: var(--ink-900);
        }

        .quick-actions {
          display: flex;
          gap: 16px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }

        .action-btn.primary {
          background: var(--purple-600);
          color: var(--ink-900);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
        }

        .action-btn.primary:hover {
          background: #2563EB;
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(59, 130, 246, 0.45);
        }

        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.08);
          color: var(--ink-900);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.25);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          padding: 32px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          transition: all 0.3s ease;
          min-height: 280px;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .card-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(59, 130, 246, 0.12);
          color: var(--purple-600);
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--status-success);
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--status-success);
          animation: pulse 2s infinite;
        }

        .feature-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 12px;
          color: var(--ink-900);
        }

        .feature-card p {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--ink-700);
          margin-bottom: 24px;
          flex: 1;
        }

        .card-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--action-primary);
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .card-action:hover {
          gap: 12px;
          color: var(--ink-900);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Responsive */
        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .content-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .dashboard-hero {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }

          .quick-actions {
            width: 100%;
            flex-direction: column;
          }

          .action-btn {
            width: 100%;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .content-grid {
            grid-template-columns: 1fr;
          }

          .hero-content h1 {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
