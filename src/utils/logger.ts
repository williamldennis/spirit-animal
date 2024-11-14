type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, context: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'info':
        console.log(logMessage, data || '');
        break;
      case 'debug':
        console.debug(logMessage, data || '');
        break;
    }
  }

  info(context: string, message: string, data?: any) {
    this.log('info', context, message, data);
  }

  warn(context: string, message: string, data?: any) {
    this.log('warn', context, message, data);
  }

  error(context: string, message: string, data?: any) {
    this.log('error', context, message, data);
  }

  debug(context: string, message: string, data?: any) {
    this.log('debug', context, message, data);
  }
}

export const logger = new Logger(); 