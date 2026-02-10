<?php
/**
 * Settings page template.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="wrap">
    <h1><?php esc_html_e( 'Koenig Editor Settings', 'wp-koenig-editor' ); ?></h1>
    <form method="post" action="options.php">
        <?php
        settings_fields( 'wp_koenig_settings' );
        do_settings_sections( 'wp-koenig-editor' );
        submit_button();
        ?>
    </form>
</div>
