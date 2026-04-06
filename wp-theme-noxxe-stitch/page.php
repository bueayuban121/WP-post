<?php
declare(strict_types=1);

get_header();
?>
<main class="min-h-screen bg-[#131313] px-6 py-24 text-white md:px-12">
    <div class="mx-auto max-w-4xl">
        <?php if (have_posts()) : ?>
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('prose prose-invert max-w-none'); ?>>
                    <h1><?php the_title(); ?></h1>
                    <?php the_content(); ?>
                </article>
            <?php endwhile; ?>
        <?php endif; ?>
    </div>
</main>
<?php
get_footer();
