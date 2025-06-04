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
  TextField,
  MenuItem,
} from "@material-ui/core";

import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

export default function TaskPage() {
  //const today = new Date().toISOString().split("T")[0];
  const [tasks, setTasks] = useState([]);
  const [searchPlate, setSearchPlate] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTasks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/tasks");
      setTasks(res.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredAndSortedtasks = tasks
    .filter((task) => {
      const plateMatch = task.sb_plate
        ? task.sb_plate.toLowerCase().includes(searchPlate.toLowerCase())
        : false;

      const taskDate = task.i_date ? new Date(task.i_date) : null;
      const start = startDate
        ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
        : null;
      const end = endDate
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
        : null;

      const isAfterStart = !start || taskDate >= start;
      const isBeforeEnd = !end || taskDate <= end;

      return plateMatch && isAfterStart && isBeforeEnd;
    })
    .sort((a, b) => {
      const dateA = new Date(a.i_date);
      const dateB = new Date(b.i_date);
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  const clearFilters = () => {
    setSearchPlate("");
    setStartDate("");
    setEndDate("");
    setSortOrder("newest");
  };

  return (
    <Card>
      <CardHeader>
        <div
          style={{
            backgroundColor: "#09c3d8",
            padding: "16px",
            borderRadius: "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h4
            className="card-title"
            style={{
              fontSize: "1.75rem",
              fontWeight: "600",
              color: "#000000", // Optional: dark green
              margin: 0,
            }}
          >
            Task List
          </h4>
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="Search Plate"
            variant="outlined"
            size="small"
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
            style={{ minWidth: 180 }}
          />
          <TextField
            select
            label="Sort by Time"
            variant="outlined"
            size="small"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <MenuItem value="newest">Newest First</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
          </TextField>

          <TextField
            label="Start Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <TextField
            label="End Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={clearFilters}
            style={{ height: "40px", alignSelf: "center" }}
          >
            Clear Filters
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <TableContainer
          component={Paper}
          style={{
            marginTop: "20px",
            maxHeight: "400px",
            overflow: "auto",
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate Number</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Prove</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedtasks.map((task) => (
                <TableRow key={task.sb_id}>
                  <TableCell>{task.sb_id}</TableCell>
                  <TableCell>{task.sb_plate}</TableCell>
                  <TableCell>
                    {task.i_date
                      ? new Date(task.i_date).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>{task.i_time || "-"}</TableCell>
                  <TableCell>
                    {task.i_url ? (
                      <a href={task.i_url} target="_blank" rel="noreferrer">
                        View Image
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{task.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  );
}
