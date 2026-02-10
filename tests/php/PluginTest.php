<?php

class PluginTest extends WP_UnitTestCase {

    public function test_enabled_post_types_default() {
        delete_option( 'wp_koenig_enabled_post_types' );

        $types = WPKoenig\Plugin::enabled_post_types();

        $this->assertSame( array( 'post' ), $types );
    }

    public function test_enabled_post_types_returns_option_value() {
        update_option( 'wp_koenig_enabled_post_types', array( 'post', 'page' ) );

        $types = WPKoenig\Plugin::enabled_post_types();

        $this->assertSame( array( 'post', 'page' ), $types );
    }

    public function test_enabled_post_types_non_array_returns_default() {
        update_option( 'wp_koenig_enabled_post_types', 'not-an-array' );

        $types = WPKoenig\Plugin::enabled_post_types();

        $this->assertSame( array( 'post' ), $types );
    }

    public function test_is_enabled_for_post_returns_true() {
        delete_option( 'wp_koenig_enabled_post_types' );

        $this->assertTrue( WPKoenig\Plugin::is_enabled_for( 'post' ) );
    }

    public function test_is_enabled_for_page_returns_false() {
        delete_option( 'wp_koenig_enabled_post_types' );

        $this->assertFalse( WPKoenig\Plugin::is_enabled_for( 'page' ) );
    }

    public function test_singleton_returns_same_instance() {
        $a = WPKoenig\Plugin::instance();
        $b = WPKoenig\Plugin::instance();

        $this->assertSame( $a, $b );
    }

    // --- Behavioral tests ---

    public function test_enabled_post_types_after_option_update() {
        // Admin changes enabled post types in settings.
        // The change should take effect immediately, not require page reload.
        delete_option( 'wp_koenig_enabled_post_types' );
        $this->assertSame( array( 'post' ), WPKoenig\Plugin::enabled_post_types() );

        update_option( 'wp_koenig_enabled_post_types', array( 'post', 'page' ) );
        $this->assertSame( array( 'post', 'page' ), WPKoenig\Plugin::enabled_post_types() );
    }

    public function test_is_enabled_for_checks_current_option_value() {
        // Initially only 'post' is enabled
        delete_option( 'wp_koenig_enabled_post_types' );
        $this->assertFalse( WPKoenig\Plugin::is_enabled_for( 'page' ) );

        // After enabling 'page', it should return true
        update_option( 'wp_koenig_enabled_post_types', array( 'post', 'page' ) );
        $this->assertTrue( WPKoenig\Plugin::is_enabled_for( 'page' ) );
    }
}
