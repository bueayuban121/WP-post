<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

get_header();
?>

<section class="article-shell">
    <main class="article-main">
        <?php if (have_posts()) : ?>
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('article-card'); ?>>
                    <header class="article-header">
                        <span class="eyebrow">Journal</span>
                        <h1 class="article-title"><?php the_title(); ?></h1>
                        <div class="article-meta">
                            <span><?php echo esc_html(get_the_date()); ?></span>
                            <span><?php echo esc_html(get_the_author()); ?></span>
                        </div>
                    </header>

                    <?php if (has_post_thumbnail()) : ?>
                        <figure class="article-featured">
                            <?php the_post_thumbnail('large'); ?>
                        </figure>
                    <?php endif; ?>

                    <div class="entry-content">
                        <?php the_content(); ?>
                    </div>
                </article>
            <?php endwhile; ?>
        <?php else : ?>
            <article class="article-card empty-state">
                <h1>Post not found</h1>
                <p>This article is not available right now.</p>
            </article>
        <?php endif; ?>
    </main>

    <aside class="article-sidebar">
        <section class="panel-card">
            <h3>Brand Direction</h3>
            <ul>
                <li>Clean editorial layout</li>
                <li>Luxury-inspired reading flow</li>
                <li>Content-first presentation</li>
            </ul>
        </section>
        <section class="panel-card">
            <h3>Quick Links</h3>
            <ul>
                <li><a href="<?php echo esc_url(home_url('/')); ?>">Back to home</a></li>
                <li><a href="<?php echo esc_url(home_url('/blog')); ?>">All journal posts</a></li>
                <li><a href="<?php echo esc_url(home_url('/shop')); ?>">Shop collection</a></li>
            </ul>
        </section>
    </aside>
</section>

<?php
get_footer();
