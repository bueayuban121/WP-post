<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

get_header();
?>
<section class="hero">
    <article class="hero-card">
        <div class="hero-copy">
            <span class="eyebrow">Modern Apparel</span>
            <h1>Minimal fashion with a sharper silhouette.</h1>
            <p>Temporary storefront theme for a clothing brand. It keeps the site live, readable, and premium-looking while the full design is being rebuilt.</p>
            <div class="hero-actions">
                <a class="button-primary" href="<?php echo esc_url(home_url('/shop')); ?>">Shop Collection</a>
                <a class="button-secondary" href="<?php echo esc_url(home_url('/blog')); ?>">Read Journal</a>
            </div>
        </div>
    </article>
    <aside class="hero-card hero-visual" aria-hidden="true"></aside>
</section>

<section class="content-grid">
    <main class="post-list">
        <?php if (have_posts()) : ?>
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('post-card hero-card'); ?>>
                    <div class="post-meta"><?php echo esc_html(get_the_date()); ?></div>
                    <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                    <div class="post-excerpt"><?php the_excerpt(); ?></div>
                </article>
            <?php endwhile; ?>
            <?php the_posts_pagination(); ?>
        <?php else : ?>
            <article class="hero-card empty-state">
                <h2>No posts yet</h2>
                <p>This temporary theme is live. Add products, collections, or blog posts from WordPress admin.</p>
            </article>
        <?php endif; ?>
    </main>

    <aside class="sidebar">
        <section class="panel-card">
            <h3>Brand Direction</h3>
            <ul>
                <li>Monochrome apparel</li>
                <li>Modern wardrobe essentials</li>
                <li>Clean silhouettes and premium fabrics</li>
            </ul>
        </section>
        <section class="panel-card">
            <h3>Quick Setup</h3>
            <ul>
                <li>Upload logo in Site Identity</li>
                <li>Create Shop, Blog, About pages</li>
                <li>Set featured images for posts</li>
            </ul>
        </section>
    </aside>
</section>
<?php
get_footer();
