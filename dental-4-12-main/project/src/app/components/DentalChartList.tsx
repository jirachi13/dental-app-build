import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { X } from 'lucide-react';
import { formatStudentName } from '../utils/formatStudentName';
import { GradeTableCell } from './GradeTableCell';
import { ListSearchInput } from './ListSearchInput';
import { studentListTableStyles } from './StudentListTableStyles';

// Mock patient data with all fields
const mockPatients = [
  { id: '1', name: 'Juan Morales', birthdate: '2020-07-23', gender: 'Male', grade: 'Grade 1', section: 'Sampaguita' },
  { id: '2', name: 'Isabella Villanueva', birthdate: '2020-08-07', gender: 'Female', grade: 'Grade 1', section: 'Sampaguita' },
  { id: '3', name: 'Aldrin Villanueva', birthdate: '2020-11-22', gender: 'Male', grade: 'Grade 1', section: 'Sampaguita' },
  { id: '4', name: 'Elena Morales', birthdate: '2020-10-10', gender: 'Female', grade: 'Grade 1', section: 'Sampaguita' },
  { id: '5', name: 'Trisha Santos', birthdate: '2020-01-27', gender: 'Female', grade: 'Grade 1', section: 'Sampaguita' },
  { id: '6', name: 'Katrina Lopez', birthdate: '2020-12-23', gender: 'Female', grade: 'Grade 1', section: 'Rosal' },
  { id: '7', name: 'Ana Morales', birthdate: '2020-11-11', gender: 'Female', grade: 'Grade 1', section: 'Rosal' },
  { id: '8', name: 'Patricia Garcia', birthdate: '2020-01-03', gender: 'Female', grade: 'Grade 1', section: 'Rosal' },
  { id: '9', name: 'Trisha Lopez', birthdate: '2020-02-13', gender: 'Female', grade: 'Grade 1', section: 'Rosal' },
  { id: '10', name: 'Nico Castillo', birthdate: '2020-02-17', gender: 'Male', grade: 'Grade 1', section: 'Rosal' },
  { id: '11', name: 'Marco Navarro', birthdate: '2019-07-07', gender: 'Male', grade: 'Grade 2', section: 'Rose' },
  { id: '12', name: 'Ivan Villanueva', birthdate: '2019-06-24', gender: 'Male', grade: 'Grade 2', section: 'Rose' },
  { id: '13', name: 'Jomar Diaz', birthdate: '2019-08-24', gender: 'Male', grade: 'Grade 2', section: 'Rose' },
  { id: '14', name: 'Patricia Castillo', birthdate: '2019-12-25', gender: 'Female', grade: 'Grade 2', section: 'Rose' },
  { id: '15', name: 'Patricia Magno', birthdate: '2019-07-26', gender: 'Female', grade: 'Grade 2', section: 'Rose' },
  { id: '16', name: 'Bea Castillo', birthdate: '2019-01-25', gender: 'Female', grade: 'Grade 2', section: 'Dahlia' },
  { id: '17', name: 'Alyssa Martinez', birthdate: '2019-02-07', gender: 'Female', grade: 'Grade 2', section: 'Dahlia' },
  { id: '18', name: 'Angel Bautista', birthdate: '2019-04-24', gender: 'Female', grade: 'Grade 2', section: 'Dahlia' },
  { id: '19', name: 'Celine Morales', birthdate: '2019-08-12', gender: 'Female', grade: 'Grade 2', section: 'Dahlia' },
  { id: '20', name: 'Ivan Bautista', birthdate: '2019-01-08', gender: 'Male', grade: 'Grade 2', section: 'Dahlia' },
  { id: '21', name: 'Rosa Reyes', birthdate: '2018-09-27', gender: 'Female', grade: 'Grade 3', section: 'Jasmine' },
  { id: '22', name: 'Ivan Dela Cruz', birthdate: '2018-01-11', gender: 'Male', grade: 'Grade 3', section: 'Jasmine' },
  { id: '23', name: 'Arnel Torres', birthdate: '2018-03-13', gender: 'Male', grade: 'Grade 3', section: 'Jasmine' },
  { id: '24', name: 'Renz Magno', birthdate: '2018-07-12', gender: 'Male', grade: 'Grade 3', section: 'Jasmine' },
  { id: '25', name: 'Danica Martinez', birthdate: '2018-04-10', gender: 'Female', grade: 'Grade 3', section: 'Jasmine' },
  { id: '26', name: 'Jose Diaz', birthdate: '2018-04-12', gender: 'Male', grade: 'Grade 3', section: 'Orchid' },
  { id: '27', name: 'Ronnie Gomez', birthdate: '2018-12-14', gender: 'Male', grade: 'Grade 3', section: 'Orchid' },
  { id: '28', name: 'Danica Flores', birthdate: '2018-10-06', gender: 'Female', grade: 'Grade 3', section: 'Orchid' },
  { id: '29', name: 'Sofia Bautista', birthdate: '2018-02-17', gender: 'Female', grade: 'Grade 3', section: 'Orchid' },
  { id: '30', name: 'Trisha Flores', birthdate: '2018-09-25', gender: 'Female', grade: 'Grade 3', section: 'Orchid' },
  { id: '31', name: 'Trisha Mendoza', birthdate: '2017-12-04', gender: 'Female', grade: 'Grade 4', section: 'Tulip' },
  { id: '32', name: 'Pedro Bautista', birthdate: '2017-01-13', gender: 'Male', grade: 'Grade 4', section: 'Tulip' },
  { id: '33', name: 'Danica Magno', birthdate: '2017-09-11', gender: 'Female', grade: 'Grade 4', section: 'Tulip' },
  { id: '34', name: 'Patricia Santos', birthdate: '2017-11-08', gender: 'Female', grade: 'Grade 4', section: 'Tulip' },
  { id: '35', name: 'Marco Magno', birthdate: '2017-05-07', gender: 'Male', grade: 'Grade 4', section: 'Tulip' },
  { id: '36', name: 'Alyssa Flores', birthdate: '2017-10-20', gender: 'Female', grade: 'Grade 4', section: 'Lily' },
  { id: '37', name: 'Roberto Navarro', birthdate: '2017-12-25', gender: 'Male', grade: 'Grade 4', section: 'Lily' },
  { id: '38', name: 'Nico Castillo', birthdate: '2017-02-10', gender: 'Male', grade: 'Grade 4', section: 'Lily' },
  { id: '39', name: 'Isabella Santos', birthdate: '2017-12-24', gender: 'Female', grade: 'Grade 4', section: 'Lily' },
  { id: '40', name: 'Juan Martinez', birthdate: '2017-02-07', gender: 'Male', grade: 'Grade 4', section: 'Lily' },
  { id: '41', name: 'Jose Cruz', birthdate: '2016-06-02', gender: 'Male', grade: 'Grade 5', section: 'Sunflower' },
  { id: '42', name: 'Arnel Reyes', birthdate: '2016-09-15', gender: 'Male', grade: 'Grade 5', section: 'Sunflower' },
  { id: '43', name: 'Nico Dela Cruz', birthdate: '2016-10-15', gender: 'Male', grade: 'Grade 5', section: 'Sunflower' },
  { id: '44', name: 'Jasmine Lopez', birthdate: '2016-08-05', gender: 'Female', grade: 'Grade 5', section: 'Sunflower' },
  { id: '45', name: 'Katrina Navarro', birthdate: '2016-06-16', gender: 'Female', grade: 'Grade 5', section: 'Sunflower' },
  { id: '46', name: 'Aldrin Morales', birthdate: '2016-02-07', gender: 'Male', grade: 'Grade 5', section: 'Daisy' },
  { id: '47', name: 'Celine Flores', birthdate: '2016-02-26', gender: 'Female', grade: 'Grade 5', section: 'Daisy' },
  { id: '48', name: 'Mia Aquino', birthdate: '2016-05-15', gender: 'Female', grade: 'Grade 5', section: 'Daisy' },
  { id: '49', name: 'Carmen Bautista', birthdate: '2016-02-03', gender: 'Female', grade: 'Grade 5', section: 'Daisy' },
  { id: '50', name: 'Carlo Mendoza', birthdate: '2016-08-25', gender: 'Male', grade: 'Grade 5', section: 'Daisy' },
  { id: '51', name: 'Isabella Villanueva', birthdate: '2015-02-17', gender: 'Female', grade: 'Grade 6', section: 'Carnation' },
  { id: '52', name: 'Nicole Lopez', birthdate: '2015-05-08', gender: 'Female', grade: 'Grade 6', section: 'Carnation' },
  { id: '53', name: 'Trisha Dela Cruz', birthdate: '2015-08-15', gender: 'Female', grade: 'Grade 6', section: 'Carnation' },
  { id: '54', name: 'Valentina Castillo', birthdate: '2015-05-11', gender: 'Female', grade: 'Grade 6', section: 'Carnation' },
  { id: '55', name: 'Alyssa Navarro', birthdate: '2015-10-21', gender: 'Female', grade: 'Grade 6', section: 'Carnation' },
  { id: '56', name: 'Nico Magno', birthdate: '2015-07-07', gender: 'Male', grade: 'Grade 6', section: 'Ilang-Ilang' },
  { id: '57', name: 'Nico Garcia', birthdate: '2015-11-27', gender: 'Male', grade: 'Grade 6', section: 'Ilang-Ilang' },
  { id: '58', name: 'Carlos Ramos', birthdate: '2015-03-03', gender: 'Male', grade: 'Grade 6', section: 'Ilang-Ilang' },
  { id: '59', name: 'Jose Aquino', birthdate: '2015-11-18', gender: 'Male', grade: 'Grade 6', section: 'Ilang-Ilang' },
  { id: '60', name: 'Sofia Cruz', birthdate: '2015-07-27', gender: 'Female', grade: 'Grade 6', section: 'Ilang-Ilang' },
  { id: '61', name: 'Marco Navarro', birthdate: '2020-05-20', gender: 'Male', grade: 'Grade 1', section: 'Ruby' },
  { id: '62', name: 'Alyssa Ramos', birthdate: '2020-07-24', gender: 'Female', grade: 'Grade 1', section: 'Ruby' },
  { id: '63', name: 'Patricia Santos', birthdate: '2020-01-01', gender: 'Female', grade: 'Grade 1', section: 'Ruby' },
  { id: '64', name: 'Jasmine Lopez', birthdate: '2020-08-25', gender: 'Female', grade: 'Grade 1', section: 'Ruby' },
  { id: '65', name: 'Jose Diaz', birthdate: '2020-12-13', gender: 'Male', grade: 'Grade 1', section: 'Ruby' },
  { id: '66', name: 'Nicole Torres', birthdate: '2020-01-01', gender: 'Female', grade: 'Grade 1', section: 'Sapphire' },
  { id: '67', name: 'Jomar Dela Cruz', birthdate: '2020-05-01', gender: 'Male', grade: 'Grade 1', section: 'Sapphire' },
  { id: '68', name: 'Angel Aquino', birthdate: '2020-12-21', gender: 'Female', grade: 'Grade 1', section: 'Sapphire' },
  { id: '69', name: 'Aldrin Bautista', birthdate: '2020-05-02', gender: 'Male', grade: 'Grade 1', section: 'Sapphire' },
  { id: '70', name: 'Arnel Morales', birthdate: '2020-08-10', gender: 'Male', grade: 'Grade 1', section: 'Sapphire' },
  { id: '71', name: 'Aldrin Torres', birthdate: '2019-01-12', gender: 'Male', grade: 'Grade 2', section: 'Emerald' },
  { id: '72', name: 'Ronnie Torres', birthdate: '2019-06-03', gender: 'Male', grade: 'Grade 2', section: 'Emerald' },
  { id: '73', name: 'Patricia Torres', birthdate: '2019-08-04', gender: 'Female', grade: 'Grade 2', section: 'Emerald' },
  { id: '74', name: 'Katrina Bautista', birthdate: '2019-03-13', gender: 'Female', grade: 'Grade 2', section: 'Emerald' },
  { id: '75', name: 'Carlo Gomez', birthdate: '2019-09-06', gender: 'Male', grade: 'Grade 2', section: 'Emerald' },
  { id: '76', name: 'Celine Mendoza', birthdate: '2019-11-25', gender: 'Female', grade: 'Grade 2', section: 'Diamond' },
  { id: '77', name: 'Angel Martinez', birthdate: '2019-07-25', gender: 'Female', grade: 'Grade 2', section: 'Diamond' },
  { id: '78', name: 'Bea Navarro', birthdate: '2019-09-16', gender: 'Female', grade: 'Grade 2', section: 'Diamond' },
  { id: '79', name: 'Valentina Morales', birthdate: '2019-04-16', gender: 'Female', grade: 'Grade 2', section: 'Diamond' },
  { id: '80', name: 'Sofia Martinez', birthdate: '2019-04-22', gender: 'Female', grade: 'Grade 2', section: 'Diamond' },
  { id: '81', name: 'Jolo Gomez', birthdate: '2018-11-06', gender: 'Male', grade: 'Grade 3', section: 'Topaz' },
  { id: '82', name: 'Carmen Lopez', birthdate: '2018-11-22', gender: 'Female', grade: 'Grade 3', section: 'Topaz' },
  { id: '83', name: 'Maria Dela Cruz', birthdate: '2018-10-08', gender: 'Female', grade: 'Grade 3', section: 'Topaz' },
  { id: '84', name: 'Diego Lopez', birthdate: '2018-11-20', gender: 'Male', grade: 'Grade 3', section: 'Topaz' },
  { id: '85', name: 'Mia Bautista', birthdate: '2018-01-19', gender: 'Female', grade: 'Grade 3', section: 'Topaz' },
  { id: '86', name: 'Angel Santos', birthdate: '2018-06-14', gender: 'Female', grade: 'Grade 3', section: 'Garnet' },
  { id: '87', name: 'Ronnie Diaz', birthdate: '2018-05-21', gender: 'Male', grade: 'Grade 3', section: 'Garnet' },
  { id: '88', name: 'Bea Lopez', birthdate: '2018-01-06', gender: 'Female', grade: 'Grade 3', section: 'Garnet' },
  { id: '89', name: 'Carlos Morales', birthdate: '2018-02-09', gender: 'Male', grade: 'Grade 3', section: 'Garnet' },
  { id: '90', name: 'Elena Gomez', birthdate: '2018-02-01', gender: 'Female', grade: 'Grade 3', section: 'Garnet' },
  { id: '91', name: 'Liam Garcia', birthdate: '2017-09-01', gender: 'Male', grade: 'Grade 4', section: 'Opal' },
  { id: '92', name: 'Elena Santos', birthdate: '2017-03-20', gender: 'Female', grade: 'Grade 4', section: 'Opal' },
  { id: '93', name: 'Renz Mendoza', birthdate: '2017-01-09', gender: 'Male', grade: 'Grade 4', section: 'Opal' },
  { id: '94', name: 'Arnel Torres', birthdate: '2017-03-23', gender: 'Male', grade: 'Grade 4', section: 'Opal' },
  { id: '95', name: 'Juan Gomez', birthdate: '2017-01-15', gender: 'Male', grade: 'Grade 4', section: 'Opal' },
  { id: '96', name: 'Jomar Garcia', birthdate: '2017-02-05', gender: 'Male', grade: 'Grade 4', section: 'Pearl' },
  { id: '97', name: 'Ana Lopez', birthdate: '2017-06-07', gender: 'Female', grade: 'Grade 4', section: 'Pearl' },
  { id: '98', name: 'Roberto Dela Cruz', birthdate: '2017-02-01', gender: 'Male', grade: 'Grade 4', section: 'Pearl' },
  { id: '99', name: 'Carlo Torres', birthdate: '2017-12-25', gender: 'Male', grade: 'Grade 4', section: 'Pearl' },
  { id: '100', name: 'Carlos Aquino', birthdate: '2017-03-15', gender: 'Male', grade: 'Grade 4', section: 'Pearl' },
  { id: '101', name: 'Nico Torres', birthdate: '2016-07-03', gender: 'Male', grade: 'Grade 5', section: 'Jade' },
  { id: '102', name: 'Pedro Cruz', birthdate: '2016-08-05', gender: 'Male', grade: 'Grade 5', section: 'Jade' },
  { id: '103', name: 'Jolo Garcia', birthdate: '2016-11-26', gender: 'Male', grade: 'Grade 5', section: 'Jade' },
  { id: '104', name: 'Juan Lopez', birthdate: '2016-05-03', gender: 'Male', grade: 'Grade 5', section: 'Jade' },
  { id: '105', name: 'Jose Villanueva', birthdate: '2016-04-27', gender: 'Male', grade: 'Grade 5', section: 'Jade' },
  { id: '106', name: 'Diego Dela Cruz', birthdate: '2016-09-04', gender: 'Male', grade: 'Grade 5', section: 'Amber' },
  { id: '107', name: 'Danica Lopez', birthdate: '2016-02-21', gender: 'Female', grade: 'Grade 5', section: 'Amber' },
  { id: '108', name: 'Mia Navarro', birthdate: '2016-12-19', gender: 'Female', grade: 'Grade 5', section: 'Amber' },
  { id: '109', name: 'Renz Martinez', birthdate: '2016-07-18', gender: 'Male', grade: 'Grade 5', section: 'Amber' },
  { id: '110', name: 'Liam Ramos', birthdate: '2016-09-27', gender: 'Male', grade: 'Grade 5', section: 'Amber' },
  { id: '111', name: 'Juan Bautista', birthdate: '2015-04-26', gender: 'Male', grade: 'Grade 6', section: 'Coral' },
  { id: '112', name: 'Marco Flores', birthdate: '2015-10-04', gender: 'Male', grade: 'Grade 6', section: 'Coral' },
  { id: '113', name: 'Isabella Ramos', birthdate: '2015-01-23', gender: 'Female', grade: 'Grade 6', section: 'Coral' },
  { id: '114', name: 'Rafael Villanueva', birthdate: '2015-06-01', gender: 'Male', grade: 'Grade 6', section: 'Coral' },
  { id: '115', name: 'Ana Reyes', birthdate: '2015-05-11', gender: 'Female', grade: 'Grade 6', section: 'Coral' },
  { id: '116', name: 'Juan Santos', birthdate: '2015-04-08', gender: 'Male', grade: 'Grade 6', section: 'Onyx' },
  { id: '117', name: 'Jolo Santos', birthdate: '2015-02-05', gender: 'Male', grade: 'Grade 6', section: 'Onyx' },
  { id: '118', name: 'Jose Diaz', birthdate: '2015-10-28', gender: 'Male', grade: 'Grade 6', section: 'Onyx' },
  { id: '119', name: 'Lucia Garcia', birthdate: '2015-06-11', gender: 'Female', grade: 'Grade 6', section: 'Onyx' },
  { id: '120', name: 'Angelo Diaz', birthdate: '2015-11-27', gender: 'Male', grade: 'Grade 6', section: 'Onyx' },
  { id: '121', name: 'Rosa Villanueva', birthdate: '2020-04-23', gender: 'Female', grade: 'Grade 1', section: 'Narra' },
  { id: '122', name: 'Renz Gomez', birthdate: '2020-01-17', gender: 'Male', grade: 'Grade 1', section: 'Narra' },
  { id: '123', name: 'Pedro Morales', birthdate: '2020-05-11', gender: 'Male', grade: 'Grade 1', section: 'Narra' },
  { id: '124', name: 'Katrina Morales', birthdate: '2020-06-06', gender: 'Female', grade: 'Grade 1', section: 'Narra' },
  { id: '125', name: 'Celine Navarro', birthdate: '2020-07-07', gender: 'Female', grade: 'Grade 1', section: 'Narra' },
  { id: '126', name: 'Ana Garcia', birthdate: '2020-06-17', gender: 'Female', grade: 'Grade 1', section: 'Molave' },
  { id: '127', name: 'Aldrin Villanueva', birthdate: '2020-09-03', gender: 'Male', grade: 'Grade 1', section: 'Molave' },
  { id: '128', name: 'Alyssa Bautista', birthdate: '2020-05-25', gender: 'Female', grade: 'Grade 1', section: 'Molave' },
  { id: '129', name: 'Ronnie Gomez', birthdate: '2020-11-19', gender: 'Male', grade: 'Grade 1', section: 'Molave' },
  { id: '130', name: 'Celine Bautista', birthdate: '2020-04-14', gender: 'Female', grade: 'Grade 1', section: 'Molave' },
  { id: '131', name: 'Sofia Villanueva', birthdate: '2019-12-21', gender: 'Female', grade: 'Grade 2', section: 'Acacia' },
  { id: '132', name: 'Rafael Reyes', birthdate: '2019-07-26', gender: 'Male', grade: 'Grade 2', section: 'Acacia' },
  { id: '133', name: 'Bea Santos', birthdate: '2019-05-22', gender: 'Female', grade: 'Grade 2', section: 'Acacia' },
  { id: '134', name: 'Celine Flores', birthdate: '2019-04-15', gender: 'Female', grade: 'Grade 2', section: 'Acacia' },
  { id: '135', name: 'Renz Martinez', birthdate: '2019-12-09', gender: 'Male', grade: 'Grade 2', section: 'Acacia' },
  { id: '136', name: 'Rosa Martinez', birthdate: '2019-01-05', gender: 'Female', grade: 'Grade 2', section: 'Mahogany' },
  { id: '137', name: 'Pedro Gomez', birthdate: '2019-12-03', gender: 'Male', grade: 'Grade 2', section: 'Mahogany' },
  { id: '138', name: 'Angelo Bautista', birthdate: '2019-08-17', gender: 'Male', grade: 'Grade 2', section: 'Mahogany' },
  { id: '139', name: 'Mia Flores', birthdate: '2019-11-07', gender: 'Female', grade: 'Grade 2', section: 'Mahogany' },
  { id: '140', name: 'Valentina Flores', birthdate: '2019-07-21', gender: 'Female', grade: 'Grade 2', section: 'Mahogany' },
  { id: '141', name: 'Rafael Flores', birthdate: '2018-08-25', gender: 'Male', grade: 'Grade 3', section: 'Bamboo' },
  { id: '142', name: 'Celine Ramos', birthdate: '2018-05-15', gender: 'Female', grade: 'Grade 3', section: 'Bamboo' },
  { id: '143', name: 'Juan Villanueva', birthdate: '2018-01-03', gender: 'Male', grade: 'Grade 3', section: 'Bamboo' },
  { id: '144', name: 'Angelo Diaz', birthdate: '2018-03-13', gender: 'Male', grade: 'Grade 3', section: 'Bamboo' },
  { id: '145', name: 'Jolo Morales', birthdate: '2018-02-04', gender: 'Male', grade: 'Grade 3', section: 'Bamboo' },
  { id: '146', name: 'Arnel Morales', birthdate: '2018-12-12', gender: 'Male', grade: 'Grade 3', section: 'Ipil' },
  { id: '147', name: 'Elena Reyes', birthdate: '2018-07-10', gender: 'Female', grade: 'Grade 3', section: 'Ipil' },
  { id: '148', name: 'Jomar Reyes', birthdate: '2018-07-12', gender: 'Male', grade: 'Grade 3', section: 'Ipil' },
  { id: '149', name: 'Celine Gomez', birthdate: '2018-02-27', gender: 'Female', grade: 'Grade 3', section: 'Ipil' },
  { id: '150', name: 'Ana Diaz', birthdate: '2018-05-13', gender: 'Female', grade: 'Grade 3', section: 'Ipil' },
  { id: '151', name: 'Valentina Reyes', birthdate: '2017-07-24', gender: 'Female', grade: 'Grade 4', section: 'Kamagong' },
  { id: '152', name: 'Pedro Lopez', birthdate: '2017-09-02', gender: 'Male', grade: 'Grade 4', section: 'Kamagong' },
  { id: '153', name: 'Jose Navarro', birthdate: '2017-06-12', gender: 'Male', grade: 'Grade 4', section: 'Kamagong' },
  { id: '154', name: 'Arnel Morales', birthdate: '2017-01-04', gender: 'Male', grade: 'Grade 4', section: 'Kamagong' },
  { id: '155', name: 'Elena Lopez', birthdate: '2017-08-04', gender: 'Female', grade: 'Grade 4', section: 'Kamagong' },
  { id: '156', name: 'Nicole Cruz', birthdate: '2017-06-17', gender: 'Female', grade: 'Grade 4', section: 'Tindalo' },
  { id: '157', name: 'Marco Reyes', birthdate: '2017-02-05', gender: 'Male', grade: 'Grade 4', section: 'Tindalo' },
  { id: '158', name: 'Juan Martinez', birthdate: '2017-07-26', gender: 'Male', grade: 'Grade 4', section: 'Tindalo' },
  { id: '159', name: 'Jasmine Bautista', birthdate: '2017-12-19', gender: 'Female', grade: 'Grade 4', section: 'Tindalo' },
  { id: '160', name: 'Roberto Garcia', birthdate: '2017-10-24', gender: 'Male', grade: 'Grade 4', section: 'Tindalo' },
  { id: '161', name: 'Arnel Villanueva', birthdate: '2016-02-17', gender: 'Male', grade: 'Grade 5', section: 'Yakal' },
  { id: '162', name: 'Ivan Gomez', birthdate: '2016-07-25', gender: 'Male', grade: 'Grade 5', section: 'Yakal' },
  { id: '163', name: 'Roberto Reyes', birthdate: '2016-04-01', gender: 'Male', grade: 'Grade 5', section: 'Yakal' },
  { id: '164', name: 'Diego Mendoza', birthdate: '2016-11-09', gender: 'Male', grade: 'Grade 5', section: 'Yakal' },
  { id: '165', name: 'Diego Navarro', birthdate: '2016-03-14', gender: 'Male', grade: 'Grade 5', section: 'Yakal' },
  { id: '166', name: 'Marco Dela Cruz', birthdate: '2016-08-05', gender: 'Male', grade: 'Grade 5', section: 'Lauan' },
  { id: '167', name: 'Alyssa Cruz', birthdate: '2016-04-09', gender: 'Female', grade: 'Grade 5', section: 'Lauan' },
  { id: '168', name: 'Angel Flores', birthdate: '2016-04-01', gender: 'Female', grade: 'Grade 5', section: 'Lauan' },
  { id: '169', name: 'Jose Garcia', birthdate: '2016-04-06', gender: 'Male', grade: 'Grade 5', section: 'Lauan' },
  { id: '170', name: 'Isabella Navarro', birthdate: '2016-03-21', gender: 'Female', grade: 'Grade 5', section: 'Lauan' },
  { id: '171', name: 'Nicole Dela Cruz', birthdate: '2015-03-23', gender: 'Female', grade: 'Grade 6', section: 'Apitong' },
  { id: '172', name: 'Mia Morales', birthdate: '2015-02-07', gender: 'Female', grade: 'Grade 6', section: 'Apitong' },
  { id: '173', name: 'Lucia Reyes', birthdate: '2015-03-25', gender: 'Female', grade: 'Grade 6', section: 'Apitong' },
  { id: '174', name: 'Trisha Martinez', birthdate: '2015-12-23', gender: 'Female', grade: 'Grade 6', section: 'Apitong' },
  { id: '175', name: 'Carlos Flores', birthdate: '2015-10-02', gender: 'Male', grade: 'Grade 6', section: 'Apitong' },
  { id: '176', name: 'Carmen Lopez', birthdate: '2015-09-07', gender: 'Female', grade: 'Grade 6', section: 'Guijo' },
  { id: '177', name: 'Arnel Mendoza', birthdate: '2015-12-01', gender: 'Male', grade: 'Grade 6', section: 'Guijo' },
  { id: '178', name: 'Ronnie Martinez', birthdate: '2015-02-06', gender: 'Male', grade: 'Grade 6', section: 'Guijo' },
  { id: '179', name: 'Danica Mendoza', birthdate: '2015-09-03', gender: 'Female', grade: 'Grade 6', section: 'Guijo' },
  { id: '180', name: 'Maria Reyes', birthdate: '2015-11-17', gender: 'Female', grade: 'Grade 6', section: 'Guijo' },
  { id: '181', name: 'Luis Santos', birthdate: '2020-06-14', gender: 'Male', grade: 'Kinder', section: 'Ilang-ilang' },
  { id: '182', name: 'Sofia Dela Cruz', birthdate: '2020-08-22', gender: 'Female', grade: 'Kinder', section: 'Ilang-ilang' },
  { id: '183', name: 'Nico Bautista', birthdate: '2020-03-05', gender: 'Male', grade: 'Kinder', section: 'Kamia' },
  { id: '184', name: 'Mia Reyes', birthdate: '2020-11-30', gender: 'Female', grade: 'Kinder', section: 'Kamia' },
  { id: '185', name: 'Liam Cruz', birthdate: '2020-09-17', gender: 'Male', grade: 'Kinder', section: 'Kamia' },
  { id: '186', name: 'Jasmine Villanueva', birthdate: '2020-07-08', gender: 'Female', grade: 'Kinder', section: 'Cadena de Amor' },
  { id: '187', name: 'Aaron Garcia', birthdate: '2020-10-14', gender: 'Male', grade: 'Kinder', section: 'Cadena de Amor' },
  { id: '188', name: 'Ella Navarro', birthdate: '2020-04-19', gender: 'Female', grade: 'Kinder', section: 'Santan' },
  { id: '189', name: 'Ben Torres', birthdate: '2020-12-02', gender: 'Male', grade: 'Kinder', section: 'Santan' },
  { id: '190', name: 'Lea Gomez', birthdate: '2020-05-25', gender: 'Female', grade: 'Kinder', section: 'Santan' },
  { id: '191', name: 'Marc Flores', birthdate: '2020-08-11', gender: 'Male', grade: 'Kinder', section: 'Banaba' },
  { id: '192', name: 'Tina Lopez', birthdate: '2020-01-27', gender: 'Female', grade: 'Kinder', section: 'Banaba' },
  { id: '193', name: 'Kevin Mendoza', birthdate: '2020-06-30', gender: 'Male', grade: 'Kinder', section: 'Banaba' },
  { id: '194', name: 'Grace Castillo', birthdate: '2020-03-21', gender: 'Female', grade: 'Kinder', section: 'Alagaw' },
  { id: '195', name: 'Dan Magno', birthdate: '2020-10-08', gender: 'Male', grade: 'Kinder', section: 'Alagaw' },
  { id: '196', name: 'Renzo Dela Cruz', birthdate: '2013-07-15', gender: 'Male', grade: 'Grade 7', section: 'Makabayan' },
  { id: '197', name: 'Carla Santos', birthdate: '2013-04-02', gender: 'Female', grade: 'Grade 7', section: 'Makabayan' },
  { id: '198', name: 'Rodel Cruz', birthdate: '2013-09-18', gender: 'Male', grade: 'Grade 7', section: 'Makabayan' },
  { id: '199', name: 'Ailyn Morales', birthdate: '2013-11-06', gender: 'Female', grade: 'Grade 7', section: 'Masagana' },
  { id: '200', name: 'Enzo Navarro', birthdate: '2013-03-24', gender: 'Male', grade: 'Grade 7', section: 'Masagana' },
  { id: '201', name: 'Bea Villanueva', birthdate: '2013-08-30', gender: 'Female', grade: 'Grade 8', section: 'Narra' },
  { id: '202', name: 'Karl Garcia', birthdate: '2012-06-12', gender: 'Male', grade: 'Grade 8', section: 'Narra' },
  { id: '203', name: 'Nina Bautista', birthdate: '2012-01-19', gender: 'Female', grade: 'Grade 8', section: 'Narra' },
  { id: '204', name: 'Gelo Reyes', birthdate: '2012-10-04', gender: 'Male', grade: 'Grade 8', section: 'Yakal' },
  { id: '205', name: 'Trish Lopez', birthdate: '2012-07-23', gender: 'Female', grade: 'Grade 8', section: 'Yakal' },
  { id: '206', name: 'Jonah Martinez', birthdate: '2011-09-09', gender: 'Male', grade: 'Grade 9', section: 'Acacia' },
  { id: '207', name: 'Cris Torres', birthdate: '2011-05-14', gender: 'Male', grade: 'Grade 9', section: 'Acacia' },
  { id: '208', name: 'Abby Diaz', birthdate: '2011-12-28', gender: 'Female', grade: 'Grade 9', section: 'Molave' },
  { id: '209', name: 'Mark Gomez', birthdate: '2011-03-07', gender: 'Male', grade: 'Grade 9', section: 'Molave' },
  { id: '210', name: 'Zoe Castillo', birthdate: '2011-07-16', gender: 'Female', grade: 'Grade 9', section: 'Molave' },
  { id: '211', name: 'Paolo Flores', birthdate: '2010-08-20', gender: 'Male', grade: 'Grade 10', section: 'Bangkal' },
  { id: '212', name: 'Ivy Mendoza', birthdate: '2010-04-11', gender: 'Female', grade: 'Grade 10', section: 'Bangkal' },
  { id: '213', name: 'Roy Dela Cruz', birthdate: '2010-11-03', gender: 'Male', grade: 'Grade 10', section: 'Talisay' },
  { id: '214', name: 'Mae Santos', birthdate: '2010-06-27', gender: 'Female', grade: 'Grade 10', section: 'Talisay' },
  { id: '215', name: 'Jan Cruz', birthdate: '2010-02-15', gender: 'Male', grade: 'Grade 10', section: 'Talisay' },
];

