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
} from "@material-ui/core";

export default function Customer() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

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
        fetchCustomers(); // Refresh data
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
    try {
      await axios.put(
        `http://localhost:5000/api/customers/${editingCustomer.c_id}`,
        editingCustomer
      );
      fetchCustomers();
      handleDialogClose();
    } catch (error) {
      console.error("Error updating customer:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingCustomer({ ...editingCustomer, [name]: value });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div>
      <h2>Customer List</h2>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Street</TableCell>
                <TableCell>Postcode</TableCell>
                <TableCell>City</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Country</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.c_id}>
                  <TableCell>{customer.c_id}</TableCell>
                  <TableCell>{customer.c_name}</TableCell>
                  <TableCell>{customer.c_street}</TableCell>
                  <TableCell>{customer.c_postcode}</TableCell>
                  <TableCell>{customer.c_city}</TableCell>
                  <TableCell>{customer.c_state}</TableCell>
                  <TableCell>{customer.c_country}</TableCell>
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
        </TableContainer>
      )}

      {/* Edit Dialog */}
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
