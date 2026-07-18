import mongoose, { Document, Schema } from 'mongoose';

export interface IBotConfig extends Document {
  guildId: string;
  modules: {
    moderation: boolean;
    tickets: boolean;
    applications: boolean;
    logging: boolean;
    welcome: boolean;
    reactionRoles: boolean;
    leveling: boolean;
    music: boolean;
    autoResponses: boolean;
    customCommands: boolean;
  };
  moduleSettings?: Record<string, any>;
}

const BotConfigSchema: Schema = new Schema({
  guildId: { type: String, required: true, unique: true },
  modules: {
    moderation: { type: Boolean, default: false },
    tickets: { type: Boolean, default: false },
    applications: { type: Boolean, default: false },
    logging: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false },
    reactionRoles: { type: Boolean, default: false },
    leveling: { type: Boolean, default: false },
    music: { type: Boolean, default: false },
    autoResponses: { type: Boolean, default: false },
    customCommands: { type: Boolean, default: false },
  },
  moduleSettings: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });

export default mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);
