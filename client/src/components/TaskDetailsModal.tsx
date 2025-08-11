import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { Task } from '../types/types';
import { formatTimeDisplay } from '../utils/dateUtils';
import LoadingSpinner from './LoadingSpinner';

interface TaskDetailsModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface TaskDetails {
  task: Task;
  assigneeDetails: Array<{
    userName: string;
    userId: string;
  }>;
  metrics: {
    timeline: Array<{
      branchName: string;
      repository: string;
      assignee: string;
      status: string;
      workTime?: number;
      created: string;
    }>;
    byRepository: {
      [repository: string]: {
        total: number;
        active: number;
        merged: number;
        workTime: number;
      };
    };
  };
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ taskId, isOpen, onClose }) => {
  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<Record<string, boolean>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      setSelectedBranches({});
    }
  }, [isOpen, taskId]);

  const loadTaskDetails = async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Use the new backend API - it returns the full structure we need
      const data = await ApiService.getTask(taskId);
      
      console.log('Task details response:', data);
      setTaskDetails(data);
      
    } catch (err) {
      console.error('Error loading task details:', err);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const toggleBranchSelection = (repository: string, branchName: string) => {
    const key = `${repository}__${branchName}`;
    setSelectedBranches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSyncSelected = async () => {
    if (!taskId || !taskDetails) return;
    const includeBranchKeys = taskDetails.metrics.timeline
      .filter(item => selectedBranches[`${item.repository}__${item.branchName}`])
      .map(item => ({ repository: item.repository, branchName: item.branchName }));
    if (includeBranchKeys.length === 0) {
      alert('Select at least one branch to sync');
      return;
    }
    try {
      setIsSyncing(true);
      await ApiService.syncTask(
        taskId,
        { organization: 'klenty', includeBranchKeys },
        (p) => console.log('Selected branch sync progress', p),
        async () => {
          await loadTaskDetails();
          setSelectedBranches({});
          alert('Selected branches synced successfully');
        }
      );
    } catch (e: any) {
      console.error('Selected branch sync failed', e);
      alert(`Selected branch sync failed: ${e.message || e}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {taskDetails ? `Task: ${taskDetails.task.taskId}` : 'Task Details'}
          </h2>
          <button className="btn-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {loading && <LoadingSpinner show={true} />}
          
          {error && (
            <div style={{ color: 'var(--error-color)', textAlign: 'center', padding: '20px' }}>
              {error}
            </div>
          )}
          
          {taskDetails && !loading && (
            <>
              {/* Task Overview */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                  Task Overview
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '12px', 
                  marginBottom: '16px' 
                }}>
                  <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary-color)' }}>
                      {taskDetails.task.taskName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Task Name</div>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--success-color)' }}>
                      {taskDetails.task.totalBranches}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Branches</div>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--warning-color)' }}>
                      {formatTimeDisplay(taskDetails.task.metrics?.totalWorkTime)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Total Work Time</div>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border-color)' 
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--error-color)' }}>
                      {taskDetails.task.assignees.length}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Assignees</div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      Repositories
                    </h4>
                    <ul style={{ margin: '0', paddingLeft: '16px', fontSize: '12px' }}>
                      {taskDetails.task.repositories.map((repo, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{repo}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      Assignees
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {taskDetails.assigneeDetails?.map((assignee, index) => (
                        <span 
                          key={index}
                          style={{ 
                            padding: '4px 8px', 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary-color)', 
                            borderRadius: 'var(--radius)', 
                            fontSize: '11px' 
                          }}
                        >
                          {assignee.userName}
                        </span>
                      )) || taskDetails.task.assignees.map((assignee, index) => (
                        <span 
                          key={index}
                          style={{ 
                            padding: '4px 8px', 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary-color)', 
                            borderRadius: 'var(--radius)', 
                            fontSize: '11px' 
                          }}
                        >
                          {assignee}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Branch Timeline */}
              {taskDetails.metrics?.timeline && taskDetails.metrics.timeline.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                    Branch Timeline
                  </h3>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {taskDetails.metrics.timeline.map((item, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px', 
                        borderBottom: '1px solid var(--border-color)' 
                      }}>
                        <input
                          type="checkbox"
                          checked={!!selectedBranches[`${item.repository}__${item.branchName}`]}
                          onChange={() => toggleBranchSelection(item.repository, item.branchName)}
                          style={{ marginRight: '8px' }}
                        />
                        <div style={{ minWidth: '80px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {new Date(item.created).toLocaleDateString()}
                        </div>
                        <div style={{ flex: 1, marginLeft: '12px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '12px' }}>
                            {item.branchName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {item.repository} • {item.assignee} • 
                            <span className={`badge badge-${item.status}`} style={{ marginLeft: '4px' }}>
                              {item.status}
                            </span>
                            {item.workTime && ` • ${formatTimeDisplay(item.workTime)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Repository Breakdown */}
              {taskDetails.metrics?.byRepository && (
                <div>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>
                    Repository Breakdown
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {Object.entries(taskDetails.metrics.byRepository).map(([repo, metrics]) => (
                      <div key={repo} style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius)', 
                        padding: '12px' 
                      }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px', fontSize: '12px' }}>
                          {repo}
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                          gap: '8px' 
                        }}>
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '6px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: 'var(--radius)' 
                          }}>
                            <div style={{ fontWeight: '600', color: 'var(--primary-color)', fontSize: '12px' }}>
                              {metrics.total}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Branches</div>
                          </div>
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '6px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: 'var(--radius)' 
                          }}>
                            <div style={{ fontWeight: '600', color: 'var(--success-color)', fontSize: '12px' }}>
                              {metrics.active}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Active</div>
                          </div>
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '6px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: 'var(--radius)' 
                          }}>
                            <div style={{ fontWeight: '600', color: 'var(--info-color)', fontSize: '12px' }}>
                              {metrics.merged}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Merged</div>
                          </div>
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '6px', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: 'var(--radius)' 
                          }}>
                            <div style={{ fontWeight: '600', color: 'var(--warning-color)', fontSize: '12px' }}>
                              {formatTimeDisplay(metrics.workTime)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Work Time</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSyncing}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleSyncSelected} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Sync Selected Branches'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal; 