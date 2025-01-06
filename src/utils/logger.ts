type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  debug(tag: string, message: string, data?: any) {
    this.log('debug', tag, message, data);
  }

  info(tag: string, message: string, data?: any) {
    this.log('info', tag, message, data);
  }

  warn(tag: string, message: string, data?: any) {
    this.log('warn', tag, message, data);
  }

  error(tag: string, message: string, data?: any) {
    this.log('error', tag, message, data);
  }

  private log(level: LogLevel, tag: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${tag}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

export const logger = new Logger(); 