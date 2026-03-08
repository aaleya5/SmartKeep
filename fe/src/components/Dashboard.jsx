import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function Dashboard({
  documents = [],
  collections = [],
  onNavigate,
  onCreateCollection,
  onSelectDocument
}) {
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  const greeting = getGreeting();
  
  // AI insight - in production, this would come from API
  const aiInsight = "You've saved articles this week — keep building your knowledge base!";
  
  const mockWeeklyData = [
    { day: 'Mon', count: 5 },
    { day: 'Tue', count: 8 },
    { day: 'Wed', count: 3 },
    { day: 'Thu', count: 12 },
    { day: 'Fri', count: 7 },
    { day: 'Sat', count: 2 },
    { day: 'Sun', count: 4 },
  ];

  const mockTrendingTags = [
    { name: 'technology', count: 24 },
    { name: 'programming', count: 18 },
    { name: 'ai', count: 15 },
    { name: 'learning', count: 12 },
    { name: 'rust', count: 9 },
    { name: 'javascript', count: 8 },
    { name: 'productivity', count: 7 },
    { name: 'design', count: 5 },
  ];

  // Sample recent documents for demo
  const recentDocs = documents.length > 0 ? documents.slice(0, 9) : [
    { id: 1, title: 'Understanding Rust Ownership Model', domain: 'rust-lang.org', favicon: '🦀', summary: 'A deep dive into Rust\'s unique ownership system and how it ensures memory safety.', reading_time: 8, difficulty_score: 75, tags: ['rust', 'programming'], saved_date: '2026-03-05', thumbnail: '🦀', progress: 60 },
    { id: 2, title: 'React 19 Hooks Tutorial', domain: 'react.dev', favicon: '⚛️', summary: 'Learn about the new hooks in React 19 and how to use them effectively.', reading_time: 12, difficulty_score: 45, tags: ['react', 'javascript'], saved_date: '2026-03-04', thumbnail: '⚛️', progress: 100 },
    { id: 3, title: 'Building AI Agents with Python', domain: 'python.org', favicon: '🐍', summary: 'Step-by-step guide to creating autonomous AI agents using Python.', reading_time: 15, difficulty_score: 30, tags: ['ai', 'python'], saved_date: '2026-03-03', thumbnail: '🤖', progress: 25 },
    { id: 4, title: 'TypeScript Generics Explained', domain: 'typescriptlang.org', favicon: '💙', summary: 'Master TypeScript generics with practical examples and use cases.', reading_time: 10, difficulty_score: 55, tags: ['typescript', 'programming'], saved_date: '2026-03-02', thumbnail: '💙', progress: 80 },
    { id: 5, title: 'CSS Grid Layout Guide', domain: 'css-tricks.com', favicon: '🎨', summary: 'Complete guide to CSS Grid for modern web layouts.', reading_time: 6, difficulty_score: 80, tags: ['css', 'design'], saved_date: '2026-03-01', thumbnail: '🎨', progress: 100 },
    { id: 6, title: 'Node.js Performance Tips', domain: 'nodejs.org', favicon: '🟢', summary: 'Optimize your Node.js applications with these performance tips.', reading_time: 9, difficulty_score: 50, tags: ['nodejs', 'javascript'], saved_date: '2026-02-28', thumbnail: '🟢', progress: 45 },
    { id: 7, title: 'Machine Learning Basics', domain: 'kaggle.com', favicon: '📊', summary: 'Introduction to machine learning concepts and algorithms.', reading_time: 20, difficulty_score: 25, tags: ['ml', 'ai'], saved_date: '2026-02-27', thumbnail: '📊', progress: 0 },
    { id: 8, title: 'Docker for Beginners', domain: 'docker.com', favicon: '🐳', summary: 'Get started with Docker containers and orchestration.', reading_time: 14, difficulty_score: 40, tags: ['docker', 'devops'], saved_date: '2026-02-26', thumbnail: '🐳', progress: 30 },
    { id: 9, title: 'GraphQL API Design', domain: 'graphql.org', favicon: '◼️', summary: 'Best practices for designing GraphQL APIs.', reading_time: 11, difficulty_score: 45, tags: ['graphql', 'api'], saved_date: '2026-02-25', thumbnail: '◼️', progress: 15 },
  ];

  const continueReading = recentDocs.filter(doc => doc.progress > 0 && doc.progress < 100).slice(0, 5);
  const recentlySaved = recentDocs.slice(0, 9);
  
  // Sample collections
  const displayCollections = collections.length > 0 ? collections : [
    { id: 1, name: 'Rust Tutorials', icon: '🦀', color: '#dea584', item_count: 12, thumbnails: ['🦀', '⚙️', '🔧'] },
    { id: 2, name: 'AI Research', icon: '🤖', color: '#6366f1', item_count: 8, thumbnails: ['🤖', '🧠', '📊'] },
    { id: 3, name: 'Web Dev', icon: '🌐', color: '#10b981', item_count: 15, thumbnails: ['⚛️', '🎨', '💙'] },
    { id: 4, name: 'DevOps', icon: '🔧', color: '#f59e0b', item_count: 6, thumbnails: ['🐳', '☸️', '📦'] },
  ];

  // Suggested re-reads (items saved > 30 days ago, never annotated)
  const suggestedRereads = [
    { id: 101, title: 'Docker Deep Dive', domain: 'docker.com', favicon: '🐳', summary: 'Advanced Docker concepts and best practices.', reading_time: 18, saved_date: '2026-01-15', thumbnail: '🐳' },
    { id: 102, title: 'Kubernetes Handbook', domain: 'kubernetes.io', favicon: '☸️', summary: 'Complete guide to Kubernetes orchestration.', reading_time: 25, saved_date: '2026-01-20', thumbnail: '☸️' },
    { id: 103, title: 'System Design Primer', domain: 'github.com', favicon: '📚', summary: 'Learn how to design large-scale systems.', reading_time: 30, saved_date: '2026-01-25', thumbnail: '📚' },
  ];

  const getDifficultyBadge = (score) => {
    if (score >= 60) return { label: 'Easy', class: 'badge-easy' };
    if (score >= 30) return { label: 'Intermediate', class: 'badge-intermediate' };
    return { label: 'Advanced', class: 'badge-advanced' };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleCreateCollection = () => {
    if (onCreateCollection) onCreateCollection();
  };

  return (
    <div className="dashboard">
      {/* Hero Strip */}
      <div className="hero-strip">
        <div className="hero-content">
          <h1>{greeting}! 👋</h1>
          <p className="ai-insight">💡 {aiInsight}</p>
        </div>
      </div>

      {/* Continue Reading */}
      {continueReading.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">Continue Reading</h2>
          <div className="continue-reading-scroll">
            {continueReading.map((doc) => (
              <div 
                key={doc.id} 
                className="continue-card"
                onClick={() => onSelectDocument && onSelectDocument(doc)}
              >
                <div className="continue-thumbnail">{doc.thumbnail}</div>
                <div className="continue-info">
                  <span className="continue-domain">{doc.favicon} {doc.domain}</span>
                  <h4 className="continue-title">{doc.title}</h4>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${doc.progress}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{doc.progress}% read</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recently Saved */}
      <section className="dashboard-section">
        <h2 className="section-title">Recently Saved</h2>
        <div className="recent-grid">
          {recentlySaved.map((doc) => (
            <div 
              key={doc.id} 
              className="recent-card"
              onClick={() => onSelectDocument && onSelectDocument(doc)}
            >
              <div className="card-thumbnail">{doc.thumbnail}</div>
              <div className="card-content">
                <div className="card-meta">
                  <span className="card-favicon">{doc.favicon}</span>
                  <span className="card-domain">{doc.domain}</span>
                </div>
                <h3 className="card-title">{doc.title}</h3>
                <p className="card-summary">{doc.summary}</p>
                <div className="card-badges">
                  <span className="reading-badge">📖 {doc.reading_time} min</span>
                  <span className={`difficulty-badge ${getDifficultyBadge(doc.difficulty_score).class}`}>
                    {getDifficultyBadge(doc.difficulty_score).label}
                  </span>
                </div>
                <div className="card-tags">
                  {doc.tags?.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
                <span className="card-date">{formatDate(doc.saved_date)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Your Collections */}
      <section className="dashboard-section">
        <h2 className="section-title">Your Collections</h2>
        <div className="collections-row">
          {displayCollections.map((collection) => (
            <div 
              key={collection.id} 
              className="collection-card"
              onClick={() => onNavigate && onNavigate('collections')}
            >
              <div className="collection-header">
                <span className="collection-icon" style={{ backgroundColor: collection.color }}>
                  {collection.icon}
                </span>
                <span className="collection-count">{collection.item_count} items</span>
              </div>
              <h3 className="collection-name">{collection.name}</h3>
              <div className="collection-thumbnails">
                {collection.thumbnails.map((thumb, idx) => (
                  <span key={idx} className="stacked-thumb">{thumb}</span>
                ))}
              </div>
            </div>
          ))}
          {/* Create new collection card */}
          <div className="collection-card create-new" onClick={handleCreateCollection}>
            <span className="plus-icon">+</span>
            <span>Create Collection</span>
          </div>
        </div>
      </section>

      {/* Trending Tags */}
      <section className="dashboard-section">
        <h2 className="section-title">Trending Tags</h2>
        <div className="trending-tags">
          {mockTrendingTags.map((tag, idx) => (
            <button 
              key={idx} 
              className="tag-chip"
              style={{ fontSize: `${Math.min(1 + tag.count / 10, 1.4)}rem` }}
              onClick={() => onNavigate && onNavigate('library', { filterTag: tag.name })}
            >
              {tag.name}
              <span className="tag-count">{tag.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Saved This Week */}
      <section className="dashboard-section chart-section">
        <h2 className="section-title">Saved This Week</h2>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={mockWeeklyData}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  background: '#1f2937', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar 
                dataKey="count" 
                fill="#667eea" 
                radius={[4, 4, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Suggested Re-reads */}
      <section className="dashboard-section">
        <h2 className="section-title">Suggested Re-reads</h2>
        <div className="reread-grid">
          {suggestedRereads.map((doc) => (
            <div 
              key={doc.id} 
              className="reread-card"
              onClick={() => onSelectDocument && onSelectDocument(doc)}
            >
              <div className="reread-badge">🔄 Rediscover</div>
              <div className="reread-thumbnail">{doc.thumbnail}</div>
              <div className="reread-content">
                <div className="reread-meta">
                  <span>{doc.favicon}</span>
                  <span>{doc.domain}</span>
                </div>
                <h4>{doc.title}</h4>
                <p>{doc.summary}</p>
                <span className="reread-date">Saved {formatDate(doc.saved_date)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .dashboard {
          padding: 0;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Hero Strip */
        .hero-strip {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          border-radius: 16px;
          margin-bottom: 2rem;
          color: white;
        }

        .hero-content h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .ai-insight {
          font-size: 1rem;
          opacity: 0.95;
          max-width: 600px;
        }

        /* Section Styles */
        .dashboard-section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 1rem;
        }

        /* Continue Reading */
        .continue-reading-scroll {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          scrollbar-width: thin;
        }

        .continue-card {
          flex-shrink: 0;
          width: 200px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .continue-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .continue-thumbnail {
          height: 80px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .continue-info {
          padding: 0.75rem;
        }

        .continue-domain {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        .continue-title {
          font-size: 0.85rem;
          font-weight: 500;
          color: #1f2937;
          margin: 0.25rem 0 0.5rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .progress-bar {
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #667eea;
          border-radius: 2px;
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        /* Recent Grid */
        .recent-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .recent-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 600px) {
          .recent-grid {
            grid-template-columns: 1fr;
          }
        }

        .recent-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .recent-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .card-thumbnail {
          height: 100px;
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }

        .card-content {
          padding: 1rem;
        }

        .card-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 0.5rem;
        }

        .card-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-summary {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-badges {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .reading-badge {
          font-size: 0.7rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .difficulty-badge {
          font-size: 0.7rem;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }

        .badge-easy {
          background: #d1fae5;
          color: #059669;
        }

        .badge-intermediate {
          background: #fef3c7;
          color: #d97706;
        }

        .badge-advanced {
          background: #fee2e2;
          color: #dc2626;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .card-tags .tag {
          font-size: 0.65rem;
          padding: 0.15rem 0.4rem;
          background: #e0e7ff;
          color: #667eea;
          border-radius: 8px;
        }

        .card-date {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        /* Collections Row */
        .collections-row {
          display: flex;
          gap: 1rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }

        .collection-card {
          flex-shrink: 0;
          width: 180px;
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          transition: transform 0.2s;
        }

        .collection-card:hover {
          transform: translateY(-2px);
        }

        .collection-card.create-new {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 2px dashed #e5e7eb;
          background: transparent;
          color: #9ca3af;
        }

        .collection-card.create-new:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .collection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .collection-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .collection-count {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        .collection-name {
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
          margin-bottom: 0.75rem;
        }

        .collection-thumbnails {
          display: flex;
        }

        .stacked-thumb {
          width: 32px;
          height: 32px;
          background: #f3f4f6;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          margin-right: -8px;
          border: 2px solid white;
        }

        .plus-icon {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        /* Trending Tags */
        .trending-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .trending-tags .tag-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
          color: #4b5563;
          font-weight: 500;
        }

        .trending-tags .tag-chip:hover {
          background: #e0e7ff;
          color: #667eea;
        }

        .tag-count {
          font-size: 0.75rem;
          background: #e5e7eb;
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
        }

        /* Chart Section */
        .chart-section {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .chart-container {
          height: 150px;
        }

        /* Reread Grid */
        .reread-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .reread-grid {
            grid-template-columns: 1fr;
          }
        }

        .reread-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          position: relative;
          transition: transform 0.2s;
        }

        .reread-card:hover {
          transform: translateY(-2px);
        }

        .reread-badge {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: #fef3c7;
          color: #d97706;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-weight: 500;
        }

        .reread-thumbnail {
          height: 80px;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }

        .reread-content {
          padding: 1rem;
        }

        .reread-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 0.5rem;
        }

        .reread-content h4 {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .reread-content p {
          font-size: 0.8rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .reread-date {
          font-size: 0.7rem;
          color: #9ca3af;
        }

        /* Dark Mode */
        .dark-mode .section-title {
          color: #f3f4f6;
        }

        .dark-mode .continue-card,
        .dark-mode .recent-card,
        .dark-mode .collection-card,
        .dark-mode .chart-section,
        .dark-mode .reread-card {
          background: #1f2937;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .dark-mode .continue-title,
        .dark-mode .card-title,
        .dark-mode .collection-name,
        .dark-mode .reread-content h4 {
          color: #f3f4f6;
        }

        .dark-mode .card-summary,
        .dark-mode .reread-content p {
          color: #9ca3af;
        }

        .dark-mode .continue-thumbnail,
        .dark-mode .card-thumbnail,
        .dark-mode .reread-thumbnail {
          background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
        }

        .dark-mode .trending-tags .tag-chip {
          background: #374151;
          color: #d1d5db;
        }

        .dark-mode .trending-tags .tag-chip:hover {
          background: #4f46e5;
          color: white;
        }

        .dark-mode .tag-count {
          background: #4b5563;
        }

        .dark-mode .reading-badge {
          background: #374151;
          color: #9ca3af;
        }

        .dark-mode .card-tags .tag {
          background: #4f46e5;
          color: #e0e7ff;
        }

        .dark-mode .stacked-thumb {
          background: #374151;
          border-color: #1f2937;
        }

        .dark-mode .collection-card.create-new {
          border-color: #374151;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
