<?php
// includes/header.php — Shared Responsive Navigation Bar
$activePage  = $activePage ?? 'flights';
$currentUser = current_user();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($pageTitle ?? 'SkyBook — Flight Booking') ?></title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="container nav-bar">
      <a href="index.php" class="brand">SkyBook</a>

      <nav class="nav-links">
        <a href="index.php" class="<?= $activePage === 'flights' ? 'active' : '' ?>">Flights</a>
        <a href="my_bookings.php" class="<?= $activePage === 'bookings' ? 'active' : '' ?>">My Bookings</a>
        <?php if ($currentUser && $currentUser['role'] === 'admin'): ?>
          <a href="admin.php" class="<?= $activePage === 'admin' ? 'active' : '' ?>">Admin</a>
        <?php endif; ?>
      </nav>

      <div>
        <?php if ($currentUser): ?>
          <form method="POST" action="logout.php" style="display:inline;">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <button type="submit" class="btn btn-outline">
              <?= e($currentUser['full_name']) ?> · Sign Out
            </button>
          </form>
        <?php else: ?>
          <a href="login.php" class="btn btn-primary">Sign In</a>
        <?php endif; ?>
      </div>
    </div>
  </header>
  <main>
