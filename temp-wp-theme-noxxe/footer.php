<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}
?>
    <footer class="site-footer">
        <div class="site-footer__inner">
            <span><?php echo esc_html(date_i18n('Y')); ?> NOXXE</span>
            <span>Temporary brand theme for recovery mode.</span>
        </div>
    </footer>
</div>
<?php wp_footer(); ?>
</body>
</html>
