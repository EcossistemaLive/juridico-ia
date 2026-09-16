"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout({ children }) {
  const { user, userProfile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMasterAdmin = 
    user?.email === "cleber.ihs@gmail.com" || 
    user?.email === "cleberdonato@ecossistemalive.com.br";
  const isPendingApproval = !isMasterAdmin && (userProfile?.status === "pending_payment" || userProfile?.paymentApproved === false);

  useEffect(() => {
    if (mounted && !loading) {
      if (!user) {
        router.push("/login");
      } else if (isPendingApproval) {
        router.push("/pending-approval");
      } else if (!userProfile?.companyName) {
        router.push("/onboarding");
      }
    }
  }, [mounted, loading, user, userProfile, isPendingApproval, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!mounted || loading || !user || isPendingApproval || !userProfile?.companyName) {
    return (
      <div className="loading-screen">
        <span>Carregando...</span>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--ink-500);
          }
        `}</style>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", label: "📊 Dashboard", section: "main" },
    { href: "/dashboard/casos", label: "📁 Casos", section: "main" },
    { href: "/dashboard/documentos", label: "📄 Documentos & Análise", section: "main" },
    { href: "/dashboard/peticoes", label: "⚖️ Peças & Minutas", section: "main" },
    { href: "/dashboard/biblioteca", label: "📚 Biblioteca de Modelos", section: "main" },
    { href: "/dashboard/settings", label: "⚙️ Configurações", section: "footer" }
  ];

  const mainNav = navItems.filter(item => item.section === "main");
  const configNav = navItems.filter(item => item.section === "footer");

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link href="/dashboard" className="brand-logo">
            <span className="logo-text-juridico">Jurídico</span>
            <span className="logo-badge-ia">IA</span>
          </Link>
        </div>

        <div className="company-badge">
          <span className="company-label">Empresa</span>
          <span className="company-name">{userProfile.companyName}</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="nav-section-title">Menu Principal</span>
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="nav-section">
            <span className="nav-section-title">Sistema</span>
            {configNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {isMasterAdmin && (
            <div className="nav-section">
              <span className="nav-section-title" style={{ color: "#3B82F6" }}>Administração</span>
              <Link
                href="/dashboard/admin/users"
                className={`nav-item ${pathname === "/dashboard/admin/users" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <span>Aprovar Usuários</span>
                <span style={{ 
                  background: "#3B82F6", 
                  color: "#FFFFFF", 
                  fontSize: "0.65rem", 
                  fontWeight: "800", 
                  padding: "1px 6px", 
                  borderRadius: "10px" 
                }}>
                  ADMIN
                </span>
              </Link>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <span className="user-label">Logado como</span>
            <span className="user-email">{userProfile.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Sair da Conta
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <style jsx>{`
        .dashboard-layout {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 240px;
          background: var(--purple-900);
          border-right: 1px solid var(--purple-800);
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
          overflow-y: auto;
        }

        .sidebar-header {
          padding: 24px 20px 20px;
          border-bottom: 1px solid var(--purple-800);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-logo {
          font-size: 1.5rem;
          font-weight: 800;
          text-decoration: none !important;
          letter-spacing: -0.02em;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .logo-text-juridico {
          color: #FFFFFF !important;
          font-weight: 800;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        .logo-badge-ia {
          color: #FBBF24 !important;
          background: rgba(251, 191, 36, 0.18);
          border: 1px solid rgba(251, 191, 36, 0.45);
          padding: 2px 7px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 900;
          letter-spacing: 0.5px;
          line-height: 1;
        }

        .company-badge {
          margin: 20px 16px 0;
          padding: 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
        }

        .company-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          color: #DDD6FE;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }

        .company-name {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: #FFFFFF;
        }

        .sidebar-nav {
          flex: 1;
          padding: 24px 12px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .nav-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-section-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: #DDD6FE;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0 12px;
          margin-bottom: 8px;
        }

        .nav-item {
          padding: 10px 16px;
          border-radius: 8px;
          color: #E2E8F0;
          text-decoration: none !important;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #FFFFFF !important;
        }

        .nav-item.active {
          background: var(--purple-600) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          color: #FFFFFF !important;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--purple-800);
          margin-top: auto;
        }

        .user-info {
          margin-bottom: 12px;
        }

        .user-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 600;
          color: #DDD6FE;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 2px;
        }

        .user-email {
          font-size: 0.8rem;
          color: #F1F5F9;
          word-break: break-all;
        }

        .logout-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #FFFFFF;
          padding: 10px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .logout-btn:hover {
          background: rgba(220, 38, 38, 0.2);
          border-color: rgba(220, 38, 38, 0.5);
          color: #FCA5A5;
        }

        .main-content {
          flex: 1;
          margin-left: 240px;
          padding: 32px 48px;
          min-height: 100vh;
        }

        @media (max-width: 1024px) {
          .main-content {
            padding: 24px;
          }
        }

        @media (max-width: 900px) {
          .sidebar {
            display: none;
          }

          .main-content {
            margin-left: 0;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
