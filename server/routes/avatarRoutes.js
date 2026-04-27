const express = require('express');
const { relayUserAvatar } = require('../controllers/avatarController');

const router = express.Router();
router.get('/relay/:id', relayUserAvatar);

module.exports = router;
