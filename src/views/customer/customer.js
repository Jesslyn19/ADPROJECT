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
} from "@material-ui/core";

export default function Customer() {
  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    c_name: "",
    c_street: "",
    c_postcode: "",
    c_city: "",
    c_state: "",
    c_country: "",
    c_contact: "",
  });

  const requiredFields = [
    "c_name",
    "c_street",
    "c_postcode",
    "c_city",
    "c_state",
    "c_country",
    "c_contact",
  ];

  const isEmpty = (v) => {
    if (v === undefined || v === null) return true;
    if (typeof v === "string") return v.trim() === "";
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

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/customers");
      setCustomers(res.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await axios.delete(`http://localhost:5000/api/customers/${id}`);
        fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error);
      }
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingCustomer(null);
  };

  const handleDialogSave = async () => {
    // Validate the fields before proceeding
    if (!validate(editingCustomer)) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      await axios.put(
        `http://localhost:5000/api/customers/${editingCustomer.c_id}`,
        editingCustomer
      );
      fetchCustomers();
      handleDialogClose();
      alert("Customer updated successfully!");
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Failed to update customer.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const handleCreateCustomer = async () => {
    if (creating) return;

    // Validate the fields before proceeding
    if (!validate(newCustomer)) {
      alert("Please fill in all required fields.");
      return;
    }

    setCreating(true);
    try {
      await axios.post("http://localhost:5000/api/customers", newCustomer);
      await fetchCustomers();
      alert("Customer created successfully!");
      setNewCustomer({
        c_name: "",
        c_street: "",
        c_postcode: "",
        c_city: "",
        c_state: "",
        c_country: "",
        c_contact: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to create customer.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div style={{ padding: 8 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? "Hide Form" : "Create New Customer"}
      </Button>

      {showForm && (
        <Paper style={{ padding: 20, marginBottom: 30 }}>
          <Typography variant="h5" gutterBottom>
            Create New Customer
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="c_name"
                label="Name"
                value={newCustomer.c_name}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_name)}
                helperText={errors.c_name && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="c_street"
                label="Street"
                value={newCustomer.c_street}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_street)}
                helperText={errors.c_street && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="c_postcode"
                label="Postcode"
                value={newCustomer.c_postcode}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_postcode)}
                helperText={errors.c_postcode && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="c_city"
                label="City"
                value={newCustomer.c_city}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_city)}
                helperText={errors.c_city && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="c_state"
                label="State"
                value={newCustomer.c_state}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_state)}
                helperText={errors.c_state && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="c_country"
                label="Country"
                value={newCustomer.c_country}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_country)}
                helperText={errors.c_country && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="c_contact"
                label="Contact Number"
                value={newCustomer.c_contact}
                onChange={handleNewCustomerChange}
                error={Boolean(errors.c_contact)}
                helperText={errors.c_contact && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateCustomer}
                disabled={creating}
                fullWidth
                style={{ padding: 10 }}
              >
                {creating ? "Creating..." : "Create Customer"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Typography variant="h4" gutterBottom>
        Customer List
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
                  <TableCell>Name</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer, index) => (
                  <TableRow key={customer.c_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{customer.c_name}</TableCell>
                    <TableCell>
                      {(customer.c_street || "") +
                        ", " +
                        (customer.c_city || "") +
                        ", " +
                        (customer.c_postcode || "") +
                        ", " +
                        (customer.c_state || "") +
                        ", " +
                        (customer.c_country || "")}
                    </TableCell>
                    <TableCell>{customer.c_contact}</TableCell>
                    <TableCell>
                      <Button
                        color="primary"
                        onClick={() => handleEdit(customer)}
                      >
                        Edit
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => handleDelete(customer.c_id)}
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
        <DialogTitle>Edit Customer</DialogTitle>
        <DialogContent>
          {editingCustomer && (
            <>
              <TextField
                name="c_name"
                label="Name"
                value={editingCustomer.c_name}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="c_street"
                label="Street"
                value={editingCustomer.c_street}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="c_postcode"
                label="Postcode"
                value={editingCustomer.c_postcode}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="c_city"
                label="City"
                value={editingCustomer.c_city}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="c_state"
                label="State"
                value={editingCustomer.c_state}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="c_country"
                label="Country"
                value={editingCustomer.c_country}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="c_contact"
                label="Contact Number"
                value={editingCustomer.c_contact}
                onChange={handleChange}
                fullWidth
                margin="dense"
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
