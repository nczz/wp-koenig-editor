<?php

class SettingsTest extends WP_UnitTestCase {

    /** @var WPKoenig\Settings */
    private $settings;

    public function set_up() {
        parent::set_up();
        $this->settings = new WPKoenig\Settings();
    }

    public function test_sanitize_post_types_filters_invalid() {
        // 'nonexistent_type' doesn't exist
        $result = $this->settings->sanitize_post_types( array( 'post', 'nonexistent_type' ) );

        $this->assertContains( 'post', $result );
        $this->assertNotContains( 'nonexistent_type', $result );
    }

    public function test_sanitize_post_types_non_array_returns_empty() {
        $result = $this->settings->sanitize_post_types( 'not-an-array' );

        $this->assertSame( array(), $result );
    }

    public function test_add_action_links_prepends_settings_link() {
        $links = array( '<a href="deactivate">Deactivate</a>' );
        $result = $this->settings->add_action_links( $links );

        $this->assertCount( 2, $result );
        $this->assertStringContainsString( 'Settings', $result[0] );
        $this->assertStringContainsString( 'wp-koenig-editor', $result[0] );
    }

    // --- Behavioral tests ---

    public function test_sanitize_post_types_empty_array_returns_empty() {
        // User unchecks all post types in settings. Should save as empty,
        // not fall back to default ['post'] (that's get_option's job).
        $result = $this->settings->sanitize_post_types( array() );

        $this->assertSame( array(), $result );
    }

    public function test_sanitize_post_types_preserves_valid_types_only() {
        // Malicious form submission includes nonexistent post types.
        // Should be filtered out, keeping only real post types.
        $result = $this->settings->sanitize_post_types( array( 'post', 'page', 'hacked_type', '../etc/passwd' ) );

        $this->assertContains( 'post', $result );
        $this->assertContains( 'page', $result );
        $this->assertNotContains( 'hacked_type', $result );
        $this->assertNotContains( '../etc/passwd', $result );
    }

    public function test_settings_link_points_to_correct_admin_page() {
        $links = $this->settings->add_action_links( array() );

        // The link should go to options-general.php?page=wp-koenig-editor
        $this->assertStringContainsString( 'options-general.php', $links[0] );
        $this->assertStringContainsString( 'page=wp-koenig-editor', $links[0] );
    }
}
