-- ============================================================================
-- SkyBook: Flight Ticket Booking System (MySQL / phpMyAdmin on XAMPP)
-- Normalized 3NF Schema (11 Tables) + Trigger + Stored Procedures + Seed Data
-- ============================================================================

CREATE DATABASE IF NOT EXISTS skybook_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE skybook_db;

-- Drop in dependency order so re-importing is clean
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Booking_Audit;
DROP TABLE IF EXISTS Payment;
DROP TABLE IF EXISTS Refund_Policy;
DROP TABLE IF EXISTS Passenger;
DROP TABLE IF EXISTS Booking;
DROP TABLE IF EXISTS Seat;
DROP TABLE IF EXISTS Flight;
DROP TABLE IF EXISTS Aircraft;
DROP TABLE IF EXISTS Airport;
DROP TABLE IF EXISTS Airline;
DROP TABLE IF EXISTS User;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. User
CREATE TABLE User (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer'
) ENGINE=InnoDB;

-- 2. Airline
CREATE TABLE Airline (
  airline_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  iata_code CHAR(2) NOT NULL UNIQUE,
  country VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

-- 3. Airport
CREATE TABLE Airport (
  airport_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  iata_code CHAR(3) NOT NULL UNIQUE,
  city VARCHAR(80) NOT NULL,
  country VARCHAR(80) NOT NULL
) ENGINE=InnoDB;

-- 4. Aircraft
CREATE TABLE Aircraft (
  aircraft_id INT AUTO_INCREMENT PRIMARY KEY,
  model VARCHAR(100) NOT NULL,
  total_seats INT NOT NULL,
  airline_id INT NOT NULL,
  CONSTRAINT fk_aircraft_airline FOREIGN KEY (airline_id) REFERENCES Airline(airline_id)
) ENGINE=InnoDB;

-- 5. Flight
CREATE TABLE Flight (
  flight_id INT AUTO_INCREMENT PRIMARY KEY,
  flight_no VARCHAR(16) NOT NULL,
  airline_id INT NOT NULL,
  aircraft_id INT NOT NULL,
  origin_id INT NOT NULL,
  dest_id INT NOT NULL,
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_flight_airline  FOREIGN KEY (airline_id)  REFERENCES Airline(airline_id),
  CONSTRAINT fk_flight_aircraft FOREIGN KEY (aircraft_id) REFERENCES Aircraft(aircraft_id),
  CONSTRAINT fk_flight_origin   FOREIGN KEY (origin_id)   REFERENCES Airport(airport_id),
  CONSTRAINT fk_flight_dest     FOREIGN KEY (dest_id)     REFERENCES Airport(airport_id),
  CONSTRAINT chk_flight_route   CHECK (origin_id <> dest_id)
) ENGINE=InnoDB;

-- 6. Seat
CREATE TABLE Seat (
  seat_id INT AUTO_INCREMENT PRIMARY KEY,
  seat_no VARCHAR(6) NOT NULL,
  class ENUM('First', 'Business', 'Economy') NOT NULL,
  status ENUM('AVAILABLE', 'BOOKED') NOT NULL DEFAULT 'AVAILABLE',
  flight_id INT NOT NULL,
  UNIQUE KEY uq_flight_seat (flight_id, seat_no),
  CONSTRAINT fk_seat_flight FOREIGN KEY (flight_id) REFERENCES Flight(flight_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Booking
CREATE TABLE Booking (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  total_amount DECIMAL(10,2) NOT NULL,
  user_id INT NOT NULL,
  flight_id INT NOT NULL,
  CONSTRAINT fk_booking_user   FOREIGN KEY (user_id)   REFERENCES User(user_id),
  CONSTRAINT fk_booking_flight FOREIGN KEY (flight_id) REFERENCES Flight(flight_id)
) ENGINE=InnoDB;

-- 8. Passenger
CREATE TABLE Passenger (
  passenger_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  passport_no VARCHAR(40) NOT NULL,
  date_of_birth DATE NOT NULL,
  booking_id INT NOT NULL,
  seat_id INT NOT NULL,
  CONSTRAINT fk_passenger_booking FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_passenger_seat    FOREIGN KEY (seat_id)    REFERENCES Seat(seat_id)
) ENGINE=InnoDB;

-- 9. Refund_Policy
CREATE TABLE Refund_Policy (
  policy_id INT AUTO_INCREMENT PRIMARY KEY,
  min_hours_before INT NOT NULL,
  refund_percent DECIMAL(5,2) NOT NULL
) ENGINE=InnoDB;

-- 10. Payment
CREATE TABLE Payment (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(40) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('PENDING', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  booking_id INT NOT NULL UNIQUE,
  policy_id INT NULL,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_policy  FOREIGN KEY (policy_id)  REFERENCES Refund_Policy(policy_id)
) ENGINE=InnoDB;

-- 11. Booking_Audit
CREATE TABLE Booking_Audit (
  audit_id INT AUTO_INCREMENT PRIMARY KEY,
  old_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  booking_id INT NOT NULL,
  CONSTRAINT fk_audit_booking FOREIGN KEY (booking_id) REFERENCES Booking(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- Triggers & Stored Procedures
-- ============================================================================
DROP TRIGGER IF EXISTS trg_booking_status_audit;
DROP PROCEDURE IF EXISTS sp_cancel_booking_with_refund;
DROP PROCEDURE IF EXISTS sp_generate_seats_for_flight;

DELIMITER //

-- Trigger: Automatically log every booking status change
CREATE TRIGGER trg_booking_status_audit
AFTER UPDATE ON Booking
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO Booking_Audit (old_status, new_status, changed_at, booking_id)
    VALUES (OLD.status, NEW.status, NOW(), NEW.booking_id);
  END IF;
END //

-- Stored Procedure: Generate cabin seats (First, Business, Economy) for a flight
CREATE PROCEDURE sp_generate_seats_for_flight(IN p_flight_id INT)
BEGIN
  DECLARE r INT DEFAULT 1;
  -- Rows 1-2: First Class (A, C, D, F)
  WHILE r <= 2 DO
    INSERT IGNORE INTO Seat (seat_no, class, status, flight_id) VALUES
      (CONCAT(r, 'A'), 'First', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'C'), 'First', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'D'), 'First', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'F'), 'First', 'AVAILABLE', p_flight_id);
    SET r = r + 1;
  END WHILE;

  -- Rows 3-4: Business Class (A, C, D, F)
  SET r = 3;
  WHILE r <= 4 DO
    INSERT IGNORE INTO Seat (seat_no, class, status, flight_id) VALUES
      (CONCAT(r, 'A'), 'Business', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'C'), 'Business', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'D'), 'Business', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'F'), 'Business', 'AVAILABLE', p_flight_id);
    SET r = r + 1;
  END WHILE;

  -- Rows 5-9: Economy Class (A, B, C, D, E, F)
  SET r = 5;
  WHILE r <= 9 DO
    INSERT IGNORE INTO Seat (seat_no, class, status, flight_id) VALUES
      (CONCAT(r, 'A'), 'Economy', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'B'), 'Economy', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'C'), 'Economy', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'D'), 'Economy', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'E'), 'Economy', 'AVAILABLE', p_flight_id),
      (CONCAT(r, 'F'), 'Economy', 'AVAILABLE', p_flight_id);
    SET r = r + 1;
  END WHILE;
