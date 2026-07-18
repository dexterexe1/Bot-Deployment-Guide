import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, Bot, Shield, Ticket, FileText, Bell, Smile, TrendingUp, Music, MessageSquare, Terminal } from 'lucide-react';
import { BunnyMascot } from '@/components/BunnyMascot';

interface ModuleConfig {
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
}

interface BotConfigData {
  config: {
    modules: ModuleConfig;
    moduleSettings?: Record<string, any>;
  };
}

const moduleInfo = [
  { key: 'moderation', label: 'Moderation', icon: Shield, description: 'Auto-moderation, warnings, mutes, bans' },
  { key: 'tickets', label: 'Tickets', icon: Ticket, description: 'Support ticket system' },
  { key: 'applications', label: 'Applications', icon: FileText, description: 'Application forms and reviews' },
  { key: 'logging', label: 'Logging', icon: Bell, description: 'Server activity logs' },
  { key: 'welcome', label: 'Welcome', icon: Smile, description: 'Welcome messages and auto-roles' },
  { key: 'reactionRoles', label: 'Reaction Roles', icon: Smile, description: 'Emoji-based role assignment' },
  { key: 'leveling', label: 'Leveling', icon: TrendingUp, description: 'XP and level system' },
  { key: 'music', label: 'Music', icon: Music, description: 'Music playback in voice channels' },
  { key: 'autoResponses', label: 'Auto Responses', icon: MessageSquare, description: 'Automatic message responses' },
  { key: 'customCommands', label: 'Custom Commands', icon: Terminal, description: 'Custom server commands' },
];

export function BotManagementPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const [modules, setModules] = useState<ModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`/api/v1/guilds/${guildId}/bot`);
        const result = await response.json();
        if (result.success) {
          setModules(result.data.config.modules);
        }
      } catch (error) {
        console.error('Failed to fetch bot config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [guildId]);

  const handleToggle = (key: keyof ModuleConfig) => {
    if (modules) {
      setModules({ ...modules, [key]: !modules[key] });
    }
  };

  const handleSave = async () => {
    if (!modules) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/guilds/${guildId}/bot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      });
      
      const result = await response.json();
      if (result.success) {
        // Show success toast or notification
      }
    } catch (error) {
      console.error('Failed to save bot config:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <BunnyMascot size="lg" animated />
        <div className="animate-pulse text-muted-foreground">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
            <Bot className="h-8 w-8 text-purple-400" />
            Bot Management
          </h1>
          <p className="text-muted-foreground">Enable or disable bot modules for your server</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="glass-button">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {moduleInfo.map((module, index) => {
          const Icon = module.icon;
          const isEnabled = modules?.[module.key as keyof ModuleConfig];
          
          return (
            <motion.div
              key={module.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`glass-card border-white/10 transition-all duration-300 ${
                isEnabled ? 'border-purple-500/30 bg-purple-500/5' : ''
              }`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-purple-500/20' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isEnabled ? 'text-purple-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{module.label}</CardTitle>
                      <CardDescription className="text-xs">{module.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(module.key as keyof ModuleConfig)}
                  />
                </CardHeader>
                <CardContent>
                  <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                    {isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
