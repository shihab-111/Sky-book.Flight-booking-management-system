<?php
// admin.php — MySQL Admin CRUD (Flights, Airlines, Airports, Aircraft) & Booking_Audit Trail
require_once __DIR__ . '/config/db.php';

require_admin();

$notice = '';
$error  = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = $_POST['action'] ?? '';

    try {
        if ($action === 'add_flight') {
            $originId = (int)$_POST['origin_id'];
            $destId   = (int)$_POST['dest_id'];
            if ($originId === $destId) {
                throw new RuntimeException('Origin and destination airports cannot be the same.');
            }
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("
              INSERT INTO Flight (flight_no, airline_id, aircraft_id, origin_id, dest_id, departure_time, arrival_time, base_price)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                strtoupper(trim($_POST['flight_no'])),
                (int)$_POST['airline_id'],
                (int)$_POST['aircraft_id'],
                $originId,
                $destId,
                str_replace('T', ' ', $_POST['departure_time']) . ':00',
                str_replace('T', ' ', $_POST['arrival_time']) . ':00',
                (float)$_POST['base_price'],
            ]);
            $newFlightId = (int)$pdo->lastInsertId();
            $gen = $pdo->prepare("CALL sp_generate_seats_for_flight(?)");
            $gen->execute([$newFlightId]);
            $gen->closeCursor();
            $pdo->commit();
            $notice = 'Flight added and cabin seats generated automatically.';
        } elseif ($action === 'delete_flight') {
            $pdo->prepare("DELETE FROM Flight WHERE flight_id = ?")->execute([(int)$_POST['flight_id']]);
            $notice = 'Flight deleted.';
        } elseif ($action === 'add_airline') {
            $pdo->prepare("INSERT INTO Airline (name, iata_code, country) VALUES (?, ?, ?)")
                ->execute([trim($_POST['name']), strtoupper(substr(trim($_POST['iata_code']), 0, 2)), trim($_POST['country'])]);
            $notice = 'Airline added.';
        } elseif ($action === 'add_airport') {
            $pdo->prepare("INSERT INTO Airport (name, iata_code, city, country) VALUES (?, ?, ?, ?)")
                ->execute([trim($_POST['name']), strtoupper(substr(trim($_POST['iata_code']), 0, 3)), trim($_POST['city']), trim($_POST['country'])]);
            $notice = 'Airport added.';
        } elseif ($action === 'add_aircraft') {
            $pdo->prepare("INSERT INTO Aircraft (model, total_seats, airline_id) VALUES (?, ?, ?)")
                ->execute([trim($_POST['model']), max(12, (int)$_POST['total_seats']), (int)$_POST['airline_id']]);
            $notice = 'Aircraft added.';
        }
    } catch (Throwable $ex) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $error = $ex instanceof RuntimeException
            ? $ex->getMessage()
            : 'Operation blocked by database constraint (duplicate code or record currently referenced by bookings).';
    }
}

