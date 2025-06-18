// backend/controllers/truckController.js

exports.saveRoute = async (req, res) => {
  try {
    const { plate, routeData } = req.body;

    // Insert a new row into your Supabase `truck_routes` table,
    // automatically scoped to the logged-in user (via RLS).
    const { data, error } = await req.supabase
      .from('truck_routes')
      .insert([
        {
          plate,
          route_data: routeData,       // match your column name
          created_by: req.authUser.id, // attach the Supabase user ID
        },
      ])
      .single();

    if (error) throw error;         // bubble up any Supabase errors

    res.status(201).json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getRoutesByPlate = async (req, res) => {
  try {
    const { plate } = req.params;

    // Fetch all rows for this plate—RLS will ensure the user only
    // sees their own records if you’ve set that policy up.
    const { data, error } = await req.supabase
      .from('truck_routes')
      .select('*')
      .eq('plate', plate);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
