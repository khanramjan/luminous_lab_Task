/**
 * Redis Configuration & Client Initialization
 *
 * Implements a robust Redis client using the official `redis` driver.
 * Features:
 * - Singleton pattern to ensure a single connection pool across the application.
 * - Exponential backoff reconnection strategy with jitter to prevent thundering herd.
 * - Graceful error handling and offline fallback (bypasses cache without crashing).
 * - Comprehensive lifecycle event monitoring.
 */

const { createClient } = require('redis');

// Configuration constants
const REDIS_URL = process.env.REDIS_URL;
const IS_TEST_ENV = process.env.NODE_ENV === 'test';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initializes the Redis connection asynchronously.
   * Handles initialization failures by downgrading to non-cached operations.
   * 
   * @returns {Promise<void>}
   */
  async connect() {
    if (IS_TEST_ENV || !REDIS_URL) {
      console.warn('⚠️ [Redis] Caching bypassed: Test environment or REDIS_URL missing.');
      return;
    }

    try {
      this.client = createClient({
        url: REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('❌ [Redis] Max reconnection attempts reached. Disabling cache gracefully.');
              return new Error('Redis connection retry limit reached');
            }
            // Exponential backoff with a cap of 5 seconds, plus randomized jitter (0-200ms)
            const jitter = Math.floor(Math.random() * 200);
            return Math.min(retries * 500, 5000) + jitter;
          },
        },
      });

      this.registerEventHandlers();

      // Initiate connection
      await this.client.connect();
    } catch (error) {
      console.error('❌ [Redis] Connection initialization failed:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Registers listeners for Redis client lifecycle events.
   * Monitors connection health and updates availability state.
   * 
   * @private
   */
  registerEventHandlers() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.info('🔄 [Redis] Establishing connection...');
    });

    this.client.on('ready', () => {
      console.info('✅ [Redis] Connection established and ready to accept commands.');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.error(`❌ [Redis] Connection error encountered: ${err.message}`);
      this.isConnected = false; // Mark unavailable on error to fallback to DB
    });

    this.client.on('end', () => {
      console.warn('⚠️ [Redis] Connection gracefully closed.');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.info('🔄 [Redis] Attempting to reconnect...');
    });
  }

  /**
   * Safe getter to verify if caching infrastructure is active and healthy.
   * Use this before attempting cache operations.
   * 
   * @returns {boolean} True if client is connected and ready
   */
  get isAvailable() {
    return this.isConnected && this.client !== null;
  }
}

// Instantiate the singleton service
const redisService = new RedisService();

// Auto-connect upon module resolution without blocking the Event Loop
redisService.connect().catch((err) => {
  console.error('❌ [Redis] Async wrapper failed:', err.message);
});

module.exports = redisService;
