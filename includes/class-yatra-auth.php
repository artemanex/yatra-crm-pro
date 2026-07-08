<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_Auth {
    
    public function check_nonce() {
        $nonce = isset( $_POST['nonce'] ) ? $_POST['nonce'] : '';
        
        if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'yatra_nonce' ) ) {
            wp_send_json_error( array( 
                'message' => 'Security check failed. Please refresh the page and try again.',
                'code' => 'invalid_nonce'
            ) );
        }
        
        return true;
    }
    
    public function handle_login() {
        if ( ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'yatra_login_nonce' ) ) {
            wp_redirect( add_query_arg( 'login', 'failed', wp_get_referer() ) );
            exit;
        }

        $email = sanitize_email( $_POST['login_email'] );
        $password = $_POST['login_password'];

        $user = get_user_by( 'email', $email );
        
        if ( ! $user ) {
            wp_redirect( add_query_arg( 'login', 'failed', wp_get_referer() ) );
            exit;
        }

        $login_result = wp_authenticate( $user->user_login, $password );
        
        if ( is_wp_error( $login_result ) ) {
            wp_redirect( add_query_arg( 'login', 'failed', wp_get_referer() ) );
            exit;
        }

        wp_set_current_user( $user->ID );
        wp_set_auth_cookie( $user->ID );
        do_action( 'wp_login', $user->user_login, $user );

        wp_redirect( home_url( '/' ) );
        exit;
    }
    
    public function handle_logout() {
        $this->check_nonce();
        wp_logout();
        wp_send_json_success( array( 'message' => 'Вы успешно вышли' ) );
    }
    
    public function is_logged_in() {
        return is_user_logged_in();
    }
    
    public function get_current_user() {
        return wp_get_current_user();
    }
}