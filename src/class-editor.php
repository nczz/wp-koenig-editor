<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Editor {

    public function __construct() {
        add_filter( 'use_block_editor_for_post', array( $this, 'disable_gutenberg' ), 100, 2 );
        add_action( 'replace_editor', array( $this, 'replace_editor' ), 10, 2 );
    }

    /**
     * Disable Gutenberg for enabled post types.
     */
    public function disable_gutenberg( $use_block_editor, $post ) {
        if ( $post && Plugin::is_enabled_for( get_post_type( $post ) ) ) {
            return false;
        }
        return $use_block_editor;
    }

    /**
     * Replace the editor with Koenig editor.
     */
    public function replace_editor( $replace, $post ) {
        if ( ! Plugin::is_enabled_for( get_post_type( $post ) ) ) {
            return $replace;
        }

        // Prepare post data for the React app.
        $post_data = $this->get_post_data( $post );

        require_once ABSPATH . 'wp-admin/admin-header.php';
        require WP_KOENIG_PLUGIN_DIR . 'src/views/editor-page.php';
        require_once ABSPATH . 'wp-admin/admin-footer.php';

        return true;
    }

    /**
     * Prepare post data to pass to the React editor.
     */
    private function get_post_data( $post ) {
        $lexical_state = $post->post_content_filtered;

        // Check if this post was created with Koenig.
        $is_koenig = get_post_meta( $post->ID, '_wp_koenig_editor', true );

        return array(
            'id'             => $post->ID,
            'title'          => $post->post_title,
            'content'        => $post->post_content,
            'lexical_state'  => $lexical_state ? $lexical_state : '',
            'status'         => $post->post_status,
            'slug'           => $post->post_name,
            'excerpt'        => $post->post_excerpt,
            'date'           => $post->post_date,
            'modified'       => $post->post_modified,
            'featured_media' => (int) get_post_thumbnail_id( $post->ID ),
            'categories'     => wp_get_post_categories( $post->ID ),
            'tags'           => wp_get_post_tags( $post->ID, array( 'fields' => 'ids' ) ),
            'is_koenig'      => (bool) $is_koenig,
            'post_type'      => get_post_type( $post ),
        );
    }
}
