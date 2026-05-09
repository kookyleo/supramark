export type ComponentType = 'container' | 'text' | 'image' | 'markdown' | 'divider';

export interface VisonComponent {
  version?: string;
  type: ComponentType;
  props?: Record<string, any>;
  style?: Record<string, any>;
  children?: VisonComponent[];
}
