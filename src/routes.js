import Dashboard from "@material-ui/icons/Dashboard";
import Person from "@material-ui/icons/Person";
import LibraryBooks from "@material-ui/icons/LibraryBooks";
import LocationOn from "@material-ui/icons/LocationOn";
import ImageIcon from "@material-ui/icons/Image";
import AssignmentLate from "@material-ui/icons/AssignmentLate";
import Image from "views/Image/Image.js";
import Customer from "views/customer/customer.js";
import Truck from "views/truck/truck.js";
// core components/views for Admin layout
import DashboardPage from "views/Dashboard/Dashboard.js";
import Bin from "views/bin/bin.js";
import Maps from "views/Maps/Maps.js";
import Task from "views/Task/Task.js";
import Report from "views/report/report.js";
import UserManagement from "views/User/User.js";
import SettingsIcon from "@material-ui/icons/Settings";
import UserSetting from "views/UserSetting/UserSetting.js";

const dashboardRoutes = [
  {
    path: "/settings",
    name: "User Settings",
    icon: SettingsIcon,
    component: UserSetting,
    layout: "/admin",
  },

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
    name: "Issues Reported",
    icon: AssignmentLate,
    component: Report,
    layout: "/admin",
  },
];

export default dashboardRoutes;
