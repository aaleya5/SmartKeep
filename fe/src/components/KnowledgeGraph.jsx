import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import './KnowledgeGraph.css';

/* ─── Static seed data for ambient graph ─────────────────────────────────── */
const SEED_NODES = [
  { id: 'n0',  label: 'Machine Learning',  group: 0, size: 18 },
  { id: 'n1',  label: 'Neural Nets',       group: 0, size: 14 },
  { id: 'n2',  label: 'Transformers',      group: 0, size: 12 },
  { id: 'n3',  label: 'Attention',         group: 0, size: 10 },
  { id: 'n4',  label: 'React',             group: 1, size: 16 },
  { id: 'n5',  label: 'TypeScript',        group: 1, size: 13 },
  { id: 'n6',  label: 'Vite',              group: 1, size: 9  },
  { id: 'n7',  label: 'Design Systems',    group: 2, size: 15 },
  { id: 'n8',  label: 'Typography',        group: 2, size: 11 },
  { id: 'n9',  label: 'Glassmorphism',     group: 2, size: 10 },
  { id: 'n10', label: 'Knowledge Graphs',  group: 3, size: 17 },
  { id: 'n11', label: 'Embeddings',        group: 3, size: 12 },
  { id: 'n12', label: 'Semantic Search',   group: 3, size: 13 },
  { id: 'n13', label: 'RAG',              group: 3, size: 11 },
  { id: 'n14', label: 'Note-taking',       group: 4, size: 14 },
  { id: 'n15', label: 'Highlights',        group: 4, size: 10 },
  { id: 'n16', label: 'Annotations',       group: 4, size: 11 },
];

const SEED_LINKS = [
  { source: 'n0',  target: 'n1',  weight: 0.9 },
  { source: 'n1',  target: 'n2',  weight: 0.8 },
  { source: 'n2',  target: 'n3',  weight: 0.85 },
  { source: 'n0',  target: 'n11', weight: 0.7 },
  { source: 'n11', target: 'n12', weight: 0.75 },
  { source: 'n12', target: 'n10', weight: 0.8 },
  { source: 'n10', target: 'n13', weight: 0.65 },
  { source: 'n13', target: 'n1',  weight: 0.6 },
  { source: 'n4',  target: 'n5',  weight: 0.9 },
  { source: 'n5',  target: 'n6',  weight: 0.7 },
  { source: 'n4',  target: 'n7',  weight: 0.6 },
  { source: 'n7',  target: 'n8',  weight: 0.75 },
  { source: 'n7',  target: 'n9',  weight: 0.7 },
  { source: 'n14', target: 'n15', weight: 0.85 },
  { source: 'n15', target: 'n16', weight: 0.8 },
  { source: 'n14', target: 'n10', weight: 0.65 },
  { source: 'n16', target: 'n12', weight: 0.6 },
  { source: 'n0',  target: 'n4',  weight: 0.55 },
  { source: 'n7',  target: 'n14', weight: 0.5 },
  { source: 'n3',  target: 'n11', weight: 0.7 },
];

const GROUP_COLORS = [
  '#f5c842', // Amber — AI/ML
  '#a3e4ff', // Sky — Frontend
  '#b8f0b4', // Mint — Design
  '#d4aaff', // Lavender — Knowledge
  '#ffb974', // Peach — Notes
];

