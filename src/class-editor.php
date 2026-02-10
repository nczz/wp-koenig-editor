<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Editor {

    public function __construct() {
        add_filter( 'use_block_editor_for_post', array( $this, 'disable_gutenberg' ), 100, 2 );
        add_filter( 'replace_editor', array( $this, 'replace_editor' ), 10, 2 );
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
     *
     * WordPress calls this filter twice:
     * 1. During set_current_screen() (class-wp-screen.php) — just to decide the screen type.
     * 2. During post.php/post-new.php — the actual replacement.
     *
     * We must only output HTML on the second call. The load-{pagenow} action
     * fires between the two calls (in admin.php), so we use it as a sentinel.
     */
    public function replace_editor( $replace, $post ) {
        if ( ! Plugin::is_enabled_for( get_post_type( $post ) ) ) {
            return $replace;
        }

        // First call (set_current_screen): signal we'll replace, but don't output yet.
        if ( ! did_action( 'load-post.php' ) && ! did_action( 'load-post-new.php' ) ) {
            return true;
        }

        // Post lock: warn if another user is editing, then set our lock.
        $lock_user = wp_check_post_lock( $post->ID );
        if ( $lock_user ) {
            $lock_user_data = get_userdata( $lock_user );
            $lock_holder    = $lock_user_data ? $lock_user_data->display_name : __( 'Another user', 'wp-koenig-editor' );
        }
        wp_set_post_lock( $post->ID );

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
        $is_koenig     = get_post_meta( $post->ID, '_wp_koenig_editor', true );
        $post_type     = get_post_type( $post );
        $type_object   = get_post_type_object( $post_type );
        $rest_base     = $type_object && ! empty( $type_object->rest_base ) ? $type_object->rest_base : $post_type;

        return array(
            'id'             => $post->ID,
            'title'          => $post->post_title,
            'content'        => $post->post_content,
            'lexical_state'  => $lexical_state ? $lexical_state : '',
            'status'         => $post->post_status,
            'slug'           => $post->post_name,
            'excerpt'        => $post->post_excerpt,
            'date'           => mysql2date( 'c', $post->post_date ),
            'modified'       => mysql2date( 'c', $post->post_modified ),
            'featured_media' => (int) get_post_thumbnail_id( $post->ID ),
            'categories'     => wp_get_post_categories( $post->ID ),
            'tags'           => wp_get_post_tags( $post->ID, array( 'fields' => 'ids' ) ),
            'is_koenig'      => (bool) $is_koenig,
            'post_type'      => $post_type,
            'rest_base'      => $rest_base,
            'preview_url'    => get_preview_post_link( $post ),
        );
    }
}
