import LocationOn from "@material-ui/icons/LocationOn";
import CreateIcon from "@material-ui/icons/Create";
import createReport from "views/report/create_report.js";
import DriverMaps from "views/Driver/DriverMaps.js";
import SettingsIcon from "@material-ui/icons/Settings";
import UserSetting from "views/UserSetting/UserSetting.js";

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
    name: "Report Issue",
    icon: CreateIcon,
    component: createReport,
    layout: "/driver",
  },
];

export default dashboardRoutes;
