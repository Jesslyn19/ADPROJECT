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
} from "@material-ui/core";

import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

export default function ImagePage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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
        setTimeout(() => setStatusMessage(""), 5000); // Clear after 5s
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <h4 className="card-title">License Plate Detection Records</h4>
          <Button
            variant="contained"
            color="primary"
            onClick={refreshProcessing}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
            style={{ marginLeft: "auto" }}
          >
            {loading ? "Processing..." : "🔄 Refresh (Detect New Image)"}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        {statusMessage && (
          <Typography variant="subtitle1" style={{ marginBottom: 12 }}>
            {statusMessage}
          </Typography>
        )}
        <TableContainer component={Paper} style={{ marginTop: "20px" }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate Number</TableCell>
                <TableCell>Image Link</TableCell>
                <TableCell>Capture Date</TableCell>
                <TableCell>Capture Time</TableCell>
                <TableCell>File Name</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {images.map((image) => (
                <TableRow key={image.i_id}>
                  <TableCell>{image.i_id}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardBody>
    </Card>
  );
}
