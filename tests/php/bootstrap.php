<?php
/**
 * PHPUnit bootstrap for WP Koenig Editor tests.
 *
 * Uses WordPress test framework with auto-rollback per test.
 */

// Path to WordPress test lib.
$_tests_dir = '/tmp/wordpress-tests-lib';

if ( ! file_exists( $_tests_dir . '/includes/functions.php' ) ) {
    echo "WordPress test library not found at {$_tests_dir}\n";
    echo "Run the setup script first.\n";
    exit( 1 );
}

// Give access to tests_add_filter() function.
require_once $_tests_dir . '/includes/functions.php';

/**
 * Manually load the plugin being tested.
 */
function _manually_load_plugin() {
    require dirname( __DIR__, 2 ) . '/wp-koenig-editor.php';
}
tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

// Start up the WP testing environment.
require $_tests_dir . '/includes/bootstrap.php';
