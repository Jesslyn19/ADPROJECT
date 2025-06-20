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
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Typography,
  TextField,
} from "@material-ui/core";

export default function Bin() {
  const [reports, setReports] = useState([]);
  const [viewingReport, setViewingReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/reports");
      setReports(res.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (report) => {
    setViewingReport(report);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setViewingReport(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      try {
        await axios.delete(`http://localhost:5000/api/reports/${id}`);
        fetchReports();
      } catch (error) {
        console.error("Error deleting report:", error);
      }
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredReports = reports.filter((report) =>
    report.r_subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <TextField
        label="Search by Subject"
        value={searchQuery}
        onChange={handleSearchChange}
        fullWidth
        variant="outlined"
        style={{ marginBottom: 20 }}
      />
      <Typography variant="h4" gutterBottom>
        Report List
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Box sx={{ maxHeight: "61vh", overflow: "auto" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>No</TableCell>
                  <TableCell>Issued Date</TableCell>
                  <TableCell>Reporter</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.map((report, index) => (
                  <TableRow key={report.r_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {new Date(report.r_datetime).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{report.r_writer}</TableCell>
                    <TableCell>{report.r_subject}</TableCell>
                    <TableCell>
                      <Button
                        color="primary"
                        onClick={() => handleView(report)}
                      >
                        View
                      </Button>
                      <Button
                        color="secondary"
                        onClick={() => handleDelete(report.r_id)}
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

      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        {viewingReport && (
          <>
            <DialogTitle>
              {new Date(viewingReport.r_datetime)
                .toISOString()
                .replace("T", " ")
                .slice(0, 19)}
            </DialogTitle>
            <DialogContent
              sx={{
                maxHeight: "70vh", // Prevent entire dialog from overflowing
                overflow: "hidden", // Disable full dialog scrolling
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Subject
                  </Typography>
                  <Box
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      padding: 1.5,
                      maxHeight: 200, // adjust height as needed
                      overflowY: "auto",
                      backgroundColor: "#f9f9f9",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <Typography variant="body1">
                      {viewingReport.r_subject}
                    </Typography>
                  </Box>
                </Box>
                <br></br>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Reporter
                  </Typography>
                  <Box
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      padding: 1.5,
                      maxHeight: 200, // adjust height as needed
                      overflowY: "auto",
                      backgroundColor: "#f9f9f9",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <Typography variant="body1">
                      {viewingReport.r_writer}
                    </Typography>
                  </Box>
                </Box>
                <br></br>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Content
                  </Typography>
                  <Box
                    sx={{
                      border: "1px solid #ddd",
                      borderRadius: 2,
                      padding: 1.5,
                      maxHeight: 200, // adjust height as needed
                      minHeight: 200,
                      overflowY: "auto",
                      backgroundColor: "#f9f9f9",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <Typography variant="body1">
                      {viewingReport.r_content}
                    </Typography>
                  </Box>
                </Box>
                <br></br>
                {viewingReport.r_image && (
                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Image
                    </Typography>
                    <Box position="relative" maxWidth="100%">
                      <img
                        src={viewingReport.r_image}
                        alt="Report"
                        style={{
                          maxWidth: "100%",
                          maxHeight: 200,
                          borderRadius: 6,
                          display: "block",
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() =>
                          window.open(viewingReport.r_image, "_blank")
                        }
                        style={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          backgroundColor: "#1976d2",
                          color: "#fff",
                          textTransform: "none",
                        }}
                      >
                        View Full Image
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
}
