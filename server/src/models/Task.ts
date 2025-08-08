import mongoose, { Schema, Document } from 'mongoose';
import { Task as ITask } from '@shared/types';

export interface TaskDocument extends Omit<ITask, '_id'>, Document {}

const taskTimelineSchema = new Schema({
  startTime: Date,
  endTime: Date,
  reviewStartTime: Date,
  mergedTime: Date,
});

const taskMetricsSchema = new Schema({
  totalWorkTime: Number,
  avgWorkTime: Number,
  totalCommits: { type: Number, default: 0 },
  totalAdditions: { type: Number, default: 0 },
  totalDeletions: { type: Number, default: 0 },
  totalFilesChanged: { type: Number, default: 0 },
});

const taskSchema = new Schema({
  taskId: { type: String, required: true, unique: true },
  taskName: { type: String, required: true },
  totalBranches: { type: Number, default: 0 },
  activeBranches: { type: Number, default: 0 },
  mergedBranches: { type: Number, default: 0 },
  repositories: { type: [String], default: [] },
  assignees: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  timeline: { type: taskTimelineSchema, default: () => ({}) },
  metrics: { type: taskMetricsSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ['active', 'in_review', 'completed', 'on_hold'],
    default: 'active',
  },
});

taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Task = mongoose.model<TaskDocument>('Task', taskSchema); 