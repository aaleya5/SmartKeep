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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="label" 
                width={100}
                tick={{ fontSize: 11 }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="bucket" 
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <YAxis tick={{ fontSize: 12 }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => {
                  const date = new Date(val + '-01');
                  return date.toLocaleDateString('en-US', { month: 'short' });
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
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
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="weekday" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
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
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.5rem;
        }

        /* Header */
        .insights-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .insights-header h1 {
          margin: 0;
          font-size: 1.75rem;
          color: #1f2937;
        }

        .time-range-selector .filter-select {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
        }

        /* Stats Cards */
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .stat-icon {
          font-size: 2rem;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 12px;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1.2;
        }

        .stat-title {
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 500;
        }

        .stat-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        /* Charts Grid */
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .chart-card {
          background: white;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .chart-card.chart-wide {
          grid-column: span 2;
        }

        .chart-card h3 {
          margin: 0 0 0.25rem;
          font-size: 1.1rem;
          color: #1f2937;
        }

        .chart-subtitle {
          margin: 0 0 1rem;
          font-size: 0.8rem;
          color: #9ca3af;
        }

        /* Quick Stats */
        .quick-stats {
          display: flex;
          justify-content: center;
          gap: 3rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          flex-wrap: wrap;
        }

        .quick-stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .quick-stat-label {
          font-size: 0.9rem;
          color: #6b7280;
        }

        .quick-stat-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
        }

        /* Loading */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4rem 2rem;
          gap: 1rem;
          color: #6b7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Tooltip */
        .chart-tooltip {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.75rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .tooltip-label {
          font-weight: 600;
          margin: 0 0 0.5rem;
          color: #374151;
        }

        .chart-tooltip p {
          margin: 0;
          font-size: 0.85rem;
        }

        /* Dark mode */
        .app.dark-mode .insights-header h1,
        .app.dark-mode .stat-value,
        .app.dark-mode .chart-card h3,
        .app.dark-mode .quick-stat-value {
          color: #f3f4f6;
        }

        .app.dark-mode .stat-title,
        .app.dark-mode .chart-subtitle,
        .app.dark-mode .quick-stat-label {
          color: #9ca3af;
        }

        .app.dark-mode .stats-cards,
        .app.dark-mode .chart-card,
        .app.dark-mode .quick-stats {
          background: #1f2937;
          border-color: #374151;
        }

        .app.dark-mode .time-range-selector .filter-select {
          background: #374151;
          border-color: #4b5563;
          color: #f3f4f6;
        }

        .app.dark-mode .stat-icon {
          background: #374151;
        }

        .app.dark-mode .chart-tooltip {
          background: #1f2937;
          border-color: #374151;
        }

        .app.dark-mode .tooltip-label {
          color: #f3f4f6;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .chart-card.chart-wide {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .insights-page {
            padding: 1rem;
          }

          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }

          .quick-stats {
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

export default InsightsPage;
