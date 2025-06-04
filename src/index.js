/*!

=========================================================
* Material Dashboard React - v1.10.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2021 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/material-dashboard-react/blob/master/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
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
