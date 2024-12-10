import React from 'react';
import { View, StyleSheet, Text, useWindowDimensions, Image } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { decode } from 'html-entities';
import sanitizeHtml from 'sanitize-html';
import { logger } from '../../../utils/logger';
import type { TRenderEngineProvider, RenderHTMLProps } from 'react-native-render-html';

interface Props {
  html: string | null;
  text: string;
}

interface CustomRendererProps {
  src?: string;
  alt?: string;
}

export default function EmailContent({ html, text }: Props) {
  const { width } = useWindowDimensions();

  if (!html) {
    logger.debug('EmailContent', 'No HTML content, rendering plain text');
    return (
      <Text style={styles.text}>
        {text}
      </Text>
    );
  }

  // First decode HTML entities
  const decodedHtml = decode(html);
  
  logger.debug('EmailContent', 'Original HTML', {
    length: html.length,
    preview: html.substring(0, 200)
  });

  // Then sanitize the HTML
  const cleanHtml = sanitizeHtml(decodedHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
      'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img', 'span'
    ],
    allowedAttributes: {
      'a': ['href', 'target'],
      'img': ['src', 'alt', 'width', 'height'],
      '*': ['style']
    },
    allowedStyles: {
      '*': {
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/],
        'text-align': [/^left$/, /^right$/, /^center$/],
        'font-size': [/^\d+(?:px|em|%)$/]
      }
    },
    transformTags: {
      'center': 'div'
    }
  });

  logger.debug('EmailContent', 'Cleaned HTML', {
    length: cleanHtml.length,
    preview: cleanHtml.substring(0, 200)
  });

  return (
    <View style={styles.container}>
      <RenderHtml
        contentWidth={width - 32}
        source={{ html: cleanHtml }}
        baseStyle={styles.text}
        tagsStyles={htmlStyles}
        enableExperimentalMarginCollapsing
        renderers={{
          img: ({ tnode }) => {
            const { src, alt } = tnode.attributes as CustomRendererProps;
            return (
              <View style={imageStyles.container}>
                <Image
                  source={{ uri: src }}
                  style={imageStyles.image}
                  resizeMode="contain"
                  accessible={true}
                  accessibilityLabel={alt}
                />
              </View>
            );
          }
        }}
      />
    </View>
  );
}

const imageStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 200,
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  text: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    fontFamily: '-apple-system',
  }
});

const htmlStyles = {
  div: {
    marginVertical: 4,
  },
  p: {
    marginVertical: 8,
  },
  a: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#111827',
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#111827',
  },
  h3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#111827',
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 12,
    marginLeft: 0,
    marginVertical: 8,
  },
  ul: {
    marginLeft: 20,
  },
  ol: {
    marginLeft: 20,
  },
  li: {
    marginBottom: 4,
  },
  img: {
    maxWidth: '100%',
    height: 'auto',
    marginVertical: 8,
    alignSelf: 'center'
  },
  pre: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 4,
    marginVertical: 8,
  },
  code: {
    fontFamily: 'Courier',
    backgroundColor: '#F3F4F6',
    padding: 2,
    borderRadius: 2,
  }
}; 