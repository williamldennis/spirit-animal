declare module 'react-native-render-html' {
  import { ComponentType } from 'react';
  
  export interface RenderHTMLProps {
    source: {
      html: string;
    };
    contentWidth: number;
    baseStyle?: any;
    tagsStyles?: Record<string, any>;
    enableExperimentalMarginCollapsing?: boolean;
    systemFonts?: string[];
    customHTMLElementModels?: Record<string, any>;
    ignoredDomTags?: string[];
    enableCSSInlineProcessing?: boolean;
  }

  const RenderHtml: ComponentType<RenderHTMLProps>;
  export const defaultSystemFonts: string[];
  export default RenderHtml;
} 