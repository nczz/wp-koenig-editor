<?php

class RestAPITest extends WP_UnitTestCase {

    /** @var WPKoenig\RestAPI */
    private $api;

    public function set_up() {
        parent::set_up();
        $this->api = new WPKoenig\RestAPI();
        do_action( 'rest_api_init' );
    }

    public function test_oembed_route_registered() {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey( '/wp-koenig/v1/oembed', $routes );
    }

    public function test_fetch_url_metadata_route_registered() {
        $routes = rest_get_server()->get_routes();

        $this->assertArrayHasKey( '/wp-koenig/v1/fetch-url-metadata', $routes );
    }

    public function test_check_edit_permission_denied_without_capability() {
        // Set current user to subscriber (no edit_posts)
        $user_id = self::factory()->user->create( array( 'role' => 'subscriber' ) );
        wp_set_current_user( $user_id );

        $this->assertFalse( $this->api->check_edit_permission() );
    }

    public function test_check_edit_permission_allowed_for_editor() {
        $user_id = self::factory()->user->create( array( 'role' => 'editor' ) );
        wp_set_current_user( $user_id );

        $this->assertTrue( $this->api->check_edit_permission() );
    }

    public function test_get_oembed_returns_error_for_empty_url() {
        $request = new WP_REST_Request( 'GET', '/wp-koenig/v1/oembed' );
        $request->set_param( 'url', '' );

        $result = $this->api->get_oembed( $request );

        $this->assertInstanceOf( 'WP_Error', $result );
        $this->assertSame( 'missing_url', $result->get_error_code() );
    }

    public function test_fetch_url_metadata_rejects_ftp_scheme() {
        $request = new WP_REST_Request( 'GET', '/wp-koenig/v1/fetch-url-metadata' );
        $request->set_param( 'url', 'ftp://evil.com/file' );

        $result = $this->api->fetch_url_metadata( $request );

        $this->assertInstanceOf( 'WP_Error', $result );
        $this->assertSame( 'invalid_scheme', $result->get_error_code() );
    }

    public function test_fetch_url_metadata_rejects_javascript_scheme() {
        $request = new WP_REST_Request( 'GET', '/wp-koenig/v1/fetch-url-metadata' );
        $request->set_param( 'url', 'javascript:alert(1)' );

        $result = $this->api->fetch_url_metadata( $request );

        $this->assertInstanceOf( 'WP_Error', $result );
    }

    public function test_parse_meta_tags_extracts_og_title() {
        $html = '<html><head><meta property="og:title" content="My Page Title"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'My Page Title', $result['title'] );
    }

    public function test_parse_meta_tags_og_description_overrides_description() {
        $html = '<html><head>'
            . '<meta name="description" content="Basic description">'
            . '<meta property="og:description" content="OG description">'
            . '</head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'OG description', $result['description'] );
    }

    public function test_parse_meta_tags_extracts_og_image() {
        $html = '<html><head><meta property="og:image" content="https://example.com/image.jpg"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'https://example.com/image.jpg', $result['thumbnail'] );
    }

    public function test_parse_meta_tags_converts_relative_favicon() {
        $html = '<html><head><link rel="icon" href="/favicon.ico"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'https://example.com/favicon.ico', $result['icon'] );
    }

    public function test_parse_meta_tags_title_fallback() {
        $html = '<html><head><title>Fallback Title</title></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'Fallback Title', $result['title'] );
    }

    public function test_parse_meta_tags_decodes_html_entities() {
        $html = '<html><head><meta property="og:title" content="Rock &amp; Roll"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'Rock & Roll', $result['title'] );
    }

    // --- Behavioral tests: real-world HTML and security ---

    public function test_parse_meta_tags_returns_defaults_for_empty_html() {
        // A page that returned empty body (timeout, empty response).
        // Should not crash, should return all fields with safe defaults.
        $result = $this->invoke_parse_meta_tags( '', 'https://example.com/page' );

        $this->assertSame( 'https://example.com/page', $result['url'] );
        $this->assertSame( '', $result['title'] );
        $this->assertSame( '', $result['description'] );
        $this->assertSame( '', $result['thumbnail'] );
        $this->assertSame( '', $result['icon'] );
    }

    public function test_parse_meta_tags_og_title_overrides_title_tag() {
        // Many sites have "Page Title - Site Name" in <title> but cleaner og:title.
        // og:title should win because bookmark cards display it prominently.
        $html = '<html><head>'
            . '<title>My Article - Example Blog | News Site</title>'
            . '<meta property="og:title" content="My Article">'
            . '</head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/article' );

        $this->assertSame( 'My Article', $result['title'] );
    }

    public function test_parse_meta_tags_absolute_favicon_not_doubled() {
        // Site uses absolute URL for favicon (common on CDN-hosted sites).
        // Should NOT prepend scheme://host again.
        $html = '<html><head><link rel="icon" href="https://cdn.example.com/favicon.ico"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'https://cdn.example.com/favicon.ico', $result['icon'] );
    }

    public function test_parse_meta_tags_extracts_publisher_from_og_site_name() {
        // Ghost/WordPress bookmark cards show publisher name.
        $html = '<html><head><meta property="og:site_name" content="TechCrunch"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://techcrunch.com/article' );

        $this->assertSame( 'TechCrunch', $result['publisher'] );
    }

    public function test_parse_meta_tags_extracts_author() {
        $html = '<html><head><meta name="author" content="Jane Doe"></head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/article' );

        $this->assertSame( 'Jane Doe', $result['author'] );
    }

    public function test_parse_meta_tags_description_falls_back_when_no_og() {
        // Site only has <meta name="description">, no og:description.
        // Should still capture it for the bookmark card.
        $html = '<html><head>'
            . '<meta name="description" content="A regular meta description">'
            . '</head><body></body></html>';

        $result = $this->invoke_parse_meta_tags( $html, 'https://example.com/page' );

        $this->assertSame( 'A regular meta description', $result['description'] );
    }

    public function test_fetch_url_metadata_rejects_data_scheme() {
        // data: URIs could be used for SSRF or local file exfiltration.
        $request = new WP_REST_Request( 'GET', '/wp-koenig/v1/fetch-url-metadata' );
        $request->set_param( 'url', 'data:text/html,<h1>evil</h1>' );

        $result = $this->api->fetch_url_metadata( $request );

        $this->assertInstanceOf( 'WP_Error', $result );
    }

    public function test_check_edit_permission_allowed_for_author() {
        // Authors can edit their own posts, so they need access to
        // oembed/bookmark endpoints while writing.
        $user_id = self::factory()->user->create( array( 'role' => 'author' ) );
        wp_set_current_user( $user_id );

        $this->assertTrue( $this->api->check_edit_permission() );
    }

    /**
     * Helper to invoke the private parse_meta_tags method via Reflection.
     */
    private function invoke_parse_meta_tags( $html, $url ) {
        $reflection = new ReflectionMethod( WPKoenig\RestAPI::class, 'parse_meta_tags' );
        $reflection->setAccessible( true );
        return $reflection->invoke( $this->api, $html, $url );
    }
}
