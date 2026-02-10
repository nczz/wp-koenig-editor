<?php

class MediaBridgeTest extends WP_UnitTestCase {

    /** @var WPKoenig\MediaBridge */
    private $bridge;

    public function set_up() {
        parent::set_up();
        $this->bridge = new WPKoenig\MediaBridge();
        do_action( 'rest_api_init' );
    }

    public function test_upload_route_registered() {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey( '/wp-koenig/v1/upload', $routes );
    }

    public function test_upload_permission_denied_without_capability() {
        $user_id = self::factory()->user->create( array( 'role' => 'subscriber' ) );
        wp_set_current_user( $user_id );

        $this->assertFalse( $this->bridge->check_upload_permission() );
    }

    public function test_handle_upload_returns_error_when_no_file() {
        $request = new WP_REST_Request( 'POST', '/wp-koenig/v1/upload' );
        $request->set_file_params( array() );

        $result = $this->bridge->handle_upload( $request );

        $this->assertInstanceOf( 'WP_Error', $result );
        $this->assertSame( 'no_file', $result->get_error_code() );
    }

    // --- Behavioral tests ---

    public function test_upload_permission_allowed_for_author() {
        // Authors can upload files (images for their posts).
        // This must work because Koenig's drag-and-drop uses this endpoint.
        $user_id = self::factory()->user->create( array( 'role' => 'author' ) );
        wp_set_current_user( $user_id );

        $this->assertTrue( $this->bridge->check_upload_permission() );
    }

    public function test_handle_upload_expects_file_key() {
        // JS side uses FormData.append('file', blob). The PHP side must
        // look for $_FILES['file'], not 'upload' or 'media'.
        // If the key doesn't match, user gets "No file was uploaded" error
        // even though they selected a file.
        $request = new WP_REST_Request( 'POST', '/wp-koenig/v1/upload' );
        $request->set_file_params( array(
            'wrong_key' => array(
                'name'     => 'photo.jpg',
                'tmp_name' => '/tmp/php123',
                'size'     => 1024,
                'error'    => 0,
            ),
        ) );

        $result = $this->bridge->handle_upload( $request );

        // Should error because it expects 'file' key, not 'wrong_key'
        $this->assertInstanceOf( 'WP_Error', $result );
        $this->assertSame( 'no_file', $result->get_error_code() );
    }

    public function test_upload_route_uses_post_method() {
        // File uploads MUST use POST, not PUT or PATCH.
        // GET would not support file bodies.
        $routes = rest_get_server()->get_routes();
        $route  = $routes['/wp-koenig/v1/upload'];

        // Check that POST is among the allowed methods
        $methods = array();
        foreach ( $route as $endpoint ) {
            $methods = array_merge( $methods, array_keys( $endpoint['methods'] ) );
        }
        $this->assertContains( 'POST', $methods );
    }
}
