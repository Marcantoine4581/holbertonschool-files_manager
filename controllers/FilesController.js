import fs from 'fs';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    // Retrieve the user based on the token.
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });

    // Create a file
    const { name, type, data } = req.body;
    const typeAccepted = ['folder', 'file', 'image'];
    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !typeAccepted.includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

    if (parentId !== 0) {
      const parentFile = await dbClient.filesCollection.findOne({ _id: ObjectId(parentId) });
      if (!parentFile) return res.status(400).send({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    // The user ID is added to the document saved in DB - as owner of a file.
    const fileDataSavedInDb = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const fileSaved = await dbClient.filesCollection.insertOne(fileDataSavedInDb);
      return res.status(201).json({
        id: fileSaved.ops[0]._id,
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      });
    }
    const pathDir = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(pathDir)) fs.mkdirSync(pathDir, { recursive: true }, () => {});

    const fileNameUuid = uuidv4();
    const filePath = `${pathDir}/${fileNameUuid}`;
    const clearData = Buffer.from(data, 'base64');

    fs.writeFile(filePath, clearData, (error) => {
      if (error) {
        return res.status(400).send({ error: error.message });
      }
      return true;
    });

    const fileSaved = await dbClient.filesCollection.insertOne({
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? parentId : ObjectId(parentId),
      localPath: filePath,
    });

    return res.status(201).json({
      id: fileSaved.ops[0]._id,
      userId: user._id,
      name,
      type,
      isPublic,
      parentId,
    });
  }
}

export default FilesController;
