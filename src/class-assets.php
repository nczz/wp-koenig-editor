<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Assets {

    public function __construct() {
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_editor_assets' ), 100 );
    }

    /**
     * Enqueue editor scripts and styles only on relevant editor screens.
     */
    public function enqueue_editor_assets( $hook ) {
        // Only load on post edit screens.
        if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ), true ) ) {
            return;
        }

        // Check if current post type is enabled.
        $screen = get_current_screen();
        if ( ! $screen || ! Plugin::is_enabled_for( $screen->post_type ) ) {
            return;
        }

        // Dequeue Gutenberg scripts to avoid conflicts.
        $this->dequeue_gutenberg();

        // Load WP media library.
        wp_enqueue_media();

        // Editor JS bundle.
        $js_file = WP_KOENIG_PLUGIN_DIR . 'assets/js/koenig-editor.js';
        $js_url  = WP_KOENIG_PLUGIN_URL . 'assets/js/koenig-editor.js';
        $version = file_exists( $js_file ) ? filemtime( $js_file ) : WP_KOENIG_VERSION;

        wp_enqueue_script(
            'wp-koenig-editor',
            $js_url,
            array(), // No WP dependencies — React is bundled.
            $version,
            true
        );

        // Editor CSS bundle.
        $css_file = WP_KOENIG_PLUGIN_DIR . 'assets/js/koenig-editor.css';
        $css_url  = WP_KOENIG_PLUGIN_URL . 'assets/js/koenig-editor.css';

        if ( file_exists( $css_file ) ) {
            wp_enqueue_style(
                'wp-koenig-editor',
                $css_url,
                array(),
                filemtime( $css_file )
            );
        }
    }

    /**
     * Dequeue Gutenberg-related scripts to prevent conflicts.
     */
    private function dequeue_gutenberg() {
        $scripts_to_remove = array(
            'wp-edit-post',
            'wp-editor',
            'wp-block-editor',
            'wp-block-library',
            'wp-blocks',
            'wp-format-library',
        );

        foreach ( $scripts_to_remove as $handle ) {
            wp_dequeue_script( $handle );
            wp_deregister_script( $handle );
        }

        $styles_to_remove = array(
            'wp-edit-post',
            'wp-editor',
            'wp-block-editor',
            'wp-block-library',
            'wp-block-library-theme',
            'wp-format-library',
        );

        foreach ( $styles_to_remove as $handle ) {
            wp_dequeue_style( $handle );
            wp_deregister_style( $handle );
        }
    }
}
