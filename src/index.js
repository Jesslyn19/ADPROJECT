import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

// layouts
import Admin from "layouts/Admin.js";
import Collector from "layouts/Collector.js";
import Driver from "layouts/Driver.js";
import LoginPage from "views/Auth/LoginPage.js";

// NEW import
import ProtectedRoute from "Routes/ProtectedRoute";

// styles
import "assets/css/material-dashboard-react.css?v=1.10.0";

ReactDOM.render(
  <BrowserRouter>
    <Switch>
      {/* Public route */}
      <Route path="/login" component={LoginPage} />

      {/* Role-protected routes */}
      <ProtectedRoute path="/admin" component={Admin} allowedRoles={[1]} />
      <ProtectedRoute
        path="/collector"
        component={Collector}
        allowedRoles={[3]}
      />
      <ProtectedRoute path="/driver" component={Driver} allowedRoles={[2]} />

      {/* Redirect any other route to login */}
      <Redirect from="/" to="/login" />
    </Switch>
  </BrowserRouter>,
  document.getElementById("root")
);
