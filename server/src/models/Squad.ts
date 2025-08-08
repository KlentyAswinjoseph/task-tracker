import mongoose, { Schema, Document } from 'mongoose';

export interface SquadMember {
  userId: string;
  userName: string;
  email?: string;
  role?: string;
  joinedAt: Date;
}

export interface SquadDocument extends Document {
  name: string;
  description: string;
  color: string;
  members: SquadMember[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const squadMemberSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  email: String,
  role: String,
  joinedAt: { type: Date, default: Date.now },
});

const squadSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, required: true, default: '#3b82f6' },
  members: [squadMemberSchema],
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field on save
squadSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
squadSchema.index({ name: 1 });
squadSchema.index({ 'members.userId': 1 });
squadSchema.index({ createdBy: 1 });

export const Squad = mongoose.model<SquadDocument>('Squad', squadSchema); 