<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_Assets {
    
    public function enqueue() {
        global $post;
        if ( ! $post || ! has_shortcode( $post->post_content, 'yatra_crm' ) ) {
            return;
        }
        
        wp_enqueue_style( 'yatra-google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' );
        wp_enqueue_style( 'yatra-fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' );
        wp_enqueue_style( 'yatra-crm', YATRA_CRM_URL . 'assets/css/yatra-crm.css', array(), YATRA_CRM_VERSION );
        
        // ПОДКЛЮЧАЕМ СКРИПТ
        wp_enqueue_script( 'yatra-crm', YATRA_CRM_URL . 'assets/js/yatra-crm.js', array(), YATRA_CRM_VERSION, true );
        
        // ЛОКАЛИЗУЕМ ПОСЛЕ ПОДКЛЮЧЕНИЯ
        $nonce = wp_create_nonce( 'yatra_nonce' );
        
        // ЛОГИРУЕМ ДЛЯ ОТЛАДКИ
        error_log('YATRA: Created nonce in assets: ' . $nonce);
        
        wp_localize_script( 'yatra-crm', 'yatra_ajax', array(
            'ajaxurl' => admin_url( 'admin-ajax.php' ),
            'nonce' => $nonce,
            'user_logged_in' => is_user_logged_in()
        ) );
    }
}