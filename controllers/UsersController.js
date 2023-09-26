import sha1 from 'sha1';
import dbClient from '../utils/db';

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

    // Save the use in the database.
    const newUser = await dbClient.usersCollection.insertOne({
      email,
      password: hashPassword,
    });
    return res.status(201).send({ id: newUser.insertedId, email });
  }
}

export default UsersController;
