import express from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';

const router = express.Router();

// get routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// post routes
router.post('/users', UsersController.postNew);

module.exports = router;
