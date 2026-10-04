import type { ConnectivityState } from '../types/index.js';

type ConnectivityListener = (state: ConnectivityState) => void;

class ConnectivityMonitor {
  private state: ConnectivityState = {
    isBrowserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isServerReachable: false,
    isFullyConnected: false,
    statusText: typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline',
    lastCheckedAt: null
  };

  private listeners: Set<ConnectivityListener> = new Set();
  private checkIntervalId: any = null;
  private isChecking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleBrowserStateChange(true));
      window.addEventListener('offline', () => this.handleBrowserStateChange(false));
    }
  }

  public start(intervalMs: number = 10000): void {
    this.checkHealth();
    if (!this.checkIntervalId) {
      this.checkIntervalId = setInterval(() => this.checkHealth(), intervalMs);
    }
  }

  public stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  public subscribe(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ConnectivityState {
    return { ...this.state };
  }

  public async checkHealth(): Promise<boolean> {
    if (this.isChecking) return this.state.isServerReachable;
    this.isChecking = true;

    const isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isBrowserOnline) {
      this.updateState({
        isBrowserOnline: false,
        isServerReachable: false,
        isFullyConnected: false,
        statusText: 'Offline',
        lastCheckedAt: new Date().toISOString()
      });
      this.isChecking = false;
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const isServerReachable = response.ok;
      this.updateState({
        isBrowserOnline: true,
        isServerReachable,
        isFullyConnected: isServerReachable,
        statusText: isServerReachable ? 'Online' : 'Server Unreachable',
        lastCheckedAt: new Date().toISOString()
      });
      this.isChecking = false;
      return isServerReachable;
    } catch (err) {
      this.updateState({
        isBrowserOnline: true,
        isServerReachable: false,
        isFullyConnected: false,
        statusText: 'Server Unreachable',
        lastCheckedAt: new Date().toISOString()
      });
      this.isChecking = false;
      return false;
    }
  }

  private handleBrowserStateChange(online: boolean): void {
    if (online) {
      this.checkHealth();
    } else {
      this.updateState({
        isBrowserOnline: false,
        isServerReachable: false,
        isFullyConnected: false,
        statusText: 'Offline',
        lastCheckedAt: new Date().toISOString()
      });
    }
  }

  private updateState(newState: ConnectivityState): void {
    this.state = newState;
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const connectivityMonitor = new ConnectivityMonitor();
