<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_AJAX {
    
    private $api;
    private $booking;
    
    public function __construct( $api, $booking ) {
        $this->api = $api;
        $this->booking = $booking;
    }
    
    private function check_nonce() {
        $nonce = isset( $_POST['nonce'] ) ? $_POST['nonce'] : '';
        
        if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'yatra_nonce' ) ) {
            wp_send_json_error( array( 
                'message' => 'Security check failed. Please refresh the page and try again.',
                'code' => 'invalid_nonce'
            ) );
        }
        
        return true;
    }
    
    public function get_trips() {
        $this->check_nonce();
        
        $status = isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : 'publish';
        $search = isset( $_POST['search'] ) ? sanitize_text_field( $_POST['search'] ) : '';
        
        $endpoint = 'trips';
        $params = array();
        if ( $status !== 'all' ) $params['status'] = $status;
        if ( $search ) $params['search'] = $search;
        
        if ( ! empty( $params ) ) {
            $endpoint .= '?' . http_build_query( $params );
        }
        
        $result = $this->api->get( $endpoint, array(), true );
        wp_send_json_success( $result );
    }
    
    public function get_trip_details() {
        $this->check_nonce();
        
        $trip_id = isset( $_POST['trip_id'] ) ? intval( $_POST['trip_id'] ) : 0;
        if ( ! $trip_id ) {
            wp_send_json_error( array( 'message' => 'ID тура не указан' ) );
        }
        
        $result = $this->api->get( 'trips/' . $trip_id, array(), true );
        wp_send_json_success( $result );
    }
    
    public function get_trip_availability() {
        $this->check_nonce();
        
        $trip_id = isset( $_POST['trip_id'] ) ? intval( $_POST['trip_id'] ) : 0;
        if ( ! $trip_id ) {
            wp_send_json_error( array( 'message' => 'ID тура не указан' ) );
        }
        
        $result = $this->api->get( 'availability?trip_id=' . $trip_id, array(), true );
        wp_send_json_success( $result );
    }
    
    public function get_account_data() {
        $this->check_nonce();
        
        $result = $this->api->get( 'customers/me', array(), true );
        wp_send_json_success( $result );
    }
    
    public function update_profile() {
        $this->check_nonce();
        
        $data = array();
        $fields = array( 'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country' );
        foreach ( $fields as $field ) {
            if ( isset( $_POST[ $field ] ) ) {
                $data[ $field ] = sanitize_text_field( $_POST[ $field ] );
            }
        }
        
        if ( empty( $data['email'] ) ) {
            wp_send_json_error( array( 'message' => 'Email обязательное поле' ) );
        }
        
        $result = $this->api->post( 'customers/me', $data, true );
        
        if ( $result['success'] ) {
            wp_send_json_success( array( 'message' => 'Профиль обновлен' ) );
        } else {
            wp_send_json_error( array( 'message' => 'Ошибка обновления профиля' ) );
        }
    }
    
    public function get_my_bookings() {
        $this->check_nonce();
        
        $result = $this->api->get( 'customers/my-bookings', array(), true );
        wp_send_json_success( $result );
    }
    
    public function get_my_payments() {
        $this->check_nonce();
        
        $result = $this->api->get( 'customers/my-payments', array(), true );
        wp_send_json_success( $result );
    }
    
    public function create_booking() {
        $this->check_nonce();
        
        if ( ! $this->booking ) {
            wp_send_json_error( array( 'message' => 'Booking service not initialized' ) );
        }
        
        $booking_data = isset( $_POST['booking_data'] ) ? json_decode( stripslashes( $_POST['booking_data'] ), true ) : array();
        
        if ( empty( $booking_data ) ) {
            wp_send_json_error( array( 'message' => 'Нет данных для бронирования' ) );
        }
        
        // Проверка обязательных полей
        $required_fields = array('trip_id', 'availability_id', 'departure_date', 'travelers_count', 'contact_email', 'contact_first_name', 'contact_last_name', 'contact_phone');
        foreach ( $required_fields as $field ) {
            if ( empty( $booking_data[ $field ] ) ) {
                wp_send_json_error( array( 'message' => "Отсутствует обязательное поле: {$field}" ) );
            }
        }
        
        $departure_date = sanitize_text_field( $booking_data['departure_date'] );
        if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $departure_date ) ) {
            wp_send_json_error( array(
                'message' => 'Неверный формат даты. Ожидается YYYY-MM-DD',
                'debug' => array(
                    'received_date' => $departure_date
                )
            ) );
        }
        
        $result = $this->booking->create( $booking_data );
        
        if ( $result['success'] ) {
            wp_send_json_success( $result );
        } else {
            wp_send_json_error( array(
                'message' => $result['message'] ?? 'Ошибка создания бронирования',
                'details' => $result
            ) );
        }
    }
    
    // ============================================================
    // НОВЫЙ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ДЕТАЛЕЙ БРОНИРОВАНИЯ
    // ============================================================
    public function get_booking() {
        $this->check_nonce();
        
        $booking_id = isset( $_POST['booking_id'] ) ? intval( $_POST['booking_id'] ) : 0;
        
        if ( ! $booking_id ) {
            wp_send_json_error( array( 'message' => 'ID бронирования не указан' ) );
        }
        
        $result = $this->api->get( 'bookings/' . $booking_id, array(), true );
        
        if ( $result['success'] ) {
            wp_send_json_success( $result['data'] );
        } else {
            wp_send_json_error( array( 
                'message' => $result['data']['message'] ?? 'Ошибка получения бронирования',
                'details' => $result
            ) );
        }
    }
}