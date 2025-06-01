import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Button,
  Table,
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
    sb_latitude: "",
    sb_longitude: "",
    c_id: "",
    t_id: "",
  });

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
        sb_latitude: "",
        sb_longitude: "",
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

  useEffect(() => {
    fetchBins();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? "Hide Form" : "Create New Bin"}
      </Button>

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
                name="sb_latitude"
                label="Latitude"
                value={newBin.sb_latitude}
                onChange={handleNewBinChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_longitude"
                label="Longitude"
                value={newBin.sb_longitude}
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

      <Typography variant="h4" gutterBottom>
        Bin List
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate Number</TableCell>
                <TableCell>Latitude</TableCell>
                <TableCell>Longitude</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Truck Plate</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bins.map((bin, index) => (
                <TableRow key={bin.sb_id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{bin.sb_plate}</TableCell>
                  <TableCell>{bin.sb_latitude}</TableCell>
                  <TableCell>{bin.sb_longitude}</TableCell>
                  <TableCell>{bin.sb_status}</TableCell>
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
                name="sb_latitude"
                label="Latitude"
                value={editingBin.sb_latitude}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="sb_longitude"
                label="Longitude"
                value={editingBin.sb_longitude}
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
