<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class MediaBridge {

    public function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
    }

    public function register_routes() {
        register_rest_route( 'wp-koenig/v1', '/upload', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'handle_upload' ),
            'permission_callback' => array( $this, 'check_upload_permission' ),
        ) );
    }

    public function check_upload_permission() {
        return current_user_can( 'upload_files' );
    }

    /**
     * Handle file upload via REST API.
     * Returns data in the format Koenig expects.
     */
    public function handle_upload( $request ) {
        $files = $request->get_file_params();

        if ( empty( $files['file'] ) ) {
            return new \WP_Error(
                'no_file',
                __( 'No file was uploaded.', 'wp-koenig-editor' ),
                array( 'status' => 400 )
            );
        }

        // Required for media_handle_upload().
        require_once ABSPATH . 'wp-admin/includes/image.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';

        // Use the 'file' key from the uploaded files.
        $attachment_id = media_handle_upload( 'file', 0 );

        if ( is_wp_error( $attachment_id ) ) {
            return new \WP_Error(
                'upload_failed',
                $attachment_id->get_error_message(),
                array( 'status' => 500 )
            );
        }

        $url      = wp_get_attachment_url( $attachment_id );
        $metadata = wp_get_attachment_metadata( $attachment_id );
        $filename = basename( get_attached_file( $attachment_id ) );
        $width    = is_array( $metadata ) && isset( $metadata['width'] ) ? $metadata['width'] : null;
        $height   = is_array( $metadata ) && isset( $metadata['height'] ) ? $metadata['height'] : null;

        return rest_ensure_response( array(
            'id'       => $attachment_id,
            'url'      => $url,
            'fileName' => $filename,
            'width'    => $width,
            'height'   => $height,
        ) );
    }
}
