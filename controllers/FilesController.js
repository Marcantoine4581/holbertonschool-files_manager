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

  // Retrieve the file document based on the ID.
  static async getShow(req, res) {
    // Retrieve the user based on the token.
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });

    // Retrieve the file document based on the ID.
    const { id } = req.params;
    const filefound = await dbClient.filesCollection.findOne({
      _id: ObjectId(id),
      userId: user._id,
    });

    if (!filefound) return res.status(404).send({ error: 'Not found' });
    return res.status(200).send({
      id: filefound._id,
      userId: filefound.userId,
      name: filefound.name,
      type: filefound.type,
      isPublic: filefound.isPublic,
      parentId: filefound.parentId,
    });
  }

  //  Retrieve all users file documents for a specific parentId and with pagination.
  static async getIndex(req, res) {
    // Retrieve the user based on the token.
    const token = req.header('X-Token');
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    // Based on the query parameters parentId and page, return the list of file document.
    const parentId = req.query.parentId || 0;
    const page = req.query.page || 0;

    const filesAggregate = parentId === 0 ? [
      { $skip: page * 20 },
      { $limit: 20 },
    ] : [
      { $match: { parentId } },
      { $skip: page * 20 },
      { $limit: 20 },
    ];
    const filesfound = await dbClient.filesCollection.aggregate(filesAggregate);
    const filesArray = [];

    await filesfound.forEach((item) => {
      const fileItem = {
        id: item._id,
        userId: item.userId,
        name: item.name,
        type: item.type,
        isPublic: item.isPublic,
        parentId: item.parentId,
      };
      filesArray.push(fileItem);
    });

    return res.status(200).send(filesArray);
  }
}

export default FilesController;
