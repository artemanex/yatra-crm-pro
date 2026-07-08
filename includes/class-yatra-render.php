<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Yatra_Render {
    
    private $auth;
    
    public function __construct( $auth ) {
        $this->auth = $auth;
    }
    
    public function render() {
        if ( $this->auth->is_logged_in() ) {
            return $this->render_dashboard();
        } else {
            return $this->render_login_form();
        }
    }
    
    private function render_dashboard() {
        $user = $this->auth->get_current_user();
        
        ob_start();
        include YATRA_CRM_PATH . 'templates/crm-dashboard.php';
        return ob_get_clean();
    }
    
    private function render_login_form() {
        ob_start();
        include YATRA_CRM_PATH . 'templates/login-form.php';
        return ob_get_clean();
    }
}