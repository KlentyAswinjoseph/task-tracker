import React, { useState, useEffect, useCallback } from 'react';
import { DashboardResponse, LegacyUser, Squad } from '../types/types';
import { ApiService, FilterParams } from '../services/api';
import { formatTimeDisplay, setDefaultDates } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import FilterBar from '../components/FilterBar';
import Navigation from '../components/Navigation';
import GitSync from '../components/GitSync';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterParams>(() => setDefaultDates());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);

  const loadSquads = useCallback(async () => {
    try {
      const squadsData = await ApiService.getSquadsForFilter();
      setSquads(squadsData);
    } catch (err) {
      console.error('Error loading squads for filter:', err);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await ApiService.getDashboardSummary(filters);
      setDashboardData(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleApplyFilters = useCallback(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSyncComplete = useCallback(() => {
    // Refresh dashboard data after sync
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadSquads();
  }, [loadSquads]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const squadOptions = squads.map(squad => ({
    value: squad._id!,
    label: squad.name,
    color: squad.color
  }));

  const renderSummaryStats = () => {
    if (!dashboardData?.summary) return null;

    const { summary } = dashboardData;

    return (
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{summary.totalUsers?.toLocaleString() || 'N/A'}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.totalBranches.toLocaleString()}</div>
          <div className="stat-label">Total Branches</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.activeBranches.toLocaleString()}</div>
          <div className="stat-label">Active Branches</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.mergedBranches.toLocaleString()}</div>
          <div className="stat-label">Merged Branches</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatTimeDisplay(summary.avgWaitingTime)}</div>
          <div className="stat-label">Avg Waiting Time</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.totalCommits.toLocaleString()}</div>
          <div className="stat-label">Total Commits</div>
        </div>
      </div>
    );
  };

  const renderTopUsers = () => {
    if (!dashboardData?.topUsers) return null;

    return (
      <div className="top-users-list">
        {dashboardData.topUsers.map((user: LegacyUser) => (
          <div key={user._id} className="user-item">
            <div className="user-info">
              <div className="user-name">{user.userName}</div>
              <div className="user-stats">
                {user.branchCount} branches • {user.totalCommits} commits • {formatTimeDisplay(user.avgWaitingTime)} avg time
              </div>
            </div>
            <div className="user-badges">
              <span className="badge badge-active">{user.branchCount} Branches</span>
              <span className="badge badge-merged">{user.totalCommits} Commits</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUsersTable = () => {
    if (!dashboardData?.topUsers) return null;

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Total Branches</th>
              <th>Total Commits</th>
              <th>Avg Waiting Time</th>
              <th>User ID</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData.topUsers.map((user: LegacyUser) => (
              <tr key={user._id} className="clickable">
                <td>
                  <strong>{user.userName}</strong>
                </td>
                <td>
                  <span className="badge badge-active">{user.branchCount}</span>
                </td>
                <td>{user.totalCommits.toLocaleString()}</td>
                <td>{formatTimeDisplay(user.avgWaitingTime)}</td>
                <td>
                  <small style={{ color: 'var(--text-secondary)' }}>{user._id}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
          <div>
            <h1>
              <i className="fas fa-code-branch"></i>
              Git Branch Tracker Dashboard
            </h1>
            <p>Track user productivity and branch lifecycle metrics with detailed analytics</p>
            {lastUpdated && (
              <small style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>
                Last updated: {lastUpdated.toLocaleString()}
              </small>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <GitSync onSyncComplete={handleSyncComplete} />
            <button 
              className="btn btn-secondary" 
              onClick={loadDashboard}
              disabled={loading}
            >
              <i className="fas fa-refresh"></i>
              Refresh
            </button>
          </div>
        </div>
        <Navigation />
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
        loading={loading}
        showSquadFilter={true}
        squadOptions={squadOptions}
      />

      {/* Error Message */}
      <ErrorMessage message={error} />

      {/* Loading Spinner */}
      <LoadingSpinner show={loading} />

      {/* Dashboard Content */}
      {dashboardData && (
        <>
          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Summary Stats */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-icon" style={{ background: 'var(--primary-color)' }}>
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  Summary Statistics
                </h2>
              </div>
              {renderSummaryStats()}
            </div>

            {/* Top Users */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-icon" style={{ background: 'var(--success-color)' }}>
                    <i className="fas fa-users"></i>
                  </div>
                  Top Users
                </h2>
              </div>
              {renderTopUsers()}
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <div className="card-icon" style={{ background: 'var(--secondary-color)' }}>
                  <i className="fas fa-table"></i>
                </div>
                User Statistics
              </h2>
            </div>
            {renderUsersTable()}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard; 