-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 01, 2025 at 07:09 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_kutip`
--

-- --------------------------------------------------------

--
-- Table structure for table `tb_customer`
--

CREATE TABLE `tb_customer` (
  `c_id` int(11) NOT NULL,
  `c_name` varchar(25) NOT NULL,
  `c_street` varchar(25) NOT NULL,
  `c_postcode` int(10) NOT NULL,
  `c_city` varchar(25) NOT NULL,
  `c_state` varchar(25) NOT NULL,
  `c_country` varchar(25) NOT NULL,
  `c_contact` varchar(15) NOT NULL,
  `c_status` int(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_customer`
--

INSERT INTO `tb_customer` (`c_id`, `c_name`, `c_street`, `c_postcode`, `c_city`, `c_state`, `c_country`, `c_contact`, `c_status`) VALUES
(1, 'SpringDay', 'Jalan Pulai Perdana', 81300, 'Johor Bahru', 'Johor', 'Malaysia', '0111234566', 1),
(7, 'CHUA MOI CHOO', '28 JALAN PUTEH 12', 80400, 'TAMAN PELANGI', 'JOHOR', 'Malaysia', '0127091939', 2);

-- --------------------------------------------------------

--
-- Table structure for table `tb_image`
--

CREATE TABLE `tb_image` (
  `i_plate` varchar(10) NOT NULL,
  `i_id` int(50) NOT NULL,
  `i_url` varchar(150) NOT NULL,
  `i_time` time NOT NULL,
  `i_date` date NOT NULL,
  `i_file` varchar(50) NOT NULL,
  `sb_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tb_report`
--

CREATE TABLE `tb_report` (
  `r_id` int(11) NOT NULL,
  `r_subject` varchar(100) NOT NULL,
  `r_content` varchar(500) NOT NULL,
  `r_image` varchar(200) NOT NULL,
  `r_writer` varchar(100) NOT NULL,
  `r_datetime` datetime NOT NULL,
  `r_status` int(1) NOT NULL DEFAULT 1,
  `u_id` int(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_report`
--

INSERT INTO `tb_report` (`r_id`, `r_subject`, `r_content`, `r_image`, `r_writer`, `r_datetime`, `r_status`, `u_id`) VALUES
(1, 'No Bin Available', 'I am at 28, Jalan Tasek 1. But there is no bin able to be collected.', 'http://localhost:5000/uploads/1751346362915-nobin.jpg', 'Driver Driver', '2025-07-01 13:06:02', 1, 2),
(2, 'Bin Rosak', 'I went to collect this bin , but this bin is badly damaged.', 'http://localhost:5000/uploads/1751346404868-bin rosak.jpg', 'Driver2 Driver', '2025-07-01 13:06:44', 1, 8),
(3, 'Spoilt Bin', 'The bin is spoilt how should i collect it?', 'http://localhost:5000/uploads/1751346443732-spoilt bin.jpg', 'Collector Collector', '2025-07-01 13:07:23', 1, 5),
(4, 'Bin is Empty', 'This bin is not collected as it is empty. Why should we come ?', 'http://localhost:5000/uploads/1751346471664-emptybin.jpg', 'Collector Collector', '2025-07-01 13:07:51', 1, 5);

-- --------------------------------------------------------

--
-- Table structure for table `tb_role`
--

CREATE TABLE `tb_role` (
  `role_id` int(5) NOT NULL,
  `role_name` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_role`
--

INSERT INTO `tb_role` (`role_id`, `role_name`) VALUES
(1, 'Admin'),
(2, 'Truck Driver'),
(3, 'Rubbish Collector');

-- --------------------------------------------------------

--
-- Table structure for table `tb_smartbin`
--

CREATE TABLE `tb_smartbin` (
  `sb_id` int(11) NOT NULL,
  `sb_plate` varchar(20) NOT NULL,
  `sb_floor` varchar(20) NOT NULL,
  `sb_street` varchar(200) NOT NULL,
  `sb_postcode` varchar(200) NOT NULL,
  `sb_city` varchar(200) NOT NULL,
  `sb_state` varchar(200) NOT NULL,
  `sb_country` varchar(200) NOT NULL,
  `sb_latitude` double NOT NULL,
  `sb_longitude` double NOT NULL,
  `c_id` int(11) NOT NULL,
  `t_id` int(11) DEFAULT NULL,
  `sb_day` varchar(255) NOT NULL,
  `sb_status` int(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_smartbin`
--

INSERT INTO `tb_smartbin` (`sb_id`, `sb_plate`, `sb_floor`, `sb_street`, `sb_postcode`, `sb_city`, `sb_state`, `sb_country`, `sb_latitude`, `sb_longitude`, `c_id`, `t_id`, `sb_day`, `sb_status`) VALUES
(1, 'CSL9133', '', '', '', '', '', '', 1.5300530195236206, 103.6688461303711, 1, NULL, '', 2),
(2, 'KAO9999', '4', 'Jalan Shahbandar 4, Taman Ungku Tun Aminah', '81300', 'Skudai', 'Johor', 'Malaysia', 1.5312707, 103.668644, 1, NULL, 'Monday,Wednesday,Friday', 1),
(3, 'DA465', '5', 'Jalan Shahbandar 8, Taman Ungku Tun Aminah', '81300', 'Skudai', 'Johor', 'Malaysia', 1.5292564, 103.6706261, 1, NULL, 'Monday,Wednesday,Friday', 1),
(4, 'DE4958', '', 'Lebuhraya Skudai, Taman Ungku Tun Aminah', '81300', 'Skudai', 'Johor', 'Malaysia', 1.5291501, 103.6693648, 1, NULL, 'Monday,Wednesday,Friday', 1),
(5, 'TJY0218', '1', 'Jalan Laksamana 5, Taman Ungku Tun Aminah', '81300', 'Skudai', 'Johor', 'Malaysia', 1.5260333, 103.6679807, 1, NULL, 'Monday,Wednesday,Friday', 1),
(6, 'YAO3456', '', 'Jalan Laksamana 6, Taman Ungku Tun Aminah', '81300', 'Skudai', 'Johor', 'Malaysia', 1.523908, 103.668078, 1, NULL, 'Monday,Wednesday,Friday', 1),
(7, 'GE3784', '', 'Jalan Tun Aminah, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5218193, 103.6630374, 1, NULL, 'Monday,Wednesday,Friday', 1),
(8, 'CYT03I3', '', 'Jalan Pahlawan 11, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5215243, 103.6657127, 1, NULL, 'Tuesday,Thursday,Saturday', 1),
(9, 'BLE5530', '', 'Jalan Bentara 1, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5188264, 103.6604029, 1, NULL, 'Tuesday,Thursday,Saturday', 1),
(10, 'ZJL1010', '', 'Jalan Bentara 20, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5154377, 103.6571909, 1, NULL, 'Tuesday,Thursday,Saturday', 1),
(11, 'QWE1011', '', 'Jalan Hulubalang 1, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5109961, 103.6549431, 1, NULL, 'Tuesday,Thursday,Saturday', 1),
(12, 'NTP1012', '', 'Jalan Perkasa 2, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5093841, 103.6487946, 1, NULL, 'Tuesday,Thursday,Saturday', 1),
(13, 'SDH1013', '', 'Jalan Perkasa 22, Taman Ungku Tun Aminah', '81380', 'Iskandar Puteri', 'Johor', 'Malaysia', 1.5068888, 103.6538796, 1, NULL, 'Tuesday,Thursday,Saturday', 1),
(14, 'SDH1013', '', '', '', '', '', '', 1.5078879594802856, 103.65283203125, 1, NULL, '', 2),
(15, 'LYF1014', '', 'Jalan Beruang, Century Garden', '80250', 'Johor Bahru', 'Johor', 'Malaysia', 1.4870413541793823, 103.7591781616211, 1, NULL, '', 2),
(16, 'VXA1015', '', 'Jalan Landak, Century Garden', '80250', 'Johor Bahru', 'Johor', 'Malaysia', 1.4870413541793823, 103.7591781616211, 1, NULL, '', 2),
(17, 'ERI1017', '', 'Jalan Abdul Rahman Andak, Kampung Tarom', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.474063754081726, 103.75167083740234, 1, NULL, '', 2),
(18, 'UJP1018', '', 'Jalan Sekolah Sultan Ismail, Tasek Utara', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.4784126281738281, 103.74394226074219, 1, NULL, '', 2),
(19, 'TGB1019', '', 'Jalan Kemaman, Tasek Utara', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.47212815284729, 103.74688720703125, 1, NULL, '', 2),
(20, 'CFD1020', 'Lorong 2B', 'Jalan Abdul Samad, Tasek Utara', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.4637118577957153, 103.7448501586914, 1, NULL, '', 2),
(21, 'HNR1021', '', 'Jalan Sri Mahligai, Tasek Utara', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.4677249193191528, 103.73968505859375, 1, NULL, '', 2),
(22, 'ZWQ1022', '', 'Jalan Nong Chik, Tasek Utara', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.4683958292007446, 103.73876953125, 1, NULL, '', 2),
(23, 'PLS1023', '', 'Jalan Tengku Petrie, Kampung Jawa', '80100', 'Johor Bahru', 'Johor', 'Malaysia', 1.4630568027496338, 103.73603820800781, 1, NULL, '', 2),
(30, 'KEK1234', '80', 'Jalan Tasek 50', '81750', 'Masai', 'Johor', 'Malaysia', 1.5035073, 103.8856097, 1, NULL, 'Monday,Wednesday', 2),
(31, 'KEK1234', '82', 'Jalan Tasek 51,  Bandar Seri Alam', '81750', 'Masai', 'Johor', 'Malaysia', 1.502739, 103.8840076, 5, NULL, 'Monday,Wednesday', 2),
(32, 'KEK1234', '80', 'Jalan Tasek 51', '81750', 'Masai', 'Johor', 'Malaysia', 1.5027287, 103.8839112, 1, 1, 'Tuesday', 1),
(33, 'KEK1111', '80', '80 Jalan Tasek 50', '81750', 'Masai', 'Johor', 'Malaysia', 1.5035073, 103.8856097, 1, 1, 'Tuesday', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tb_status`
--

CREATE TABLE `tb_status` (
  `s_id` int(1) NOT NULL,
  `s_name` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_status`
--

INSERT INTO `tb_status` (`s_id`, `s_name`) VALUES
(1, 'Exist'),
(2, 'Deleted');

-- --------------------------------------------------------

--
-- Table structure for table `tb_truck`
--

CREATE TABLE `tb_truck` (
  `t_id` int(11) NOT NULL,
  `t_plate` varchar(10) NOT NULL,
  `t_capacity` varchar(10) NOT NULL,
  `driver_id` int(11) DEFAULT NULL,
  `t_status` int(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_truck`
--

INSERT INTO `tb_truck` (`t_id`, `t_plate`, `t_capacity`, `driver_id`, `t_status`) VALUES
(1, 'BYD2023', '200', 2, 1),
(2, 'LJC4896', '200', 8, 1),
(3, 'JMM123', '10', 8, 2),
(4, 'JHE39', '10', 2, 2),
(5, 'QQQ11', '13', 8, 2),
(7, 'JHE399', '10', 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tb_user`
--

CREATE TABLE `tb_user` (
  `u_id` int(5) NOT NULL,
  `u_fname` varchar(30) NOT NULL,
  `u_lname` varchar(30) NOT NULL,
  `u_contact` varchar(15) NOT NULL,
  `u_url` varchar(255) NOT NULL DEFAULT 'DefaultProfileImage.png',
  `u_name` varchar(25) NOT NULL,
  `u_password` varchar(20) NOT NULL,
  `u_street` varchar(30) NOT NULL,
  `u_postcode` int(10) NOT NULL,
  `u_city` varchar(30) NOT NULL,
  `u_state` varchar(30) NOT NULL,
  `u_country` varchar(30) NOT NULL,
  `role_id` int(5) NOT NULL,
  `u_status` int(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_user`
--

INSERT INTO `tb_user` (`u_id`, `u_fname`, `u_lname`, `u_contact`, `u_url`, `u_name`, `u_password`, `u_street`, `u_postcode`, `u_city`, `u_state`, `u_country`, `role_id`, `u_status`) VALUES
(1, 'Admin', 'Admin', '0111234567', 'DefaultProfileImage.png', 'Admin1', 'Admin123', '80 Jalan Dedaru 1', 88000, 'Johor Bahru', 'Johor', 'Malaysia', 1, 1),
(2, 'Driver', 'Driver', '0121234567', 'DefaultProfileImage.png', 'Driver1', 'Driver123', '90 Jalan Lambang 2', 88000, 'Johor Bahru', 'Johor', 'Malaysia', 2, 1),
(5, 'Collector', 'Collector', '0191277777', 'DefaultProfileImage.png', 'Collector', 'Collector123', '1,Jalan Boom', 88112, 'Kukup', 'Johor', 'Malaysia', 3, 1),
(6, 'Admin2', 'Admin', '', '1749523105085-Screenshot 2025-06-05 143740.png', 'Admin2', 'Admin456', '12, Jalan Lalor 2', 80200, 'Taman Pelangi', 'Johor', 'Malaysia', 1, 1),
(8, 'Driver2', 'Driver', '0123456789', 'DefaultProfileImage.png', 'Driver2', 'Driver456', '23, Jalan Seeen Der 2', 77166, 'Johor Bahru', 'Johor', 'Malaysia', 2, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_customer`
--
ALTER TABLE `tb_customer`
  ADD PRIMARY KEY (`c_id`),
  ADD KEY `c_status` (`c_status`);

--
-- Indexes for table `tb_image`
--
ALTER TABLE `tb_image`
  ADD PRIMARY KEY (`i_id`),
  ADD KEY `sb_id` (`sb_id`);

--
-- Indexes for table `tb_report`
--
ALTER TABLE `tb_report`
  ADD PRIMARY KEY (`r_id`),
  ADD KEY `r_status` (`r_status`),
  ADD KEY `u_id` (`u_id`);

--
-- Indexes for table `tb_role`
--
ALTER TABLE `tb_role`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `tb_smartbin`
--
ALTER TABLE `tb_smartbin`
  ADD PRIMARY KEY (`sb_id`),
  ADD KEY `fk_c_id` (`c_id`),
  ADD KEY `fk_t_id` (`t_id`),
  ADD KEY `sb_status` (`sb_status`);

--
-- Indexes for table `tb_status`
--
ALTER TABLE `tb_status`
  ADD PRIMARY KEY (`s_id`);

--
-- Indexes for table `tb_truck`
--
ALTER TABLE `tb_truck`
  ADD PRIMARY KEY (`t_id`),
  ADD UNIQUE KEY `t_plate` (`t_plate`),
  ADD KEY `fk_truck_driver` (`driver_id`),
  ADD KEY `t_status` (`t_status`);

--
-- Indexes for table `tb_user`
--
ALTER TABLE `tb_user`
  ADD PRIMARY KEY (`u_id`),
  ADD UNIQUE KEY `u_name` (`u_name`),
  ADD UNIQUE KEY `u_name_2` (`u_name`),
  ADD KEY `fk_user_role` (`role_id`),
  ADD KEY `u_status` (`u_status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_customer`
--
ALTER TABLE `tb_customer`
  MODIFY `c_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tb_image`
--
ALTER TABLE `tb_image`
  MODIFY `i_id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tb_report`
--
ALTER TABLE `tb_report`
  MODIFY `r_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tb_smartbin`
--
ALTER TABLE `tb_smartbin`
  MODIFY `sb_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `tb_status`
--
ALTER TABLE `tb_status`
  MODIFY `s_id` int(1) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tb_truck`
--
ALTER TABLE `tb_truck`
  MODIFY `t_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tb_user`
--
ALTER TABLE `tb_user`
  MODIFY `u_id` int(5) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tb_customer`
--
ALTER TABLE `tb_customer`
  ADD CONSTRAINT `tb_customer_ibfk_1` FOREIGN KEY (`c_status`) REFERENCES `tb_status` (`s_id`);

--
-- Constraints for table `tb_image`
--
ALTER TABLE `tb_image`
  ADD CONSTRAINT `tb_image_ibfk_1` FOREIGN KEY (`sb_id`) REFERENCES `tb_smartbin` (`sb_id`);

--
-- Constraints for table `tb_report`
--
ALTER TABLE `tb_report`
  ADD CONSTRAINT `tb_report_ibfk_1` FOREIGN KEY (`r_status`) REFERENCES `tb_status` (`s_id`),
  ADD CONSTRAINT `tb_report_ibfk_2` FOREIGN KEY (`u_id`) REFERENCES `tb_user` (`u_id`);

--
-- Constraints for table `tb_smartbin`
--
ALTER TABLE `tb_smartbin`
  ADD CONSTRAINT `fk_c_id` FOREIGN KEY (`c_id`) REFERENCES `tb_customer` (`c_id`),
  ADD CONSTRAINT `fk_t_id` FOREIGN KEY (`t_id`) REFERENCES `tb_truck` (`t_id`),
  ADD CONSTRAINT `tb_smartbin_ibfk_1` FOREIGN KEY (`sb_status`) REFERENCES `tb_status` (`s_id`);

--
-- Constraints for table `tb_truck`
--
ALTER TABLE `tb_truck`
  ADD CONSTRAINT `fk_truck_driver` FOREIGN KEY (`driver_id`) REFERENCES `tb_user` (`u_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tb_truck_ibfk_1` FOREIGN KEY (`t_status`) REFERENCES `tb_status` (`s_id`);

--
-- Constraints for table `tb_user`
--
ALTER TABLE `tb_user`
  ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `tb_role` (`role_id`),
  ADD CONSTRAINT `tb_user_ibfk_1` FOREIGN KEY (`u_status`) REFERENCES `tb_status` (`s_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
