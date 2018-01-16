let express = require('express');
let router = express.Router();

/* GET aboutus listing. */
router.get('/', (req, res, next) => {
  res.send('aboutus page');
});

module.exports = router;
