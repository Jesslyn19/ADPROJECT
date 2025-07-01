import CreateIcon from "@material-ui/icons/Create";
import createReport from "views/report/create_report.js";
import SettingsIcon from "@material-ui/icons/Settings";
import UserSetting from "views/UserSetting/UserSetting.js";

const dashboardRoutes = [
  {
    path: "/settings",
    name: "User Settings",
    icon: SettingsIcon,
    component: UserSetting,
    layout: "/collector",
  },
  {
    path: "/create_report",
    name: "Report Issue",
    icon: CreateIcon,
    component: createReport,
    layout: "/collector",
  },
];

export default dashboardRoutes;
