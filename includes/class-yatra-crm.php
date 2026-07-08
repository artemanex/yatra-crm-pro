<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_CRM {
    
    private static $instance = null;
    
    public $api;
    public $auth;
    public $ajax;
    public $render;
    public $assets;
    public $booking;
    
    private function __construct() {
        $this->init_classes();
        $this->init_hooks();
    }
    
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function init_classes() {
        $this->api     = new Yatra_API();
        $this->auth    = new Yatra_Auth();
        $this->booking = new Yatra_Booking( $this->api );
        $this->ajax    = new Yatra_AJAX( $this->api, $this->booking );
        $this->render  = new Yatra_Render( $this->auth );
        $this->assets  = new Yatra_Assets();
    }
    
    private function init_hooks() {
        add_shortcode( 'yatra_crm', array( $this->render, 'render' ) );
        add_action( 'wp_enqueue_scripts', array( $this->assets, 'enqueue' ) );
        
        // AJAX handlers - ТУРЫ
        add_action( 'wp_ajax_yatra_trips', array( $this->ajax, 'get_trips' ) );
        add_action( 'wp_ajax_nopriv_yatra_trips', array( $this->ajax, 'get_trips' ) );
        
        add_action( 'wp_ajax_yatra_trip_details', array( $this->ajax, 'get_trip_details' ) );
        add_action( 'wp_ajax_nopriv_yatra_trip_details', array( $this->ajax, 'get_trip_details' ) );
        
        add_action( 'wp_ajax_yatra_trip_availability', array( $this->ajax, 'get_trip_availability' ) );
        add_action( 'wp_ajax_nopriv_yatra_trip_availability', array( $this->ajax, 'get_trip_availability' ) );
        
        // AJAX handlers - АККАУНТ
        add_action( 'wp_ajax_yatra_account_data', array( $this->ajax, 'get_account_data' ) );
        add_action( 'wp_ajax_nopriv_yatra_account_data', array( $this->ajax, 'get_account_data' ) );
        
        add_action( 'wp_ajax_yatra_update_profile', array( $this->ajax, 'update_profile' ) );
        add_action( 'wp_ajax_nopriv_yatra_update_profile', array( $this->ajax, 'update_profile' ) );
        
        // AJAX handlers - БРОНИРОВАНИЯ
        add_action( 'wp_ajax_yatra_my_bookings', array( $this->ajax, 'get_my_bookings' ) );
        add_action( 'wp_ajax_nopriv_yatra_my_bookings', array( $this->ajax, 'get_my_bookings' ) );
        
        // ДОБАВЛЕНО: получение деталей конкретного бронирования
        add_action( 'wp_ajax_yatra_get_booking', array( $this->ajax, 'get_booking' ) );
        add_action( 'wp_ajax_nopriv_yatra_get_booking', array( $this->ajax, 'get_booking' ) );
        
        // AJAX handlers - ПЛАТЕЖИ
        add_action( 'wp_ajax_yatra_my_payments', array( $this->ajax, 'get_my_payments' ) );
        add_action( 'wp_ajax_nopriv_yatra_my_payments', array( $this->ajax, 'get_my_payments' ) );
        
        // AJAX handlers - СОЗДАНИЕ БРОНИРОВАНИЯ
        add_action( 'wp_ajax_yatra_create_booking', array( $this->ajax, 'create_booking' ) );
        add_action( 'wp_ajax_nopriv_yatra_create_booking', array( $this->ajax, 'create_booking' ) );
        
        // Login/Logout handlers
        add_action( 'admin_post_yatra_login', array( $this->auth, 'handle_login' ) );
        add_action( 'admin_post_nopriv_yatra_login', array( $this->auth, 'handle_login' ) );
        add_action( 'wp_ajax_yatra_logout', array( $this->auth, 'handle_logout' ) );
        add_action( 'wp_ajax_nopriv_yatra_logout', array( $this->auth, 'handle_logout' ) );
    }
}