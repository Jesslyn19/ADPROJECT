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
  InputAdornment,
  IconButton,
} from "@material-ui/core";

import Visibility from "@material-ui/icons/Visibility";
import VisibilityOff from "@material-ui/icons/VisibilityOff";

export default function User() {
  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [roles, setRoles] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [newUser, setNewUser] = useState({
    u_fname: "",
    u_lname: "",
    u_name: "",
    u_password: "",
    u_street: "",
    u_postcode: "",
    u_city: "",
    u_state: "",
    u_country: "",
    u_contact: "", // Added contact field
    role_id: "",
  });

  const requiredFields = [
    "u_fname",
    "u_lname",
    "role_id",
    "u_name",
    "u_password",
    "u_street",
    "u_city",
    "u_postcode",
    "u_state",
    "u_country",
    "u_contact",
  ];

  const isEmpty = (v) => {
    if (v === undefined || v === null) return true;
    if (typeof v === "string") return v.trim() === "";
    // treat 0, NaN, or '' as empty only if you want to forbid them
    return false;
  };

  const validate = (data) => {
    const newErrors = {};
    requiredFields.forEach((key) => {
      if (isEmpty(data[key])) newErrors[key] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchRoles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/roles");
      setRoles(res.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const currentUserId = localStorage.getItem("userId");
      const res = await axios.get(`http://localhost:5000/api/users`, {
        params: { exclude: currentUserId },
      });
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${id}`);
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleDialogSave = async () => {
    try {
      await axios.put(
        `http://localhost:5000/api/users/${editingUser.u_id}`,
        editingUser
      );
      fetchUsers();
      handleDialogClose();
      alert("User updated successfully!");
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const noPunctuationFields = [
      "u_street",
      "u_fname",
      "u_lname",
      "u_city",
      "u_state",
      "u_country",
      "u_postcode",
      "u_contact", // added to prevent punctuation in contact
    ];

    const filteredValue = noPunctuationFields.includes(name)
      ? value.replace(/[^\w\s]/gi, "")
      : value;

    setEditingUser((prev) => ({
      ...prev,
      [name]: filteredValue,
    }));
  };

  const handleNewUserChange = (e) => {
    const { name, value } = e.target;

    // List of fields that should NOT have punctuation
    const noPunctuation = [
      "u_fname",
      "u_lname",
      "u_street",
      "u_city",
      "u_state",
      "u_country",
      "u_postcode",
      "u_contact", // added to prevent punctuation in contact
    ];

    const clean = noPunctuation.includes(name)
      ? value.replace(/[^\w\s]/g, "") // remove punctuation
      : value;

    setNewUser((prev) => ({
      ...prev,
      [name]: clean,
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: false,
    }));
  };

  const handleCreateUser = async () => {
    if (creating) return;

    if (!validate(newUser)) {
      // quick global hint – individual fields already turn red
      alert("Please fill in all required fields.");
      return;
    }

    setCreating(true);
    try {
      await axios.post("http://localhost:5000/api/users", newUser);
      await fetchUsers();
      alert("User created successfully!");
      setNewUser({
        u_fname: "",
        u_lname: "",
        u_name: "",
        u_street: "",
        u_postcode: "",
        u_city: "",
        u_state: "",
        u_country: "",
        u_contact: "", // Reset the contact field
        role_id: "",
        u_password: "",
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  return (
    <div style={{ padding: 8 }}>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setShowForm(!showForm)}
        style={{ marginBottom: 20 }}
      >
        {showForm ? "Hide Form" : "Create New User"}
      </Button>

      {showForm && (
        <Paper style={{ padding: 20, marginBottom: 30 }}>
          <Typography variant="h5" gutterBottom>
            Create New User
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="u_fname"
                label="First Name"
                value={newUser.u_fname}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_fname)}
                helperText={errors.u_fname && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="u_lname"
                label="Last Name"
                value={newUser.u_lname}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_lname)}
                helperText={errors.u_lname && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                select
                name="role_id"
                label="Role"
                value={newUser.role_id}
                onChange={handleNewUserChange}
                error={Boolean(errors.role_id)}
                helperText={errors.role_id && "Please fill out this field"}
                required
                fullWidth
              >
                {roles.map((role) => (
                  <MenuItem key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="u_name"
                label="Username"
                value={newUser.u_name}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_name)}
                helperText={errors.u_name && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="u_password"
                label="Password"
                type={showPassword ? "text" : "password"} // 👈 Toggle between text & password
                value={newUser.u_password}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_password)}
                helperText={errors.u_password && "Please fill out this field"}
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="u_street"
                label="Street"
                value={newUser.u_street}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_street)}
                helperText={errors.u_street && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="u_city"
                label="City"
                value={newUser.u_city}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_city)}
                helperText={errors.u_city && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="u_postcode"
                label="Postcode"
                value={newUser.u_postcode}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_postcode)}
                helperText={errors.u_postcode && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="u_state"
                label="State"
                value={newUser.u_state}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_state)}
                helperText={errors.u_state && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                name="u_country"
                label="Country"
                value={newUser.u_country}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_country)}
                helperText={errors.u_country && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="u_contact"
                label="Contact Number"
                value={newUser.u_contact}
                onChange={handleNewUserChange}
                error={Boolean(errors.u_contact)}
                helperText={errors.u_contact && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateUser}
                disabled={creating}
                fullWidth
                style={{ padding: 10 }}
              >
                {creating ? "Creating..." : "Create User"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Typography variant="h4" gutterBottom>
        User List
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
                  <TableCell>Username</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Contact</TableCell> {/* Added Contact */}
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.u_id}>
                    <TableCell>{user.u_id}</TableCell>
                    <TableCell>
                      {(user.u_fname || "") + " " + (user.u_lname || "")}
                    </TableCell>
                    <TableCell>{user.u_name}</TableCell>
                    <TableCell>{user.role_name}</TableCell>
                    <TableCell>
                      {(user.u_street || "") +
                        ", " +
                        (user.u_city || "") +
                        ", " +
                        (user.u_postcode || "") +
                        ", " +
                        (user.u_state || "") +
                        ", " +
                        (user.u_country || "")}
                    </TableCell>
                    <TableCell>{user.u_contact}</TableCell>
                    <TableCell>
                      <Button color="primary" onClick={() => handleEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => handleDelete(user.u_id)}
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
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editingUser && (
            <>
              <TextField
                name="u_fname"
                label="First Name"
                value={editingUser.u_fname}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_lname"
                label="Last Name"
                value={editingUser.u_lname}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_name"
                label="Username"
                value={editingUser.u_name}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_password"
                label="Password"
                type={showPassword ? "text" : "password"} // 👈 Toggle between text & password
                value={editingUser.u_password}
                onChange={handleChange}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <Visibility /> : <VisibilityOff />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                select
                name="role_id"
                label="Role"
                value={editingUser.role_id}
                onChange={handleChange}
                fullWidth
                margin="dense"
              >
                {roles.map((role) => (
                  <MenuItem key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="u_street"
                label="Street"
                value={editingUser.u_street}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_postcode"
                label="Postcode"
                value={editingUser.u_postcode}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_city"
                label="City"
                value={editingUser.u_city}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_state"
                label="State"
                value={editingUser.u_state}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_country"
                label="Country"
                value={editingUser.u_country}
                onChange={handleChange}
                fullWidth
                margin="dense"
              />
              <TextField
                name="u_contact"
                label="Contact Number"
                value={editingUser.u_contact}
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
