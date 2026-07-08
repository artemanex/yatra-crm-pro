<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_API {
    
    private $api_url;
    
    public function __construct() {
        $this->api_url = trailingslashit( home_url() ) . 'wp-json/yatra/v1/';
    }
    
    public function request( $endpoint, $method = 'GET', $data = array(), $with_auth = true ) {
        $url = $this->api_url . ltrim( $endpoint, '/' );
        
        $args = array(
            'method' => strtoupper( $method ),
            'headers' => array(
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
        );

        if ( $with_auth ) {
            $args['headers']['X-WP-Nonce'] = wp_create_nonce( 'wp_rest' );
        }

        $cookies = $this->get_auth_cookies();
        if ( ! empty( $cookies ) ) {
            $args['cookies'] = $cookies;
        }

        if ( strtoupper( $method ) === 'GET' && ! empty( $data ) ) {
            $url .= '?' . http_build_query( $data );
        } elseif ( ! empty( $data ) && ( strtoupper( $method ) === 'POST' || strtoupper( $method ) === 'PUT' || strtoupper( $method ) === 'PATCH' ) ) {
            $args['body'] = wp_json_encode( $data );
        }

        $response = wp_remote_request( $url, $args );
        
        if ( is_wp_error( $response ) ) {
            return array(
                'success' => false,
                'error' => $response->get_error_message()
            );
        }

        $status = wp_remote_retrieve_response_code( $response );
        $body = wp_remote_retrieve_body( $response );
        $decoded = json_decode( $body, true );

        return array(
            'status_code' => $status,
            'success' => $status >= 200 && $status < 300,
            'data' => $decoded ?: $body,
        );
    }
    
    private function get_auth_cookies() {
        $cookies = array();
        $auth_cookie_names = array(
            'wordpress_logged_in_',
            'wp-',
            'PHPSESSID',
            'RCPC'
        );
        
        foreach ( $_COOKIE as $name => $value ) {
            foreach ( $auth_cookie_names as $prefix ) {
                if ( strpos( $name, $prefix ) === 0 ) {
                    $cookies[] = new WP_Http_Cookie( array(
                        'name' => $name,
                        'value' => $value,
                        'path' => '/'
                    ) );
                    break;
                }
            }
        }
        
        return $cookies;
    }
    
    public function get( $endpoint, $data = array(), $with_auth = true ) {
        return $this->request( $endpoint, 'GET', $data, $with_auth );
    }
    
    public function post( $endpoint, $data = array(), $with_auth = true ) {
        return $this->request( $endpoint, 'POST', $data, $with_auth );
    }
    
    public function put( $endpoint, $data = array(), $with_auth = true ) {
        return $this->request( $endpoint, 'PUT', $data, $with_auth );
    }
    
    public function delete( $endpoint, $data = array(), $with_auth = true ) {
        return $this->request( $endpoint, 'DELETE', $data, $with_auth );
    }
}