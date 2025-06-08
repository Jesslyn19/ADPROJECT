import React, { useEffect, useState } from "react";
import axios from "axios";
// react plugin for creating charts
//import ChartistGraph from "react-chartist";
// @material-ui/core
import { makeStyles } from "@material-ui/core/styles";
import Icon from "@material-ui/core/Icon";
// @material-ui/icons
//import Store from "@material-ui/icons/Store";
//import Warning from "@material-ui/icons/Warning";
//import DateRange from "@material-ui/icons/DateRange";
//import LocalOffer from "@material-ui/icons/LocalOffer";
//import Update from "@material-ui/icons/Update";
//import ArrowUpward from "@material-ui/icons/ArrowUpward";
//import AccessTime from "@material-ui/icons/AccessTime";
//import Accessibility from "@material-ui/icons/Accessibility";
import ReportProblem from "@material-ui/icons/ReportProblem";
// import Code from "@material-ui/icons/Code";
// import Cloud from "@material-ui/icons/Cloud";
// core components
import GridItem from "components/Grid/GridItem.js";
import GridContainer from "components/Grid/GridContainer.js";
//import Table from "components/Table/Table.js";
import Tasks from "components/Tasks/Tasks.js";
import CustomTabs from "components/CustomTabs/CustomTabs.js";
//import Danger from "components/Typography/Danger.js";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardIcon from "components/Card/CardIcon.js";
import CardBody from "components/Card/CardBody.js";
import CardFooter from "components/Card/CardFooter.js";
import MapComponent from "views/Maps/MapsDashboard.js";
import { TextField } from "@material-ui/core";
//import { bugs, website, server } from "variables/general.js";

// import {
//   dailySalesChart,
//   emailsSubscriptionChart,
//   completedTasksChart,
// } from "variables/charts.js";

import styles from "assets/jss/material-dashboard-react/views/dashboardStyle.js";

const useStyles = makeStyles(styles);

