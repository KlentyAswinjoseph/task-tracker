import React from 'react';
import { FilterParams } from '../services/api';

interface FilterBarProps {
  filters: FilterParams;
  onFiltersChange: (filters: FilterParams) => void;
  onApplyFilters: () => void;
  showAssigneeFilter?: boolean;
  showStatusFilter?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
  assigneeOptions?: Array<{ value: string; label: string }>;
  loading?: boolean;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'merged', label: 'Merged' },
  { value: 'deployed', label: 'Deployed' },
];

const TASK_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'in_review', label: 'In Review' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
];

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  showAssigneeFilter = false,
  showStatusFilter = true,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  assigneeOptions = [],
  loading = false,
}) => {
  const handleInputChange = (field: keyof FilterParams, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onApplyFilters();
    }
  };

  return (
    <div className="filters">
      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            value={filters.startDate || ''}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="endDate">End Date</label>
          <input
            type="date"
            id="endDate"
            value={filters.endDate || ''}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            onKeyPress={handleKeyPress}
          />
        </div>
        
        {showStatusFilter && (
          <div className="filter-group">
            <label htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              value={filters.status || ''}
              onChange={(e) => handleInputChange('status', e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {showAssigneeFilter && (
          <div className="filter-group">
            <label htmlFor="assigneeFilter">Assignee</label>
            <select
              id="assigneeFilter"
              value={filters.assignee || ''}
              onChange={(e) => handleInputChange('assignee', e.target.value)}
            >
              <option value="">All Assignees</option>
              {assigneeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="filter-group">
          <label>&nbsp;</label>
          <button 
            className="btn btn-primary" 
            onClick={onApplyFilters}
            disabled={loading}
          >
            <i className="fas fa-filter"></i>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export { TASK_STATUS_OPTIONS };
export default FilterBar; 