<?php
// my_bookings.php — MySQL Reservations & Automated Refund Stored Procedure
require_once __DIR__ . '/config/db.php';

$user = require_login();
$notice = '';
$error  = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['cancel_booking_id'])) {
    verify_csrf();
    $bid = (int)$_POST['cancel_booking_id'];

    // Verify ownership (unless admin) before calling cancellation procedure
    $ownStmt = $pdo->prepare("SELECT booking_id, user_id, status FROM Booking WHERE booking_id = ?");
    $ownStmt->execute([$bid]);
    $row = $ownStmt->fetch();

    if (!$row || ($user['role'] !== 'admin' && (int)$row['user_id'] !== (int)$user['user_id'])) {
        $error = 'You do not have permission to cancel this booking.';
    } elseif ($row['status'] !== 'CONFIRMED') {
        $error = 'Only confirmed bookings can be cancelled.';
    } else {
        $proc = $pdo->prepare("CALL sp_cancel_booking_with_refund(?)");
        $proc->execute([$bid]);
        $proc->closeCursor();
        header('Location: my_bookings.php?cancelled=' . $bid);
        exit;
    }
}

if (isset($_GET['booked'])) {
    $notice = 'Booking #' . (int)$_GET['booked'] . ' confirmed and seat locked in MySQL.';
} elseif (isset($_GET['cancelled'])) {
    $notice = 'Booking #' . (int)$_GET['cancelled'] . ' cancelled. Seat released, refund recorded, and audit log written.';
}

if ($user['role'] === 'admin') {
    $stmt = $pdo->query("
      SELECT b.booking_id, b.booking_date, b.status, b.total_amount,
             u.full_name AS customer_name,
             f.flight_no, f.departure_time, o.iata_code AS orig, d.iata_code AS dest,
             s.seat_no, s.class AS seat_class,
             p.method, p.payment_status, rp.refund_percent
      FROM Booking b
      JOIN User u    ON b.user_id = u.user_id
      JOIN Flight f  ON b.flight_id = f.flight_id
      JOIN Airport o ON f.origin_id = o.airport_id
      JOIN Airport d ON f.dest_id = d.airport_id
      LEFT JOIN Passenger ps     ON ps.booking_id = b.booking_id
      LEFT JOIN Seat s           ON ps.seat_id = s.seat_id
      LEFT JOIN Payment p        ON p.booking_id = b.booking_id
      LEFT JOIN Refund_Policy rp ON p.policy_id = rp.policy_id
      ORDER BY b.booking_date DESC
    ");
    $bookings = $stmt->fetchAll();
} else {
    $stmt = $pdo->prepare("
      SELECT b.booking_id, b.booking_date, b.status, b.total_amount,
             f.flight_no, f.departure_time, o.iata_code AS orig, d.iata_code AS dest,
             s.seat_no, s.class AS seat_class,
             p.method, p.payment_status, rp.refund_percent
      FROM Booking b
      JOIN Flight f  ON b.flight_id = f.flight_id
      JOIN Airport o ON f.origin_id = o.airport_id
      JOIN Airport d ON f.dest_id = d.airport_id
      LEFT JOIN Passenger ps     ON ps.booking_id = b.booking_id
      LEFT JOIN Seat s           ON ps.seat_id = s.seat_id
      LEFT JOIN Payment p        ON p.booking_id = b.booking_id
      LEFT JOIN Refund_Policy rp ON p.policy_id = rp.policy_id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC
    ");
    $stmt->execute([(int)$user['user_id']]);
    $bookings = $stmt->fetchAll();
}

$pageTitle  = 'My Bookings — SkyBook';
$activePage = 'bookings';
include __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="container">
    <div class="section-head">
      <h1><?= $user['role'] === 'admin' ? 'All Bookings' : 'My Bookings' ?></h1>
      <span class="muted mono"><?= count($bookings) ?> records</span>
    </div>

    <?php if ($notice): ?>
      <div class="card" style="margin-bottom: 16px; border-color: #BBF7D0; background: #F0FDF4; color: #166534;">
        <?= e($notice) ?>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="alert-error"><?= e($error) ?></div>
    <?php endif; ?>

    <?php if (empty($bookings)): ?>
      <div class="card empty-box">
        <p>You do not have any flight bookings yet.</p>
        <a href="index.php" class="btn btn-primary">Search Flights</a>
      </div>
    <?php else: ?>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Booking</th>
              <?php if ($user['role'] === 'admin'): ?><th>Customer</th><?php endif; ?>
              <th>Flight & Route</th>
              <th>Departure</th>
              <th>Seat</th>
              <th>Status</th>
              <th>Payment</th>
              <th class="text-right">Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($bookings as $b): ?>
              <tr>
                <td class="mono">#<?= (int)$b['booking_id'] ?></td>
                <?php if ($user['role'] === 'admin'): ?><td><?= e($b['customer_name']) ?></td><?php endif; ?>
                <td><strong class="mono"><?= e($b['flight_no']) ?></strong> · <?= e($b['orig']) ?> → <?= e($b['dest']) ?></td>
                <td class="mono"><?= date('Y-m-d H:i', strtotime($b['departure_time'])) ?></td>
                <td class="mono"><?= e(($b['seat_no'] ?? '—') . ($b['seat_class'] ? ' (' . $b['seat_class'] . ')' : '')) ?></td>
                <td><?= e($b['status']) ?></td>
                <td><?= e(($b['method'] ?? '—') . ' · ' . ($b['payment_status'] ?? '—')) ?></td>
                <td class="text-right mono">Tk <?= number_format((float)$b['total_amount'], 0) ?></td>
                <td>
                  <?php if ($b['status'] === 'CONFIRMED'): ?>
                    <form method="POST">
                      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                      <input type="hidden" name="cancel_booking_id" value="<?= (int)$b['booking_id'] ?>">
                      <button type="submit" class="btn btn-danger">Cancel</button>
                    </form>
                  <?php else: ?>
                    <span class="muted">
                      <?= $b['refund_percent'] !== null ? (int)$b['refund_percent'] . '% refunded' : 'Cancelled' ?>
                    </span>
                  <?php endif; ?>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
