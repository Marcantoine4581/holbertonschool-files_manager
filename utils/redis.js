import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.asyncGet = promisify(this.client.get).bind(this.client);

    this.client.on('connect', () => {
      console.log('Redis client connected to the server');
    });

    this.client.on('error', (err) => {
      console.log(`Redis client not connected to the server: ${err.message}`);
    });
  }

  //  Returns true when the connection to Redis is a success otherwise, false.
  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const value = await this.asyncGet(key);
    return value;
  }

  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
