<?php
/**
 * Koenig Editor page template.
 *
 * @var array $post_data Post data prepared by Editor class.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$dark_mode       = get_option( 'wp_koenig_dark_mode', false );
$show_word_count = get_option( 'wp_koenig_show_word_count', true );
?>
<style>
    /* Hide default admin content area padding and let editor take over */
    #wpbody-content {
        padding-bottom: 0;
    }
    #wpfooter {
        display: none;
    }
    .koenig-editor-wrap {
        position: fixed;
        top: 32px; /* WordPress admin bar height */
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 99999;
        background: <?php echo $dark_mode ? '#1a1a2e' : '#ffffff'; ?>;
        display: flex;
        flex-direction: column;
    }
    /* Responsive: admin bar is 46px on mobile */
    @media screen and (max-width: 782px) {
        .koenig-editor-wrap {
            top: 46px;
        }
    }
    /* Hide the admin menu when editor is active */
    #adminmenuwrap,
    #adminmenuback,
    #adminmenumain {
        display: none !important;
    }
    #wpcontent,
    #wpfooter {
        margin-left: 0 !important;
    }
</style>

<div class="koenig-editor-wrap">
    <?php if ( ! empty( $lock_holder ) ) : ?>
    <div class="koenig-post-lock-warning" style="background:#fff3cd;color:#856404;padding:10px 20px;text-align:center;font-size:14px;border-bottom:1px solid #ffc107;">
        <?php
        printf(
            /* translators: %s: user display name */
            esc_html__( '%s is currently editing this post. If you take over, the other user will lose unsaved changes.', 'wp-koenig-editor' ),
            '<strong>' . esc_html( $lock_holder ) . '</strong>'
        );
        ?>
    </div>
    <?php endif; ?>
    <div id="koenig-editor-root"></div>
</div>

<script>
    // Heartbeat: refresh post lock so other users see our lock.
    (function() {
        if (typeof jQuery !== 'undefined' && typeof wp !== 'undefined' && wp.heartbeat) {
            var postId = <?php echo (int) $post_data['id']; ?>;
            jQuery(document).on('heartbeat-send', function(e, data) {
                data['wp-refresh-post-lock'] = { post_id: postId };
            });
        }
    })();
</script>
<script>
    window.wpKoenigConfig = {
        postData: <?php echo wp_json_encode( $post_data ); ?>,
        restUrl: <?php echo wp_json_encode( esc_url_raw( rest_url() ) ); ?>,
        restNonce: <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>,
        uploadUrl: <?php echo wp_json_encode( esc_url_raw( rest_url( 'wp-koenig/v1/upload' ) ) ); ?>,
        oembedUrl: <?php echo wp_json_encode( esc_url_raw( rest_url( 'wp-koenig/v1/oembed' ) ) ); ?>,
        bookmarkUrl: <?php echo wp_json_encode( esc_url_raw( rest_url( 'wp-koenig/v1/fetch-url-metadata' ) ) ); ?>,
        siteUrl: <?php echo wp_json_encode( esc_url_raw( home_url() ) ); ?>,
        adminUrl: <?php echo wp_json_encode( esc_url_raw( admin_url() ) ); ?>,
        editPostListUrl: <?php echo wp_json_encode( esc_url_raw( admin_url( 'edit.php?post_type=' . $post_data['post_type'] ) ) ); ?>,
        darkMode: <?php echo wp_json_encode( (bool) $dark_mode ); ?>,
        showWordCount: <?php echo wp_json_encode( (bool) $show_word_count ); ?>,
    };
</script>
