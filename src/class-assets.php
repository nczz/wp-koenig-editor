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

        // Load WP media library and heartbeat for post locking.
        wp_enqueue_media();
        wp_enqueue_script( 'heartbeat' );

        // Attach post-lock refresh to heartbeat (runs after heartbeat.js loads).
        global $post;
        if ( $post ) {
            $heartbeat_js = sprintf(
                'jQuery(document).on("heartbeat-send",function(e,d){d["wp-refresh-post-lock"]={post_id:%d};});',
                $post->ID
            );
            wp_add_inline_script( 'heartbeat', $heartbeat_js );
        }

        // Editor JS bundle.
        $js_file = WP_KOENIG_PLUGIN_DIR . 'assets/js/koenig-editor.js';
        $js_url  = WP_KOENIG_PLUGIN_URL . 'assets/js/koenig-editor.js';

        if ( ! file_exists( $js_file ) ) {
            return; // Build not available — skip loading.
        }

        wp_enqueue_script(
            'wp-koenig-editor',
            $js_url,
            array(), // No WP dependencies — React is bundled.
            filemtime( $js_file ),
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
     *
     * Only dequeue+deregister high-level Gutenberg UI scripts.
     * Low-level scripts (wp-block-editor, wp-blocks, wp-editor) must NOT
     * be deregistered because wp-core-data and wp-core-commands depend on them.
     * Deregistering breaks the dependency chain and causes QM warnings.
     */
    private function dequeue_gutenberg() {
        // High-level Gutenberg UI: safe to fully remove.
        $scripts_to_deregister = array(
            'wp-edit-post',
            'wp-block-library',
            'wp-format-library',
        );

        foreach ( $scripts_to_deregister as $handle ) {
            wp_dequeue_script( $handle );
            wp_deregister_script( $handle );
        }

        // Low-level dependencies: only dequeue, keep registered for other core scripts.
        $scripts_to_dequeue = array(
            'wp-editor',
            'wp-block-editor',
            'wp-blocks',
        );

        foreach ( $scripts_to_dequeue as $handle ) {
            wp_dequeue_script( $handle );
        }

        // Styles: dequeue only (no dependency chain concerns for CSS).
        $styles_to_dequeue = array(
            'wp-edit-post',
            'wp-editor',
            'wp-block-editor',
            'wp-block-library',
            'wp-block-library-theme',
            'wp-format-library',
        );

        foreach ( $styles_to_dequeue as $handle ) {
            wp_dequeue_style( $handle );
        }
    }
}
