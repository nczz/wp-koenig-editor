<?php
/**
 * Plugin Name: WP Koenig Editor
 * Plugin URI:  https://github.com/nczz/wp-koenig-editor
 * Description: Replace Gutenberg with Ghost's Koenig editor (Lexical-based) for a distraction-free Markdown writing experience.
 * Version:     1.0.0
 * Author:      HC Chiang
 * Author URI:  https://blog.hcchiang.com
 * License:     GPL-2.0-or-later
 * Text Domain: wp-koenig-editor
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'WP_KOENIG_VERSION', '1.0.0' );
define( 'WP_KOENIG_PLUGIN_FILE', __FILE__ );
define( 'WP_KOENIG_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WP_KOENIG_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WP_KOENIG_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

require_once WP_KOENIG_PLUGIN_DIR . 'src/autoload.php';

register_activation_hook( __FILE__, function () {
    $defaults = array(
        'wp_koenig_enabled_post_types' => array( 'post' ),
        'wp_koenig_dark_mode'          => false,
        'wp_koenig_show_word_count'    => true,
    );
    foreach ( $defaults as $key => $value ) {
        if ( false === get_option( $key ) ) {
            add_option( $key, $value );
        }
    }
} );

add_action( 'wp_loaded', array( WPKoenig\Plugin::class, 'instance' ) );
