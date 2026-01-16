
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private storageKey = 'app_detailed_logs';

  constructor() {
    // Load logs from localStorage on initialization if in browser
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          this.logs = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Failed to load logs from localStorage', e);
      }
    }
  }

  private addLog(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitizeData(data),
      context
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with colors
    const contextPrefix = context ? `[%c${context}%c] ` : '';
    const contextStyles = context ? ['color: #3b82f6; font-weight: bold;', ''] : [];
    
    const levelStyles = {
      debug: 'color: #6b7280;',
      info: 'color: #3b82f6;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;'
    };

    console.log(
      `%c${entry.timestamp.split('T')[1].split('.')[0]} %c${level.toUpperCase()}%c ${contextPrefix}${message}`,
      'color: #9ca3af;',
      levelStyles[level],
      '',
      ...contextStyles,
      data !== undefined ? data : ''
    );

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        // We only persist a subset of logs to localStorage to avoid filling it up
        const sessionLogs = this.logs.slice(-200); 
        localStorage.setItem(this.storageKey, JSON.stringify(sessionLogs));
      } catch (e) {
        // If localStorage is full, clear old logs
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  // Avoid circular references or massive objects in logs
  private sanitizeData(data: any): any {
    if (data === undefined) return undefined;
    try {
      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          stack: data.stack
        };
      }
      if (data instanceof Blob) {
        return {
          type: 'Blob',
          size: data.size,
          contentType: data.type
        };
      }
      // Simple stringify/parse to break references and check for circularity
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      return '[Complex or Circular Data]';
    }
  }

  debug(message: string, data?: any, context?: string) { this.addLog('debug', message, data, context); }
  info(message: string, data?: any, context?: string) { this.addLog('info', message, data, context); }
  warn(message: string, data?: any, context?: string) { this.addLog('warn', message, data, context); }
  error(message: string, data?: any, context?: string) { this.addLog('error', message, data, context); }

  getLogs() { return this.logs; }
  
  clearLogs() {
    this.logs = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }

  downloadLogs() {
    if (typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app_logs_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger();
