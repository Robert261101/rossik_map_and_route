// backend/routes/truckRoutes.js
const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { saveRoute, getRoutesByPlate } = require('../controllers/truckController');

// both admin & employee can save/get
router.post('/', auth, saveRoute);
router.get('/:plate', auth, getRoutesByPlate);

module.exports = router;
