"use client";

import React from 'react';

const GlassCard = ({ children, className = '', ...props }) => {
  return (
    <div className={`glass-card ${className}`} {...props}>
      {children}
      <style jsx>{`
        .glass-card {
          background: var(--canvas-card, #FFFFFF);
          border: 1px solid var(--border-glass, #E2E8F0);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          color: var(--ink-700);
          transition: all 0.2s ease;
          position: relative;
        }

        ${!props.noHover ? `
          .glass-card:hover {
            border-color: var(--purple-500, #7C3AED);
            box-shadow: 0 4px 14px rgba(91, 42, 134, 0.08);
          }
        ` : ''}
      `}</style>
    </div>
  );
};

export default GlassCard;
