<?php
// login.php — MySQL Role-Based Authentication (PDO + password_verify)
require_once __DIR__ . '/config/db.php';

if (current_user()) {
    header('Location: index.php');
    exit;
}

$error = '';
$notice = isset($_GET['registered']) ? 'Account created! Sign in with your email and password.' : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $email = strtolower(trim($_POST['email'] ?? ''));
    $pass  = $_POST['password'] ?? '';

    $stmt = $pdo->prepare("SELECT user_id, full_name, email, password_hash, role FROM User WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'user_id'   => (int)$user['user_id'],
            'full_name' => $user['full_name'],
            'email'     => $user['email'],
            'role'      => $user['role'],
        ];
        header('Location: ' . ($user['role'] === 'admin' ? 'admin.php' : 'index.php'));
        exit;
    }
    $error = 'Invalid email or password.';
}

$pageTitle  = 'Sign In — SkyBook';
$activePage = '';
include __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="auth-card card">
    <h1>Sign in to SkyBook</h1>
    <p class="muted">Access your flight reservations or admin console.</p>

    <?php if ($notice): ?>
      <div class="card" style="margin: 14px 0; border-color: #BBF7D0; background: #F0FDF4; color: #166534;">
        <?= e($notice) ?>
      </div>
    <?php endif; ?>

    <?php if ($error): ?>
      <div class="alert-error"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST" class="form-stack">
      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
      <div class="field">
        <label for="email">Email</label>
        <input type="email" name="email" id="email" required placeholder="you@skybook.com">
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input type="password" name="password" id="password" required>
      </div>
      <button type="submit" class="btn btn-primary">Sign In</button>
    </form>

    <p class="muted" style="margin-top: 16px;">
      New to SkyBook? <a href="register.php">Create an account</a>
    </p>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
