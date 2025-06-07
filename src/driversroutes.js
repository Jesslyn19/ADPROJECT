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
// @material-ui/icons
// import Dashboard from "@material-ui/icons/Dashboard";
// import Person from "@material-ui/icons/Person";
// import LibraryBooks from "@material-ui/icons/LibraryBooks";
// import BubbleChart from "@material-ui/icons/BubbleChart";
import LocationOn from "@material-ui/icons/LocationOn";
// import Notifications from "@material-ui/icons/Notifications";
// import ImageIcon from "@material-ui/icons/Image";
// import AssignmentLate from "@material-ui/icons/AssignmentLate";
import CreateIcon from "@material-ui/icons/Create";
// import Image from "views/Image/Image.js";
// import Customer from "views/customer/customer.js";
// import Truck from "views/truck/truck.js";
// core components/views for Admin layout
// import DashboardPage from "views/Dashboard/Dashboard.js";
// import UserProfile from "views/UserProfile/UserProfile.js";
// import Bin from "views/bin/bin.js";
// import Typography from "views/Typography/Typography.js";
// import Icons from "views/Icons/Icons.js";
// import Maps from "views/Maps/Maps.js";
// import Task from "views/Task/Task.js";
// import Report from "views/report/report.js";
import createReport from "views/report/create_report.js";
import DriverMaps from "views/Driver/DriverMaps.js";
import SettingsIcon from "@material-ui/icons/Settings";
import UserSetting from "views/UserSetting/UserSetting.js";
// import NotificationsPage from "views/Notifications/Notifications.js";

const dashboardRoutes = [
  {
    path: "/settings",
    name: "User Settings",
    icon: SettingsIcon,
    component: UserSetting,
    layout: "/driver",
  },
  {
    path: "/map",
    name: "Driver Map",
    icon: LocationOn,
    component: DriverMaps,
    layout: "/driver",
  },
  {
    path: "/report",
    name: "Write Report",
    icon: CreateIcon,
    component: createReport,
    layout: "/driver",
  },
];

export default dashboardRoutes;
