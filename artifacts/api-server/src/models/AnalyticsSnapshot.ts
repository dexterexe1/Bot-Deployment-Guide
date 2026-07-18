import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  guildId: string;
  timestamp: Date;
  memberCount: number;
  messageCount: number;
  commandUsage: number;
  ticketCount: number;
  applicationCount: number;
  activeUsers: number;
}

const AnalyticsSnapshotSchema: Schema = new Schema({
  guildId: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  memberCount: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  commandUsage: { type: Number, default: 0 },
  ticketCount: { type: Number, default: 0 },
  applicationCount: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
}, { timestamps: true });

AnalyticsSnapshotSchema.index({ guildId: 1, timestamp: -1 });

export default mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', AnalyticsSnapshotSchema);
