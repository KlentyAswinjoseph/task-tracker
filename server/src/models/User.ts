import mongoose, { Schema, Document } from 'mongoose';
import { User as IUser } from '@shared/types';

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const userStatsSchema = new Schema({
  totalBranches: { type: Number, default: 0 },
  activeBranches: { type: Number, default: 0 },
  mergedBranches: { type: Number, default: 0 },
  avgWaitingTime: { type: Number, default: 0 },
  totalCommits: { type: Number, default: 0 },
  totalAdditions: { type: Number, default: 0 },
  totalDeletions: { type: Number, default: 0 },
});

const userSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  email: String,
  avatar: String,
  stats: { type: userStatsSchema, default: () => ({}) },
  lastActivity: { type: Date, default: Date.now },
});

userSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

export const User = mongoose.model<UserDocument>('User', userSchema); 