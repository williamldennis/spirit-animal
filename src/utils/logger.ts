type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  timestamp?: boolean;
  level?: LogLevel;
}

class Logger {
  private readonly options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      timestamp: true,
      level: 'debug',
      ...options,
    };
  }

  private formatMessage(level: LogLevel, context: string, message: string, data?: any): string {
    const timestamp = this.options.timestamp ? new Date().toISOString() : '';
    const dataString = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${dataString}`;
  }

  debug(context: string, message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', context, message, data));
    }
  }

  info(context: string, message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', context, message, data));
    }
  }

  warn(context: string, message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', context, message, data));
    }
  }

  error(context: string, message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', context, message, data));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.options.level || 'debug');
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}

export const logger = new Logger({
  timestamp: true,
  level: __DEV__ ? 'debug' : 'info'
}); 