/**
 * EmptyState - Reusable empty state component
 * 
 * Props:
 * - illustration: ReactNode - SVG illustration
 * - heading: string - Main heading
 * - subtext: string - Description text
 * - action: ReactNode - Optional CTA button
 */

export default function EmptyState({ 
  illustration, 
  heading, 
  subtext, 
  action 
}) {
  const defaultIllustrations = {
    library: (
      <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="30" width="160" height="100" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2"/>
        <rect x="35" y="45" width="130" height="8" rx="4" fill="#cbd5e1"/>
        <rect x="35" y="60" width="100" height="6" rx="3" fill="#e2e8f0"/>
        <rect x="35" y="72" width="120" height="6" rx="3" fill="#e2e8f0"/>
        <rect x="35" y="84" width="80" height="6" rx="3" fill="#e2e8f0"/>
        <circle cx="100" cy="105" r="15" fill="#667eea" opacity="0.2"/>
        <path d="M95 105L98 108L105 101" stroke="#667eea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    search: (
      <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="65" r="30" stroke="#e2e8f0" strokeWidth="4" fill="none"/>
        <path d="M105 90L140 125" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round"/>
        <rect x="60" y="100" width="80" height="6" rx="3" fill="#e2e8f0"/>
        <rect x="70" y="112" width="60" height="6" rx="3" fill="#e2e8f0"/>
      </svg>
    ),
    collection: (
      <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="40" width="120" height="80" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2"/>
        <path d="M60 55H140" stroke="#e2e8f0" strokeWidth="2"/>
        <path d="M60 65H120" stroke="#e2e8f0" strokeWidth="2"/>
        <path d="M60 75H100" stroke="#e2e8f0" strokeWidth="2"/>
        <rect x="90" y="90" width="50" height="20" rx="4" fill="#667eea" opacity="0.2"/>
      </svg>
    ),
    annotations: (
      <svg viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="30" width="140" height="90" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2"/>
        <path d="M50 50H130" stroke="#cbd5e1" strokeWidth="3"/>
        <path d="M50 65H110" stroke="#cbd5e1" strokeWidth="3"/>
        <path d="M50 80H90" stroke="#cbd5e1" strokeWidth="3"/>
        <circle cx="140" cy="100" r="15" fill="#667eea" opacity="0.2"/>
        <path d="M135 100H145M140 95V105" stroke="#667eea" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  };
  
  // Use provided illustration or default
  const IllustrationComponent = illustration || defaultIllustrations.library;
  
  return (
    <div className="empty-state">
      <div className="empty-state-illustration">
        {IllustrationComponent}
      </div>
      <h3 className="empty-state-heading">{heading}</h3>
      {subtext && <p className="empty-state-subtext">{subtext}</p>}
      {action && <div className="empty-state-action">{action}</div>}
      
      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          text-align: center;
        }
        
        .empty-state-illustration {
          width: 200px;
          height: 150px;
          margin-bottom: 24px;
        }
        
        .empty-state-illustration svg {
          width: 100%;
          height: 100%;
        }
        
        .empty-state-heading {
          font-size: 20px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 8px;
        }
        
        .empty-state-subtext {
          font-size: 15px;
          color: #64748b;
          max-width: 400px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        
        .empty-state-action {
          display: flex;
          gap: 12px;
        }
        
        /* Dark mode */
        .dark-mode .empty-state-heading {
          color: #f1f5f9;
        }
        
        .dark-mode .empty-state-subtext {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