const GRADES = ['Kinder','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

const calculateAge = (birthdate: string) => {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const getAgeGroup = (age: number) => {
  if (age <= 4) return '4 & below';
  if (age <= 9) return '5-9';
  if (age <= 14) return '10-14';
  if (age <= 19) return '15-19';
  return '20 & above';
};

export const DentalChartList = () => {
  const navigate = useNavigate();
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const allSections = useMemo(() => {
    let base = gradeFilter !== 'all' ? mockPatients.filter(p => p.grade === gradeFilter) : mockPatients;
    return [...new Set(base.map(p => p.section))].sort();
  }, [gradeFilter]);

  const filtered = useMemo(() => mockPatients.filter(p => {
    const age = calculateAge(p.birthdate);
    const ag = getAgeGroup(age);
    if (gradeFilter !== 'all' && p.grade !== gradeFilter) return false;
    if (sectionFilter !== 'all' && p.section !== sectionFilter) return false;
    if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
    if (ageGroupFilter !== 'all' && ag !== ageGroupFilter) return false;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      const formattedName = formatStudentName(p.name).toLowerCase();
      if (!formattedName.includes(query) && !p.grade.toLowerCase().includes(query) && !p.section.toLowerCase().includes(query)) return false;
    }
    return true;
  }), [gradeFilter, sectionFilter, genderFilter, ageGroupFilter, searchTerm]);

  const hasActiveFilters = gradeFilter !== 'all' || sectionFilter !== 'all' || genderFilter !== 'all' || ageGroupFilter !== 'all' || searchTerm !== '';
  const clearFilters = () => { setGradeFilter('all'); setSectionFilter('all'); setGenderFilter('all'); setAgeGroupFilter('all'); setSearchTerm(''); };

  const FilterSelect = ({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="all">{label}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dental Charts</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <ListSearchInput value={searchTerm} onChange={setSearchTerm} />
          <FilterSelect value={gradeFilter} onChange={v => { setGradeFilter(v); setSectionFilter('all'); }} label="All Grades"
            options={GRADES.map(g => ({ value: g, label: g }))} />
          <FilterSelect value={sectionFilter} onChange={setSectionFilter} label="All Sections"
            options={allSections.map(s => ({ value: s, label: s }))} />
          <FilterSelect value={genderFilter} onChange={setGenderFilter} label="All Genders"
            options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]} />
          <FilterSelect value={ageGroupFilter} onChange={setAgeGroupFilter} label="All Age Groups"
            options={[{ value: '4 & below', label: '4 & below' }, { value: '5-9', label: '5-9' }, { value: '10-14', label: '10-14' }, { value: '15-19', label: '15-19' }, { value: '20 & above', label: '20 & above' }]} />
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={studentListTableStyles.wrapper}>
        <div className={studentListTableStyles.scroller}>
          <table className={studentListTableStyles.table}>
            <thead className={studentListTableStyles.head}>
              <tr>
                <th className={studentListTableStyles.headerCell}>Student</th>
                <th className={studentListTableStyles.headerCell}>Grade</th>
                <th className={studentListTableStyles.headerCell}>Section</th>
                <th className={studentListTableStyles.headerCell}>Gender</th>
                <th className={studentListTableStyles.headerCell}>Age</th>
              </tr>
            </thead>
            <tbody className={studentListTableStyles.body}>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className={studentListTableStyles.emptyCell}>No dental charts match the selected filters.</td></tr>
              ) : filtered.map(patient => {
                const age = calculateAge(patient.birthdate);
                return (
                  <tr key={patient.id} onClick={() => navigate(`/dental-chart/${patient.id}`)} className={studentListTableStyles.row}>
                    <td className={studentListTableStyles.primaryCell}>{formatStudentName(patient.name)}</td>
                    <GradeTableCell grade={patient.grade} />
                    <td className={studentListTableStyles.secondaryCell}>{patient.section}</td>
                    <td className={studentListTableStyles.secondaryCell}>{patient.gender}</td>
                    <td className={studentListTableStyles.secondaryCell}>{age}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className={studentListTableStyles.footer}>
            Showing {filtered.length} of {mockPatients.length} records
          </div>
        )}
      </div>
    </div>
  );
};
