﻿import React, { useEffect, useState } from "react";
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
  Typography,
  Grid,
} from "@material-ui/core";

export default function Truck() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTruck, setNewTruck] = useState({
    t_plate: "",
  });

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
    setEditingTruck(truck);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingTruck(null);
  };

  const handleDialogSave = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/trucks/${editingTruck.t_id}`,
        editingTruck,
      );
      fetchTrucks();
      handleDialogClose();
    } catch (error) {
      console.error("Error updating truck:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingTruck({ ...editingTruck, [name]: value });
  };

  const handleNewTruckChange = (e) => {
    const { name, value } = e.target;
    setNewTruck({ ...newTruck, [name]: value });
  };

  const handleCreateTruck = async () => {
    if (creating) return;
    setCreating(true);
    try {
      await axios.post("http://localhost:5000/api/trucks", newTruck);
      await fetchTrucks();
      alert("Truck created successfully!");
      setNewTruck({ t_plate: "" });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating truck:", error);
      alert("Failed to create truck.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? "Hide Form" : "Create New Truck"}
      </Button>

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
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateTruck}
                disabled={creating}
                fullWidth
                style={{ padding: 10 }}
              >
                {creating ? "Creating..." : "Create Truck"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Typography variant="h4" gutterBottom>
        Truck List
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {trucks.map((truck) => (
                <TableRow key={truck.t_id}>
                  <TableCell>{truck.t_id}</TableCell>
                  <TableCell>{truck.t_plate}</TableCell>
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
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Edit Truck</DialogTitle>
        <DialogContent>
          {editingTruck && (
            <TextField
              name="t_plate"
              label="Plate Number"
              value={editingTruck.t_plate}
              onChange={handleChange}
              fullWidth
              margin="dense"
            />
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
