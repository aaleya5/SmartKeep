import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { exploreAPI, statsAPI } from '../services/api';
import './ExplorePage.css';
import KnowledgeGraph from './KnowledgeGraph';

// Knowledge Gaps Component
function KnowledgeGaps({ onSearch }) {
  // AI-generated knowledge gap suggestions based on common learning patterns
  const gaps = [];

  return (
    <div className="knowledge-gaps">
      <h3 className="section-title">Knowledge Gaps</h3>
      <p className="section-subtitle">Topics you're building knowledge in but might need deeper dives</p>
      {gaps.length === 0 ? (
        <div className="empty-placeholder">Not enough data to suggest knowledge gaps yet.</div>
      ) : (
        <div className="gaps-grid">
          {gaps.map((gap, idx) => (
            <div key={idx} className="gap-card" onClick={() => onSearch(gap.suggestion)}>
              <div className="gap-icon">🎯</div>
              <h4>{gap.topic}</h4>
              <p className="gap-reason">{gap.reason}</p>
              <span className="gap-search">Search: "{gap.suggestion}" →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Similar Pairs Component ("These Go Together")
function SimilarPairs({ pairs, onSelectItem, isLoading }) {
  return (
    <div className="similar-pairs-section">
      <h3 className="section-title">These Go Together</h3>
      <p className="section-subtitle">Pairs of items that are semantically related</p>
      {isLoading ? (
        <div className="loading-placeholder">Loading...</div>
      ) : pairs.length === 0 ? (
        <div className="empty-placeholder">Not enough data yet. Save more content to see connections!</div>
      ) : (
        <div className="pairs-grid">
          {pairs.map((pair, idx) => (
            <div key={idx} className="pair-card">
              <div className="pair-item" onClick={() => onSelectItem(pair.item_a)}>
                <div className="pair-favicon">{pair.item_a.favicon_url ? <img src={pair.item_a.favicon_url} alt="" /> : '📄'}</div>
                <div className="pair-info">
                  <div className="pair-title">{pair.item_a.title}</div>
                  <div className="pair-domain">{pair.item_a.domain}</div>
                </div>
              </div>
              <div className="pair-connection">
                <span className="similarity-badge">{Math.round(pair.similarity * 100)}% similar</span>
                {pair.shared_tags?.length > 0 && (
                  <div className="shared-tags">
                    {pair.shared_tags.slice(0, 2).map(tag => (
                      <span key={tag} className="tag-chip">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="pair-item" onClick={() => onSelectItem(pair.item_b)}>
                <div className="pair-favicon">{pair.item_b.favicon_url ? <img src={pair.item_b.favicon_url} alt="" /> : '📄'}</div>
                <div className="pair-info">
                  <div className="pair-title">{pair.item_b.title}</div>
                  <div className="pair-domain">{pair.item_b.domain}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Topic Clusters Component (D3.js Force Graph)
function TopicClusters({ clusters, isLoading }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!clusters.length || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 280;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Prepare nodes and links
    const nodes = [];
    const links = [];
    const clusterColors = d3.schemeCategory10;

    clusters.forEach((cluster, cIdx) => {
      // Cluster center node
      const clusterNode = {
        id: `cluster-${cIdx}`,
        label: cluster.label,
        type: 'cluster',
        color: clusterColors[cIdx % 10],
      };
      nodes.push(clusterNode);

      // Item nodes
      cluster.items?.slice(0, 5).forEach((item) => {
        const itemNode = {
          id: item.id,
          title: item.title,
          domain: item.domain,
          type: 'item',
          clusterId: `cluster-${cIdx}`,
          color: clusterColors[cIdx % 10],
        };
        nodes.push(itemNode);
        links.push({ source: clusterNode.id, target: item.id, value: 0.5 });
      });
    });

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

    // Draw links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#d1d5db')
      .attr('stroke-width', 1.5);

    // Draw nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Cluster nodes (larger)
    node.filter(d => d.type === 'cluster')
      .append('circle')
      .attr('r', 16)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    node.filter(d => d.type === 'cluster')
      .append('text')
      .text(d => d.label.substring(0, 2).toUpperCase())
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold');

    // Item nodes (smaller)
    node.filter(d => d.type === 'item')
      .append('circle')
      .attr('r', 8)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // Tooltip
    node.append('title')
      .text(d => d.type === 'cluster' ? d.label : d.title);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [clusters]);

  return (
    <div className="topic-clusters">
      <h3 className="section-title">Topic Clusters</h3>
      <p className="section-subtitle">AI groups your content into thematic clusters</p>
      {isLoading ? (
        <div className="graph-loading">
          <div className="spinner"></div>
          <span>Analyzing content...</span>
        </div>
      ) : clusters.length === 0 ? (
        <div className="empty-placeholder">No clusters yet. Save more content to see patterns!</div>
      ) : (
        <div className="clusters-container" ref={containerRef}>
          <svg ref={svgRef}></svg>
        </div>
      )}
    </div>
  );
}

// Tag Relationships Component (Simple Chord-like visualization)
function TagRelationships({ tags, isLoading }) {
  // Co-occurrence matrix visualization (simplified)
  const topTags = tags.slice(0, 8);

  return (
    <div className="tag-relationships">
      <h3 className="section-title">Tag Relationships</h3>
      <p className="section-subtitle">How your knowledge areas overlap</p>
      {isLoading ? (
        <div className="loading-placeholder">Loading...</div>
      ) : topTags.length === 0 ? (
        <div className="empty-placeholder">No tags yet. Add tags to your content!</div>
      ) : (
        <div className="tag-chord-container">
          <div className="tag-bubbles">
            {topTags.map((tag, idx) => (
              <div 
                key={tag.label} 
                className="tag-bubble"
                style={{
                  '--size': `${Math.max(60, Math.min(120, tag.value * 10))}px`,
                  '--delay': `${idx * 0.1}s`,
                }}
              >
                <span className="tag-name">{tag.label}</span>
                <span className="tag-count">{tag.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Forgotten Gems Component
function ForgottenGems({ items, onSelectItem, isLoading }) {
  return (
    <div className="forgotten-gems">
      <h3 className="section-title">Forgotten Gems</h3>
      <p className="section-subtitle">Old treasures you've never opened</p>
      {isLoading ? (
        <div className="loading-placeholder">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-placeholder">No forgotten items! Great job staying on top of your reading.</div>
      ) : (
        <div className="gems-grid">
          {items.map(item => (
            <div 
              key={item.id} 
              className="gem-card"
              onClick={() => onSelectItem(item)}
            >
              <div className="gem-dust"></div>
              <div className="gem-content">
                <div className="gem-favicon">{item.favicon_url ? <img src={item.favicon_url} alt="" /> : '📄'}</div>
                <div className="gem-info">
                  <div className="gem-title">{item.title}</div>
                  <div className="gem-domain">{item.domain}</div>
                  <div className="gem-date">Saved {new Date(item.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reading Streak Component (GitHub-style heatmap)
function ReadingStreak({ heatmapData, streak, isLoading }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!heatmapData?.length || !containerRef.current) return;

    const cellSize = 12;
    const cellGap = 3;
    const weeks = 52;
    const days = 7;

    // Group by week
    const dataByWeek = {};
    heatmapData.forEach(cell => {
      const week = Math.floor(cell.day_of_year / 7);
      if (!dataByWeek[week]) dataByWeek[week] = {};
      dataByWeek[week][cell.day_of_week] = cell.count;
    });

    // Clear previous
    d3.select(containerRef.current).selectAll('*').remove();

    const svg = d3.select(containerRef.current)
      .attr('width', (weeks * (cellSize + cellGap)))
      .attr('height', days * (cellSize + cellGap));

    // Draw cells
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < days; d++) {
        const count = dataByWeek[w]?.[d] || 0;
        const color = count === 0 ? '#ebedf0' : 
                      count === 1 ? '#9be9a8' : 
                      count === 2 ? '#40c463' : 
                      count === 3 ? '#30a14e' : '#216e39';

        svg.append('rect')
          .attr('x', w * (cellSize + cellGap))
          .attr('y', d * (cellSize + cellGap))
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('rx', 2)
          .attr('fill', color)
          .append('title')
          .text(`Day ${w * 7 + d}: ${count} saves`);
      }
    }
  }, [heatmapData]);

  return (
    <div className="reading-streak">
      <h3 className="section-title">Reading Streak</h3>
      <div className="streak-header">
        <div className="streak-stat">
          <span className="streak-number">{streak?.current_streak || 0}</span>
          <span className="streak-label">day streak</span>
        </div>
        <div className="streak-stat">
          <span className="streak-number">{streak?.longest_streak || 0}</span>
          <span className="streak-label">longest</span>
        </div>
      </div>
      {isLoading ? (
        <div className="loading-placeholder">Loading...</div>
      ) : (
        <div className="heatmap-container" ref={containerRef}></div>
      )}
    </div>
  );
}

// Main Explore Page Component
function ExplorePage({ onNavigate }) {
  const [clusters, setClusters] = useState([]);
  const [similarPairs, setSimilarPairs] = useState([]);
  const [forgottenItems, setForgottenItems] = useState([]);
  const [tagDistribution, setTagDistribution] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [streak, setStreak] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clustersRes, pairsRes, forgottenRes, tagsRes, heatmapRes, streakRes] = await Promise.allSettled([
        exploreAPI.getClusters(),
        exploreAPI.getSimilarPairs(5, 0.7),
        exploreAPI.getForgotten(60, 6),
        statsAPI.getTagDistribution(10),
        statsAPI.getActivityHeatmap(365),
        statsAPI.getStreak(),
      ]);

      if (clustersRes.status === 'fulfilled') setClusters(clustersRes.value.data.clusters || []);
      if (pairsRes.status === 'fulfilled') setSimilarPairs(pairsRes.value.data.pairs || []);
      if (forgottenRes.status === 'fulfilled') setForgottenItems(forgottenRes.value.data.items || []);
      if (tagsRes.status === 'fulfilled') setTagDistribution(tagsRes.value.data.data || []);
      if (heatmapRes.status === 'fulfilled') setHeatmapData(heatmapRes.value.data.cells || []);
      if (streakRes.status === 'fulfilled') setStreak(streakRes.value.data);
    } catch (err) {
      console.error('Failed to fetch explore data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (query) => {
    if (onNavigate) {
      onNavigate('search', { query });
    }
  };

  const handleSelectItem = (item) => {
    if (onNavigate) {
      onNavigate('content-detail', { id: item.id });
    }
  };

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h1>Explore</h1>
        <p className="page-description">Surface patterns, connections, and hidden gems in your knowledge base</p>
      </div>

      <div className="explore-grid">
        {/* Knowledge Graph — hero full-width card */}
        <div className="explore-card graph-hero-card">
          <KnowledgeGraph clusters={clusters} />
        </div>

        {/* Reading Streak - Full Width */}
        <div className="explore-card streak-card">
          <ReadingStreak 
            heatmapData={heatmapData} 
            streak={streak} 
            isLoading={isLoading} 
          />
        </div>

        {/* Knowledge Gaps */}
        <div className="explore-card gaps-card">
          <KnowledgeGaps 
            tags={tagDistribution} 
            onSearch={handleSearch}
          />
        </div>

        {/* Tag Relationships */}
        <div className="explore-card tags-card">
          <TagRelationships 
            tags={tagDistribution} 
            isLoading={isLoading} 
          />
        </div>

        {/* Similar Pairs */}
        <div className="explore-card pairs-card">
          <SimilarPairs 
            pairs={similarPairs} 
            onSelectItem={handleSelectItem}
            isLoading={isLoading} 
          />
        </div>

        {/* Forgotten Gems */}
        <div className="explore-card gems-card">
          <ForgottenGems 
            items={forgottenItems} 
            onSelectItem={handleSelectItem}
            isLoading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
}

export default ExplorePage;
