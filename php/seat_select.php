<?php
// seat_select.php — MySQL Seat Selection & Transactional Booking (FOR UPDATE Row Lock)
require_once __DIR__ . '/config/db.php';

$flightId = (int)($_GET['flight_id'] ?? 0);
$stmt = $pdo->prepare("
  SELECT f.*, al.name AS airline_name, ac.model AS aircraft_model,
         o.iata_code AS orig, o.city AS orig_city,
         d.iata_code AS dest, d.city AS dest_city
  FROM Flight f
  JOIN Airline al  ON f.airline_id = al.airline_id
  JOIN Aircraft ac ON f.aircraft_id = ac.aircraft_id
  JOIN Airport o   ON f.origin_id = o.airport_id
  JOIN Airport d   ON f.dest_id = d.airport_id
  WHERE f.flight_id = ?
");
$stmt->execute([$flightId]);
$flight = $stmt->fetch();

if (!$flight) {
    header('Location: index.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $user = require_login();

    $seatId   = (int)($_POST['seat_id'] ?? 0);
    $fullName = trim($_POST['full_name'] ?? '');
    $passport = strtoupper(trim($_POST['passport_no'] ?? ''));
    $dob      = trim($_POST['date_of_birth'] ?? '');
    $method   = trim($_POST['payment_method'] ?? 'Card');

    $allowedMethods = ['Card', 'bKash', 'Nagad', 'Bank Transfer'];
    if (!in_array($method, $allowedMethods, true)) {
        $method = 'Card';
    }

    if ($seatId <= 0 || $fullName === '' || $passport === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob)) {
        $error = 'Please choose an open seat and fill all passenger details.';
    } else {
        try {
            $pdo->beginTransaction();

            // Row-level lock prevents two users from double-booking the same seat
            $lock = $pdo->prepare("
              SELECT seat_id, seat_no, class, status
              FROM Seat
              WHERE seat_id = ? AND flight_id = ?
              FOR UPDATE
            ");
            $lock->execute([$seatId, $flightId]);
            $seat = $lock->fetch();

            if (!$seat || $seat['status'] !== 'AVAILABLE') {
                throw new RuntimeException('This seat was already booked. Please choose another open seat.');
            }

            $mult   = $seat['class'] === 'First' ? 3.1 : ($seat['class'] === 'Business' ? 1.85 : 1.0);
            $amount = round((float)$flight['base_price'] * $mult, 2);

            // Insert PENDING booking first, then confirm so trg_booking_status_audit logs PENDING -> CONFIRMED
            $insBooking = $pdo->prepare("
              INSERT INTO Booking (booking_date, status, total_amount, user_id, flight_id)
              VALUES (NOW(), 'PENDING', ?, ?, ?)
            ");
            $insBooking->execute([$amount, (int)$user['user_id'], $flightId]);
            $bookingId = (int)$pdo->lastInsertId();

            $pdo->prepare("UPDATE Seat SET status = 'BOOKED' WHERE seat_id = ?")->execute([$seatId]);

            $pdo->prepare("
              INSERT INTO Passenger (full_name, passport_no, date_of_birth, booking_id, seat_id)
              VALUES (?, ?, ?, ?, ?)
            ")->execute([$fullName, $passport, $dob, $bookingId, $seatId]);

            $pdo->prepare("
              INSERT INTO Payment (method, amount, payment_status, paid_at, booking_id, policy_id)
              VALUES (?, ?, 'PAID', NOW(), ?, NULL)
            ")->execute([$method, $amount, $bookingId]);

            $pdo->prepare("UPDATE Booking SET status = 'CONFIRMED' WHERE booking_id = ?")->execute([$bookingId]);

            $pdo->commit();
            header("Location: my_bookings.php?booked={$bookingId}");
            exit;
        } catch (Throwable $ex) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = $ex instanceof RuntimeException ? $ex->getMessage() : 'Could not complete booking. Please try again.';
        }
    }
}

$seatsStmt = $pdo->prepare("
  SELECT seat_id, seat_no, class, status
  FROM Seat
  WHERE flight_id = ?
  ORDER BY seat_id ASC
");
$seatsStmt->execute([$flightId]);
$seats = $seatsStmt->fetchAll();

$policies = $pdo->query("SELECT min_hours_before, refund_percent FROM Refund_Policy ORDER BY min_hours_before DESC")->fetchAll();

$pageTitle  = 'Select Seat — ' . $flight['flight_no'];
$activePage = 'flights';
include __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="container">
    <h1><?= e($flight['flight_no']) ?> · <?= e($flight['orig']) ?> → <?= e($flight['dest']) ?></h1>
    <p class="muted">
      <?= e($flight['airline_name']) ?> · <?= e($flight['aircraft_model']) ?> ·
      Departure <?= date('M d, Y H:i', strtotime($flight['departure_time'])) ?>
    </p>

    <?php if ($error): ?>
      <div class="alert-error"><?= e($error) ?></div>
    <?php endif; ?>

    <?php if (!current_user()): ?>
      <div class="card" style="margin: 16px 0; border-color: #FDE68A; background: #FFFBEB; color: #92400E;">
        Please <a href="login.php" style="font-weight: 700; color: #92400E;">sign in</a> or
        <a href="register.php" style="font-weight: 700; color: #92400E;">create an account</a> before confirming your booking.
      </div>
    <?php endif; ?>

    <form method="POST" class="split-grid">
      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">

      <div class="card">
        <h2>1. Choose an Open Seat</h2>
        <p class="muted">
          Economy: Tk <?= number_format((float)$flight['base_price'], 0) ?> ·
          Business: Tk <?= number_format(round((float)$flight['base_price'] * 1.85), 0) ?> ·
          First: Tk <?= number_format(round((float)$flight['base_price'] * 3.1), 0) ?>
        </p>

        <div class="seat-grid">
          <?php foreach ($seats as $s): ?>
            <?php $isBooked = $s['status'] === 'BOOKED'; ?>
            <label class="seat-tile <?= $isBooked ? 'is-booked' : '' ?>" title="<?= e($s['seat_no'] . ' · ' . $s['class']) ?>">
              <input
                type="radio"
                name="seat_id"
                value="<?= (int)$s['seat_id'] ?>"
                <?= $isBooked ? 'disabled' : 'required' ?>
              >
              <span><?= $isBooked ? '×' : e($s['seat_no']) ?></span>
            </label>
          <?php endforeach; ?>
        </div>
      </div>

      <div class="card form-stack">
        <h2>2. Passenger & Payment</h2>
        <div class="field">
          <label for="full_name">Passenger Full Name</label>
          <input type="text" name="full_name" id="full_name" required value="<?= e(current_user()['full_name'] ?? '') ?>">
        </div>
        <div class="field">
          <label for="passport_no">Passport Number</label>
          <input type="text" name="passport_no" id="passport_no" required placeholder="A04921842">
        </div>
        <div class="field">
          <label for="date_of_birth">Date of Birth</label>
          <input type="date" name="date_of_birth" id="date_of_birth" required>
        </div>
        <div class="field">
          <label for="payment_method">Payment Method</label>
          <select name="payment_method" id="payment_method">
            <option value="Card">Credit / Debit Card</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <button type="submit" class="btn btn-primary">Confirm Booking & Pay</button>

        <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;">
          <p class="muted" style="margin:0 0 6px;font-weight:600;">Cancellation Refund Policy</p>
          <?php foreach ($policies as $rp): ?>
            <div class="muted mono" style="font-size:0.78rem;">
              <?= (int)$rp['min_hours_before'] ?>+ hrs before departure → <?= (int)$rp['refund_percent'] ?>% refund
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </form>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
