import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  Table,
  Box,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Typography,
  MenuItem,
} from "@material-ui/core";

export default function Truck() {
  const [trucks, setTrucks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTruck, setNewTruck] = useState({
    t_plate: "",
    driver_id: "",
    t_capacity: "",
  });
  const [searchQuery, setSearchQuery] = useState(""); // State for search query
  const [errors, setErrors] = useState({});

  const requiredFields = ["t_plate", "driver_id", "t_capacity"];

  const isEmpty = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
  };

  const validate = (data) => {
    const newErrors = {};
    requiredFields.forEach((key) => {
      if (isEmpty(data[key])) newErrors[key] = "This field is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkDuplicatePlate = async (plate) => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/trucks/check-duplicate/${plate}`
      );
      return res.data.exists; // Assuming the response will return an object with an `exists` field
    } catch (error) {
      console.error("Error checking for duplicate plate:", error);
      return false; // If there's an error, we assume it's not a duplicate
    }
  };

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/trucks");
      setTrucks(res.data);
    } catch (error) {
      console.error("Error fetching trucks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/drivers?role=2");
      setDrivers(res.data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  useEffect(() => {
    fetchTrucks();
    fetchDrivers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this truck?")) {
      try {
        await axios.delete(`http://localhost:5000/api/trucks/${id}`);
        fetchTrucks();
      } catch (error) {
        console.error("Error deleting truck:", error);
      }
    }
  };

  const handleEdit = (truck) => {
    setEditingTruck({ ...truck });
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingTruck(null);
  };

  const handleDialogSave = async () => {
    const isDuplicate = await checkDuplicatePlate(editingTruck.t_plate);
    if (
      isDuplicate &&
      editingTruck.t_plate !==
        trucks.find((truck) => truck.t_id === editingTruck.t_id).t_plate
    ) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        t_plate: "Truck number plate already registered",
      }));
      return;
    }

    if (!validate(editingTruck)) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/trucks/${editingTruck.t_id}`,
        editingTruck
      );
      fetchTrucks();
      handleDialogClose();
    } catch (error) {
      console.error("Error updating truck:", error);
    }
  };

  const handleNewTruckChange = async (e) => {
    const { name, value } = e.target;
    setNewTruck({ ...newTruck, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));

    if (name === "t_plate") {
      const isDuplicate = await checkDuplicatePlate(value);
      if (isDuplicate) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          t_plate: "Truck number plate already registered",
        }));
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          t_plate: undefined,
        }));
      }
    }
  };

  const handleCreateTruck = async () => {
    if (creating) return;

    if (!validate(newTruck)) {
      alert("Please fill in all required fields.");
      return;
    }

    const isDuplicate = await checkDuplicatePlate(newTruck.t_plate);
    if (isDuplicate) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        t_plate: "Truck number plate already registered",
      }));
      return;
    }

    setCreating(true);
    try {
      await axios.post("http://localhost:5000/api/trucks", newTruck);
      await fetchTrucks();
      alert("Truck created successfully!");
      setNewTruck({ t_plate: "", driver_id: "", t_capacity: "" });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating truck:", error);
      alert("Failed to create truck.");
    } finally {
      setCreating(false);
    }
  };

  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter trucks based on search query (by plate number)
  const filteredTrucks = trucks.filter((truck) =>
    truck.t_plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle input change for both creating and editing
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (editingTruck) {
      setEditingTruck({ ...editingTruck, [name]: value });
    } else {
      setNewTruck({ ...newTruck, [name]: value });
    }
  };

  return (
    <div style={{ padding: 8 }}>
      {/* Create New Truck Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? "Hide Form" : "Create New Truck"}
      </Button>

      {/* Truck Form */}
      {showForm && (
        <Paper style={{ padding: 20, marginBottom: 30 }}>
          <Typography variant="h5" gutterBottom>
            Create New Truck
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                name="t_plate"
                label="Plate Number"
                value={newTruck.t_plate}
                onChange={handleNewTruckChange}
                fullWidth
                error={Boolean(errors.t_plate)}
                helperText={errors.t_plate || "Please fill out this field"}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                name="driver_id"
                label="Select Driver"
                value={newTruck.driver_id}
                onChange={handleNewTruckChange}
                fullWidth
                error={Boolean(errors.driver_id)}
                helperText={errors.driver_id || "Please select a driver"}
              >
                <MenuItem value="">Select Driver</MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={driver.u_id} value={driver.u_id}>
                    {driver.u_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="t_capacity"
                label="Capacity (tons)"
                type="number"
                value={newTruck.t_capacity}
                onChange={handleNewTruckChange}
                fullWidth
                error={Boolean(errors.t_capacity)}
                helperText={errors.t_capacity || "Please fill out this field"}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateTruck}
                disabled={creating}
                fullWidth
              >
                {creating ? "Creating..." : "Create Truck"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Search Bar */}
      <TextField
        label="Search by Plate Number"
        value={searchQuery}
        onChange={handleSearchChange}
        fullWidth
        variant="outlined"
        style={{ marginBottom: 20 }}
      />

      {/* Truck List */}
      <Typography variant="h4" gutterBottom>
        Truck List
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Box sx={{ maxHeight: "55vh", overflow: "auto" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Plate</TableCell>
                  <TableCell>Driver</TableCell>
                  <TableCell>Capacity (tons)</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTrucks.map((truck, index) => (
                  <TableRow key={truck.t_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{truck.t_plate}</TableCell>
                    <TableCell>{truck.driver_name || "Unknown"}</TableCell>
                    <TableCell>{truck.t_capacity || "-"}</TableCell>
                    <TableCell>
                      <Button color="primary" onClick={() => handleEdit(truck)}>
                        Edit
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => handleDelete(truck.t_id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Edit Truck</DialogTitle>
        <DialogContent>
          {editingTruck && (
            <>
              <TextField
                name="t_plate"
                label="Plate Number"
                value={editingTruck.t_plate}
                onChange={handleChange}
                fullWidth
                margin="dense"
                error={Boolean(errors.t_plate)}
                helperText={errors.t_plate || "Please fill out this field"}
              />
              <TextField
                select
                name="driver_id"
                label="Select Driver"
                value={editingTruck.driver_id}
                onChange={handleChange}
                fullWidth
                margin="dense"
                error={Boolean(errors.driver_id)}
                helperText={errors.driver_id || "Please select a driver"}
              >
                <MenuItem value="">Select Driver</MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={driver.u_id} value={driver.u_id}>
                    {driver.u_name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="t_capacity"
                label="Capacity (tons)"
                type="number"
                value={editingTruck.t_capacity}
                onChange={handleChange}
                fullWidth
                margin="dense"
                error={Boolean(errors.t_capacity)}
                helperText={errors.t_capacity || "Please fill out this field"}
                inputProps={{ min: 0 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleDialogSave} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
