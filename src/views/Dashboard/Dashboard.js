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
import BugReport from "@material-ui/icons/BugReport";
import Code from "@material-ui/icons/Code";
import Cloud from "@material-ui/icons/Cloud";
// core components
import GridItem from "components/Grid/GridItem.js";
import GridContainer from "components/Grid/GridContainer.js";
import Table from "components/Table/Table.js";
import Tasks from "components/Tasks/Tasks.js";
import CustomTabs from "components/CustomTabs/CustomTabs.js";
//import Danger from "components/Typography/Danger.js";
import Card from "components/Card/Card.js";
import CardHeader from "components/Card/CardHeader.js";
import CardIcon from "components/Card/CardIcon.js";
import CardBody from "components/Card/CardBody.js";
import CardFooter from "components/Card/CardFooter.js";

import MapComponent from "views/Maps/MapsDashboard.js";

import { bugs, website, server } from "variables/general.js";

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
  const [totalCollectedBins, setTotalCollectedBins] = useState(0);
  const [totalMissedBins, setTotalMissedBins] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState("just now");

  useEffect(() => {
    const fetchTotalBins = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/total-bins"
        );
        setTotalBins(response.data.total);
        setLastUpdated(Date.now());
      } catch (error) {
        console.error("Failed to fetch total bins:", error);
      }
    };
    fetchTotalBins();
  }, []);

  useEffect(() => {
    const fetchTotalCollectedBins = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/collected-bins"
        );
        setTotalCollectedBins(response.data.total);
        setLastUpdated(Date.now());
      } catch (error) {
        console.error("Failed to fetch total collected bins:", error);
      }
    };
    fetchTotalCollectedBins();
  }, []);

  useEffect(() => {
    const fetchTotalMissedBins = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/missed-bins"
        );
        setTotalMissedBins(response.data.total);
        setLastUpdated(Date.now());
      } catch (error) {
        console.error("Failed to fetch total missed bins:", error);
      }
    };
    fetchTotalMissedBins();
  }, []);

  useEffect(() => {
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
    fetchTotalCustomers();
  }, []);

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
                {totalCollectedBins}/{totalBins} <small>bins</small>
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
                {totalMissedBins}/{totalBins} <small>bins</small>
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
          <MapComponent></MapComponent>
        </GridItem>
      </GridContainer>
      <GridContainer>
        <GridItem xs={12} sm={12} md={6}>
          <CustomTabs
            title="Tasks:"
            headerColor="primary"
            tabs={[
              {
                tabName: "Bugs",
                tabIcon: BugReport,
                tabContent: (
                  <Tasks
                    checkedIndexes={[0, 3]}
                    tasksIndexes={[0, 1, 2, 3]}
                    tasks={bugs}
                  />
                ),
              },
              {
                tabName: "Website",
                tabIcon: Code,
                tabContent: (
                  <Tasks
                    checkedIndexes={[0]}
                    tasksIndexes={[0, 1]}
                    tasks={website}
                  />
                ),
              },
              {
                tabName: "Server",
                tabIcon: Cloud,
                tabContent: (
                  <Tasks
                    checkedIndexes={[1]}
                    tasksIndexes={[0, 1, 2]}
                    tasks={server}
                  />
                ),
              },
            ]}
          />
        </GridItem>
        <GridItem xs={12} sm={12} md={6}>
          <Card>
            <CardHeader color="warning">
              <h4 className={classes.cardTitleWhite}>Employees Stats</h4>
              <p className={classes.cardCategoryWhite}>
                New employees on 15th September, 2016
              </p>
            </CardHeader>
            <CardBody>
              <Table
                tableHeaderColor="warning"
                tableHead={["ID", "Name", "Salary", "Country"]}
                tableData={[
                  ["1", "Dakota Rice", "$36,738", "Niger"],
                  ["2", "Minerva Hooper", "$23,789", "Curaçao"],
                  ["3", "Sage Rodriguez", "$56,142", "Netherlands"],
                  ["4", "Philip Chaney", "$38,735", "Korea, South"],
                ]}
              />
            </CardBody>
          </Card>
        </GridItem>
      </GridContainer>
    </div>
  );
}
