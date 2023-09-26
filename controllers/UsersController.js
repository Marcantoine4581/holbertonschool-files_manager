import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  // Create a new user.
  static async postNew(req, res) {
    const { email } = req.body;
    const { password } = req.body;

    // Check if the email or password is missing.
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    // Check if the email already exists in DB.
    const existingUser = await dbClient.usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ error: 'Already exist' });
    }

    // Hash password with the SHA-1 algorithm.
    const hashPassword = sha1(password);

    // Save the user in the database.
    const newUser = await dbClient.usersCollection.insertOne({
      email,
      password: hashPassword,
    });
    return res.status(201).send({ id: newUser.insertedId, email });
  }

  // Retrieve the user based on the token.
  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const existingUser = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
    return res.status(200).send({ id: existingUser._id, email: existingUser.email });
  }
}

export default UsersController;
