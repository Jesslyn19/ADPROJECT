import React, { useEffect, useState } from "react";
import {
  Button,
  Avatar,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Box,
  Container,
  Paper,
} from "@material-ui/core";
import axios from "axios";
import EditIcon from "@material-ui/icons/Edit";
import IconButton from "@material-ui/core/IconButton";

const UserSetting = () => {
  const [user, setUser] = useState({
    u_id: "",
    u_fname: "",
    u_lname: "",
    u_contact: "",
    u_name: "",
    u_password: "",
    u_street: "",
    u_city: "",
    u_postcode: "",
    u_state: "",
    u_country: "",
    u_url: "",
    role_id: "",
    role_name: "",
    u_status: "",
    s_name: "",
  });

  const [avatarKey, setAvatarKey] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      setError("No user ID found in localStorage.");
      setLoading(false);
      return;
    }

    axios
      .get(`http://localhost:5000/api/users/${userId}`)
      .then((res) => {
        setUser(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err);
        setError("Failed to fetch user data.");
        setLoading(false);
      });
  }, []);

  const handleUpdate = () => {
    axios
      .patch(`http://localhost:5000/api/users/${user.u_id}`, user)
      .then((res) => {
        alert(res.data.message || "User updated successfully.");
        setEditMode(false);
      })
      .catch((err) => {
        console.error("Update failed:", err);
        alert(err.response?.data?.message || "Failed to update user.");
      });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    axios
      .patch(`http://localhost:5000/api/users/update-password/${user.u_id}`, {
        currentPassword,
        newPassword,
      })
      .then((res) => {
        alert(res.data.message || "Password changed successfully.");
        setShowPasswordForm(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      })
      .catch((err) => {
        console.error("Password update failed:", err);
        alert(err.response?.data?.message || "Failed to update password.");
      });
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError("");
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const response = await axios.post(
        `http://localhost:5000/api/users/${user.u_id}/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Update the user with the new image URL
      setUser((prev) => ({
        ...prev,
        u_url: response.data.imageUrl,
      }));

      // Force Avatar remount to reload image
      setAvatarKey((prev) => prev + 1);

      setSelectedFile(null); // clear preview
      setUploadError("");
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  if (loading)
    return (
      <Container maxWidth="md" style={{ marginTop: 40 }}>
        <Typography>Loading user data...</Typography>
      </Container>
    );

  if (error)
    return (
      <Container maxWidth="md" style={{ marginTop: 40 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );

  const cacheBuster = new Date().getTime();

  return (
    <Container maxWidth="lg">
      <Paper
        elevation={3}
        style={{ marginTop: 40, padding: 30, borderRadius: 20 }}
      >
        <Box display="flex" flexDirection="row" alignItems="flex-start">
          {/* Left: Avatar */}
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            width="30%"
            marginRight={4}
          >
            <Avatar
              key={avatarKey} // <- force remount on key change
              alt="Profile"
              src={
                user.u_url && user.u_url.trim() !== ""
                  ? user.u_url.startsWith("http")
                    ? `${user.u_url}?cb=${cacheBuster}`
                    : `http://localhost:5000/${user.u_url}?cb=${cacheBuster}`
                  : "/images/DefaultProfileImage.png"
              }
              style={{
                width: 150,
                height: 150,
                marginBottom: 10,
                border: "3px solid #3f51b5",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            />
            {/* Hidden file input */}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {/* Label acts as a button */}
            <label
              htmlFor="image-upload"
              style={{
                cursor: uploading ? "default" : "pointer",
                backgroundColor: uploading ? "#999" : "#3f51b5",
                color: "white",
                padding: "8px 16px",
                borderRadius: 5,
                fontSize: 14,
                display: "inline-block",
                userSelect: "none",
              }}
            >
              {uploading ? "Uploading..." : "Change Photo"}
            </label>

            {selectedFile && (
              <Box
                mt={2}
                display="flex"
                flexDirection="column"
                alignItems="center"
              >
                <Typography variant="subtitle2">Preview:</Typography>
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  style={{
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #3f51b5",
                    marginTop: 8,
                  }}
                />
                <Box display="flex" justifyContent="center" gap={2} mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleImageUpload}
                    disabled={uploading}
                    style={{ minWidth: 120, borderRadius: 8 }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => setSelectedFile(null)}
                    disabled={uploading}
                    style={{ minWidth: 120, borderRadius: 8 }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            )}

            {uploadError && (
              <Typography
                variant="body2"
                color="error"
                style={{ marginTop: 8 }}
              >
                {uploadError}
              </Typography>
            )}

            <Typography variant="h5" gutterBottom style={{ marginTop: 16 }}>
              {user.u_fname} {user.u_lname}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Username: {user.u_name}
            </Typography>
          </Box>

          {/* Right: Form */}
          <Box width="70%">
            <Box
              display="flex"
              justifyContent="space-between"
              style={{ marginBottom: 16 }}
            >
              <IconButton
                onClick={() => setEditMode(true)}
                style={{
                  marginTop: 20,
                  backgroundColor: "#3f51b5",
                  color: "white",
                  borderRadius: "50%",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                }}
              >
                <EditIcon />
              </IconButton>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                style={{
                  backgroundColor: "#3f51b5",
                  color: "white",
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: 5,
                  marginTop: 20,
                  cursor: "pointer",
                }}
              >
                {showPasswordForm
                  ? "Cancel Password Change"
                  : "Change Password"}
              </button>
            </Box>

            {/* Edit Form */}
            {editMode && (
              <Card style={{ marginBottom: 30 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Edit Profile
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        value={user.u_fname}
                        onChange={(e) =>
                          setUser({ ...user, u_fname: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        value={user.u_lname}
                        onChange={(e) =>
                          setUser({ ...user, u_lname: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Contact"
                        value={user.u_contact}
                        onChange={(e) =>
                          setUser({ ...user, u_contact: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Street"
                        value={user.u_street}
                        onChange={(e) =>
                          setUser({ ...user, u_street: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={user.u_city}
                        onChange={(e) =>
                          setUser({ ...user, u_city: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Postcode"
                        value={user.u_postcode}
                        onChange={(e) =>
                          setUser({ ...user, u_postcode: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="State"
                        value={user.u_state}
                        onChange={(e) =>
                          setUser({ ...user, u_state: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={user.u_country}
                        onChange={(e) =>
                          setUser({ ...user, u_country: e.target.value })
                        }
                      />
                    </Grid>
                    <Grid item xs={12} style={{ display: "flex", gap: "16px" }}>
                      <button
                        onClick={handleUpdate}
                        style={{
                          backgroundColor: "#4caf50",
                          color: "white",
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: 5,
                          cursor: "pointer",
                        }}
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        style={{
                          backgroundColor: "#f44336",
                          color: "white",
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: 5,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Password Form */}
            {showPasswordForm && (
              <Card style={{ marginBottom: 30 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Change Password
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <button
                        onClick={handleChangePassword}
                        style={{
                          backgroundColor: "#2196f3",
                          color: "white",
                          padding: "8px 16px",
                          border: "none",
                          borderRadius: 5,
                          cursor: "pointer",
                        }}
                      >
                        Save Password
                      </button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Read-only View */}
            <Card>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={user.u_fname}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={user.u_lname}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      value={user.u_name}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact"
                      value={user.u_contact}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street"
                      value={user.u_street}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={user.u_city}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Postcode"
                      value={user.u_postcode}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="State"
                      value={user.u_state}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={user.u_country}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Role"
                      value={user.role_name || ""}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Status"
                      value={user.s_name || ""}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};
export default UserSetting;
