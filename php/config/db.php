<?php
// config/db.php — XAMPP MySQL Connection (PDO Prepared Statements) + Session & Security Helpers
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

$dbHost = getenv('SKYBOOK_DB_HOST') ?: '127.0.0.1';
$dbName = getenv('SKYBOOK_DB_NAME') ?: 'skybook_db';
$dbUser = getenv('SKYBOOK_DB_USER') ?: 'root';
$dbPass = getenv('SKYBOOK_DB_PASS') !== false ? (string)getenv('SKYBOOK_DB_PASS') : '';

try {
    $pdo = new PDO(
        "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $ex) {
    http_response_code(500);
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Database Setup Required</title><link rel="stylesheet" href="css/style.css"></head><body>';
    echo '<div class="container" style="padding:48px 20px;max-width:640px;"><div class="card">';
    echo '<h2>MySQL Connection Needed</h2>';
    echo '<p class="muted">Could not connect to <strong>skybook_db</strong> on MySQL (127.0.0.1).</p>';
    echo '<ol style="font-size:0.9rem;line-height:1.8;color:#334155;">';
    echo '<li>Open <strong>XAMPP Control Panel</strong> and click <strong>Start</strong> on <strong>MySQL</strong> (and Apache).</li>';
    echo '<li>Open <strong>http://localhost/phpmyadmin</strong> in Chrome.</li>';
    echo '<li>Click <strong>Import</strong>, choose <code>sql/skybook.sql</code>, and click <strong>Import</strong>.</li>';
    echo '<li>Refresh this page.</li>';
    echo '</ol></div></div></body></html>';
    exit;
}

function e(?string $value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(): void {
    $submitted = $_POST['csrf_token'] ?? '';
    $expected  = $_SESSION['csrf_token'] ?? '';
    if ($submitted === '' || $expected === '' || !hash_equals($expected, $submitted)) {
        http_response_code(403);
        die('Invalid security token. Please go back and try again.');
    }
}

function current_user(): ?array {
    return $_SESSION['user'] ?? null;
}

function require_login(): array {
    $user = current_user();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

function require_admin(): array {
    $user = require_login();
    if (($user['role'] ?? '') !== 'admin') {
        http_response_code(403);
        header('Location: index.php');
        exit;
    }
    return $user;
}
