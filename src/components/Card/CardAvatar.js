﻿import React from "react";
// nodejs library that concatenates classes
import classNames from "classnames";
// nodejs library to set properties for components
import PropTypes from "prop-types";
// @material-ui/core components
import { makeStyles } from "@material-ui/core/styles";
// @material-ui/icons
// core components

import styles from "assets/jss/material-dashboard-react/components/cardAvatarStyle.js";

const useStyles = makeStyles(styles);

export default function CardAvatar(props) {
  const classes = useStyles();
  const { children, className, plain, profile, ...rest } = props;
  const cardAvatarClasses = classNames({
    [classes.cardAvatar]: true,
    [classes.cardAvatarProfile]: profile,
    [classes.cardAvatarPlain]: plain,
    [className]: className !== undefined,
  });
  return (
    <div className={cardAvatarClasses} {...rest}>
      {children}
    </div>
  );
}

CardAvatar.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  profile: PropTypes.bool,
  plain: PropTypes.bool,
};