END //

-- Stored Procedure: Cancel booking, apply refund policy, release seats
CREATE PROCEDURE sp_cancel_booking_with_refund(IN p_booking_id INT)
BEGIN
  DECLARE v_hours INT DEFAULT 0;
  DECLARE v_policy_id INT DEFAULT NULL;

  START TRANSACTION;
    SELECT GREATEST(TIMESTAMPDIFF(HOUR, NOW(), f.departure_time), 0)
      INTO v_hours
    FROM Booking b
    JOIN Flight f ON b.flight_id = f.flight_id
    WHERE b.booking_id = p_booking_id
    FOR UPDATE;

    SELECT policy_id
      INTO v_policy_id
    FROM Refund_Policy
    WHERE min_hours_before <= v_hours
    ORDER BY min_hours_before DESC
    LIMIT 1;

    UPDATE Booking
       SET status = 'CANCELLED'
     WHERE booking_id = p_booking_id
       AND status = 'CONFIRMED';

    UPDATE Payment
       SET payment_status = 'REFUNDED',
           policy_id = v_policy_id
     WHERE booking_id = p_booking_id;

    UPDATE Seat s
      JOIN Passenger p ON s.seat_id = p.seat_id
       SET s.status = 'AVAILABLE'
     WHERE p.booking_id = p_booking_id;
  COMMIT;
