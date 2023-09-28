import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  // Should sign-in the user by generating a new authentication token.
  static async getConnect(req, res) {
    const b64auth = req.headers.authorization.split(' ')[1];
    if (!b64auth) return res.status(401).send({ error: 'Unauthorized' });

    const [login, password] = Buffer.from(b64auth, 'base64').toString('utf-8').split(':');
    if (!login || !password) return res.status(401).send({ error: 'Unauthorized' });

    const existingUser = await dbClient.usersCollection.findOne({ email: login });
    const hashPassword = sha1(password);

    if (!existingUser || hashPassword !== existingUser.password) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    // Generate a random string (using uuidv4) as token.
    const token = uuidv4();

    // Store the user ID in Redis for 24 hours following this format :
    // key = auth_<token>, value = user ID
    const key = `auth_${token}`;
    const value = existingUser._id.toString();
    const durationInHours = 24;
    redisClient.set(key, value, durationInHours * 3600);

    return res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });
    await redisClient.del(key);
    return res.status(204).end();
  }
}

export default AuthController;
