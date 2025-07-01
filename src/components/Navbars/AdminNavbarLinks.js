import React from "react";
import { useHistory } from "react-router-dom";
// Material-UI components
import Icon from "@material-ui/core/Icon";
import Button from "components/CustomButtons/Button.js";

export default function AdminNavbarLinks() {
  const history = useHistory();

  const handleLogout = () => {
    localStorage.clear();
    history.push("/login");
  };

  return (
    <div>
      <Button
        color={window.innerWidth > 959 ? "transparent" : "white"}
        justIcon={window.innerWidth > 959}
        simple={!(window.innerWidth > 959)}
        onClick={handleLogout}
      >
        <Icon style={{ fontSize: 30 }}>logout</Icon>
      </Button>
    </div>
  );
}
