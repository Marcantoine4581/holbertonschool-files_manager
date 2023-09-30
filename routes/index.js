import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = express.Router();

// App routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Auth Routes
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);

// Users routes
router.get('/users/me', UsersController.getMe);
router.post('/users', UsersController.postNew);

// Files routes
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);
router.post('/files', FilesController.postUpload);
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);
router.get('/files/:id/data', FilesController.getFile);

module.exports = router;
