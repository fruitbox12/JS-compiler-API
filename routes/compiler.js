const express = require('express');
const router = express.Router();

const {
  run
} = require('../controllers/compiler');

router.route('/').get(run);

module.exports = router;
