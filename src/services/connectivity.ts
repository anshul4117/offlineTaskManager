export interface ConnectivityState {
  isBrowserOnline: boolean;
  isServerReachable: boolean;
  isFullyConnected: boolean;
  lastCheckedAt: string | null;
}

type ConnectivityListener = (state: ConnectivityState) => void;

class ConnectivityMonitor {
  private state: ConnectivityState = {
    isBrowserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isServerReachable: false,
    isFullyConnected: false,
    lastCheckedAt: null
  };

  private listeners: Set<ConnectivityListener> = new Set();
  private checkIntervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleBrowserOnlineChange(true));
      window.addEventListener('offline', () => this.handleBrowserOnlineChange(false));
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
    const isBrowserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isBrowserOnline) {
      this.updateState({
        isBrowserOnline: false,
        isServerReachable: false,
        isFullyConnected: false,
        lastCheckedAt: new Date().toISOString()
      });
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
        lastCheckedAt: new Date().toISOString()
      });
      return isServerReachable;
    } catch (err) {
      this.updateState({
        isBrowserOnline: true,
        isServerReachable: false,
        isFullyConnected: false,
        lastCheckedAt: new Date().toISOString()
      });
      return false;
    }
  }

  private handleBrowserOnlineChange(online: boolean): void {
    if (online) {
      this.checkHealth();
    } else {
      this.updateState({
        isBrowserOnline: false,
        isServerReachable: false,
        isFullyConnected: false,
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
