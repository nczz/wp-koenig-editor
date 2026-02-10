<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class PostStorage {

    public function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_rest_fields' ) );
        add_filter( '_wp_post_revision_fields', array( $this, 'add_revision_field' ), 10, 2 );
        add_action( 'wp_restore_post_revision', array( $this, 'restore_revision' ), 10, 2 );
    }

    /**
     * Register lexical_state as a REST API field on enabled post types.
     */
    public function register_rest_fields() {
        $post_types = Plugin::enabled_post_types();

        foreach ( $post_types as $post_type ) {
            register_rest_field( $post_type, 'lexical_state', array(
                'get_callback'    => array( $this, 'get_lexical_state' ),
                'update_callback' => array( $this, 'update_lexical_state' ),
                'schema'          => array(
                    'type'        => 'string',
                    'description' => 'Lexical editor JSON state stored in post_content_filtered.',
                    'context'     => array( 'edit' ),
                ),
            ) );
        }
    }

    /**
     * Read lexical_state from post_content_filtered.
     */
    public function get_lexical_state( $post_arr ) {
        $post = get_post( $post_arr['id'] );
        return $post ? $post->post_content_filtered : '';
    }

    /**
     * Write lexical_state to post_content_filtered and mark post as Koenig-edited.
     */
    public function update_lexical_state( $value, $post ) {
        // Validate that the value is valid JSON (or empty).
        if ( '' !== $value && null === json_decode( $value ) ) {
            return;
        }

        global $wpdb;

        // Update post_content_filtered directly to avoid recursive hooks.
        $wpdb->update(
            $wpdb->posts,
            array( 'post_content_filtered' => $value ),
            array( 'ID' => $post->ID ),
            array( '%s' ),
            array( '%d' )
        );

        // Mark this post as Koenig-edited.
        update_post_meta( $post->ID, '_wp_koenig_editor', '1' );

        clean_post_cache( $post->ID );
    }

    /**
     * Include post_content_filtered in revision fields for Koenig posts.
     *
     * WordPress stores the filter result back into a static variable,
     * so we must explicitly add OR remove the key on every call to
     * prevent leaking the field to non-Koenig posts.
     */
    public function add_revision_field( $fields, $post ) {
        $is_koenig = false;

        if ( is_array( $post ) && ! empty( $post['ID'] ) ) {
            $parent_id = wp_is_post_revision( $post['ID'] );
            $check_id  = $parent_id ? $parent_id : $post['ID'];
            $is_koenig = (bool) get_post_meta( $check_id, '_wp_koenig_editor', true );
        }

        if ( $is_koenig ) {
            $fields['post_content_filtered'] = __( 'Lexical State', 'wp-koenig-editor' );
        } else {
            unset( $fields['post_content_filtered'] );
        }

        return $fields;
    }

    /**
     * Restore post_content_filtered when restoring a revision.
     */
    public function restore_revision( $post_id, $revision_id ) {
        $revision = get_post( $revision_id );
        if ( ! $revision ) {
            return;
        }

        global $wpdb;
        $wpdb->update(
            $wpdb->posts,
            array( 'post_content_filtered' => $revision->post_content_filtered ),
            array( 'ID' => $post_id ),
            array( '%s' ),
            array( '%d' )
        );

        clean_post_cache( $post_id );
    }
}
