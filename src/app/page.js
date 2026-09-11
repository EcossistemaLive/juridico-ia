"use client";

import GlassCard from "../components/common/GlassCard";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="nav-brand">
          <span className="brand-text brand-underline">
            <span className="text-brand-recruit">Jurídico</span>
            <span className="text-brand-ai"> IA</span>
          </span>
        </div>
        <div className="nav-links">
          <Link href="/login" className="btn-secondary">Entrar</Link>
          <Link href="/login" className="btn-indigo">
            Começar Grátis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <p className="hero-eyebrow">Plataforma de IA para Advogados</p>
          <h1 className="hero-title">
            Redija a <span className="text-gradient">tese</span>,<br />
            não apenas a petição.
          </h1>
          <p className="hero-subtitle">
            Transforme o trabalho burocrático em uma experiência de alta performance.
            Nossa IA entende o caso, planeja as teses com base na sua biblioteca e redige a melhor
            peça da sua vida.
          </p>
          <div className="hero-cta">
            <Link href="/login" className="btn-primary-large">
              <span>Experimente a Nova Era</span> <ArrowRight size={18} />
            </Link>
            <span className="hero-disclaimer">7 dias grátis • Sem cartão de crédito</span>
          </div>
        </div>
      </section>

      {/* Problem vs Solution */}
      <section className="contrast-section">
        <div className="contrast-grid">
          <GlassCard className="contrast-card old">
            <span className="contrast-label">A Velha Advocacia</span>
            <p>&quot;Copiar e colar de modelos antigos, petições genéricas e processos que consomem horas valiosas.&quot;</p>
          </GlassCard>
          <GlassCard className="contrast-card new">
            <span className="contrast-label">A Nova Era</span>
            <p>&quot;Interface inteligente, análise tática e uma IA que atua como seu Assessor Jurídico.&quot;</p>
          </GlassCard>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="pillars-section">
        <div className="section-header">
          <h2>Como Funciona</h2>
          <p>Três módulos integrados para revolucionar sua atuação jurídica</p>
        </div>
        <div className="pillars-grid">
          <GlassCard className="pillar-card">
            <span className="pillar-number">01</span>
            <h3>Análise de Documentos</h3>
            <p>Faça upload dos autos do processo. Nossa IA lê tudo, gera uma matriz de risco, extrai prazos e elabora a tabela de evidências automaticamente.</p>
          </GlassCard>

          <GlassCard className="pillar-card">
            <span className="pillar-number">02</span>
            <h3>Planejamento Tático</h3>
            <p>Antes de escrever, defina o esqueleto silogístico. A plataforma aponta pendências e garante que a peça só será redigida se houver material.</p>
          </GlassCard>

          <GlassCard className="pillar-card">
            <span className="pillar-number">03</span>
            <h3>Redação & Auditoria</h3>
            <p>Assista a IA redigindo em tempo real e realize uma auditoria adversarial que simula os argumentos da parte contrária antes de exportar o DOCX.</p>
          </GlassCard>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">73%</span>
            <span className="stat-label">Redução no tempo de redação</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">100%</span>
            <span className="stat-label">Conferência dos Checklist</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">&lt;2min</span>
            <span className="stat-label">Para analisar documentos complexos</span>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="trust-section">
        <GlassCard className="trust-card">
          <p className="trust-text">
            &quot;Para escritórios que não buscam apenas protocolar petições, mas ganhar causas.
            A plataforma escolhida por advogados que valorizam a inteligência e o tempo.&quot;
          </p>
        </GlassCard>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <h2>Pronto para transformar<br />seu escritório?</h2>
        <Link href="/login" className="btn-primary-large">
          <span>Começar Agora</span> <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-brand">Jurídico IA</div>
        <div className="footer-links">
          <Link href="/terms">Termos</Link>
          <Link href="/privacy">Privacidade</Link>
          <Link href="/contact">Contato</Link>
        </div>
        <p className="footer-copy">© 2026 Ecossistema Live. Todos os direitos reservados.</p>
      </footer>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* Navigation */
        .nav-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 6%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .brand-text {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .text-accent {
          color: #F59E0B;
        }

        .text-brand-ai {
           color: #F59E0B;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .nav-link {
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: var(--text-primary);
        }

        /* Hero */
        .hero-section {
          padding: 100px 6% 140px;
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }

        .hero-eyebrow {
          color: var(--action-primary);
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 28px;
          letter-spacing: -0.03em;
          color: var(--text-primary);
        }

        .text-gradient {
          background: linear-gradient(135deg, var(--action-primary) 0%, var(--action-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          line-height: 1.7;
          color: rgba(251, 247, 240, 0.75);
          margin-bottom: 48px;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .btn-primary-large {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 18px 40px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 1.05rem;
          transition: all 0.2s;
        }

        .btn-primary-large:hover {
          background: var(--action-primary) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(244, 169, 0, 0.5) !important;
          color: var(--text-dark) !important;
        }

        .hero-disclaimer {
          font-size: 0.9rem;
          color: var(--text-muted);
          opacity: 0.7;
        }

        /* Contrast Section */
        .contrast-section {
          padding: 80px 6%;
          max-width: 1000px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 20px;
          margin-bottom: 40px;
        }

        .contrast-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .contrast-card {
          padding: 40px;
          background: linear-gradient(180deg, rgba(42, 36, 32, 0.9) 0%, rgba(26, 22, 20, 0.8) 100%);
          border: 1px solid var(--border-glass);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .contrast-card.old {
          opacity: 0.7;
          border-left: 3px solid rgba(212, 184, 150, 0.1);
        }

        .contrast-card.new {
          border-left: 3px solid var(--action-primary);
        }

        .contrast-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
          color: var(--text-muted);
        }

        .contrast-card p {
          font-size: 1.1rem;
          line-height: 1.6;
          font-style: italic;
          color: var(--text-primary);
        }

        /* Pillars Section */
        .pillars-section {
          padding: 120px 6%;
          max-width: 1200px;
          margin: 0 auto;
          background: rgba(0, 0, 0, 0.2);
        }

        .section-header {
          text-align: center;
          margin-bottom: 64px;
        }

        .section-header h2 {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .section-header p {
          font-size: 1.1rem;
          color: var(--text-muted);
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }

        .pillar-card {
          padding: 48px 36px;
          background: linear-gradient(180deg, rgba(42, 36, 32, 0.9) 0%, rgba(26, 22, 20, 0.8) 100%);
          border: 1px solid var(--border-glass);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }

        .pillar-number {
          display: block;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--action-primary);
          margin-bottom: 24px;
          letter-spacing: 1px;
        }

        .pillar-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--text-primary);
        }

        .pillar-card p {
          font-size: 0.95rem;
          line-height: 1.7;
          color: rgba(251, 247, 240, 0.7);
        }

        /* Stats Section */
        .stats-section {
          padding: 100px 6%;
          background: linear-gradient(180deg, transparent, rgba(244, 169, 0, 0.03), transparent);
        }

        .stats-grid {
          display: flex;
          justify-content: center;
          gap: 80px;
          max-width: 900px;
          margin: 0 auto;
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          display: block;
          font-size: 3rem;
          font-weight: 800;
          color: var(--action-primary);
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .stat-label {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Trust Section */
        .trust-section {
          padding: 60px 6%;
          max-width: 800px;
          margin: 0 auto;
        }

        .trust-card {
          padding: 48px;
          text-align: center;
        }

        .trust-text {
          font-size: 1.15rem;
          line-height: 1.8;
          font-style: italic;
          color: rgba(251, 247, 240, 0.8);
        }

        /* Final CTA */
        .final-cta-section {
          padding: 140px 6%;
          text-align: center;
        }

        .final-cta-section h2 {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 40px;
          line-height: 1.2;
        }

        /* Footer */
        .landing-footer {
          padding: 48px 6%;
          border-top: 1px solid var(--border-glass);
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1400px;
          margin: 0 auto;
          flex-wrap: wrap;
          gap: 24px;
        }

        .footer-brand {
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--text-primary);
        }

        .footer-links {
          display: flex;
          gap: 32px;
        }

        .footer-links a {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s;
        }

        .footer-links a:hover {
          color: var(--action-primary);
        }

        .footer-copy {
          font-size: 0.85rem;
          color: rgba(251, 247, 240, 0.4);
        }

        /* Mobile */
        @media (max-width: 1024px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .pillars-grid {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            flex-direction: column;
            gap: 48px;
          }

          .contrast-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .nav-bar {
            flex-direction: column;
            gap: 20px;
          }

          .hero-section {
            padding: 60px 6% 80px;
          }

          .hero-title {
            font-size: 2rem;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .section-header h2 {
            font-size: 1.75rem;
          }

          .final-cta-section h2 {
            font-size: 1.75rem;
          }

          .landing-footer {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
