import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  //   return if Redis is alive and if the DB is alive too
  //   { "redis": true, "db": true } with a status code 200
  static getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(status);
  }

  //   should return the number of users and files in DB:
  //   { "users": 12, "files": 1231 } with a status code 200
  static async getStats(req, res) {
    const numUsers = await dbClient.nbUsers();
    const numFiles = await dbClient.nbFiles();
    const stats = {
      users: numUsers,
      files: numFiles,
    };
    res.status(200).send(stats);
  }
}

export default AppController;
