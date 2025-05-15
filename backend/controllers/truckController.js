// backend/controllers/truckController.js
const TruckRoute = require('../models/TruckRoute');

// Save a route for a plate
exports.saveRoute = async (req, res) => {
  try {
    const { plate, routeData } = req.body;
    const record = await TruckRoute.create({
      plate,
      routeData,
      createdBy: req.user.id
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all routes for a plate
exports.getRoutesByPlate = async (req, res) => {
  try {
    const routes = await TruckRoute.find({ plate: req.params.plate });
    res.json(routes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
