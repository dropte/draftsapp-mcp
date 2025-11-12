import http from 'http';
import { URL } from 'url';

interface CallbackData {
  success: boolean;
  params: Record<string, string>;
  error?: string;
}

type CallbackResolver = (data: CallbackData) => void;

/**
 * Manages a local HTTP server to receive x-callback-url responses
 */
export class CallbackServer {
  private server: http.Server | null = null;
  private port: number = 0;
  private pendingCallbacks: Map<string, CallbackResolver> = new Map();
  private isStarted: boolean = false;

  /**
   * Start the callback server on an available port
   */
  async start(): Promise<number> {
    if (this.isStarted && this.server) {
      return this.port;
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // Listen on a random available port
      this.server.listen(0, 'localhost', () => {
        const address = this.server!.address();
        if (address && typeof address === 'object') {
          this.port = address.port;
          this.isStarted = true;
          console.error(`[CallbackServer] Started on port ${this.port}`);
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      this.server.on('error', (error) => {
        console.error('[CallbackServer] Error:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the callback server
   */
  async stop(): Promise<void> {
    if (this.server && this.isStarted) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.error('[CallbackServer] Stopped');
          this.isStarted = false;
          this.server = null;
          resolve();
        });
      });
    }
  }

  /**
   * Register a callback and wait for response
   */
  async waitForCallback(callbackId: string, timeoutMs: number = 30000): Promise<CallbackData> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingCallbacks.delete(callbackId);
        reject(new Error('Callback timeout - Drafts app may not have responded'));
      }, timeoutMs);

      // Register callback handler
      this.pendingCallbacks.set(callbackId, (data: CallbackData) => {
        clearTimeout(timeout);
        this.pendingCallbacks.delete(callbackId);
        resolve(data);
      });
    });
  }

  /**
   * Get the callback URL for a specific callback ID
   */
  getCallbackUrl(callbackId: string, type: 'success' | 'error' | 'cancel'): string {
    return `http://localhost:${this.port}/callback?id=${callbackId}&type=${type}`;
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Parse the URL
    const url = new URL(req.url || '', `http://localhost:${this.port}`);

    if (url.pathname === '/callback') {
      const callbackId = url.searchParams.get('id');
      const type = url.searchParams.get('type') || 'success';

      if (!callbackId) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing callback ID');
        return;
      }

      // Extract all query parameters except id and type
      const params: Record<string, string> = {};
      url.searchParams.forEach((value, key) => {
        if (key !== 'id' && key !== 'type') {
          params[key] = value;
        }
      });

      // Find the pending callback
      const resolver = this.pendingCallbacks.get(callbackId);
      if (resolver) {
        const data: CallbackData = {
          success: type === 'success',
          params,
          error: type === 'error' ? (params.errorMessage || params.error || 'Unknown error') : undefined,
        };

        resolver(data);

        // Send response
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Callback Received</title>
            </head>
            <body>
              <h1>Callback Received</h1>
              <p>You can close this window.</p>
              <script>window.close();</script>
            </body>
          </html>
        `);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Callback not found or already processed');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  }
}

// Singleton instance
let callbackServerInstance: CallbackServer | null = null;

export function getCallbackServer(): CallbackServer {
  if (!callbackServerInstance) {
    callbackServerInstance = new CallbackServer();
  }
  return callbackServerInstance;
}
