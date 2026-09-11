"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

/**
 * Statistic Card for Dashboard
 * 
 * @param {object} props
 * @param {React.ReactNode} props.icon - Lucide icon
 * @param {string|number} props.value - Main value to display
 * @param {string} props.label - Description of the value
 * @param {number} props.trend - Optional trend percentage (positive or negative)
 * @param {string} props.variant - Color variant (briefcase, users, calendar, target)
 */
export default function StatCard({ icon, value, label, trend, variant = "briefcase" }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${variant}`}>
                {icon}
            </div>
            <div className="stat-info">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
            </div>
            {trend !== undefined && (
                <div className={`stat-trend ${trend >= 0 ? "positive" : "negative"}`}>
                    {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {trend !== 0 && <span>{Math.abs(trend)}%</span>}
                </div>
            )}

            <style jsx>{`
        .stat-card {
          background: var(--canvas-card, #FFFFFF);
          border: 1px solid var(--border-glass, #E2E8F0);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          flex: 1;
        }

        .stat-card:hover {
          border-color: var(--purple-500, #7C3AED);
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(91, 42, 134, 0.08);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon.briefcase {
          background: #F3E8FF;
          color: #6D28D9;
        }

        .stat-icon.users {
          background: #E0F2FE;
          color: #0284C7;
        }

        .stat-icon.calendar {
          background: #FEF3C7;
          color: #D97706;
        }

        .stat-icon.target {
          background: #ECFDF5;
          color: #059669;
        }

        .stat-info {
          flex: 1;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--ink-900, #0F172A);
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--ink-500, #64748B);
          font-weight: 600;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .stat-trend.positive {
          background: #ECFDF5;
          color: #059669;
        }

        .stat-trend.negative {
          background: #FEF2F2;
          color: #DC2626;
        }

        .stat-trend.positive {
          background: rgba(125, 155, 106, 0.2);
          color: var(--status-success);
        }

        .stat-trend.negative {
          background: rgba(193, 102, 107, 0.2);
          color: var(--status-error);
        }

        @media (max-width: 640px) {
          .stat-card {
            padding: 16px;
          }
          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
        </div>
    );
}
