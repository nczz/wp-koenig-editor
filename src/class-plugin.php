<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Plugin {

    private static $instance = null;

    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_modules();
    }

    private function init_modules() {
        new Editor();
        new Settings();
        new PostStorage();
        new RestAPI();
        new MediaBridge();
        new Assets();
    }

    /**
     * Get the post types that have Koenig editor enabled.
     */
    public static function enabled_post_types() {
        $types = get_option( 'wp_koenig_enabled_post_types', array( 'post' ) );
        return is_array( $types ) ? $types : array( 'post' );
    }

    /**
     * Check if a post type has Koenig editor enabled.
     */
    public static function is_enabled_for( $post_type ) {
        return in_array( $post_type, self::enabled_post_types(), true );
    }
}
