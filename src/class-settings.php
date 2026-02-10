<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Settings {

    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
        add_action( 'admin_init', array( $this, 'register_settings' ) );
        add_filter( 'plugin_action_links_' . WP_KOENIG_PLUGIN_BASENAME, array( $this, 'add_action_links' ) );
    }

    public function add_settings_page() {
        add_options_page(
            __( 'Koenig Editor', 'wp-koenig-editor' ),
            __( 'Koenig Editor', 'wp-koenig-editor' ),
            'manage_options',
            'wp-koenig-editor',
            array( $this, 'render_settings_page' )
        );
    }

    public function register_settings() {
        // Enabled post types.
        register_setting( 'wp_koenig_settings', 'wp_koenig_enabled_post_types', array(
            'type'              => 'array',
            'sanitize_callback' => array( $this, 'sanitize_post_types' ),
            'default'           => array( 'post' ),
        ) );

        // Dark mode.
        register_setting( 'wp_koenig_settings', 'wp_koenig_dark_mode', array(
            'type'              => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default'           => false,
        ) );

        // Show word count.
        register_setting( 'wp_koenig_settings', 'wp_koenig_show_word_count', array(
            'type'              => 'boolean',
            'sanitize_callback' => 'rest_sanitize_boolean',
            'default'           => true,
        ) );

        // Section.
        add_settings_section(
            'wp_koenig_general',
            __( 'General Settings', 'wp-koenig-editor' ),
            '__return_false',
            'wp-koenig-editor'
        );

        add_settings_field(
            'wp_koenig_enabled_post_types',
            __( 'Enable for Post Types', 'wp-koenig-editor' ),
            array( $this, 'render_post_types_field' ),
            'wp-koenig-editor',
            'wp_koenig_general'
        );

        add_settings_field(
            'wp_koenig_dark_mode',
            __( 'Dark Mode', 'wp-koenig-editor' ),
            array( $this, 'render_dark_mode_field' ),
            'wp-koenig-editor',
            'wp_koenig_general'
        );

        add_settings_field(
            'wp_koenig_show_word_count',
            __( 'Show Word Count', 'wp-koenig-editor' ),
            array( $this, 'render_word_count_field' ),
            'wp-koenig-editor',
            'wp_koenig_general'
        );
    }

    public function sanitize_post_types( $input ) {
        if ( ! is_array( $input ) ) {
            return array( 'post' );
        }
        $valid_types = get_post_types( array( 'show_ui' => true ), 'names' );
        return array_values( array_intersect( $input, $valid_types ) );
    }

    public function render_post_types_field() {
        $enabled    = Plugin::enabled_post_types();
        $post_types = get_post_types( array( 'show_ui' => true ), 'objects' );

        // Exclude built-in non-content types.
        unset( $post_types['attachment'], $post_types['wp_block'], $post_types['wp_template'], $post_types['wp_template_part'], $post_types['wp_navigation'] );

        foreach ( $post_types as $type ) {
            $checked = in_array( $type->name, $enabled, true ) ? 'checked' : '';
            printf(
                '<label style="display:block;margin-bottom:6px;"><input type="checkbox" name="wp_koenig_enabled_post_types[]" value="%s" %s /> %s</label>',
                esc_attr( $type->name ),
                $checked,
                esc_html( $type->labels->name )
            );
        }
    }

    public function render_dark_mode_field() {
        $value = get_option( 'wp_koenig_dark_mode', false );
        printf(
            '<label><input type="checkbox" name="wp_koenig_dark_mode" value="1" %s /> %s</label>',
            checked( $value, true, false ),
            esc_html__( 'Enable dark mode for the editor', 'wp-koenig-editor' )
        );
    }

    public function render_word_count_field() {
        $value = get_option( 'wp_koenig_show_word_count', true );
        printf(
            '<label><input type="checkbox" name="wp_koenig_show_word_count" value="1" %s /> %s</label>',
            checked( $value, true, false ),
            esc_html__( 'Display word count in the editor', 'wp-koenig-editor' )
        );
    }

    public function render_settings_page() {
        require WP_KOENIG_PLUGIN_DIR . 'src/views/settings-page.php';
    }

    public function add_action_links( $links ) {
        $settings_link = sprintf(
            '<a href="%s">%s</a>',
            esc_url( admin_url( 'options-general.php?page=wp-koenig-editor' ) ),
            __( 'Settings', 'wp-koenig-editor' )
        );
        array_unshift( $links, $settings_link );
        return $links;
    }
}
