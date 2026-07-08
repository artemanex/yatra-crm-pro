<?php
/**
 * Plugin Name: Yatra CRM Pro
 * Plugin URI: https://your-site.com/yatra-crm-pro
 * Description: Полноценная CRM система для управления турами с красивым интерфейсом
 * Version: 3.6.4
 * Author: Your Name
 * Author URI: https://your-site.com
 * Text Domain: yatra-crm-pro
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Константы
define( 'YATRA_CRM_VERSION', '3.6.4' );
define( 'YATRA_CRM_PATH', plugin_dir_path( __FILE__ ) );
define( 'YATRA_CRM_URL', plugin_dir_url( __FILE__ ) );

// ТЕСТОВЫЙ ЭНДПОИНТ ДЛЯ ПРОВЕРКИ NONCE
add_action('init', function() {
    if (isset($_GET['test_nonce'])) {
        $nonce = wp_create_nonce('yatra_nonce');
        header('Content-Type: text/plain');
        echo 'YATRA Nonce: ' . $nonce;
        exit;
    }
});

// Загрузка классов
require_once YATRA_CRM_PATH . 'includes/class-yatra-crm.php';
require_once YATRA_CRM_PATH . 'includes/class-yatra-api.php';
require_once YATRA_CRM_PATH . 'includes/class-yatra-auth.php';
require_once YATRA_CRM_PATH . 'includes/class-yatra-ajax.php';
require_once YATRA_CRM_PATH . 'includes/class-yatra-render.php';
require_once YATRA_CRM_PATH . 'includes/class-yatra-assets.php';
require_once YATRA_CRM_PATH . 'includes/class-yatra-booking.php';

// Инициализация плагина
Yatra_CRM::get_instance();