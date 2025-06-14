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

export default function Bin() {
  const [bins, setBins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newBin, setNewBin] = useState({
    sb_plate: "",
    sb_floor: "",
    sb_street: "",
    sb_postcode: "",
    sb_city: "",
    sb_state: "",
    sb_country: "",
    c_id: "",
    t_id: "",
  });
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/customers")
      .then((res) => setCustomers(res.data))
      .catch((err) => console.error("Failed to fetch customers:", err));
  }, []);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/trucks")
      .then((res) => setTrucks(res.data))
      .catch((err) => console.error("Failed to fetch trucks:", err));
  }, []);

  const fetchBins = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/smartbins");
      setBins(res.data);
    } catch (error) {
      console.error("Error fetching bins:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this bin?")) {
      try {
        await axios.delete(`http://localhost:5000/api/smartbins/${id}`);
        fetchBins();
      } catch (error) {
        console.error("Error deleting bin:", error);
      }
    }
  };

  const handleEdit = (bin) => {
    setEditingBin(bin);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingBin(null);
  };

  const handleDialogSave = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/smartbins/${editingBin.sb_id}`,
        editingBin
      );
      fetchBins();
      handleDialogClose();
    } catch (error) {
      console.error("Error updating bin:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingBin({ ...editingBin, [name]: value });
  };

  const handleNewBinChange = (e) => {
    const { name, value } = e.target;
    setNewBin({ ...newBin, [name]: value });
  };

  const handleCreateBin = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await axios.post("http://localhost:5000/api/smartbins", newBin);
      await fetchBins();
      alert("Bin created successfully!");
      setNewBin({
        sb_plate: "",
        sb_floor: "",
        sb_street: "",
        sb_postcode: "",
        sb_city: "",
        sb_state: "",
        sb_country: "",
        c_id: "",
        t_id: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating bin:", error);
      alert("Failed to create bin.");
    } finally {
      setCreating(false);
    }
  };

  // Handle search query change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter bins based on search query (by bin plate)
  const filteredBins = bins.filter((bin) =>
    bin.sb_plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: 8 }}>
      {/* Create New Bin Button */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? "Hide Form" : "Create New Bin"}
      </Button>

      {/* Bin Form */}
      {showForm && (
        <Paper style={{ padding: 20, marginBottom: 30 }}>
          <Typography variant="h5" gutterBottom>
            Create New Bin
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="sb_plate"
                label="Bin Plate Number"
                value={newBin.sb_plate}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="sb_floor"
                label="Floor/Unit No"
                value={newBin.sb_floor}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="sb_street"
                label="Street (include taman if necessary)"
                value={newBin.sb_street}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_postcode"
                label="Postcode"
                value={newBin.sb_postcode}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_city"
                label="City"
                value={newBin.sb_city}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_state"
                label="State"
                value={newBin.sb_state}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_country"
                label="Country"
                value={newBin.sb_country}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                name="c_id"
                label="Select Customer"
                value={newBin.c_id}
                onChange={handleNewBinChange}
                required
              >
                <MenuItem value="">Select Customer</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.c_id} value={customer.c_id}>
                    {customer.c_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                name="t_id"
                label="Select Truck"
                value={newBin.t_id}
                onChange={handleNewBinChange}
                required
              >
                <MenuItem value="">Select Truck</MenuItem>
                {trucks.map((truck) => (
                  <MenuItem key={truck.t_id} value={truck.t_id}>
                    {truck.t_plate}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateBin}
                disabled={creating}
                fullWidth
                style={{ padding: 10 }}
              >
                {creating ? "Creating..." : "Create Bin"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Search Bar */}
      <TextField
        label="Search by Bin Plate"
        value={searchQuery}
        onChange={handleSearchChange}
        fullWidth
        variant="outlined"
        style={{ marginBottom: 20 }}
      />

      {/* Bin List */}
      <Typography variant="h4" gutterBottom>
        Bin List
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Plate Number</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Latitude</TableCell>
                  <TableCell>Longitude</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Truck Plate</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBins.map((bin, index) => (
                  <TableRow key={bin.sb_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{bin.sb_plate}</TableCell>
                    <TableCell>
                      {bin.sb_floor
                        ? `${bin.sb_floor}, ${bin.sb_street}, ${bin.sb_postcode}, ${bin.sb_city}, ${bin.sb_state}, ${bin.sb_country}`
                        : `${bin.sb_street}, ${bin.sb_postcode}, ${bin.sb_city}, ${bin.sb_state}, ${bin.sb_country}`}
                    </TableCell>
                    <TableCell>{bin.sb_latitude}</TableCell>
                    <TableCell>{bin.sb_longitude}</TableCell>
                    <TableCell>
                      {customers.find((c) => c.c_id === bin.c_id)?.c_name ||
                        "Unknown"}
                    </TableCell>
                    <TableCell>
                      {trucks.find((t) => t.t_id === bin.t_id)?.t_plate ||
                        "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Button color="primary" onClick={() => handleEdit(bin)}>
                        Edit
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => handleDelete(bin.sb_id)}
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

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Edit Bin</DialogTitle>
        <DialogContent>
          {editingBin && (
            <>
              <TextField
                name="sb_plate"
                label="Bin Plate Number"
                value={editingBin.sb_plate}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_floor"
                label="Floor/Unit No"
                value={editingBin.sb_floor}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_street"
                label="Street (include taman if necessary)"
                value={editingBin.sb_street}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_postcode"
                label="Postcode"
                value={editingBin.sb_postcode}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_city"
                label="City"
                value={editingBin.sb_city}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_state"
                label="State"
                value={editingBin.sb_state}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_country"
                label="Country"
                value={editingBin.sb_country}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                select
                fullWidth
                name="c_id"
                label="Select Customer"
                value={editingBin.c_id}
                onChange={handleChange}
              >
                <MenuItem value="">Select Customer</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.c_id} value={customer.c_id}>
                    {customer.c_name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                name="t_id"
                label="Select Truck"
                value={editingBin.t_id}
                onChange={handleChange}
              >
                <MenuItem value="">Select Truck</MenuItem>
                {trucks.map((truck) => (
                  <MenuItem key={truck.t_id} value={truck.t_id}>
                    {truck.t_plate}
                  </MenuItem>
                ))}
              </TextField>
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
