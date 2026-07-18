// Customization types for user-specific dashboard settings

export interface BackgroundConfig {
  // Aurora gradient colors (CSS color strings)
  auroraColor1: string
  auroraColor2: string
  auroraColor3: string
  auroraColor4: string
  
  // Particle settings
  particleCount: number
  particleSizeMin: number
  particleSizeMax: number
  particleOpacity: number
  
  // Bunny silhouette settings
  bunnyCount: number
  bunnySizeMin: number
  bunnySizeMax: number
  bunnyOpacity: number
  bunnyColor: string
}

export interface MouseFollowerConfig {
  enabled: boolean
  showLargeBunny: boolean
  showSmallBunny: boolean
  largeBunnyScale: number
  smallBunnyScale: number
  largeBunnyOpacity: number
  smallBunnyOpacity: number
}

export interface CustomCursorConfig {
  enabled: boolean
  cursorType: 'default' | 'bunny' | 'bunny-glow' | 'bunny-large'
  cursorColor: string
}

export interface CustomizationSettings {
  background: BackgroundConfig
  mouseFollowers: MouseFollowerConfig
  customCursor: CustomCursorConfig
}

// Default values
export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
  auroraColor1: 'rgba(139, 92, 246, 0.4)', // Violet
  auroraColor2: 'rgba(59, 130, 246, 0.3)', // Blue
  auroraColor3: 'rgba(236, 72, 153, 0.3)', // Pink
  auroraColor4: 'rgba(168, 85, 247, 0.3)', // Purple
  particleCount: 80,
  particleSizeMin: 1,
  particleSizeMax: 3,
  particleOpacity: 0.5,
  bunnyCount: 8,
  bunnySizeMin: 40,
  bunnySizeMax: 60,
  bunnyOpacity: 0.06,
  bunnyColor: 'rgba(139, 92, 246, 0.6)',
}

export const DEFAULT_MOUSE_FOLLOWER_CONFIG: MouseFollowerConfig = {
  enabled: true,
  showLargeBunny: true,
  showSmallBunny: true,
  largeBunnyScale: 1.5,
  smallBunnyScale: 1,
  largeBunnyOpacity: 0.2,
  smallBunnyOpacity: 0.4,
}

export const DEFAULT_CUSTOM_CURSOR_CONFIG: CustomCursorConfig = {
  enabled: false,
  cursorType: 'bunny-glow',
  cursorColor: 'rgba(139, 92, 246, 0.9)',
}

export const DEFAULT_CUSTOMIZATION_SETTINGS: CustomizationSettings = {
  background: DEFAULT_BACKGROUND_CONFIG,
  mouseFollowers: DEFAULT_MOUSE_FOLLOWER_CONFIG,
  customCursor: DEFAULT_CUSTOM_CURSOR_CONFIG,
}
