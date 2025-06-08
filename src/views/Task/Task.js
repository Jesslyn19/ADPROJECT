import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Box,
  Typography,
  TextField,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@material-ui/core";

import CloseIcon from "@material-ui/icons/Close";

export default function TaskListTable() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [open, setOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [plateFilter, setPlateFilter] = useState("");

  const fetchTasks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/tasks", {
        params: { date: selectedDate },
      });
      setTasks(res.data);
    } catch (error) {
      console.error("Error fetching task list:", error);
    }
  };

  useEffect(() => {
    console.log("Fetching tasks for date:", selectedDate); // Check dev console
    fetchTasks();
  }, [selectedDate]);

  const handleOpenImage = (fileName) => {
    setSelectedImage(
      `http://localhost:5000/downloads/${encodeURIComponent(fileName)}`
    );
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedImage("");
  };

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h5" gutterBottom>
        📋 Task List (Date: {selectedDate})
      </Typography>

      <Box
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <TextField
          label="Select Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          select
          label="Filter Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          SelectProps={{ native: true }}
          style={{ minWidth: "150px" }}
        >
          <option value="All">All</option>
          <option value="Done">Done</option>
          <option value="Missed">Missed</option>
        </TextField>

        <TextField
          label="Search Plate"
          value={plateFilter}
          onChange={(e) => setPlateFilter(e.target.value)}
          style={{ minWidth: "180px" }}
        />
      </Box>
      <Box
        style={{
          display: "flex",
          justifyContent: "flex-start",
          gap: "4rem", // <- This will work reliably
          fontWeight: "bold",
          marginBottom: "1rem",
        }}
      >
        <Typography color="primary">
          ✅ Done: {tasks.filter((task) => task.status === "Done").length}
        </Typography>
        <Typography color="error">
          ❌ Missed: {tasks.filter((task) => task.status === "Missed").length}
        </Typography>
      </Box>
      <TableContainer component={Paper}>
        <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate</TableCell>
                <TableCell>In-Charge</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Image</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks
                .filter(
                  (task) =>
                    (statusFilter === "All" || task.status === statusFilter) &&
                    task.sb_plate
                      .toLowerCase()
                      .includes(plateFilter.toLowerCase())
                )
                .map((task) => (
                  <TableRow key={task.sb_id}>
                    <TableCell>{task.sb_id}</TableCell>
                    <TableCell>{task.sb_plate}</TableCell>
                    <TableCell>{task.incharge || "-"}</TableCell>
                    <TableCell>{task.i_time || "-"}</TableCell>
                    <TableCell>
                      {task.i_file ? (
                        <span
                          onClick={() => handleOpenImage(task.i_file)}
                          style={{
                            color: "blue",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                        >
                          View Image
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{task.status}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Box>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md">
        <DialogTitle>
          Image Preview
          <IconButton
            aria-label="close"
            onClick={handleClose}
            style={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <img
            src={selectedImage}
            alt="Task"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
