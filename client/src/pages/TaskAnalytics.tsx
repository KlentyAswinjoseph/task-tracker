import React, { useState, useEffect, useCallback } from 'react';
import { ApiService, FilterParams } from '../services/api';
import { TaskDashboardResponse, Task, User, Squad } from '../types/types';
import { formatTimeDisplay, setDefaultDates } from '../utils/dateUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import FilterBar, { TASK_STATUS_OPTIONS } from '../components/FilterBar';
import Navigation from '../components/Navigation';
import GitSync from '../components/GitSync';
import TaskDetailsModal from '../components/TaskDetailsModal';

const TaskAnalytics: React.FC = () => {
  const [taskDashboard, setTaskDashboard] = useState<TaskDashboardResponse | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterParams>(() => setDefaultDates());
  
  // Modal state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);
  };

  const loadSquads = useCallback(async () => {
    try {
      const squadsData = await ApiService.getSquadsForFilter();
      setSquads(squadsData);
    } catch (err) {
      console.error('Error loading squads for filter:', err);
    }
  }, []);

  const loadTaskDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load dashboard analytics
      const dashboardData = await ApiService.getTaskDashboard(filters);
      setTaskDashboard(dashboardData);
      
      // Load tasks list
      const tasksData = await ApiService.getTasks(filters);
      setTasks(tasksData.tasks);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task data');
      console.error('Error loading task dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadAssigneeFilter = useCallback(async () => {
    try {
      const users = await ApiService.getUsers();
      const options = users.map((user: User) => ({
        value: user.userId,
        label: user.userName,
      }));
      setAssigneeOptions(options);
    } catch (err) {
      console.error('Error loading assignees:', err);
    }
  }, []);

  const handleApplyFilters = useCallback(() => {
    loadTaskDashboard();
  }, [loadTaskDashboard]);

  useEffect(() => {
    loadSquads();
    loadAssigneeFilter();
    loadTaskDashboard();
  }, [loadSquads, loadAssigneeFilter, loadTaskDashboard]);

  const squadOptions = squads.map(squad => ({
    value: squad._id!,
    label: squad.name,
    color: squad.color
  }));

  const renderTaskSummary = () => {
    if (!taskDashboard?.summary) return null;

    const { summary } = taskDashboard;

    return (
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{summary.totalTasks.toLocaleString()}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.activeTasks.toLocaleString()}</div>
          <div className="stat-label">Active Tasks</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.completedTasks.toLocaleString()}</div>
          <div className="stat-label">Completed Tasks</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.inReviewTasks.toLocaleString()}</div>
          <div className="stat-label">In Review</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatTimeDisplay(summary.avgWorkTime)}</div>
          <div className="stat-label">Avg Work Time</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatTimeDisplay(summary.totalWorkTime)}</div>
          <div className="stat-label">Total Work Time</div>
        </div>
      </div>
    );
  };

  const renderTopTasks = () => {
    if (!taskDashboard?.topTasksByWorkTime) return null;

    return (
      <div className="top-tasks-list">
        {taskDashboard.topTasksByWorkTime.map((task: Task) => (
          <div key={task.taskId} className="task-item clickable" onClick={() => handleTaskClick(task.taskId)}>
            <div className="task-info">
              <div className="task-name">{task.taskName}</div>
              <div className="task-stats">
                {task.totalBranches} branches • {formatTimeDisplay(task.metrics.totalWorkTime)} work time
              </div>
            </div>
            <div className="task-badges">
              <span className={`badge badge-${task.status}`}>{task.status}</span>
              <span className="badge badge-active">{task.activeBranches} Active</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTasksByAssignee = () => {
    if (!taskDashboard?.tasksByAssignee) return null;

    return (
      <div className="top-users-list">
        {taskDashboard.tasksByAssignee.map((item) => (
          <div key={item.assignee} className="user-item">
            <div className="user-info">
              <div className="user-name">{item.assignee}</div>
              <div className="user-stats">
                {item.count} tasks • {formatTimeDisplay(item.totalWorkTime)} total work time
              </div>
            </div>
            <div className="user-badges">
              <span className="badge badge-active">{item.count} Tasks</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTasksByRepository = () => {
    if (!taskDashboard?.tasksByRepository) return null;

    return (
      <div className="top-users-list">
        {taskDashboard.tasksByRepository.map((item) => (
          <div key={item.repository} className="user-item">
            <div className="user-info">
              <div className="user-name">{item.repository}</div>
              <div className="user-stats">
                {item.count} tasks • {formatTimeDisplay(item.avgWorkTime)} avg work time
              </div>
            </div>
            <div className="user-badges">
              <span className="badge badge-merged">{item.count} Tasks</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTasksTable = () => {
    if (!tasks?.length) return null;

    return (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Task Name</th>
              <th>Status</th>
              <th>Branches</th>
              <th>Assignees</th>
              <th>Work Time</th>
              <th>Repositories</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task: Task) => (
              <tr key={task.taskId} className="clickable" onClick={() => handleTaskClick(task.taskId)}>
                <td>
                  <strong>{task.taskId}</strong>
                </td>
                <td>{task.taskName}</td>
                <td>
                  <span className={`badge badge-${task.status}`}>{task.status}</span>
                </td>
                <td>
                  <span className="badge badge-active">{task.activeBranches}</span>
                  {' / '}
                  <span className="badge badge-merged">{task.mergedBranches}</span>
                  {' / '}
                  {task.totalBranches}
                </td>
                <td>{task.assignees.join(', ')}</td>
                <td>{formatTimeDisplay(task.metrics.totalWorkTime)}</td>
                <td>{task.repositories.join(', ')}</td>
                <td>{new Date(task.updatedAt).toLocaleDateString()}</td>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1>
              <i className="fas fa-tasks"></i>
              Task Analytics Dashboard
            </h1>
            <p>Track task progress, work time, and performance metrics across repositories</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <GitSync onSyncComplete={loadTaskDashboard} />
            <button 
              className="btn btn-primary" 
              onClick={loadTaskDashboard}
              disabled={loading}
            >
              <i className="fas fa-refresh"></i> Refresh
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
        showAssigneeFilter={true}
        showSquadFilter={true}
        statusOptions={TASK_STATUS_OPTIONS}
        assigneeOptions={assigneeOptions}
        squadOptions={squadOptions}
        loading={loading}
      />

      {/* Error Message */}
      <ErrorMessage message={error} />

      {/* Loading Spinner */}
      <LoadingSpinner show={loading} />

      {/* Dashboard Content */}
      {taskDashboard && (
        <>
          {/* Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Task Summary */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-icon" style={{ background: '#3b82f6' }}>
                    <i className="fas fa-chart-bar"></i>
                  </div>
                  Task Summary
                </h2>
              </div>
              {renderTaskSummary()}
            </div>

            {/* Top Tasks */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-icon" style={{ background: '#dc2626' }}>
                    <i className="fas fa-clock"></i>
                  </div>
                  Longest Running Tasks
                </h2>
              </div>
              {renderTopTasks()}
            </div>

            {/* Tasks by Assignee */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-icon" style={{ background: '#10b981' }}>
                    <i className="fas fa-users"></i>
                  </div>
                  Tasks by Assignee
                </h2>
              </div>
              {renderTasksByAssignee()}
            </div>

            {/* Tasks by Repository */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <div className="card-icon" style={{ background: '#8b5cf6' }}>
                    <i className="fas fa-code-branch"></i>
                  </div>
                  Tasks by Repository
                </h2>
              </div>
              {renderTasksByRepository()}
            </div>
          </div>

          {/* Tasks Table */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                <div className="card-icon" style={{ background: '#f59e0b' }}>
                  <i className="fas fa-table"></i>
                </div>
                All Tasks
              </h2>
            </div>
            {renderTasksTable()}
          </div>
        </>
      )}

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default TaskAnalytics; 