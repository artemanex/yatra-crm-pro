<?php
/**
 * Тест API Yatra
 * Открыть: https://ваш-сайт/wp-content/plugins/yatra-crm-pro/test-api.php
 */

// Ищем wp-load.php правильным способом
$wp_load = false;
$paths = array(
    dirname(dirname(dirname(__FILE__))) . '/wp-load.php',           // ../../../wp-load.php
    dirname(dirname(dirname(dirname(__FILE__)))) . '/wp-load.php',  // ../../../../wp-load.php
    dirname(__FILE__) . '/../../../../wp-load.php',                 // ../../../../wp-load.php
    dirname(__FILE__) . '/../../../wp-load.php',                    // ../../../wp-load.php
    dirname(__FILE__) . '/../../wp-load.php',                       // ../../wp-load.php
    $_SERVER['DOCUMENT_ROOT'] . '/wp-load.php',                     // /var/www/.../wp-load.php
    $_SERVER['DOCUMENT_ROOT'] . '/../wp-load.php',                  // на уровень выше
);

foreach ($paths as $path) {
    if (file_exists($path)) {
        require_once($path);
        $wp_load = true;
        echo "<!-- Загружен wp-load.php: $path -->\n";
        break;
    }
}

if (!$wp_load) {
    die('❌ Не найден wp-load.php');
}

echo '<h1>🔍 Тест API Yatra</h1>';

// 1. Проверяем авторизацию
echo '<h2>1. Авторизация</h2>';
if (is_user_logged_in()) {
    $user = wp_get_current_user();
    echo '✅ Пользователь: ' . $user->display_name . ' (' . $user->user_email . ')<br>';
    echo '👤 ID: ' . $user->ID . '<br>';
} else {
    echo '❌ Пользователь не авторизован!<br>';
    echo '⚠️ Войдите в админку и обновите страницу<br>';
}

// 2. Проверяем REST API
echo '<h2>2. Проверка REST API (прямой запрос)</h2>';

$api_url = home_url() . '/wp-json/yatra/v1/trips';
echo '📤 Запрос: GET ' . $api_url . '<br>';

$response = wp_remote_get($api_url, array(
    'headers' => array(
        'X-WP-Nonce' => wp_create_nonce('wp_rest')
    )
));

if (is_wp_error($response)) {
    echo '❌ Ошибка: ' . $response->get_error_message() . '<br>';
} else {
    $status = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    echo '📥 Статус: ' . $status . '<br>';
    
    $data = json_decode($body, true);
    
    echo '<h3>Ответ:</h3>';
    echo '<pre style="background:#1e293b;color:#e2e8f0;padding:15px;border-radius:8px;overflow:auto;max-height:500px;font-size:12px;">';
    
    if ($data) {
        print_r($data);
        
        // Проверяем структуру
        echo "\n\n=== СТРУКТУРА ===\n";
        if (isset($data['data'])) {
            echo "✅ Есть поле 'data'\n";
            if (isset($data['data']['data']) && is_array($data['data']['data'])) {
                echo "✅ Есть поле 'data.data' - массив из " . count($data['data']['data']) . " элементов\n";
            }
        }
        if (isset($data['data']) && is_array($data['data']) && !isset($data['data']['data'])) {
            echo "✅ Поле 'data' - массив из " . count($data['data']) . " элементов\n";
        }
    } else {
        echo '❌ Не удалось разобрать JSON<br>';
        echo 'Сырой ответ: ' . substr($body, 0, 1000);
    }
    
    echo '</pre>';
}

// 3. Проверяем AJAX
echo '<h2>3. Проверка AJAX (через admin-ajax.php)</h2>';

$ajax_url = admin_url('admin-ajax.php');
echo '📤 AJAX URL: ' . $ajax_url . '<br>';

$nonce = wp_create_nonce('yatra_nonce');
echo '🔑 Nonce: ' . $nonce . '<br>';

$body = array(
    'action' => 'yatra_trips',
    'nonce' => $nonce,
    'status' => 'publish'
);

$response = wp_remote_post($ajax_url, array(
    'body' => $body,
    'headers' => array(
        'X-Requested-With' => 'XMLHttpRequest'
    )
));

if (is_wp_error($response)) {
    echo '❌ Ошибка: ' . $response->get_error_message() . '<br>';
} else {
    $status = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    
    echo '📥 Статус: ' . $status . '<br>';
    
    $data = json_decode($body, true);
    
    echo '<h3>Ответ:</h3>';
    echo '<pre style="background:#1e293b;color:#e2e8f0;padding:15px;border-radius:8px;overflow:auto;max-height:500px;font-size:12px;">';
    if ($data) {
        print_r($data);
    } else {
        echo $body;
    }
    echo '</pre>';
}

// 4. Информация о плагине
echo '<h2>4. Информация о плагине</h2>';
echo 'Путь к плагину: ' . YATRA_CRM_PATH . '<br>';
echo 'URL плагина: ' . YATRA_CRM_URL . '<br>';
echo 'Версия: ' . YATRA_CRM_VERSION . '<br>';

// 5. Проверяем файлы
echo '<h2>5. Проверка файлов</h2>';
$files = array(
    'includes/class-yatra-crm.php',
    'includes/class-yatra-api.php',
    'includes/class-yatra-auth.php',
    'includes/class-yatra-ajax.php',
    'includes/class-yatra-render.php',
    'includes/class-yatra-assets.php',
    'includes/class-yatra-booking.php',
    'templates/crm-dashboard.php',
    'templates/login-form.php',
    'assets/js/yatra-crm.js',
    'assets/css/yatra-crm.css'
);

foreach ($files as $file) {
    $path = YATRA_CRM_PATH . $file;
    if (file_exists($path)) {
        echo '✅ ' . $file . ' - существует<br>';
    } else {
        echo '❌ ' . $file . ' - НЕ НАЙДЕН<br>';
    }
}

echo '<hr>';
echo '<p><strong>Путь к логу:</strong> /wp-content/plugins/yatra-crm-pro/logs/yatra-debug.log</p>';

// 6. Проверяем логи
echo '<h2>6. Логи (последние 50 строк)</h2>';
$log_file = YATRA_CRM_PATH . 'logs/yatra-debug.log';
if (file_exists($log_file)) {
    $log_content = file_get_contents($log_file);
    $lines = explode("\n", $log_content);
    $last_lines = array_slice($lines, -50);
    echo '<pre style="background:#1e293b;color:#e2e8f0;padding:15px;border-radius:8px;overflow:auto;max-height:300px;font-size:11px;">';
    echo implode("\n", $last_lines);
    echo '</pre>';
} else {
    echo '❌ Файл лога не найден: ' . $log_file . '<br>';
    echo '⚠️ Возможно папка logs не создана или нет прав на запись<br>';
}