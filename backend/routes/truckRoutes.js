// backend/routes/truckRoutes.js
const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const { saveRoute, getRoutesByPlate } = require('../controllers/truckController');

// both admin & employee can save/get
router.post('/', authMiddleware, saveRoute);
router.get('/:plate', authMiddleware, getRoutesByPlate);

module.exports = router;
