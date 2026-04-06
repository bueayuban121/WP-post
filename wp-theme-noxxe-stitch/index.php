<?php
declare(strict_types=1);

get_header();
?>
<main class="min-h-screen bg-[#131313] px-6 py-24 text-white md:px-12">
    <div class="mx-auto max-w-4xl">
        <?php if (have_posts()) : ?>
            <?php while (have_posts()) : the_post(); ?>
                <article <?php post_class('mb-16'); ?>>
                    <h2 class="mb-3 text-4xl font-semibold">
                        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                    </h2>
                    <div class="text-sm uppercase tracking-[0.3em] text-neutral-400"><?php echo esc_html(get_the_date()); ?></div>
                    <div class="mt-6 text-neutral-200"><?php the_excerpt(); ?></div>
                </article>
            <?php endwhile; ?>
        <?php else : ?>
            <p>No content yet.</p>
        <?php endif; ?>
    </div>
</main>
<?php
get_footer();
