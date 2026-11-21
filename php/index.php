<?php
// index.php — Home Banner & Live MySQL Flight Search (Prepared SQL Statements)
require_once __DIR__ . '/config/db.php';

$pageTitle  = 'SkyBook — Search Flights';
$activePage = 'flights';

$airports = $pdo->query("SELECT airport_id, iata_code, city FROM Airport ORDER BY city ASC")->fetchAll();

$originId = isset($_GET['origin_id']) && $_GET['origin_id'] !== '' ? (int)$_GET['origin_id'] : null;
$destId   = isset($_GET['dest_id']) && $_GET['dest_id'] !== '' ? (int)$_GET['dest_id'] : null;
$date     = trim($_GET['date'] ?? '');
$rawClass = trim($_GET['class'] ?? '');
$class    = in_array($rawClass, ['Economy', 'Business', 'First'], true) ? $rawClass : '';

$classMult = $class === 'First' ? 3.1 : ($class === 'Business' ? 1.85 : 1.0);

$sql = "
  SELECT f.flight_id, f.flight_no, f.departure_time, f.arrival_time, f.base_price,
         al.name AS airline_name, ac.model AS aircraft_model,
         o.iata_code AS origin_code, o.city AS origin_city,
         d.iata_code AS dest_code, d.city AS dest_city,
         SUM(CASE WHEN s.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS open_seats
  FROM Flight f
  JOIN Airline al  ON f.airline_id = al.airline_id
  JOIN Aircraft ac ON f.aircraft_id = ac.aircraft_id
  JOIN Airport o   ON f.origin_id = o.airport_id
  JOIN Airport d   ON f.dest_id = d.airport_id
  LEFT JOIN Seat s ON s.flight_id = f.flight_id
       " . ($class !== '' ? "AND s.class = :seat_class" : "") . "
  WHERE 1 = 1
";

$params = [];
if ($class !== '') {
    $params[':seat_class'] = $class;
}
if ($originId) {
    $sql .= " AND f.origin_id = :origin_id";
    $params[':origin_id'] = $originId;
}
if ($destId) {
    $sql .= " AND f.dest_id = :dest_id";
    $params[':dest_id'] = $destId;
}
if ($date !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $sql .= " AND DATE(f.departure_time) = :dep_date";
    $params[':dep_date'] = $date;
}

$sql .= " GROUP BY f.flight_id ORDER BY f.departure_time ASC";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$flights = $stmt->fetchAll();

include __DIR__ . '/includes/header.php';
?>

<!-- Hero Banner Photo Section -->
<section class="hero-banner">
  <img src="images/skybook_banner.jpg" alt="Commercial passenger aircraft flying above clouds at sunrise" class="hero-bg">
  <div class="hero-scrim"></div>
  <div class="container hero-content">
    <h1>Simple flight booking with live seat availability.</h1>
    <p>Search routes, select your cabin seat, and confirm your ticket in minutes.</p>
  </div>
</section>

<!-- From / To / Date / Class Search Section positioned cleanly below the banner -->
<div class="container search-wrapper">
  <form method="GET" action="index.php" class="search-box">
    <div class="field">
      <label for="origin_id">From</label>
      <select name="origin_id" id="origin_id">
        <option value="">All Origins</option>
        <?php foreach ($airports as $ap): ?>
          <option value="<?= (int)$ap['airport_id'] ?>" <?= $originId === (int)$ap['airport_id'] ? 'selected' : '' ?>>
            <?= e($ap['iata_code']) ?> — <?= e($ap['city']) ?>
          </option>
        <?php endforeach; ?>
      </select>
    </div>

    <div class="field">
      <label for="dest_id">To</label>
      <select name="dest_id" id="dest_id">
        <option value="">All Destinations</option>
        <?php foreach ($airports as $ap): ?>
          <option value="<?= (int)$ap['airport_id'] ?>" <?= $destId === (int)$ap['airport_id'] ? 'selected' : '' ?>>
            <?= e($ap['iata_code']) ?> — <?= e($ap['city']) ?>
          </option>
        <?php endforeach; ?>
      </select>
    </div>

    <div class="field">
      <label for="date">Date</label>
      <input type="date" name="date" id="date" value="<?= e($date) ?>">
    </div>

    <div class="field">
      <label for="class">Class</label>
      <select name="class" id="class">
        <option value="">All Classes</option>
        <option value="Economy"  <?= $class === 'Economy'  ? 'selected' : '' ?>>Economy</option>
        <option value="Business" <?= $class === 'Business' ? 'selected' : '' ?>>Business</option>
        <option value="First"    <?= $class === 'First'    ? 'selected' : '' ?>>First</option>
      </select>
    </div>

    <button type="submit" class="btn btn-primary search-btn">Search</button>
  </form>
</div>

<!-- Available Flights List -->
<section class="section">
  <div class="container">
    <div class="section-head">
      <h2>Available Flights</h2>
      <span class="muted mono"><?= count($flights) ?> flights</span>
    </div>

    <?php if (empty($flights)): ?>
      <div class="card empty-box">
        <p>No flights match your search filters.</p>
        <a href="index.php" class="btn btn-outline">Reset Search</a>
      </div>
    <?php else: ?>
      <div class="flight-list">
        <?php foreach ($flights as $f): ?>
          <article class="card flight-row">
            <div>
              <strong class="mono"><?= e($f['flight_no']) ?></strong> · <?= e($f['airline_name']) ?>
              <div class="muted"><?= e($f['aircraft_model']) ?> · <?= date('M d, Y', strtotime($f['departure_time'])) ?></div>
            </div>

            <div class="route-times">
              <div>
                <div class="time mono"><?= date('H:i', strtotime($f['departure_time'])) ?></div>
                <div class="muted"><?= e($f['origin_code']) ?> · <?= e($f['origin_city']) ?></div>
              </div>
              <div class="route-line"></div>
              <div class="text-right">
                <div class="time mono"><?= date('H:i', strtotime($f['arrival_time'])) ?></div>
                <div class="muted"><?= e($f['dest_code']) ?> · <?= e($f['dest_city']) ?></div>
              </div>
            </div>

            <div class="flight-action">
              <div class="text-right">
                <div class="price mono">Tk <?= number_format(round((float)$f['base_price'] * $classMult), 0) ?></div>
                <div class="muted"><?= (int)$f['open_seats'] ?> seats open</div>
              </div>
              <?php if ((int)$f['open_seats'] > 0): ?>
                <a href="seat_select.php?flight_id=<?= (int)$f['flight_id'] ?>" class="btn btn-primary">
                  Select Seat
                </a>
              <?php else: ?>
                <span class="muted">Sold Out</span>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
