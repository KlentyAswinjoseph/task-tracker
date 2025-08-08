import mongoose, { Schema, Document } from 'mongoose';
import { Branch as IBranch } from '@shared/types';

export interface BranchDocument extends Omit<IBranch, '_id'>, Document {}

const branchStagesSchema = new Schema({
  created: { type: Date, default: Date.now },
  firstCommit: Date,
  prCreated: Date,
  reviewStarted: Date,
  merged: Date,
  deployed: Date,
});

const branchWaitingTimesSchema = new Schema({
  development: Number, // hours
  review: Number, // hours
  deployment: Number, // hours
  total: Number, // hours
});

const branchMetricsSchema = new Schema({
  commits: { type: Number, default: 0 },
  additions: { type: Number, default: 0 },
  deletions: { type: Number, default: 0 },
  filesChanged: { type: Number, default: 0 },
  reviewers: [String],
  comments: { type: Number, default: 0 },
});

const branchSchema = new Schema({
  branchName: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  repository: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'merged', 'deleted', 'deployed'],
    default: 'active',
  },
  stages: { type: branchStagesSchema, default: () => ({}) },
  waitingTimes: { type: branchWaitingTimesSchema, default: () => ({}) },
  metrics: { type: branchMetricsSchema, default: () => ({}) },
  taskId: { type: String, default: null },
  taskDescription: { type: String, default: null },
  tags: { type: [String], default: [] },
});

branchSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Branch = mongoose.model<BranchDocument>('Branch', branchSchema); 