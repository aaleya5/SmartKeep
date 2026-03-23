import { useState, useEffect } from 'react';
import { statsAPI } from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Color palette
const COLORS = ['#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const DIFFICULTY_COLORS = { easy: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' };

// Stat Card Component
function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Main InsightsPage Component
function InsightsPage() {
  // State for all data
  const [overview, setOverview] = useState(null);
  const [savesOverTime, setSavesOverTime] = useState(null);
  const [topDomains, setTopDomains] = useState([]);
  const [tagDistribution, setTagDistribution] = useState([]);
  const [readingTimeDist, setReadingTimeDist] = useState([]);
  const [difficultyOverTime, setDifficultyOverTime] = useState([]);
  const [weekdayActivity, setWeekdayActivity] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(90);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [
        overviewRes,
        savesRes,
        domainsRes,
        tagsRes,
        readingRes,
        difficultyRes,
        weekdayRes,
      ] = await Promise.all([
        statsAPI.getOverview(),
        statsAPI.getSavesOverTime(timeRange, 'day'),
        statsAPI.getTopDomains(10),
        statsAPI.getTagDistribution(10),
        statsAPI.getReadingTimeDistribution(),
        statsAPI.getDifficultyOverTime(),
        statsAPI.getWeekdayActivity(),
      ]);

      setOverview(overviewRes.data);
      setSavesOverTime(savesRes.data);
      setTopDomains(domainsRes.data.data || []);
      setTagDistribution(tagsRes.data.data || []);
      setReadingTimeDist(readingRes.data.data || []);
      setDifficultyOverTime(difficultyRes.data.data || []);
      setWeekdayActivity(weekdayRes.data.data || []);
    } catch (err) {
      console.error('Failed to load insights data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Format data for saves over time chart
  const formatSavesData = () => {
    if (!savesOverTime?.data) return [];
    return savesOverTime.data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      saves: item.value,
      rollingAvg: savesOverTime.rolling_avg?.find(r => r.date === item.date)?.value || null,
    }));
  };

  // Format data for difficulty stacked bar
  const formatDifficultyData = () => {
    return difficultyOverTime.map(item => ({
      month: item.month,
      Easy: item.easy,
      Intermediate: item.intermediate,
      Advanced: item.advanced,
    })).reverse();
  };

  // Format reading time for histogram
  const formatReadingTimeData = () => {
    return readingTimeDist.map(item => ({
      bucket: item.bucket,
      count: item.count,
    }));
  };

  // Format weekday data for radar
  const formatWeekdayData = () => {
    return weekdayActivity.map(item => ({
      weekday: item.weekday,
      saves: item.avg_saves,
    }));
  };

  if (isLoading) {
    return (
      <div className="insights-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-page">
      {/* Header */}
      <div className="insights-header">
        <h1>Insights</h1>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="filter-select"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="stats-cards">
        <StatCard 
          title="Total Saved" 
          value={overview?.total_items || 0} 
          icon="📚"
          subtitle="articles saved"
        />
        <StatCard 
          title="Reading Time" 
          value={overview?.total_reading_hours || 0} 
          icon="⏱️"
          subtitle="hours total"
        />
        <StatCard 
          title="Annotations" 
          value={overview?.total_annotations || 0} 
          icon="📝"
          subtitle="highlights & notes"
        />
        <StatCard 
          title="Best Streak" 
          value={overview?.longest_streak_days || 0} 
          icon="🔥"
          subtitle="days in a row"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Saves Over Time - Line Chart */}
        <div className="chart-card chart-wide">
          <h3>Saves Over Time</h3>
          <p className="chart-subtitle">Daily saves with 7-day rolling average</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatSavesData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="saves" 
                stroke="#667eea" 
                strokeWidth={2}
                dot={false}
                name="Daily Saves"
              />
              <Line 
                type="monotone" 
                dataKey="rollingAvg" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="7-day Avg"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Domains - Horizontal Bar Chart */}
        <div className="chart-card">
          <h3>Top Domains</h3>
          <p className="chart-subtitle">Most saved content sources</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topDomains.slice(0, 8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
              <YAxis 
                type="category" 
                dataKey="label" 
                width={100}
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#667eea" radius={[0, 4, 4, 0]} name="Articles" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tag Distribution - Pie Chart */}
        <div className="chart-card">
          <h3>Tag Distribution</h3>
          <p className="chart-subtitle">Most common topics</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tagDistribution.slice(0, 8)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="label"
                label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {tagDistribution.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Reading Time Distribution - Histogram */}
        <div className="chart-card">
          <h3>Reading Time</h3>
          <p className="chart-subtitle">Article length distribution</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formatReadingTimeData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="bucket" 
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Articles" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Difficulty Over Time - Stacked Bar */}
        <div className="chart-card chart-wide">
          <h3>Difficulty Breakdown</h3>
          <p className="chart-subtitle">Content difficulty over time</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formatDifficultyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
                tickFormatter={(val) => {
                  const date = new Date(val + '-01');
                  return date.toLocaleDateString('en-US', { month: 'short' });
                }}
              />
              <YAxis tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Easy" stackId="a" fill={DIFFICULTY_COLORS.easy} name="Easy" />
              <Bar dataKey="Intermediate" stackId="a" fill={DIFFICULTY_COLORS.intermediate} name="Intermediate" />
              <Bar dataKey="Advanced" stackId="a" fill={DIFFICULTY_COLORS.advanced} name="Advanced" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekday Activity - Radar Chart */}
        <div className="chart-card">
          <h3>Weekly Activity</h3>
          <p className="chart-subtitle">Average saves by day of week</p>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={formatWeekdayData()}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="weekday" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} />
              <Radar
                name="Avg Saves"
                dataKey="saves"
                stroke="#667eea"
                fill="#667eea"
                fillOpacity={0.3}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="quick-stats">
        <div className="quick-stat">
          <span className="quick-stat-label">Current Streak:</span>
          <span className="quick-stat-value">{overview?.current_streak_days || 0} days</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Most Saved Domain:</span>
          <span className="quick-stat-value">{overview?.most_saved_domain || 'N/A'}</span>
        </div>
        <div className="quick-stat">
          <span className="quick-stat-label">Avg Reading Time:</span>
          <span className="quick-stat-value">{overview?.average_reading_time_minutes || 0} min</span>
        </div>
      </div>

      <style>{`
        .insights-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Header */
        .insights-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .insights-header h1 {
          margin: 0;
          font-family: var(--font-serif);
          font-size: 3.5rem;
          color: #fff;
          letter-spacing: -0.04em;
          line-height: 1;
        }

        .time-range-selector .filter-select {
          padding: 8px 16px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          font-family: var(--font-sans);
          font-size: 13px;
          background: rgba(255,255,255,0.05);
          color: #fff;
          cursor: pointer;
        }

        /* Stats Cards */
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s;
        }

        .stat-card:hover {
          background: rgba(255,255,255,0.04);
          transform: translateY(-2px);
        }

        .stat-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(245,200,66,0.1);
          border-radius: 12px;
          color: var(--accent-color);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-family: var(--font-serif);
          font-size: 32px;
          font-weight: 500;
          color: #fff;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-title {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-subtitle {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        /* Charts Grid */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }

        .chart-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 32px;
        }

        .chart-card.chart-wide {
          grid-column: span 2;
        }

        .chart-card h3 {
          margin: 0 0 4px;
          font-family: var(--font-sans);
          font-size: 18px;
          color: #fff;
        }

        .chart-subtitle {
          margin: 0 0 24px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        /* Quick Stats */
        .quick-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          flex-wrap: wrap;
        }

        .quick-stat {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .quick-stat-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .quick-stat-value {
          font-family: var(--font-serif);
          font-size: 18px;
          color: var(--accent-color);
          font-style: italic;
        }

        /* Loading */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 80px 32px;
          gap: 16px;
          color: var(--text-secondary);
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Tooltip */
        .chart-tooltip {
          background: rgba(8, 10, 15, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .tooltip-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-secondary);
          margin: 0 0 8px;
        }

        .chart-tooltip p {
          margin: 0;
          font-family: var(--font-sans);
          font-size: 14px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .charts-grid { grid-template-columns: 1fr; }
          .chart-card.chart-wide { grid-column: span 1; }
        }

        @media (max-width: 768px) {
          .insights-page { padding: 16px; }
          .insights-header h1 { font-size: 2.5rem; }
          .stats-cards { grid-template-columns: 1fr; }
          .quick-stats { flex-direction: column; align-items: center; gap: 16px; }
        }
      `}</style>
    </div>
  );
}

export default InsightsPage;
