const express = require('express');
const router = express.Router();

const {
  run
} = require('../controllers/compiler');

router.route('/').post(run);

module.exports = router;
