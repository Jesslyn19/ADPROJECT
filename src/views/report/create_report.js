import React, { useEffect, useState } from "react";
import axios from "axios";
import { TextField, Button, Grid, Paper, Typography } from "@material-ui/core";

export default function Report() {
  // eslint-disable-next-line no-unused-vars
  const [reports, setReports] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [users, setUsers] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [newReport, setNewReport] = useState({
    r_subject: "",
    r_content: "",
    r_image: "",
    r_writer: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const currentUserId = localStorage.getItem("userId");
      console.log("User ID from localStorage:", currentUserId);

      const res = await axios.get(
        `http://localhost:5000/api/username/${currentUserId}`
      );

      const user = res.data; // ✅ Now this is a single object
      console.log("Fetched user:", user);

      const fullName = `${user.u_fname} ${user.u_lname}`;

      setUsers([user]); // Optional
      setNewReport((prev) => ({
        ...prev,
        r_writer: fullName,
      }));
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/create_report");
      setReports(res.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleNewReportChange = (e) => {
    const { name, value } = e.target;
    setNewReport({ ...newReport, [name]: value });
  };

  const handleCreateReport = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const formData = new FormData();

      const currentUserId = localStorage.getItem("userId"); // ✅ Get u_id
      formData.append("u_id", currentUserId); // ✅ Append it to the form
      formData.append("writer", newReport.r_writer);
      formData.append("subject", newReport.r_subject);
      formData.append("content", newReport.r_content);

      if (image) {
        formData.append("image", image); // Must match `upload.single("image")`
      }

      await axios.post("http://localhost:5000/api/create_report", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchReports();
      alert("Report created successfully!");
      setNewReport({
        r_subject: "",
        r_content: "",
        r_image: "",
        r_writer: "",
      });
      setPreview(null);
      setImage(null);
    } catch (error) {
      console.error("Error creating report:", error.response || error);
      alert("Failed to create report.");
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: 9 }}>
      <Paper style={{ padding: 20 }}>
        <Typography variant="h5" gutterBottom>
          Report New Issue
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              name="r_writer"
              label="From"
              value={newReport.r_writer}
              onChange={handleNewReportChange}
              fullWidth
              required
              disabled
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="r_subject"
              label="Subject"
              value={newReport.r_subject}
              onChange={handleNewReportChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="r_content"
              label="Content"
              value={newReport.r_content}
              onChange={handleNewReportChange}
              fullWidth
              multiline
              rows={15}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" component="label">
              Upload Image
              <input
                type="file"
                accept="image/*"
                hidden
                required
                onChange={handleImageChange}
              />
            </Button>
            {preview && (
              <div style={{ marginTop: 20 }}>
                <img
                  src={preview}
                  alt="Preview"
                  style={{ maxWidth: "100%", height: "200px", borderRadius: 8 }}
                />
              </div>
            )}
          </Grid>
          <Grid item xs={12}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateReport}
                disabled={creating}
                style={{ width: "50%" }}
              >
                {creating ? "Created" : "Create Report"}
              </Button>
            </div>
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
}
