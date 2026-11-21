<?php
// register.php — MySQL Account Registration (with one-time initial Admin setup if no Admin exists)
require_once __DIR__ . '/config/db.php';

if (current_user()) {
    header('Location: index.php');
    exit;
}

$adminCount = (int)$pdo->query("SELECT COUNT(*) FROM User WHERE role = 'admin'")->fetchColumn();
$canClaimFirstAdmin = ($adminCount === 0);

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();

    $name  = trim($_POST['full_name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $phone = trim($_POST['phone'] ?? '');
    $pass  = $_POST['password'] ?? '';
    $wantAdmin = $canClaimFirstAdmin && isset($_POST['claim_admin']) && $_POST['claim_admin'] === '1';

    if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $phone === '' || strlen($pass) < 6) {
        $error = 'Please enter a valid name, email, phone, and password (at least 6 characters).';
    } else {
        try {
            $pdo->beginTransaction();

            // Re-check admin count inside transaction so first-admin claim is atomic
            $role = 'customer';
            if ($wantAdmin) {
                $existingAdmins = (int)$pdo->query("SELECT COUNT(*) FROM User WHERE role = 'admin' FOR UPDATE")->fetchColumn();
                if ($existingAdmins === 0) {
                    $role = 'admin';
                }
            }

            $hash = password_hash($pass, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("
              INSERT INTO User (full_name, email, password_hash, phone, role)
              VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $email, $hash, $phone, $role]);
            $pdo->commit();

            header('Location: login.php?registered=1');
            exit;
        } catch (PDOException $ex) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = 'An account with this email already exists.';
        }
    }
}

$pageTitle  = 'Register — SkyBook';
$activePage = '';
include __DIR__ . '/includes/header.php';
?>

<section class="section">
  <div class="auth-card card">
    <h1>Create Account</h1>
    <p class="muted">Register your SkyBook account in MySQL.</p>

    <?php if ($error): ?>
      <div class="alert-error"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="POST" class="form-stack">
      <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">

      <div class="field">
        <label for="full_name">Full Name</label>
        <input type="text" name="full_name" id="full_name" required>
      </div>
      <div class="field">
        <label for="email">Email Address</label>
        <input type="email" name="email" id="email" required>
      </div>
      <div class="field">
        <label for="phone">Phone</label>
        <input type="text" name="phone" id="phone" required placeholder="+880 17XX-XXXXXX">
      </div>
      <div class="field">
        <label for="password">Password (min 6 chars)</label>
        <input type="password" name="password" id="password" required minlength="6">
      </div>

      <?php if ($canClaimFirstAdmin): ?>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.875rem;color:#334155;cursor:pointer;">
          <input type="checkbox" name="claim_admin" value="1">
          Register as initial Administrator (first-run setup)
        </label>
      <?php endif; ?>

      <button type="submit" class="btn btn-primary">Create Account</button>
    </form>

    <p class="muted" style="margin-top: 16px;">
      Already have an account? <a href="login.php">Sign in</a>
    </p>
  </div>
</section>

<?php include __DIR__ . '/includes/footer.php'; ?>