END //

DELIMITER ;

-- ============================================================================
-- Seed Data (Airlines, Airports, Aircraft, Refund Policies, Flights & Seats)
-- Note: Register your own Customer & Admin accounts on register.php
-- ============================================================================
INSERT INTO Airline (name, iata_code, country) VALUES
  ('Biman Bangladesh Airlines', 'BG', 'Bangladesh'),
  ('US-Bangla Airlines', 'BS', 'Bangladesh'),
  ('Emirates', 'EK', 'United Arab Emirates'),
  ('Singapore Airlines', 'SQ', 'Singapore'),
  ('Qatar Airways', 'QR', 'Qatar');

INSERT INTO Airport (name, iata_code, city, country) VALUES
  ('Hazrat Shahjalal International Airport', 'DAC', 'Dhaka', 'Bangladesh'),
  ('Shah Amanat International Airport', 'CGP', 'Chittagong', 'Bangladesh'),
  ('Cox''s Bazar Airport', 'CXB', 'Cox''s Bazar', 'Bangladesh'),
  ('Dubai International Airport', 'DXB', 'Dubai', 'United Arab Emirates'),
  ('Singapore Changi Airport', 'SIN', 'Singapore', 'Singapore'),
  ('Hamad International Airport', 'DOH', 'Doha', 'Qatar'),
  ('London Heathrow Airport', 'LHR', 'London', 'United Kingdom');

INSERT INTO Aircraft (model, total_seats, airline_id) VALUES
  ('Boeing 787-9 Dreamliner', 46, 1),
  ('Boeing 737-800', 46, 2),
  ('Boeing 777-300ER', 46, 3),
  ('Airbus A350-900', 46, 4),
  ('Airbus A350-1000', 46, 5);

INSERT INTO Refund_Policy (min_hours_before, refund_percent) VALUES
  (72, 90.00),
  (24, 60.00),
  (6,  25.00),
  (0,   0.00);

INSERT INTO Flight (flight_no, airline_id, aircraft_id, origin_id, dest_id, departure_time, arrival_time, base_price) VALUES
  ('BG 347', 1, 1, 1, 4, '2026-12-10 08:30:00', '2026-12-10 13:15:00', 420.00),
  ('EK 583', 3, 3, 1, 4, '2026-12-10 19:40:00', '2026-12-11 00:10:00', 510.00),
  ('SQ 447', 4, 4, 1, 5, '2026-12-11 23:55:00', '2026-12-12 06:05:00', 460.00),
  ('BS 141', 2, 2, 1, 3, '2026-12-10 09:15:00', '2026-12-10 10:20:00',  78.00),
  ('QR 639', 5, 5, 1, 6, '2026-12-12 04:15:00', '2026-12-12 09:30:00', 485.00),
  ('BG 201', 1, 1, 1, 7, '2026-12-13 11:00:00', '2026-12-13 21:40:00', 790.00);

CALL sp_generate_seats_for_flight(1);
CALL sp_generate_seats_for_flight(2);
CALL sp_generate_seats_for_flight(3);
CALL sp_generate_seats_for_flight(4);
CALL sp_generate_seats_for_flight(5);
CALL sp_generate_seats_for_flight(6);
