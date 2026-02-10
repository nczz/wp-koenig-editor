<?php

class EditorTest extends WP_UnitTestCase {

    /** @var WPKoenig\Editor */
    private $editor;

    public function set_up() {
        parent::set_up();
        $this->editor = new WPKoenig\Editor();
        // Ensure 'post' is enabled (default)
        delete_option( 'wp_koenig_enabled_post_types' );
    }

    public function test_disable_gutenberg_returns_false_for_enabled_post_type() {
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        $result = $this->editor->disable_gutenberg( true, $post );

        $this->assertFalse( $result );
    }

    public function test_disable_gutenberg_passes_through_for_disabled_post_type() {
        $post_id = self::factory()->post->create( array( 'post_type' => 'page' ) );
        $post    = get_post( $post_id );

        $result = $this->editor->disable_gutenberg( true, $post );

        $this->assertTrue( $result );
    }

    public function test_replace_editor_returns_original_for_disabled_post_type() {
        $post_id = self::factory()->post->create( array( 'post_type' => 'page' ) );
        $post    = get_post( $post_id );

        $result = $this->editor->replace_editor( false, $post );

        $this->assertFalse( $result );
    }

    public function test_get_post_data_rest_base_uses_post_type_object() {
        // 'post' type has rest_base = 'posts'
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        $this->assertSame( 'posts', $data['rest_base'] );
    }

    public function test_get_post_data_rest_base_fallback_to_post_type() {
        // Register a custom post type without rest_base
        register_post_type( 'custom_cpt', array(
            'public'    => true,
            'show_in_rest' => true,
        ) );
        update_option( 'wp_koenig_enabled_post_types', array( 'custom_cpt' ) );

        $post_id = self::factory()->post->create( array( 'post_type' => 'custom_cpt' ) );
        $post    = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        // Without explicit rest_base, falls back to post_type name
        $this->assertSame( 'custom_cpt', $data['rest_base'] );

        unregister_post_type( 'custom_cpt' );
    }

    public function test_get_post_data_assembles_correct_data() {
        $post_id = self::factory()->post->create( array(
            'post_title'   => 'Test Title',
            'post_content' => '<p>Hello</p>',
            'post_status'  => 'draft',
            'post_name'    => 'test-title',
            'post_excerpt' => 'An excerpt',
        ) );
        $post = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        $this->assertSame( $post_id, $data['id'] );
        $this->assertSame( 'Test Title', $data['title'] );
        $this->assertSame( '<p>Hello</p>', $data['content'] );
        $this->assertSame( 'draft', $data['status'] );
        $this->assertSame( 'test-title', $data['slug'] );
        $this->assertSame( 'An excerpt', $data['excerpt'] );
        $this->assertSame( 'post', $data['post_type'] );
        $this->assertSame( 'posts', $data['rest_base'] );
    }

    // --- Behavioral tests: JS-PHP contract ---

    public function test_get_post_data_featured_media_is_integer() {
        // JS uses `featured_media > 0` to decide whether to fetch image.
        // If PHP returns string "0", JS comparison might break.
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        $this->assertIsInt( $data['featured_media'] );
    }

    public function test_get_post_data_categories_is_array_of_ints() {
        // JS sends categories as [1, 2, 3] to REST API. PHP must provide the same format.
        $cat_id  = self::factory()->category->create();
        $post_id = self::factory()->post->create();
        wp_set_post_categories( $post_id, array( $cat_id ) );
        $post = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        $this->assertIsArray( $data['categories'] );
        $this->assertContains( $cat_id, $data['categories'] );
    }

    public function test_get_post_data_tags_is_array_of_ints() {
        // Same contract as categories — JS expects int array.
        $tag_id  = self::factory()->tag->create();
        $post_id = self::factory()->post->create();
        wp_set_post_tags( $post_id, array( $tag_id ) );
        $post = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        $this->assertIsArray( $data['tags'] );
        $this->assertNotEmpty( $data['tags'] );
    }

    public function test_get_post_data_date_is_iso8601() {
        // JS uses `new Date(postData.date)` — must be parseable ISO 8601.
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        // ISO 8601: must contain T separator and timezone offset (+00:00 or Z)
        $this->assertMatchesRegularExpression( '/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $data['date'] );
    }

    public function test_get_post_data_lexical_state_empty_string_for_new_post() {
        // New post has no Lexical state. JS checks `lexical_state === ''` to decide
        // whether to import HTML content or restore Lexical state.
        // Empty string (not null, not false) is the expected value.
        $post_id = self::factory()->post->create();
        $post    = get_post( $post_id );

        $reflection = new ReflectionMethod( WPKoenig\Editor::class, 'get_post_data' );
        $reflection->setAccessible( true );
        $data = $reflection->invoke( $this->editor, $post );

        $this->assertSame( '', $data['lexical_state'] );
    }

    public function test_disable_gutenberg_handles_null_post_gracefully() {
        // WordPress may call this filter with null post in some edge cases
        // (e.g., during post type registration or bulk operations).
        $result = $this->editor->disable_gutenberg( true, null );

        // Should pass through the original value, not crash
        $this->assertTrue( $result );
    }
}