$airlines = $pdo->query("SELECT * FROM Airline ORDER BY name ASC")->fetchAll();
$airports = $pdo->query("SELECT * FROM Airport ORDER BY city ASC")->fetchAll();
$aircraft = $pdo->query("
  SELECT ac.*, al.name AS airline_name
  FROM Aircraft ac
  JOIN Airline al ON ac.airline_id = al.airline_id
  ORDER BY ac.model ASC
")->fetchAll();

$flights = $pdo->query("
  SELECT f.flight_id, f.flight_no, al.name AS airline, o.iata_code AS orig, d.iata_code AS dest,
         f.departure_time, f.base_price
  FROM Flight f
  JOIN Airline al ON f.airline_id = al.airline_id
  JOIN Airport o  ON f.origin_id = o.airport_id
  JOIN Airport d  ON f.dest_id = d.airport_id
  ORDER BY f.departure_time DESC
")->fetchAll();

$audits = $pdo->query("
  SELECT audit_id, booking_id, old_status, new_status, changed_at
  FROM Booking_Audit
  ORDER BY changed_at DESC
  LIMIT 25
")->fetchAll();

$pageTitle  = 'Admin Console — SkyBook';
$activePage = 'admin';
include __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="container">
    <h1>Admin Console</h1>
    <p class="muted">Manage flights, airlines, airports, aircraft, and inspect automatic Booking_Audit trigger logs.</p>

    <?php if ($notice): ?>
      <div class="card" style="margin: 16px 0; border-color: #BBF7D0; background: #F0FDF4; color: #166534;">
        <?= e($notice) ?>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="alert-error"><?= e($error) ?></div>
    <?php endif; ?>

    <!-- Add Flight -->
    <div class="card" style="margin: 20px 0 28px;">
      <h2>Add New Flight</h2>
      <form method="POST" class="admin-grid">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="add_flight">

        <div class="field"><label>Flight No</label><input type="text" name="flight_no" required placeholder="BG 391"></div>
        <div class="field">
          <label>Airline</label>
          <select name="airline_id"><?php foreach ($airlines as $a): ?><option value="<?= (int)$a['airline_id'] ?>"><?= e($a['iata_code'] . ' — ' . $a['name']) ?></option><?php endforeach; ?></select>
        </div>
        <div class="field">
          <label>Aircraft</label>
          <select name="aircraft_id"><?php foreach ($aircraft as $ac): ?><option value="<?= (int)$ac['aircraft_id'] ?>"><?= e($ac['model']) ?></option><?php endforeach; ?></select>
        </div>
        <div class="field">
          <label>Origin</label>
          <select name="origin_id"><?php foreach ($airports as $ap): ?><option value="<?= (int)$ap['airport_id'] ?>"><?= e($ap['iata_code'] . ' — ' . $ap['city']) ?></option><?php endforeach; ?></select>
        </div>
        <div class="field">
          <label>Destination</label>
          <select name="dest_id"><?php foreach ($airports as $ap): ?><option value="<?= (int)$ap['airport_id'] ?>"><?= e($ap['iata_code'] . ' — ' . $ap['city']) ?></option><?php endforeach; ?></select>
        </div>
        <div class="field"><label>Departure</label><input type="datetime-local" name="departure_time" required></div>
        <div class="field"><label>Arrival</label><input type="datetime-local" name="arrival_time" required></div>
        <div class="field"><label>Base Price (Tk)</label><input type="number" name="base_price" required min="10" value="390"></div>
        <button type="submit" class="btn btn-primary" style="align-self:end;">Save Flight</button>
      </form>
    </div>

    <!-- Scheduled Flights Table -->
    <h2>Scheduled Flights</h2>
    <div class="table-wrap" style="margin-bottom: 28px;">
      <table class="data-table">
        <thead>
          <tr><th>Flight</th><th>Airline</th><th>Route</th><th>Departure</th><th class="text-right">Base Fare</th><th>Action</th></tr>
        </thead>
        <tbody>
          <?php foreach ($flights as $f): ?>
            <tr>
              <td class="mono"><?= e($f['flight_no']) ?></td>
              <td><?= e($f['airline']) ?></td>
              <td class="mono"><?= e($f['orig'] . ' → ' . $f['dest']) ?></td>
              <td class="mono"><?= e($f['departure_time']) ?></td>
              <td class="text-right mono">Tk <?= number_format((float)$f['base_price'], 0) ?></td>
              <td>
                <form method="POST">
                  <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                  <input type="hidden" name="action" value="delete_flight">
                  <input type="hidden" name="flight_id" value="<?= (int)$f['flight_id'] ?>">
                  <button type="submit" class="btn btn-danger">Delete</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <!-- Quick Add Airline / Airport / Aircraft -->
    <div class="admin-grid" style="margin-bottom: 28px;">
      <form method="POST" class="card form-stack">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="add_airline">
        <h3>Add Airline</h3>
        <div class="field"><label>Name</label><input type="text" name="name" required placeholder="Novoair"></div>
        <div class="field"><label>IATA (2 chars)</label><input type="text" name="iata_code" required maxlength="2" placeholder="VQ"></div>
        <div class="field"><label>Country</label><input type="text" name="country" required placeholder="Bangladesh"></div>
        <button type="submit" class="btn btn-outline">Add Airline</button>
      </form>

      <form method="POST" class="card form-stack">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="add_airport">
        <h3>Add Airport</h3>
        <div class="field"><label>Airport Name</label><input type="text" name="name" required placeholder="Osmani Intl"></div>
        <div class="field"><label>IATA (3 chars)</label><input type="text" name="iata_code" required maxlength="3" placeholder="ZYL"></div>
        <div class="field"><label>City</label><input type="text" name="city" required placeholder="Sylhet"></div>
        <div class="field"><label>Country</label><input type="text" name="country" required placeholder="Bangladesh"></div>
        <button type="submit" class="btn btn-outline">Add Airport</button>
      </form>

      <form method="POST" class="card form-stack">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="add_aircraft">
        <h3>Add Aircraft</h3>
        <div class="field"><label>Model</label><input type="text" name="model" required placeholder="Airbus A321neo"></div>
        <div class="field"><label>Total Seats</label><input type="number" name="total_seats" required min="12" value="46"></div>
        <div class="field">
          <label>Airline</label>
          <select name="airline_id"><?php foreach ($airlines as $a): ?><option value="<?= (int)$a['airline_id'] ?>"><?= e($a['name']) ?></option><?php endforeach; ?></select>
        </div>
        <button type="submit" class="btn btn-outline">Add Aircraft</button>
      </form>
    </div>

    <!-- Booking Audit Trail -->
    <h2>Booking Audit Trail (Automatic Trigger Log)</h2>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Audit ID</th><th>Booking</th><th>Old Status</th><th>New Status</th><th>Changed At</th></tr></thead>
        <tbody>
          <?php if (empty($audits)): ?>
            <tr><td colspan="5" class="muted">No audit events recorded yet. Book or cancel a flight to trigger entries.</td></tr>
          <?php else: ?>
            <?php foreach ($audits as $a): ?>
              <tr>
                <td class="mono">#<?= (int)$a['audit_id'] ?></td>
                <td class="mono">#<?= (int)$a['booking_id'] ?></td>
                <td class="mono"><?= e($a['old_status']) ?></td>
                <td class="mono"><?= e($a['new_status']) ?></td>
                <td class="mono"><?= e($a['changed_at']) ?></td>
              </tr>
            <?php endforeach; ?>
          <?php endif; ?>
        </tbody>
      </table>
    </div>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
