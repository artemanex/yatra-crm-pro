<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_Booking {
    
    private $api;
    
    public function __construct( $api ) {
        $this->api = $api;
    }
    
    public function create( $booking_data ) {
        // Проверка обязательных полей
        $required_fields = array(
            'trip_id', 'availability_id', 'departure_date', 
            'travelers_count', 'contact_email', 'contact_first_name', 
            'contact_last_name', 'contact_phone'
        );
        
        foreach ( $required_fields as $field ) {
            if ( empty( $booking_data[ $field ] ) ) {
                return array(
                    'success' => false,
                    'message' => "Отсутствует обязательное поле: {$field}"
                );
            }
        }
        
        $departure_date = sanitize_text_field( $booking_data['departure_date'] );
        if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $departure_date ) ) {
            return array(
                'success' => false,
                'message' => 'Неверный формат даты. Ожидается YYYY-MM-DD',
                'debug' => array(
                    'received_date' => $departure_date
                )
            );
        }
        
        // Формируем данные для API
        $api_data = array(
            'trip_id' => intval( $booking_data['trip_id'] ),
            'availability_id' => intval( $booking_data['availability_id'] ),
            'travelers_count' => intval( $booking_data['travelers_count'] ),
            'departure_date' => $departure_date,
            'start_date' => $departure_date,
            'travel_date' => $departure_date,
            'contact_email' => sanitize_email( $booking_data['contact_email'] ),
            'contact_first_name' => sanitize_text_field( $booking_data['contact_first_name'] ),
            'contact_last_name' => sanitize_text_field( $booking_data['contact_last_name'] ),
            'contact_phone' => sanitize_text_field( $booking_data['contact_phone'] ),
            'contact_country' => sanitize_text_field( $booking_data['contact_country'] ?? 'US' ),
            'travelers' => array(),
            'total_amount' => floatval( $booking_data['total_amount'] ?? 0 ),
            'amount_paid' => floatval( $booking_data['amount_paid'] ?? 0 ),
            'amount_due' => floatval( $booking_data['amount_due'] ?? $booking_data['total_amount'] ?? 0 ),
            'subtotal' => floatval( $booking_data['subtotal'] ?? $booking_data['total_amount'] ?? 0 ),
            'currency' => sanitize_text_field( $booking_data['currency'] ?? 'USD' ),
            'booking_token' => sanitize_text_field( $booking_data['booking_token'] ?? '' ),
            'status' => sanitize_text_field( $booking_data['status'] ?? 'pending' ),
            'payment_method' => sanitize_text_field( $booking_data['payment_method'] ?? 'full' )
        );
        
        // Добавляем путешественников
        if ( isset( $booking_data['travelers'] ) && is_array( $booking_data['travelers'] ) ) {
            foreach ( $booking_data['travelers'] as $traveler ) {
                $api_data['travelers'][] = array(
                    'first_name' => sanitize_text_field( $traveler['first_name'] ?? '' ),
                    'last_name' => sanitize_text_field( $traveler['last_name'] ?? '' ),
                    'email' => sanitize_email( $traveler['email'] ?? '' ),
                    'phone' => sanitize_text_field( $traveler['phone'] ?? '' ),
                    'dob' => sanitize_text_field( $traveler['dob'] ?? '1990-01-01' ),
                    'gender' => sanitize_text_field( $traveler['gender'] ?? 'male' ),
                    'nationality' => sanitize_text_field( $traveler['nationality'] ?? 'US' )
                );
            }
        }
        
        $result = $this->api->post( 'bookings', $api_data, true );
        
        return $result;
    }
}