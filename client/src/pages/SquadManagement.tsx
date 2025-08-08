import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation';
import { ApiService } from '../services/api';
import { Squad, User } from '../types/types';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const SquadManagement: React.FC = () => {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [syncData, setSyncData] = useState({
    organization: '',
    isSyncing: false,
    progress: null as any,
    results: null as any
  });

  // Load squads and users from API
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [squadsData, usersData] = await Promise.all([
        ApiService.getSquads(),
        ApiService.getAllUsers()
      ]);
      
      setSquads(squadsData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading squad data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSquad = async () => {
    if (!formData.name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const newSquad = await ApiService.createSquad({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        createdBy: 'admin' // TODO: Get from auth context
      });

      setSquads([newSquad, ...squads]);
      setFormData({ name: '', description: '', color: '#3b82f6' });
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create squad');
      console.error('Error creating squad:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUsers = async () => {
    if (!selectedSquad || selectedUsers.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const updatedSquad = await ApiService.addMembersToSquad(selectedSquad._id!, {
        memberIds: selectedUsers
      });

      setSquads(squads.map(squad => 
        squad._id === selectedSquad._id ? updatedSquad : squad
      ));
      setSelectedUsers([]);
      setShowAssignModal(false);
      setSelectedSquad(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign users');
      console.error('Error assigning users:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (squadId: string, userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const updatedSquad = await ApiService.removeMemberFromSquad(squadId, userId);

      setSquads(squads.map(squad => 
        squad._id === squadId ? updatedSquad : squad
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      console.error('Error removing member:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUsers = async () => {
    if (!syncData.organization.trim()) return;

    try {
      setSyncData(prev => ({ ...prev, isSyncing: true, progress: null, results: null }));
      setError(null);

      await ApiService.syncUsers(
        syncData.organization,
        (progress) => {
          setSyncData(prev => ({ ...prev, progress }));
        },
        (results) => {
          setSyncData(prev => ({ ...prev, results, isSyncing: false }));
          // Reload users after sync
          loadData();
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync users');
      console.error('Error syncing users:', err);
      setSyncData(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const getAvailableUsers = (squad: Squad) => {
    return users.filter(user => !squad.members.some(member => member.userId === user.userId));
  };

  if (loading && squads.length === 0) {
    return (
      <div className="container">
        <Navigation />
        <LoadingSpinner show={true} />
      </div>
    );
  }

  return (
    <div className="container">
      <Navigation />
      
      {error && <ErrorMessage message={error} />}
      
      <div className="header">
        <div className="header-content">
          <h1>
            <i className="fas fa-users"></i>
            Squad Management
          </h1>
          <p>Create and manage teams, assign members to squads</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowSyncModal(true)}
            disabled={loading}
          >
            <i className="fas fa-sync"></i>
            Sync Users
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
          >
            <i className="fas fa-plus"></i>
            Create Squad
          </button>
        </div>
      </div>

      <div className="squads-grid">
        {squads.map(squad => (
          <div key={squad._id} className="squad-card">
            <div className="squad-header">
              <div className="squad-info">
                <div 
                  className="squad-color" 
                  style={{ backgroundColor: squad.color }}
                ></div>
                <div>
                  <h3 className="squad-name">{squad.name}</h3>
                  <p className="squad-description">{squad.description}</p>
                </div>
              </div>
              <div className="squad-actions">
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedSquad(squad);
                    setShowAssignModal(true);
                  }}
                  disabled={loading}
                >
                  <i className="fas fa-user-plus"></i>
                  Add Members
                </button>
              </div>
            </div>

            <div className="squad-members">
              <div className="members-header">
                <h4>Members ({squad.members.length})</h4>
                {getAvailableUsers(squad).length > 0 && (
                  <span className="available-users">
                    {getAvailableUsers(squad).length} available
                  </span>
                )}
              </div>
              
              {squad.members.length === 0 ? (
                <div className="no-members">
                  <i className="fas fa-user-friends"></i>
                  <p>No members assigned</p>
                </div>
              ) : (
                <div className="members-list">
                  {squad.members.map(member => (
                    <div key={member.userId} className="member-item">
                      <div className="member-avatar">
                        <div className="avatar-placeholder">
                          {member.userName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="member-info">
                        <div className="member-name">{member.userName}</div>
                        <div className="member-role">{member.role || 'Member'}</div>
                      </div>
                      <button 
                        className="btn-remove-member"
                        onClick={() => removeMember(squad._id!, member.userId)}
                        title="Remove member"
                        disabled={loading}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="squad-footer">
              <span className="squad-date">
                Created: {new Date(squad.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Squad Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Squad</h3>
              <button 
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="squad-name">Squad Name</label>
                <input
                  id="squad-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter squad name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="squad-description">Description</label>
                <textarea
                  id="squad-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter squad description"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="squad-color">Color</label>
                <div className="color-picker">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      className={`color-option ${formData.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({...formData, color})}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateSquad}
                disabled={!formData.name.trim() || loading}
              >
                {loading ? 'Creating...' : 'Create Squad'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && selectedSquad && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Members to {selectedSquad.name}</h3>
              <button 
                className="btn-close"
                onClick={() => setShowAssignModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="users-list">
                {getAvailableUsers(selectedSquad).map(user => (
                  <div key={user.userId} className="user-select-item">
                    <label className="user-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.userId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.userId]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.userId));
                          }
                        }}
                      />
                      <div className="user-info">
                        <div className="user-name">{user.userName}</div>
                        <div className="user-email">{user.email}</div>
                        <div className="user-role">Developer</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowAssignModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAssignUsers}
                disabled={selectedUsers.length === 0 || loading}
              >
                {loading ? 'Assigning...' : `Assign ${selectedUsers.length} Member${selectedUsers.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Users Modal */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sync Users from Git Organization</h3>
              <button 
                className="btn-close"
                onClick={() => setShowSyncModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="organization-name">Organization Name</label>
                <input
                  id="organization-name"
                  type="text"
                  value={syncData.organization}
                  onChange={(e) => setSyncData(prev => ({ ...prev, organization: e.target.value }))}
                  placeholder="Enter GitHub organization name"
                  disabled={syncData.isSyncing}
                />
              </div>
              
              {syncData.progress && (
                <div className="sync-progress">
                  <div className="progress-status">
                    <strong>{syncData.progress.status}</strong>
                  </div>
                  <div className="progress-message">
                    {syncData.progress.message}
                  </div>
                  {syncData.progress.results && (
                    <div className="progress-results">
                      <div className="result-item">
                        <span>Total Users:</span>
                        <span>{syncData.progress.results.totalUsers}</span>
                      </div>
                      <div className="result-item">
                        <span>Created:</span>
                        <span>{syncData.progress.results.usersCreated}</span>
                      </div>
                      <div className="result-item">
                        <span>Updated:</span>
                        <span>{syncData.progress.results.usersUpdated}</span>
                      </div>
                      <div className="result-item">
                        <span>Skipped:</span>
                        <span>{syncData.progress.results.usersSkipped}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSyncModal(false)}
                disabled={syncData.isSyncing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSyncUsers}
                disabled={!syncData.organization.trim() || syncData.isSyncing}
              >
                {syncData.isSyncing ? 'Syncing...' : 'Sync Users'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadManagement; 