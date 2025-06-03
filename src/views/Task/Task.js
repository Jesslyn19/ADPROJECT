import React, { useEffect, useState } from "react";
import axios from "axios";
import {
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

  useEffect(() => {
    const fetchTaskData = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/tasks");
        setImages(res.data); // or rename to setTasks() if clearer
      } catch (error) {
        console.error("Error fetching task data:", error);
      }
    };

    fetchTaskData();
  }, []);
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
            Track Task
          </h4>
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        ></div>
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
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Plate Number</TableCell>
                <TableCell>Prove</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {images.map((task, index) => (
                <TableRow key={index}>
                  <TableCell>{task.sb_id}</TableCell>
                  <TableCell>{task.sb_plate}</TableCell>
                  <TableCell>
                    {task.i_url ? (
                      <a href={task.i_url} target="_blank" rel="noreferrer">
                        View Image
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{new Date().toLocaleDateString()}</TableCell>
                  <TableCell>{task.i_time}</TableCell>
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
