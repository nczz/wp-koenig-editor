<?php
/**
 * Uninstall WP Koenig Editor.
 *
 * Cleans up plugin options. Post meta (_wp_koenig_editor) and
 * post_content_filtered data are intentionally preserved to avoid data loss.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

delete_option( 'wp_koenig_enabled_post_types' );
delete_option( 'wp_koenig_dark_mode' );
delete_option( 'wp_koenig_show_word_count' );