export default function KnowledgeGraph({ clusters = [] }) {
  const svgRef   = useRef(null);
  const wrapRef  = useRef(null);
  const simRef   = useRef(null);

  /* Merge real cluster data with seed nodes if available */
  const { nodes, links } = useMemo(() => {
    if (!clusters.length) return { nodes: SEED_NODES, links: SEED_LINKS };

    const clusterNodes = [];
    const clusterLinks = [];
    clusters.forEach((c, ci) => {
      const centerId = `cluster-${ci}`;
      clusterNodes.push({ id: centerId, label: c.label, group: ci % 5, size: 16 });
      (c.items || []).slice(0, 4).forEach((item, ii) => {
        const itemId = `item-${ci}-${ii}`;
        clusterNodes.push({ id: itemId, label: item.title?.slice(0, 20) || 'Item', group: ci % 5, size: 9 });
        clusterLinks.push({ source: centerId, target: itemId, weight: 0.7 });
        if (ii > 0) {
          clusterLinks.push({ source: `item-${ci}-${ii - 1}`, target: itemId, weight: 0.4 });
        }
      });
    });
    return { nodes: clusterNodes, links: clusterLinks };
  }, [clusters]);

  useEffect(() => {
    if (!svgRef.current || !wrapRef.current) return;

    const wrap   = wrapRef.current;
    const W      = wrap.clientWidth  || 800;
    const H      = wrap.clientHeight || 480;

    const svg = d3.select(svgRef.current)
      .attr('width',  W)
      .attr('height', H)
      .attr('viewBox', `0 0 ${W} ${H}`);

    svg.selectAll('*').remove();

    /* ── Defs: glow filter + gradient ──────────────────────────────── */
    const defs = svg.append('defs');

    GROUP_COLORS.forEach((color, gi) => {
      const grad = defs.append('radialGradient')
        .attr('id', `node-grad-${gi}`)
        .attr('cx', '35%').attr('cy', '35%').attr('r', '65%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 1);
      grad.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.4);
    });

    /* Glow filter */
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    /* ── Background grid dots ───────────────────────────────────────── */
    const gridG = svg.append('g').attr('class', 'grid-layer');
    const spacing = 40;
    for (let x = spacing; x < W; x += spacing) {
      for (let y = spacing; y < H; y += spacing) {
        gridG.append('circle')
          .attr('cx', x).attr('cy', y).attr('r', 1)
          .attr('fill', 'rgba(255,255,255,0.03)');
      }
    }

    /* ── Force simulation ───────────────────────────────────────────── */
    const nodesCopy = nodes.map(n => ({ ...n }));
    const linksCopy = links.map(l => ({ ...l }));

    const sim = d3.forceSimulation(nodesCopy)
      .force('link',    d3.forceLink(linksCopy).id(d => d.id).distance(d => 80 / (d.weight || 0.5)).strength(0.4))
      .force('charge',  d3.forceManyBody().strength(-180))
      .force('center',  d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide().radius(d => d.size + 12))
      .alphaDecay(0.02);

    simRef.current = sim;

    /* ── Link layer ─────────────────────────────────────────────────── */
    const linkG = svg.append('g').attr('class', 'link-layer');
    const linkSel = linkG.selectAll('line')
      .data(linksCopy)
      .join('line')
      .attr('stroke', d => {
        const src = typeof d.source === 'object' ? d.source : nodesCopy.find(n => n.id === d.source);
        return GROUP_COLORS[src?.group ?? 0] || '#ffffff';
      })
      .attr('stroke-opacity', d => (d.weight || 0.5) * 0.35)
      .attr('stroke-width', d => (d.weight || 0.5) * 1.5);

    /* ── Node hull / pulse ring ─────────────────────────────────────── */
    const nodeG = svg.append('g').attr('class', 'node-layer');
    const nodeSel = nodeG.selectAll('g.node')
      .data(nodesCopy)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (ev, d) => { if (!ev.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag',  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on('end',   (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    /* Outer pulse ring */
    nodeSel.append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', d => d.size + 7)
      .attr('fill', 'none')
      .attr('stroke', d => GROUP_COLORS[d.group] || '#f5c842')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0)
      .each(function (d, i) {
        const el = d3.select(this);
        function pulse() {
          el.attr('r', d.size + 4)
            .attr('stroke-opacity', 0)
            .transition().duration(1200 + i * 80)
            .ease(d3.easeSinOut)
            .attr('r', d.size + 18)
            .attr('stroke-opacity', 0.4)
            .transition().duration(800)
            .attr('stroke-opacity', 0)
            .on('end', pulse);
        }
        setTimeout(pulse, i * 120);
      });

    /* Main circle */
    nodeSel.append('circle')
      .attr('r',    d => d.size)
      .attr('fill', d => `url(#node-grad-${d.group})`)
      .attr('stroke', d => GROUP_COLORS[d.group] || '#fff')
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#glow)')
      .on('mouseover', function () {
        d3.select(this).transition().duration(200).attr('r', d => d.size * 1.25);
      })
      .on('mouseout', function () {
        d3.select(this).transition().duration(200).attr('r', d => d.size);
      });

    /* Label */
    nodeSel.append('text')
      .text(d => d.label)
      .attr('dy', d => d.size + 14)
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', d => (d.size > 13 ? 11 : 9))
      .attr('fill', d => GROUP_COLORS[d.group] || '#fff')
      .attr('fill-opacity', 0.75)
      .attr('pointer-events', 'none');

    /* ── Animated signal pulse along edges ──────────────────────────── */
    const pulseG = svg.append('g').attr('class', 'pulse-layer');
    function spawnSignal() {
      const link = linksCopy[Math.floor(Math.random() * linksCopy.length)];
      if (!link) return;
      const src = link.source;
      const tgt = link.target;
      if (!src?.x || !tgt?.x) return;

      const dot = pulseG.append('circle')
        .attr('r', 3)
        .attr('fill', GROUP_COLORS[src.group ?? 0] || '#f5c842')
        .attr('filter', 'url(#glow)')
        .attr('cx', src.x)
        .attr('cy', src.y);

      dot.transition().duration(600 + Math.random() * 500)
        .ease(d3.easeSinInOut)
        .attr('cx', tgt.x)
        .attr('cy', tgt.y)
        .attr('fill-opacity', 0.1)
        .remove();
    }

    const signalInterval = setInterval(spawnSignal, 120);

    /* ── Tick ───────────────────────────────────────────────────────── */
    sim.on('tick', () => {
      linkSel
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => {
      sim.stop();
      clearInterval(signalInterval);
    };
  }, [nodes, links]);

  return (
    <div className="knowledge-graph-wrap" ref={wrapRef}>
      {/* Header */}
      <div className="kg-header">
        <div className="kg-title-block">
          <span className="kg-eyebrow">Neural Knowledge Map</span>
          <h3 className="kg-title">Your Knowledge Graph</h3>
        </div>
        <div className="kg-legend">
          {['AI & ML', 'Frontend', 'Design', 'Knowledge', 'Notes'].map((label, i) => (
            <span key={label} className="kg-legend-item">
              <span className="kg-legend-dot" style={{ background: GROUP_COLORS[i] }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="kg-canvas">
        <svg ref={svgRef} className="kg-svg" />
        {/* Corner labels */}
        <span className="kg-corner kg-corner-tl">CONNECTIONS</span>
        <span className="kg-corner kg-corner-br">{nodes.length} nodes · {links.length} edges</span>
      </div>
    </div>
  );
}
