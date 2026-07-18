import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Palette, Bot, Sparkles, Gamepad2, Briefcase } from 'lucide-react';
import { BunnyMascot } from '@/components/BunnyMascot';

interface Template {
  _id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  theme: {
    themePreset?: string;
    primaryColor?: string;
  };
  mascot: {
    enabled: boolean;
    style?: string;
  };
  enabledModules: Record<string, boolean>;
}

const presetTemplates = [
  { id: 'default', name: 'Default Bunny', icon: Bot, description: 'Standard United Bunnies configuration' },
  { id: 'midnight', name: 'Midnight Community', icon: Palette, description: 'Dark theme for communities' },
  { id: 'gaming', name: 'Gaming Server', icon: Gamepad2, description: 'Optimized for gaming communities' },
  { id: 'professional', name: 'Professional', icon: Briefcase, description: 'Clean setup for professional servers' },
];

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/v1/templates');
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data.templates);
        }
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleApplyTemplate = async (templateId: string) => {
    try {
      // In a real implementation, this would apply the template to the current guild
      console.log('Applying template:', templateId);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const handleSaveAsTemplate = async () => {
    // Save current configuration as a new template
    console.log('Saving as template');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-400" />
            Server Templates
          </h1>
          <p className="text-muted-foreground">Quick-start configurations for your server</p>
        </div>
        <Button onClick={handleSaveAsTemplate} className="glass-button">
          <Copy className="h-4 w-4 mr-2" />
          Save Current as Template
        </Button>
      </div>

      {/* Preset Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Preset Templates</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {presetTemplates.map((preset, index) => {
            const Icon = preset.icon;
            return (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card border-white/10 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group">
                  <CardHeader>
                    <div className="p-3 rounded-lg bg-purple-500/10 w-fit group-hover:bg-purple-500/20 transition-colors">
                      <Icon className="h-6 w-6 text-purple-400" />
                    </div>
                    <CardTitle className="text-lg">{preset.name}</CardTitle>
                    <CardDescription>{preset.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full glass-button"
                      onClick={() => handleApplyTemplate(preset.id)}
                    >
                      Apply Template
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Saved Templates */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Saved Templates</h2>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <BunnyMascot size="lg" animated />
            <div className="text-center text-muted-foreground">Loading templates...</div>
          </div>
        ) : templates.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="py-12 flex flex-col items-center justify-center gap-4">
              <BunnyMascot size="lg" />
              <div className="text-center text-muted-foreground">
                No saved templates yet. Create one to get started!
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template, index) => (
              <motion.div
                key={template._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card border-white/10 hover:border-purple-500/30 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant={template.isPublic ? 'default' : 'secondary'}>
                        {template.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Theme: {template.theme.themePreset || 'Custom'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Mascot: {template.mascot.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 glass-button"
                        onClick={() => setSelectedTemplate(template)}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 glass-button"
                        onClick={() => handleApplyTemplate(template._id)}
                      >
                        Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
