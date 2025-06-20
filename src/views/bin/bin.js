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
  Checkbox,
  Select,
  InputLabel,
  ListItemText,
  FormControl,
  FormHelperText,
} from "@material-ui/core";

export default function Bin() {
  const [errors, setErrors] = useState({});
  const [filterDay, setFilterDay] = useState([]);
  const [tempFilterDay, setTempFilterDay] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
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
    sb_day: [],
  });

  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const requiredFields = [
    "sb_plate",
    "sb_floor",
    "sb_street",
    "sb_postcode",
    "sb_state",
    "sb_city",
    "sb_country",
    "c_id",
    "sb_day",
  ];

  const validate = (data) => {
    const newErrors = {};
    requiredFields.forEach((key) => {
      if (
        key === "sb_day" &&
        (!Array.isArray(data[key]) || data[key].length === 0)
      ) {
        newErrors[key] = "Please select at least one day";
      } else if (!data[key] || data[key].toString().trim() === "") {
        newErrors[key] = "This field is required";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      const res = await axios.get("http://localhost:5000/api/allsmartbins");
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
        alert("Bin deleted successfully!");
      } catch (error) {
        console.error("Error deleting bin:", error);
        alert("Failed to delete bin.");
      }
    }
  };

  const handleEdit = (bin) => {
    setEditingBin({
      ...bin,
      sb_day: bin.sb_day ? bin.sb_day.split(",") : [], // convert string to array
    });
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditingBin(null);
  };

  const handleDialogSave = async () => {
    // Validate the fields before proceeding
    // if (!validate(editingBin)) {
    //   alert("Please fill in all required fields.");
    //   return;
    // }
    try {
      const payload = {
        ...editingBin,
        sb_day: editingBin.sb_day.join(","), // convert back to string
      };
      await axios.put(
        `http://localhost:5000/api/smartbins/${editingBin.sb_id}`,
        payload
      );
      fetchBins();
      handleDialogClose();
      alert("Bin updated successfully!");
    } catch (error) {
      console.error("Error updating bin:", error);
      alert("Failed to update bin.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditingBin((prev) => ({
      ...prev,
      [name]: typeof value === "string" ? value.split(",") : value,
    }));
  };

  const handleNewBinChange = (e) => {
    const { name, value } = e.target;
    setNewBin((prev) => ({
      ...prev,
      [name]: typeof value === "string" ? value.split(",") : value, // handles multiple select
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const handleCreateBin = async () => {
    if (creating) return;
    // Validate the fields before proceeding
    if (!validate(newBin)) {
      alert("Please fill in all required fields.");
      return;
    }
    setCreating(true);
    try {
      const payload = {
        ...newBin,
        sb_day: newBin.sb_day.join(","), // convert array to comma-separated string
      };
      await axios.post("http://localhost:5000/api/smartbins", payload);
      // await axios.post("http://localhost:5000/api/smartbins", newBin);
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
        sb_day: [],
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredBins = bins.filter((bin) =>
    bin.sb_plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: 8 }}>
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
                error={Boolean(errors.sb_plate)}
                helperText={errors.sb_plate && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="sb_floor"
                label="Floor/Unit No"
                value={newBin.sb_floor}
                onChange={handleNewBinChange}
                error={Boolean(errors.sb_floor)}
                helperText={errors.sb_floor && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="sb_street"
                label="Street (include taman if necessary)"
                value={newBin.sb_street}
                onChange={handleNewBinChange}
                error={Boolean(errors.sb_street)}
                helperText={errors.sb_street && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_postcode"
                label="Postcode"
                value={newBin.sb_postcode}
                onChange={handleNewBinChange}
                error={Boolean(errors.sb_postcode)}
                helperText={errors.sb_postcode && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_city"
                label="City"
                value={newBin.sb_city}
                onChange={handleNewBinChange}
                error={Boolean(errors.sb_city)}
                helperText={errors.sb_city && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_state"
                label="State"
                value={newBin.sb_state}
                onChange={handleNewBinChange}
                error={Boolean(errors.sb_state)}
                helperText={errors.sb_state && "Please fill out this field"}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                name="sb_country"
                label="Country"
                value={newBin.sb_country}
                onChange={handleNewBinChange}
                error={Boolean(errors.sb_country)}
                helperText={errors.sb_country && "Please fill out this field"}
                required
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
                error={Boolean(errors.c_id)}
                helperText={errors.c_id && "Please fill out this field"}
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
              <FormControl
                fullWidth
                required
                error={Boolean(errors.sb_day)}
                variant="standard"
                margin="dense"
              >
                <InputLabel id="select-day-label">Select Day</InputLabel>
                <Select
                  labelId="select-day-label"
                  name="sb_day"
                  multiple
                  value={newBin.sb_day}
                  onChange={handleNewBinChange}
                  renderValue={(selected) => selected.join(", ")}
                >
                  {dayOptions.map((day) => (
                    <MenuItem key={day} value={day}>
                      <Checkbox checked={newBin.sb_day.includes(day)} />
                      <ListItemText primary={day} />
                    </MenuItem>
                  ))}
                </Select>
                {Boolean(errors.sb_day) && (
                  <FormHelperText>{errors.sb_day}</FormHelperText>
                )}
              </FormControl>
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
      <br></br>
      {/* <TextField
        label="Search by Bin Plate"
        value={searchQuery}
        onChange={handleSearchChange}
        fullWidth
        variant="outlined"
        style={{ marginBottom: 20 }}
      /> */}
      <Box display="flex" alignItems="center" gap={2} marginBottom={2}>
        <FormControl
          style={{ minWidth: 250, marginRight: 10 }}
          variant="outlined"
        >
          <TextField
            label="Search by Bin Plate"
            value={searchQuery}
            onChange={handleSearchChange}
            fullWidth
            variant="outlined"
          />
        </FormControl>
        <FormControl style={{ minWidth: 250 }} variant="outlined">
          <InputLabel id="filter-day-label">Filter by Day</InputLabel>
          <Select
            labelId="filter-day-label"
            multiple
            value={tempFilterDay}
            onChange={(e) => setTempFilterDay(e.target.value)}
            renderValue={(selected) => selected.join(", ")}
          >
            {dayOptions.map((day) => (
              <MenuItem key={day} value={day}>
                <Checkbox checked={tempFilterDay.includes(day)} />
                <ListItemText primary={day} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          color="primary"
          onClick={() => setFilterDay(tempFilterDay)}
          style={{ margin: 10 }}
        >
          Apply
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setTempFilterDay([]);
            setFilterDay([]);
          }}
        >
          Clear
        </Button>
      </Box>

      <Typography variant="h4" gutterBottom>
        Bin List
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Box sx={{ maxHeight: "57.5vh", overflow: "auto" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Plate Number</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Latitude</TableCell>
                  <TableCell>Longitude</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Day for Collection</TableCell>
                  <TableCell>Truck Plate</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBins
                  .filter((bin) => {
                    if (filterDay.length === 0) return true;
                    const binDays = bin.sb_day.split(",").map((d) => d.trim());
                    return filterDay.some((day) => binDays.includes(day));
                  })
                  .map((bin, index) => (
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
                      <TableCell>{bin.sb_day.split(",").join(", ")}</TableCell>
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
                margin="dense"
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
              <FormControl variant="standard" fullWidth margin="dense">
                <InputLabel>Select Days</InputLabel>
                <Select
                  labelId="edit-select-days-label"
                  multiple
                  fullWidth
                  name="sb_day"
                  value={editingBin.sb_day}
                  onChange={handleChange}
                  renderValue={(selected) => selected.join(", ")}
                >
                  {dayOptions.map((day) => (
                    <MenuItem key={day} value={day}>
                      <Checkbox checked={editingBin.sb_day.includes(day)} />
                      <ListItemText primary={day} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                select
                fullWidth
                margin="dense"
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
