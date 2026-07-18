import mongoose, { Document, Schema } from 'mongoose';

export interface IServerTemplate extends Document {
  name: string;
  description?: string;
  guildId?: string;
  isPublic: boolean;
  theme: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    themePreset?: string;
  };
  mascot: {
    enabled: boolean;
    style?: string;
    color?: string;
    glowColor?: string;
    animations: {
      breathing: boolean;
      blinking: boolean;
      earMovement: boolean;
      hopping: boolean;
      particles: boolean;
    };
  };
  enabledModules: {
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
}

const ServerTemplateSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: String,
  guildId: String,
  isPublic: { type: Boolean, default: true },
  theme: {
    primaryColor: String,
    secondaryColor: String,
    accentColor: String,
    themePreset: String,
  },
  mascot: {
    enabled: { type: Boolean, default: true },
    style: String,
    color: String,
    glowColor: String,
    animations: {
      breathing: { type: Boolean, default: true },
      blinking: { type: Boolean, default: true },
      earMovement: { type: Boolean, default: true },
      hopping: { type: Boolean, default: false },
      particles: { type: Boolean, default: true },
    },
  },
  enabledModules: {
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
}, { timestamps: true });

export default mongoose.model<IServerTemplate>('ServerTemplate', ServerTemplateSchema);
