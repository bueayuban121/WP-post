<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

get_header();
?>

<section class="page-shell">
    <main class="page-main">
        <article class="page-card empty-state">
            <span class="eyebrow">404</span>
            <h1 class="page-title">This page is not available.</h1>
            <p>The link may be outdated or the content may have been moved while the site is being rebuilt.</p>
            <div class="hero-actions">
                <a class="button-primary" href="<?php echo esc_url(home_url('/')); ?>">Back Home</a>
                <a class="button-secondary" href="<?php echo esc_url(home_url('/blog')); ?>">Open Journal</a>
            </div>
        </article>
    </main>
</section>

<?php
get_footer();
