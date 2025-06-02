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
  Typography,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@material-ui/core";

import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

export default function ImagePage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchPlate, setSearchPlate] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [binPlates, setBinPlates] = useState([]);
  const [plateStatusFilter, setPlateStatusFilter] = useState("all");
  const [openEdit, setOpenEdit] = useState(false);
  const [editImage, setEditImage] = useState(null);
  const [editPlate, setEditPlate] = useState("");

  const fetchImages = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/images");
      setImages(res.data);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const refreshProcessing = async () => {
    setLoading(true);
    setStatusMessage("Start Processing...");

    try {
      const res = await axios.post("http://localhost:5000/api/refresh");
      console.log("Refresh API response:", res.data); // ← ADD THIS

      await fetchImages();
    } catch (error) {
      console.error("Error refreshing images:", error);
      setStatusMessage("Failed to refresh images.");
    } finally {
      setTimeout(() => {
        setStatusMessage(`Done`);
        setTimeout(() => setStatusMessage(""), 2000); // Clear after 5s
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    fetchSmartBins();
  }, []);

  const filteredAndSortedImages = images
    .filter((image) => {
      const plateMatch = image.i_plate
        .toLowerCase()
        .includes(searchPlate.toLowerCase());

      const imageDate = new Date(image.i_date);
      const start = startDate
        ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
        : null;
      const end = endDate
        ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
        : null;

      const isAfterStart = !start || imageDate >= start;
      const isBeforeEnd = !end || imageDate <= end;

      const isKnown = binPlates.includes(image.i_plate.toLowerCase());

      const matchesPlateStatus =
        plateStatusFilter === "all" ||
        (plateStatusFilter === "attention" && !isKnown) ||
        (plateStatusFilter === "no-attention" && isKnown);

      return plateMatch && isAfterStart && isBeforeEnd && matchesPlateStatus;
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
    setPlateStatusFilter("all"); // Optional: reset sort order
  };

  const fetchSmartBins = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/smartbins");
      setBinPlates(res.data.map((bin) => bin.sb_plate.toLowerCase())); // Normalize to lowercase
    } catch (error) {
      console.error("Error fetching smartbin data:", error);
    }
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
            License Plate Detection Records
          </h4>
          <Button
            variant="contained"
            color="primary"
            onClick={refreshProcessing}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? "Processing..." : "🔄 Refresh (Detect New Image)"}
          </Button>
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

          <TextField
            select
            label="Plate Status"
            variant="outlined"
            size="small"
            value={plateStatusFilter}
            onChange={(e) => setPlateStatusFilter(e.target.value)}
            style={{ minWidth: 180 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="attention">⚠️ With Attention</MenuItem>
            <MenuItem value="no-attention">✅ No Attention</MenuItem>
          </TextField>
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
        {statusMessage && (
          <Typography variant="subtitle1" style={{ marginBottom: 12 }}>
            {statusMessage}
          </Typography>
        )}
        <TableContainer
          component={Paper}
          style={{
            marginTop: "20px",
            maxHeight: "400px",
            overflow: "auto",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate Number</TableCell>
                <TableCell>Image Link</TableCell>
                <TableCell>Capture Date</TableCell>
                <TableCell>Capture Time</TableCell>
                <TableCell>File Name</TableCell>
                <TableCell>Edit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedImages.map((image) => (
                <TableRow key={image.i_id}>
                  <TableCell>
                    {image.i_id}{" "}
                    {!binPlates.includes(image.i_plate.toLowerCase()) && (
                      <span
                        title="Unregistered Plate"
                        style={{ color: "orange" }}
                      >
                        ⚠️
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{image.i_plate}</TableCell>
                  <TableCell>
                    <a href={image.i_url} target="_blank" rel="noreferrer">
                      View Image
                    </a>
                  </TableCell>
                  <TableCell>
                    {new Date(image.i_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{image.i_time}</TableCell>
                  <TableCell>{image.i_file}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setEditImage(image);
                        setEditPlate(image.i_plate);
                        setOpenEdit(true);
                      }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardBody>
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Plate Number</DialogTitle>

        {editImage ? (
          <DialogContent dividers>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>
                    <strong>ID</strong>
                  </TableCell>
                  <TableCell>{editImage.i_id}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <strong>File Name</strong>
                  </TableCell>
                  <TableCell>{editImage.i_file}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <strong>Capture Date</strong>
                  </TableCell>
                  <TableCell>
                    {new Date(editImage.i_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <strong>Capture Time</strong>
                  </TableCell>
                  <TableCell>{editImage.i_time}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <strong>Plate Number (Editable)</strong>
                  </TableCell>
                  <TableCell>
                    <TextField
                      value={editPlate}
                      onChange={(e) => setEditPlate(e.target.value)}
                      fullWidth
                      autoFocus
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogContent>
        ) : (
          <DialogContent>
            <p>Loading...</p>
          </DialogContent>
        )}

        <DialogActions>
          <Button onClick={() => setOpenEdit(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              try {
                await axios.put(
                  `http://localhost:5000/api/images/${editImage.i_id}`,
                  { i_plate: editPlate }
                );
                setOpenEdit(false);
                fetchImages();
              } catch (error) {
                console.error("Error updating plate:", error);
              }
            }}
            color="primary"
            variant="contained"
            disabled={!editImage} // disable save if no editImage
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