export default function Dashboard() {
  const classes = useStyles();
  const [totalBins, setTotalBins] = useState(0);
  // const [totalCollectedBins, setTotalCollectedBins] = useState(0);
  // const [totalMissedBins, setTotalMissedBins] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [reports, setReports] = useState([]);
  const [bugs, setBugs] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  // eslint-disable-next-line no-unused-vars
  const [timeAgo, setTimeAgo] = useState("just now");
  // eslint-disable-next-line no-unused-vars
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const fetchTotalBins = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/total-bins");
      setTotalBins(response.data.total);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Failed to fetch total bins:", error);
    }
  };

  useEffect(() => {
    fetchTotalBins();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/tasks", {
        params: { date: selectedDate },
      });
      setTasks(res.data);
    } catch (error) {
      console.error("Error fetching task list:", error);
    }
  };

  useEffect(() => {
    console.log("Fetching tasks for date:", selectedDate); // Check dev console
    fetchTasks();
  }, [selectedDate]);

  const fetchTotalCustomers = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/total-customers"
      );
      setTotalCustomers(response.data.total);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Failed to fetch total customers:", error);
    }
  };

  useEffect(() => {
    fetchTotalCustomers();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Re-fetch the data every 10 minutes
      console.log("Auto-refreshing dashboard data...");

      // Refetch all necessary data
      fetchTotalBins();
      fetchTasks();
      fetchTotalCustomers();

      setLastUpdated(Date.now()); // Update timestamp
    });

    return () => clearInterval(interval); // Clean up on unmount
  }, [selectedDate]); // Optional: re-setup interval if date changes

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated) / 1000);
      if (diff < 60)
        setTimeAgo(`Last updated: ${diff} sec${diff !== 1 ? "s" : ""} ago`);
      else if (diff < 3600)
        setTimeAgo(`Last updated: ${Math.floor(diff / 60)} min ago`);
      else
        setTimeAgo(
          `Last updated: ${new Date(lastUpdated).toLocaleTimeString()}`
        );
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/reports");

        // Sort by r_datetime (latest first), then get top 5
        const sortedReports = res.data
          .sort((a, b) => new Date(b.r_datetime) - new Date(a.r_datetime))
          .slice(0, 5); // Get the 5 most recent reports

        setReports(sortedReports);

        // Optional: if you want to turn it into a bugs-style array:
        const bugList = sortedReports.map(
          (report) => report.r_subject ?? "Untitled Report"
        );
        console.log("Recent bug list:", bugList);
        // You could also store it in a useState: setBugs(bugList)
        setBugs(bugList);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
    };

    fetchReports();
  }, []);

  useEffect(() => {
    const missedCount = localStorage.getItem("showMissedAlert");
    if (missedCount && parseInt(missedCount) > 0) {
      const timer = setTimeout(() => {
        alert(`⚠️ There are ${missedCount} missed tasks today!`);
        localStorage.removeItem("showMissedAlert");
      }, 300); // delay 300 ms (adjust as needed)

      return () => clearTimeout(timer); // cleanup on unmount
    }
  }, []);

  return (
    <div>
      <GridContainer>
        <GridItem xs={12} sm={6} md={3}>
          <Card>
            <CardHeader color="warning" stats icon>
              <CardIcon color="warning">
                <Icon>delete</Icon>
              </CardIcon>
              <p className={classes.cardCategory}>Total Bins</p>
              <h3 className={classes.cardTitle}>
                {totalBins} <small>bins</small>
              </h3>
            </CardHeader>
            <CardFooter stats>
              <div className={classes.stats}>
                <Icon>access_time</Icon>
                {timeAgo}
              </div>
            </CardFooter>
          </Card>
        </GridItem>
        <GridItem xs={12} sm={6} md={3}>
          <Card>
            <CardHeader color="success" stats icon>
              <CardIcon color="success">
                <Icon>check_circle</Icon>
              </CardIcon>
              <p className={classes.cardCategory}>Total Collected</p>
              <h3 className={classes.cardTitle}>
                {tasks.filter((task) => task.status === "Done").length}/
                {totalBins} <small>bins</small>
              </h3>
            </CardHeader>
            <CardFooter stats>
              <div className={classes.stats}>
                <Icon>access_time</Icon>
                {timeAgo}
              </div>
            </CardFooter>
          </Card>
        </GridItem>
        <GridItem xs={12} sm={6} md={3}>
          <Card>
            <CardHeader color="danger" stats icon>
              <CardIcon color="danger">
                <Icon>delete_forever</Icon>
              </CardIcon>
              <p className={classes.cardCategory}>Total Missed</p>
              <h3 className={classes.cardTitle}>
                {tasks.filter((task) => task.status === "Missed").length}/
                {totalBins} <small>bins</small>
              </h3>
            </CardHeader>
            <CardFooter stats>
              <div className={classes.stats}>
                <Icon>access_time</Icon>
                {timeAgo}
              </div>
            </CardFooter>
          </Card>
        </GridItem>
        <GridItem xs={12} sm={6} md={3}>
          <Card>
            <CardHeader color="info" stats icon>
              <CardIcon color="info">
                <Icon>people</Icon>
              </CardIcon>
              <p className={classes.cardCategory}>Total Customers</p>
              <h3 className={classes.cardTitle}>{totalCustomers}</h3>
            </CardHeader>
            <CardFooter stats>
              <div className={classes.stats}>
                <Icon>access_time</Icon>
                {timeAgo}
              </div>
            </CardFooter>
          </Card>
        </GridItem>
      </GridContainer>
      <GridContainer>
        <GridItem xs={12} sm={12} md={12}>
          <div>
            <MapComponent></MapComponent>
          </div>
        </GridItem>
      </GridContainer>
      <GridContainer>
        <GridItem xs={12} sm={12} md={6}>
          <CustomTabs
            title="Reports:"
            headerColor="primary"
            tabs={[
              {
                tabName: " 5 Latest Report",
                tabIcon: ReportProblem,
                tabContent: (
                  <Tasks
                    checkedIndexes={[]}
                    tasksIndexes={bugs.map((_, index) => index)}
                    tasks={bugs}
                  />
                ),
              },
            ]}
          />
        </GridItem>
        <GridItem xs={12} sm={12} md={6}>
          <Card>
            <CardHeader color="warning">
              <h4 className={classes.cardTitleWhite}>Notepad</h4>
              <p className={classes.cardCategoryWhite}>
                Feel free to write anything
              </p>
            </CardHeader>
            <CardBody>
              <TextField
                label="Write Anything Here..."
                fullWidth
                multiline
                rows={10}
              />
            </CardBody>
          </Card>
        </GridItem>
      </GridContainer>
    </div>
  );
}
