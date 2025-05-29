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
} from "@material-ui/core";

import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardBody from "components/Card/CardBody.js";

export default function ImagePage() {
  const [images, setImages] = useState([]);

  const fetchImages = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/images");
      setImages(res.data);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  const refreshProcessing = async () => {
    try {
      await axios.post("http://localhost:5000/api/refresh");
      fetchImages(); // Refresh the table after processing
    } catch (error) {
      console.error("Error refreshing images:", error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  return (
    <Card>
      <CardHeader title="License Plate Detection Records" />
      <CardBody>
        <Button variant="contained" color="primary" onClick={refreshProcessing}>
          🔄 Refresh (Run Image Processing)
        </Button>
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
                  <TableCell>{image.i_date}</TableCell>
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
