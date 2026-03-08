import { Terminal, Database, Clock, Activity, ArrowUpRight } from 'lucide-react';

function Dashboard({
  documents = [],
  collections = [],
  onNavigate,
  onSelectDocument
}) {
  const recentlySaved = documents.length > 0 ? documents.slice(0, 4) : [
    { id: 1, title: 'Understanding Rust Ownership', domain: 'rust-lang.org', summary: 'A deep dive into memory safety without GC.', reading_time: 8, difficulty_score: 75, tags: ['rust', 'systems'] },
    { id: 2, title: 'React 19 Server Components', domain: 'react.dev', summary: 'How RSCs change the frontend landscape.', reading_time: 12, difficulty_score: 65, tags: ['react', 'js'] },
    { id: 3, title: 'PostgreSQL Vector Search', domain: 'pgvector.org', summary: 'Implementing embeddings directly in Postgres.', reading_time: 15, difficulty_score: 80, tags: ['db', 'ai'] },
    { id: 4, title: 'Building Event-Driven Architectures', domain: 'martinfowler.com', summary: 'When to choose pub/sub vs message queues.', reading_time: 21, difficulty_score: 85, tags: ['architecture'] }
  ];

  return (
    <div className="dashboard-bento-container">
      
      <div className="bento-grid">
        
        {/* BENTO: GREETING (Spans 2 columns, Hero block) */}
        <div className="bento-cell greeting-cell">
          <div className="greeting-wrapper">
            <div className="g-tag">OVERVIEW</div>
            <h1 className="editorial-h1">Your Knowledge<br /><em>Base</em>.</h1>
            <p className="greeting-sub">142 distinct concepts captured and semantically indexed. Seamless extraction, ready for instant retrieval.</p>
            <div className="hero-actions" style={{ marginTop: 32 }}>
              <button className="btn primary" onClick={() => onNavigate('add')}>Add URL →</button>
              <button className="btn secondary" onClick={() => onNavigate('search')}>Search Graph</button>
            </div>
          </div>
          <div className="g-decoration"></div>
        </div>

        {/* BENTO: METRIC 1 */}
        <div className="bento-cell metric-cell">
          <div className="m-icon"><Database size={18} /></div>
          <div>
            <div className="m-val">{documents.length || 142}</div>
            <div className="m-lbl">Total Documents</div>
          </div>
        </div>

        {/* BENTO: METRIC 2 (Amber Highlight) */}
        <div className="bento-cell metric-cell amber-active">
          <div className="m-icon glow"><Terminal size={18} /></div>
          <div>
            <div className="m-val">3,205</div>
            <div className="m-lbl">Vectors Indexed</div>
          </div>
        </div>

        {/* BENTO: RECENT DOCUMENTS (Spans 2 rows, 2 cols) */}
        <div className="bento-cell recent-cell">
          <div className="bento-header">
            <div className="g-tag">RECENTLY INGESTED</div>
            <button className="b-view-all" onClick={() => onNavigate('library')}>View All <ArrowUpRight size={14}/></button>
          </div>
          <div className="b-doc-list">
            {recentlySaved.map((doc, i) => (
              <div key={doc.id} className="b-doc-row" onClick={() => onSelectDocument && onSelectDocument(doc)}>
                <div className="b-doc-num">0{i+1}</div>
                <div className="b-doc-main">
                  <div className="b-doc-title">{doc.title}</div>
                  <div className="b-doc-sum">{doc.summary}</div>
                </div>
                <div className="b-doc-meta">
                  {doc.tags?.slice(0,2).map(t => <span key={t} className="mono-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BENTO: METRIC 3 & 4 (Stacked in one cell style) */}
        <div className="bento-cell split-metric-cell">
          <div className="split-m">
            <div className="m-lbl">Avg Extraction</div>
            <div className="m-val">1.2<span style={{fontSize:12, color:'var(--text-secondary)'}}>s</span></div>
          </div>
          <div className="split-div"></div>
          <div className="split-m">
            <div className="m-lbl">Search Latency</div>
            <div className="m-val">42<span style={{fontSize:12, color:'var(--text-secondary)'}}>ms</span></div>
          </div>
        </div>

        {/* BENTO: PIPELINE ACTIVITY */}
        <div className="bento-cell pipeline-cell">
          <div className="bento-header">
            <div className="g-tag">PIPELINE LOGS</div>
          </div>
          <div className="tl-container">
            {[
               { id: 1, c: 'success', t: 'Just now', msg: <><strong>Vector Sync</strong> completed. 3 embeddings updated.</> },
               { id: 2, c: 'info', t: '2m ago', msg: <><strong>AI Summary</strong> generated for rust article.</> },
               { id: 3, c: 'warning', t: '15m ago', msg: <><strong>Extraction Queue</strong> processing 1 URL.</> },
               { id: 4, c: 'ghost', t: '1h ago', msg: <><strong>System Backup</strong> completed.</> },
            ].map(log => (
              <div key={log.id} className="tl-item">
                <div className={`tl-dot bg-${log.c}`}></div>
                <div className="tl-content">
                  <span className="tl-time">{log.t}</span>
                  <div className="tl-msg">{log.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        .dashboard-bento-container {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: 150px;
          gap: 24px;
        }

        .bento-cell {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 32px;
          position: relative;
          overflow: hidden;
          transition: border-color 0.3s ease, background 0.3s ease;
        }

        .bento-cell:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255,255,255,0.08);
        }

        /* Span configurations */
        .greeting-cell { grid-column: span 2; grid-row: span 2; background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%); }
        .metric-cell { grid-column: span 1; grid-row: span 1; display: flex; flex-direction: column; justify-content: space-between; gap: 16px; }
        .recent-cell { grid-column: span 3; grid-row: span 3; }
        .split-metric-cell { grid-column: span 1; grid-row: span 1; display: flex; flex-direction: column; justify-content: space-between; padding: 24px 32px; }
        .pipeline-cell { grid-column: span 1; grid-row: span 3; }

        @media (max-width: 1200px) {
          .bento-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: minmax(150px, auto); }
          .greeting-cell { grid-column: span 3; grid-row: span 2; }
          .metric-cell { grid-column: span 1; }
          .split-metric-cell { grid-column: span 1; }
          .recent-cell { grid-column: span 2; grid-row: span 3; }
          .pipeline-cell { grid-column: span 1; grid-row: span 3; }
        }

        @media (max-width: 768px) {
          .bento-grid { grid-template-columns: 1fr; }
          .bento-cell { grid-column: span 1 !important; grid-row: auto !important; height: auto !important; }
        }

        /* Typography & Internal Elements */
        .g-tag {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .editorial-h1 {
          font-family: var(--font-serif);
          font-size: 4rem;
          line-height: 1;
          letter-spacing: -0.04em;
          color: #fff;
          margin-bottom: 16px;
        }

        .editorial-h1 em {
          font-style: italic;
          color: var(--accent-color);
          font-weight: 300;
        }

        .greeting-sub {
          font-size: 16px;
          color: var(--text-secondary);
          max-width: 400px;
          line-height: 1.6;
        }

        .g-decoration {
          position: absolute;
          bottom: -50px;
          right: -50px;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,200,66,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .m-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-color);
        }

        .m-icon.glow {
          background: rgba(245,200,66,0.15);
          color: var(--accent-color);
          box-shadow: 0 0 20px rgba(245,200,66,0.1);
        }

        .m-val {
          font-family: var(--font-serif);
          font-size: 32px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 4px;
        }

        .m-lbl {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .amber-active {
          border-color: rgba(245,200,66,0.2) !important;
          background: linear-gradient(135deg, rgba(245,200,66,0.03) 0%, transparent 100%) !important;
        }

        .split-div {
          height: 1px;
          background: rgba(255,255,255,0.05);
          width: 100%;
        }

        /* Recent List */
        .bento-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .b-view-all {
          background: none;
          border: none;
          color: var(--accent-color);
          font-family: var(--font-sans);
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          opacity: 0.8;
          transition: 0.2s;
        }
        .b-view-all:hover { opacity: 1; }

        .b-doc-list {
          display: flex;
          flex-direction: column;
        }

        .b-doc-row {
          display: grid;
          grid-template-columns: 32px 1fr auto;
          gap: 24px;
          padding: 24px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .b-doc-row:last-child {
          border-bottom: none;
        }

        .b-doc-row:hover .b-doc-title {
          color: var(--accent-color);
        }

        .b-doc-num {
          font-family: var(--font-mono);
          font-size: 12px;
          color: rgba(255,255,255,0.2);
          padding-top: 4px;
        }

        .b-doc-title {
          font-family: var(--font-sans);
          font-size: 17px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 8px;
          transition: color 0.2s ease;
        }

        .b-doc-sum {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .b-doc-meta {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          padding-top: 4px;
        }

        /* Timeline */
        .tl-container {
          display: flex;
          flex-direction: column;
          gap: 32px;
          position: relative;
        }

        .tl-container::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 10px;
          bottom: 10px;
          width: 1px;
          background: rgba(255,255,255,0.05);
        }

        .tl-item {
          display: flex;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .tl-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          border: 2px solid #0a0a0c;
          margin-top: 4px;
        }

        .bg-success { background: var(--success); box-shadow: 0 0 10px rgba(62,207,142,0.4); }
        .bg-info { background: var(--info); box-shadow: 0 0 10px rgba(96,180,240,0.4); }
        .bg-warning { background: var(--accent-color); box-shadow: 0 0 10px rgba(245,200,66,0.4); }
        .bg-ghost { background: var(--text-secondary); }

        .tl-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tl-time {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .tl-msg {
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .tl-msg strong {
          color: #fff;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
