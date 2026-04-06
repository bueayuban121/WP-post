<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

get_header();
?>

<section class="page-shell">
    <main class="page-main">
        <?php if (have_posts()) : ?>
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('page-card'); ?>>
                    <header class="page-header">
                        <span class="eyebrow">Brand Page</span>
                        <h1 class="page-title"><?php the_title(); ?></h1>
                    </header>

                    <?php if (has_post_thumbnail()) : ?>
                        <figure class="page-featured">
                            <?php the_post_thumbnail('large'); ?>
                        </figure>
                    <?php endif; ?>

                    <div class="entry-content">
                        <?php the_content(); ?>
                    </div>
                </article>
            <?php endwhile; ?>
        <?php else : ?>
            <article class="page-card empty-state">
                <h1>Page not found</h1>
                <p>This page is not available right now.</p>
            </article>
        <?php endif; ?>
    </main>
</section>

<?php
get_footer();
