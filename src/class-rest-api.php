<?php

namespace WPKoenig;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RestAPI {

    public function __construct() {
        add_action( 'rest_api_init', array( $this, 'register_routes' ) );
    }

    public function register_routes() {
        // oEmbed proxy.
        register_rest_route( 'wp-koenig/v1', '/oembed', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_oembed' ),
            'permission_callback' => array( $this, 'check_edit_permission' ),
            'args'                => array(
                'url' => array(
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'esc_url_raw',
                ),
            ),
        ) );

        // URL metadata for bookmark cards.
        register_rest_route( 'wp-koenig/v1', '/fetch-url-metadata', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'fetch_url_metadata' ),
            'permission_callback' => array( $this, 'check_edit_permission' ),
            'args'                => array(
                'url' => array(
                    'required'          => true,
                    'type'              => 'string',
                    'sanitize_callback' => 'esc_url_raw',
                ),
            ),
        ) );
    }

    public function check_edit_permission() {
        return current_user_can( 'edit_posts' );
    }

    /**
     * Proxy oEmbed requests through WordPress.
     */
    public function get_oembed( $request ) {
        $url = $request->get_param( 'url' );

        if ( empty( $url ) ) {
            return new \WP_Error( 'missing_url', 'URL is required.', array( 'status' => 400 ) );
        }

        require_once ABSPATH . WPINC . '/class-wp-oembed.php';
        $oembed = _wp_oembed_get_object();

        $data = $oembed->get_data( $url );
        if ( ! $data ) {
            return new \WP_Error( 'oembed_failed', 'Could not fetch oEmbed data.', array( 'status' => 422 ) );
        }

        return rest_ensure_response( array(
            'type'          => $data->type ?? '',
            'url'           => $url,
            'title'         => $data->title ?? '',
            'html'          => $data->html ?? '',
            'width'         => $data->width ?? null,
            'height'        => $data->height ?? null,
            'thumbnail_url' => $data->thumbnail_url ?? '',
            'provider_name' => $data->provider_name ?? '',
        ) );
    }

    /**
     * Fetch Open Graph / meta tag data for bookmark cards.
     */
    public function fetch_url_metadata( $request ) {
        $url = $request->get_param( 'url' );

        if ( empty( $url ) ) {
            return new \WP_Error( 'missing_url', 'URL is required.', array( 'status' => 400 ) );
        }

        // Validate URL scheme and use wp_safe_remote_get to prevent SSRF.
        $scheme = wp_parse_url( $url, PHP_URL_SCHEME );
        if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
            return new \WP_Error( 'invalid_scheme', 'Only HTTP(S) URLs are allowed.', array( 'status' => 400 ) );
        }

        $response = wp_safe_remote_get( $url, array(
            'timeout'    => 10,
            'user-agent' => 'Mozilla/5.0 (compatible; WPKoenigEditor/' . WP_KOENIG_VERSION . ')',
            'reject_unsafe_urls' => true,
        ) );

        if ( is_wp_error( $response ) ) {
            return new \WP_Error( 'fetch_failed', 'Could not fetch URL.', array( 'status' => 422 ) );
        }

        $body = wp_remote_retrieve_body( $response );
        $meta = $this->parse_meta_tags( $body, $url );

        return rest_ensure_response( $meta );
    }

    /**
     * Parse Open Graph and standard meta tags from HTML.
     */
    private function parse_meta_tags( $html, $url ) {
        $meta = array(
            'url'         => $url,
            'title'       => '',
            'description' => '',
            'author'      => '',
            'publisher'   => '',
            'thumbnail'   => '',
            'icon'        => '',
        );

        // Title from <title> tag.
        if ( preg_match( '/<title[^>]*>(.*?)<\/title>/is', $html, $matches ) ) {
            $meta['title'] = html_entity_decode( trim( $matches[1] ), ENT_QUOTES, 'UTF-8' );
        }

        // Meta tags.
        if ( preg_match_all( '/<meta\s[^>]*>/is', $html, $meta_tags ) ) {
            foreach ( $meta_tags[0] as $tag ) {
                $name    = '';
                $content = '';

                if ( preg_match( '/(?:property|name)\s*=\s*["\']([^"\']+)["\']/i', $tag, $m ) ) {
                    $name = strtolower( $m[1] );
                }
                if ( preg_match( '/content\s*=\s*["\']([^"\']*?)["\']/i', $tag, $m ) ) {
                    $content = $m[1];
                }

                if ( ! $name || ! $content ) {
                    continue;
                }

                switch ( $name ) {
                    case 'og:title':
                        $meta['title'] = html_entity_decode( $content, ENT_QUOTES, 'UTF-8' );
                        break;
                    case 'og:description':
                    case 'description':
                        if ( empty( $meta['description'] ) || $name === 'og:description' ) {
                            $meta['description'] = html_entity_decode( $content, ENT_QUOTES, 'UTF-8' );
                        }
                        break;
                    case 'og:image':
                        $meta['thumbnail'] = $content;
                        break;
                    case 'og:site_name':
                        $meta['publisher'] = html_entity_decode( $content, ENT_QUOTES, 'UTF-8' );
                        break;
                    case 'author':
                        $meta['author'] = html_entity_decode( $content, ENT_QUOTES, 'UTF-8' );
                        break;
                }
            }
        }

        // Favicon.
        if ( preg_match( '/<link[^>]+rel\s*=\s*["\'](?:shortcut )?icon["\'][^>]+href\s*=\s*["\']([^"\']+)["\']/i', $html, $matches ) ) {
            $icon = $matches[1];
            // Make relative URLs absolute.
            if ( strpos( $icon, '//' ) === false ) {
                $parsed = wp_parse_url( $url );
                $icon   = $parsed['scheme'] . '://' . $parsed['host'] . '/' . ltrim( $icon, '/' );
            }
            $meta['icon'] = $icon;
        }

        return $meta;
    }
}
