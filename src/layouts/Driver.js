import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import { makeStyles } from "@material-ui/core/styles";
import Navbar from "components/Navbars/Navbar.js";
import Footer from "components/Footer/Footer.js";
import Sidebar from "components/Sidebar/Sidebar.js";
import routes from "driversroutes";
import styles from "assets/jss/material-dashboard-react/layouts/adminStyle.js";
import bgImage from "assets/img/sidebar-2.jpg";
import logo from "assets/img/logo.png";

let ps;

const switchRoutes = (
  <Switch>
    {routes.map((prop, key) => {
      if (prop.layout === "/driver") {
        return (
          <Route
            path={prop.layout + prop.path}
            component={prop.component}
            key={key}
          />
        );
      }
      return null;
    })}
    <Redirect from="/driver" to="/driver/map" />
  </Switch>
);

const useStyles = makeStyles(styles);

export default function Driver({ ...rest }) {
  // styles
  const classes = useStyles();
  // ref to help us initialize PerfectScrollbar on windows devices
  const mainPanel = React.createRef();
  // states and functions
  // eslint-disable-next-line no-unused-vars
  const [image, setImage] = React.useState(bgImage);
  // eslint-disable-next-line no-unused-vars
  const [color, setColor] = React.useState("green"); // Changed default color for driver view
  //const [fixedClasses, setFixedClasses] = React.useState("dropdown show");
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // const handleImageClick = (image) => {
  //   setImage(image);
  // };
  // const handleColorClick = (color) => {
  //   setColor(color);
  // };
  // const handleFixedClick = () => {
  //   if (fixedClasses === "dropdown") {
  //     setFixedClasses("dropdown show");
  //   } else {
  //     setFixedClasses("dropdown");
  //   }
  // };
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const getRoute = () => {
    return window.location.pathname !== "/driver/report";
  };

  const resizeFunction = () => {
    if (window.innerWidth >= 960) {
      setMobileOpen(false);
    }
  };

  React.useEffect(() => {
    if (navigator.platform.indexOf("Win") > -1) {
      ps = new PerfectScrollbar(mainPanel.current, {
        suppressScrollX: true,
        suppressScrollY: false,
      });
      document.body.style.overflow = "hidden";
    }
    window.addEventListener("resize", resizeFunction);
    // Specify how to clean up after this effect:
    return function cleanup() {
      if (navigator.platform.indexOf("Win") > -1) {
        ps.destroy();
      }
      window.removeEventListener("resize", resizeFunction);
    };
  }, [mainPanel]); // Dependency array should include mainPanel

  return (
    <div className={classes.wrapper}>
      <Sidebar
        routes={routes.filter((route) => route.layout === "/driver")}
        logoText={"Smartbin Driver"}
        logo={logo}
        image={image}
        handleDrawerToggle={handleDrawerToggle}
        open={mobileOpen}
        color={color}
        {...rest}
      />
      <div className={classes.mainPanel} ref={mainPanel}>
        <Navbar
          routes={routes.filter((route) => route.layout === "/driver")}
          handleDrawerToggle={handleDrawerToggle}
          {...rest}
        />
        {/* On the /driver/map route we want the map to be on full screen -
            this is not possible if the content and container classes are present
            because they have some paddings which would make the map smaller */}
        {getRoute() ? ( // If not on /driver/map, use content/container classes
          <div className={classes.content}>
            <div className={classes.container}>{switchRoutes}</div>
          </div>
        ) : (
          // If on /driver/map, use the map class for full screen
          <div className={classes.map}>{switchRoutes}</div>
        )}
        {getRoute() ? <Footer /> : null}{" "}
        {/* Only show footer if not on full-screen map */}
        {/* <FixedPlugin
          handleImageClick={handleImageClick}
          handleColorClick={handleColorClick}
          bgColor={color}
          bgImage={image}
          handleFixedClick={handleFixedClick}
          fixedClasses={fixedClasses}
        /> */}
      </div>
    </div>
  );
}
