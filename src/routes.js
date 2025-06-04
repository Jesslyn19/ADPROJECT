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
import Dashboard from "@material-ui/icons/Dashboard";
import Person from "@material-ui/icons/Person";
import LibraryBooks from "@material-ui/icons/LibraryBooks";
//import BubbleChart from "@material-ui/icons/BubbleChart";
import LocationOn from "@material-ui/icons/LocationOn";
//import Notifications from "@material-ui/icons/Notifications";
import ImageIcon from "@material-ui/icons/Image";
import AssignmentLate from "@material-ui/icons/AssignmentLate";
import CreateIcon from "@material-ui/icons/Create";
import Image from "views/Image/Image.js";
import Customer from "views/customer/customer.js";
import Truck from "views/truck/truck.js";
// core components/views for Admin layout
import DashboardPage from "views/Dashboard/Dashboard.js";
//import UserProfile from "views/UserProfile/UserProfile.js";
import Bin from "views/bin/bin.js";
//import Typography from "views/Typography/Typography.js";
//import Icons from "views/Icons/Icons.js";
import Maps from "views/Maps/Maps.js";
import Task from "views/Task/Task.js";
import Report from "views/report/report.js";
import createReport from "views/report/create_report.js";
import UserManagement from "views/User/User.js";
import DriverMaps from "views/Driver/DriverMaps.js";
//import NotificationsPage from "views/Notifications/Notifications.js";

const dashboardRoutes = [
  {
    path: "/dashboard",
    name: "Dashboard",
    icon: Dashboard,
    component: DashboardPage,
    layout: "/admin",
  },

  {
    path: "/user",
    name: "User Management",
    icon: Person,
    component: UserManagement,
    layout: "/admin",
  },
  {
    path: "/customer",
    name: "Customer List",
    icon: Person,
    component: Customer,
    layout: "/admin",
  },
  {
    path: "/table",
    name: "Bin List",
    icon: "content_paste",
    component: Bin,
    layout: "/admin",
  },
  {
    path: "/truck",
    name: "Truck List",
    icon: LibraryBooks,
    component: Truck,
    layout: "/admin",
  },
  //{
  // path: "/icons",
  //  name: "Icons",
  //  icon: BubbleChart,
  //  component: Icons,
  //  layout: "/admin",
  //},
  {
    path: "/maps",
    name: "Maps",
    icon: LocationOn,
    component: Maps,
    layout: "/admin",
  },
  {
    path: "/task",
    name: "Task List",
    icon: LibraryBooks, // or any icon you prefer
    component: Task,
    layout: "/admin",
  },
  {
    path: "/image",
    name: "Image",
    icon: ImageIcon,
    component: Image,
    layout: "/admin",
  },
  {
    path: "/report",
    name: "Report",
    icon: AssignmentLate,
    component: Report,
    layout: "/admin",
  },
];

export default dashboardRoutes;
