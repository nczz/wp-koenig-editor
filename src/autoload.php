<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

spl_autoload_register( function ( $class ) {
    $prefix    = 'WPKoenig\\';
    $base_dir  = __DIR__ . '/';

    $len = strlen( $prefix );
    if ( strncmp( $prefix, $class, $len ) !== 0 ) {
        return;
    }

    $relative_class = substr( $class, $len );
    // Convert CamelCase to kebab-case: PostStorage → post-storage
    $file_name = strtolower( preg_replace( '/([a-z])([A-Z])/', '$1-$2', $relative_class ) );
    $file      = $base_dir . 'class-' . $file_name . '.php';

    if ( file_exists( $file ) ) {
        require_once $file;
    }
} );
