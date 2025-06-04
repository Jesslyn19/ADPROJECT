import React from "react";
import PropTypes from "prop-types";
import { Route, Redirect } from "react-router-dom";

const ProtectedRoute = ({ component: Component, allowedRoles, ...rest }) => {
  const roleId = parseInt(localStorage.getItem("role_id"));
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const sessionExpiry = parseInt(localStorage.getItem("sessionExpiry"));
  const currentTime = new Date().getTime();
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

  if (!sessionExpiry || currentTime > sessionExpiry) {
    // Session expired - clear storage and redirect
    localStorage.clear();
    return <Redirect to="/login" />;
  }

  // Session still valid, extend expiry on each access
  localStorage.setItem("sessionExpiry", currentTime + SESSION_DURATION);

  return (
    <Route
      {...rest}
      render={(props) =>
        isLoggedIn && allowedRoles.includes(roleId) ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );
};

ProtectedRoute.propTypes = {
  component: PropTypes.elementType.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.number).isRequired,
};

export default ProtectedRoute;
