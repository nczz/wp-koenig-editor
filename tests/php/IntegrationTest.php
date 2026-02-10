<?php

/**
 * Cross-module integration tests.
 *
 * These tests verify behavior that spans multiple classes,
 * ensuring the full lifecycle works correctly end-to-end.
 */
class IntegrationTest extends WP_UnitTestCase {

    /**
     * Full save → revision → restore lifecycle.
     *
     * When a user edits a Koenig post, saves it multiple times,
     * then restores an older revision, the Lexical state should
     * be restored alongside the post content.
     */
    public function test_save_revision_restore_lifecycle() {
        $storage = new WPKoenig\PostStorage();

        // 1. Create a post and mark it as Koenig-edited
        $post_id = self::factory()->post->create( array(
            'post_content' => '<p>Version 1</p>',
        ) );
        $post = get_post( $post_id );

        // 2. Save initial Lexical state (simulates first save from editor)
        $storage->update_lexical_state( '{"root":{"children":[{"text":"Version 1"}]}}', $post );
        clean_post_cache( $post_id );

        // Verify meta is set
        $this->assertSame( '1', get_post_meta( $post_id, '_wp_koenig_editor', true ) );

        // 3. Create a revision (simulates WordPress auto-revision on save)
        $revision_1_id = wp_save_post_revision( $post_id );

        // Copy lexical state to revision (simulates _wp_post_revision_fields hook)
        global $wpdb;
        $wpdb->update(
            $wpdb->posts,
            array( 'post_content_filtered' => '{"root":{"children":[{"text":"Version 1"}]}}' ),
            array( 'ID' => $revision_1_id )
        );

        // 4. User makes another edit
        wp_update_post( array(
            'ID'           => $post_id,
            'post_content' => '<p>Version 2</p>',
        ) );
        $post = get_post( $post_id );
        $storage->update_lexical_state( '{"root":{"children":[{"text":"Version 2"}]}}', $post );
        clean_post_cache( $post_id );

        // Verify current state is Version 2
        $this->assertSame(
            '{"root":{"children":[{"text":"Version 2"}]}}',
            get_post( $post_id )->post_content_filtered
        );

        // 5. User clicks "Restore" on the Version 1 revision
        $storage->restore_revision( $post_id, $revision_1_id );
        clean_post_cache( $post_id );

        // 6. Verify Lexical state is restored to Version 1
        $this->assertSame(
            '{"root":{"children":[{"text":"Version 1"}]}}',
            get_post( $post_id )->post_content_filtered
        );
    }

    /**
     * Plugin settings affect Editor behavior.
     *
     * When admin enables Koenig for 'page' post type in settings,
     * the Editor class should start disabling Gutenberg for pages.
     */
    public function test_settings_affect_editor_behavior() {
        $editor = new WPKoenig\Editor();

        // Initially only 'post' is enabled (default)
        delete_option( 'wp_koenig_enabled_post_types' );

        $page_id = self::factory()->post->create( array( 'post_type' => 'page' ) );
        $page    = get_post( $page_id );

        // Page should NOT have Gutenberg disabled
        $this->assertTrue( $editor->disable_gutenberg( true, $page ) );

        // Admin enables 'page' in settings
        update_option( 'wp_koenig_enabled_post_types', array( 'post', 'page' ) );

        // Now page should have Gutenberg disabled
        $this->assertFalse( $editor->disable_gutenberg( true, $page ) );

        // Clean up
        delete_option( 'wp_koenig_enabled_post_types' );
    }

    /**
     * Revision fields correctly track Koenig posts across multiple calls.
     *
     * WordPress calls _wp_post_revision_fields for every post being saved.
     * The static variable pollution bug means one Koenig post's fields
     * could leak into the next non-Koenig post. This tests the full sequence.
     */
    public function test_revision_fields_isolation_across_multiple_posts() {
        $storage = new WPKoenig\PostStorage();

        // Create 3 posts: Koenig, regular, Koenig
        $koenig_1  = self::factory()->post->create();
        $regular   = self::factory()->post->create();
        $koenig_2  = self::factory()->post->create();

        update_post_meta( $koenig_1, '_wp_koenig_editor', '1' );
        update_post_meta( $koenig_2, '_wp_koenig_editor', '1' );

        $base_fields = array( 'post_title' => 'Title', 'post_content' => 'Content' );

        // Simulate WordPress calling the filter for each post in sequence
        $fields_1 = $storage->add_revision_field( $base_fields, array( 'ID' => $koenig_1 ) );
        $this->assertArrayHasKey( 'post_content_filtered', $fields_1 );

        $fields_2 = $storage->add_revision_field( $fields_1, array( 'ID' => $regular ) );
        $this->assertArrayNotHasKey( 'post_content_filtered', $fields_2 );

        $fields_3 = $storage->add_revision_field( $fields_2, array( 'ID' => $koenig_2 ) );
        $this->assertArrayHasKey( 'post_content_filtered', $fields_3 );
    }

    /**
     * RestAPI permission check uses same capability as Editor.
     *
     * Both the REST API endpoints (oembed, bookmark) and the editor itself
     * require edit_posts. A user who can see the editor should always be
     * able to use its REST endpoints — otherwise the editor loads but
     * bookmark/embed cards fail silently.
     */
    public function test_rest_api_and_editor_share_permission_model() {
        $api = new WPKoenig\RestAPI();

        // Contributor can edit_posts (their own)
        $user_id = self::factory()->user->create( array( 'role' => 'contributor' ) );
        wp_set_current_user( $user_id );

        $this->assertTrue( $api->check_edit_permission() );
    }
}
