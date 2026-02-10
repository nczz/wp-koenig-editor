<?php

class PostStorageTest extends WP_UnitTestCase {

    /** @var WPKoenig\PostStorage */
    private $storage;

    public function set_up() {
        parent::set_up();
        $this->storage = new WPKoenig\PostStorage();
    }

    public function test_get_lexical_state_returns_post_content_filtered() {
        $post_id = self::factory()->post->create();
        global $wpdb;
        $wpdb->update( $wpdb->posts, array( 'post_content_filtered' => '{"root":{}}' ), array( 'ID' => $post_id ) );
        clean_post_cache( $post_id );

        $result = $this->storage->get_lexical_state( array( 'id' => $post_id ) );

        $this->assertSame( '{"root":{}}', $result );
    }

    public function test_get_lexical_state_returns_empty_for_nonexistent_post() {
        $result = $this->storage->get_lexical_state( array( 'id' => 999999 ) );

        $this->assertSame( '', $result );
    }

    public function test_update_lexical_state_writes_valid_json() {
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );
        $json    = '{"root":{"children":[]}}';

        $this->storage->update_lexical_state( $json, $post );
        clean_post_cache( $post_id );

        $updated = get_post( $post_id );
        $this->assertSame( $json, $updated->post_content_filtered );
        $this->assertSame( '1', get_post_meta( $post_id, '_wp_koenig_editor', true ) );
    }

    public function test_update_lexical_state_rejects_invalid_json() {
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        $this->storage->update_lexical_state( 'not-json{', $post );
        clean_post_cache( $post_id );

        $updated = get_post( $post_id );
        $this->assertSame( '', $updated->post_content_filtered );
    }

    public function test_update_lexical_state_accepts_empty_string() {
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        // First set some content
        global $wpdb;
        $wpdb->update( $wpdb->posts, array( 'post_content_filtered' => '{"old":"data"}' ), array( 'ID' => $post_id ) );

        $this->storage->update_lexical_state( '', $post );
        clean_post_cache( $post_id );

        $updated = get_post( $post_id );
        $this->assertSame( '', $updated->post_content_filtered );
    }

    public function test_add_revision_field_adds_for_koenig_post() {
        $post_id = self::factory()->post->create();
        update_post_meta( $post_id, '_wp_koenig_editor', '1' );

        $fields = $this->storage->add_revision_field( array( 'post_title' => 'Title' ), array( 'ID' => $post_id ) );

        $this->assertArrayHasKey( 'post_content_filtered', $fields );
    }

    public function test_add_revision_field_removes_for_non_koenig_post() {
        $post_id = self::factory()->post->create();
        // Don't set _wp_koenig_editor meta

        $fields = $this->storage->add_revision_field(
            array( 'post_title' => 'Title', 'post_content_filtered' => 'Leftover' ),
            array( 'ID' => $post_id )
        );

        $this->assertArrayNotHasKey( 'post_content_filtered', $fields );
    }

    public function test_add_revision_field_traces_revision_to_parent() {
        $post_id = self::factory()->post->create();
        update_post_meta( $post_id, '_wp_koenig_editor', '1' );

        // Create a revision
        $revision_id = wp_save_post_revision( $post_id );
        $this->assertIsInt( $revision_id );

        $fields = $this->storage->add_revision_field( array( 'post_title' => 'Title' ), array( 'ID' => $revision_id ) );

        $this->assertArrayHasKey( 'post_content_filtered', $fields );
    }

    public function test_restore_revision_copies_post_content_filtered() {
        $post_id = self::factory()->post->create();
        update_post_meta( $post_id, '_wp_koenig_editor', '1' );

        // Create revision with lexical state
        $revision_id = wp_save_post_revision( $post_id );
        global $wpdb;
        $wpdb->update( $wpdb->posts, array( 'post_content_filtered' => '{"restored":"state"}' ), array( 'ID' => $revision_id ) );
        clean_post_cache( $revision_id );

        $this->storage->restore_revision( $post_id, $revision_id );
        clean_post_cache( $post_id );

        $updated = get_post( $post_id );
        $this->assertSame( '{"restored":"state"}', $updated->post_content_filtered );
    }

    // --- Behavioral tests: real-world edge cases ---

    public function test_update_lexical_state_accepts_json_primitives() {
        // json_decode("null") returns null — but the code checks `null === json_decode($value)`.
        // "null" is valid JSON. This tests whether the code accidentally rejects it.
        // In practice, Lexical always sends objects, so this is defensive.
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        // "true" and "false" are valid JSON and json_decode returns non-null
        $this->storage->update_lexical_state( '"a string"', $post );
        clean_post_cache( $post_id );
        $this->assertSame( '"a string"', get_post( $post_id )->post_content_filtered );
    }

    public function test_revision_field_no_static_pollution_across_posts() {
        // WordPress caches _wp_post_revision_fields in a static variable.
        // If we add post_content_filtered for a Koenig post, the NEXT call
        // for a non-Koenig post must remove it. Otherwise ALL posts get
        // post_content_filtered in their revisions — wasting DB space.
        $koenig_post_id = self::factory()->post->create();
        update_post_meta( $koenig_post_id, '_wp_koenig_editor', '1' );

        $regular_post_id = self::factory()->post->create();
        // No _wp_koenig_editor meta

        // First call: Koenig post — should add the field
        $fields1 = $this->storage->add_revision_field(
            array( 'post_title' => 'Title' ),
            array( 'ID' => $koenig_post_id )
        );
        $this->assertArrayHasKey( 'post_content_filtered', $fields1 );

        // Second call: regular post — must remove the field
        $fields2 = $this->storage->add_revision_field(
            $fields1, // pass the result of first call (simulates static leakage)
            array( 'ID' => $regular_post_id )
        );
        $this->assertArrayNotHasKey( 'post_content_filtered', $fields2 );
    }

    public function test_restore_revision_does_not_crash_for_nonexistent_revision() {
        // User clicks restore on a revision that was already purged (old revisions pruned).
        $post_id = self::factory()->post->create();

        // Should silently return without error
        $this->storage->restore_revision( $post_id, 999999 );

        // Post should remain unchanged
        $post = get_post( $post_id );
        $this->assertNotNull( $post );
    }

    public function test_get_lexical_state_preserves_unicode() {
        // Chinese, Japanese, emoji in editor content must survive round-trip.
        $post_id = self::factory()->post->create();
        $json = '{"root":{"children":[{"text":"你好世界 🌍"}]}}';

        global $wpdb;
        $wpdb->update( $wpdb->posts, array( 'post_content_filtered' => $json ), array( 'ID' => $post_id ) );
        clean_post_cache( $post_id );

        $result = $this->storage->get_lexical_state( array( 'id' => $post_id ) );

        $this->assertSame( $json, $result );
    }

    public function test_update_lexical_state_sets_koenig_meta_on_first_save() {
        // When user first opens classic post in Koenig editor and saves,
        // the _wp_koenig_editor meta is set. Future revisions then track
        // post_content_filtered. This is the "migration" moment.
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        // No meta yet
        $this->assertEmpty( get_post_meta( $post_id, '_wp_koenig_editor', true ) );

        $this->storage->update_lexical_state( '{"root":{}}', $post );

        // Now meta should be set
        $this->assertSame( '1', get_post_meta( $post_id, '_wp_koenig_editor', true ) );
    }
}
