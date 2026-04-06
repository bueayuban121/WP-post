<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

require_once get_template_directory() . '/inc/stitch.php';

function noxxe_stitch_setup(): void
{
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
}
add_action('after_setup_theme', 'noxxe_stitch_setup');

function noxxe_stitch_enqueue_assets(): void
{
    wp_enqueue_style('noxxe-stitch-style', get_stylesheet_uri(), [], '1.0.0');
    wp_enqueue_style(
        'noxxe-stitch-fonts',
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,200;0,6..72,300;0,6..72,400;1,6..72,200&display=swap',
        [],
        null
    );
    wp_enqueue_style(
        'noxxe-stitch-icons',
        'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
        [],
        null
    );

    wp_register_script(
        'noxxe-stitch-tailwind',
        'https://cdn.tailwindcss.com?plugins=forms,container-queries',
        [],
        null,
        false
    );

    wp_add_inline_script('noxxe-stitch-tailwind', <<<'JS'
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-primary": "#1a1c1c",
        "surface-container-high": "#2a2a2a",
        "error": "#ffb4ab",
        "tertiary-fixed": "#5f5e5e",
        "on-primary-fixed-variant": "#e2e2e2",
        "primary-fixed-dim": "#454747",
        "surface-container-low": "#1b1b1b",
        "on-secondary": "#1a1c1c",
        "tertiary-container": "#929090",
        "on-surface": "#e2e2e2",
        "surface-container-highest": "#353535",
        "surface-tint": "#c6c6c7",
        "on-primary-container": "#000000",
        "surface-bright": "#393939",
        "inverse-surface": "#e2e2e2",
        "on-primary-fixed": "#ffffff",
        "on-background": "#e2e2e2",
        "surface-variant": "#353535",
        "secondary-fixed-dim": "#ababab",
        "on-secondary-fixed-variant": "#3a3c3c",
        "tertiary": "#e4e2e1",
        "on-surface-variant": "#c6c6c6",
        "primary": "#ffffff",
        "on-secondary-container": "#e2e2e2",
        "outline-variant": "#474747",
        "tertiary-fixed-dim": "#474747",
        "on-tertiary-fixed-variant": "#e4e2e1",
        "on-secondary-fixed": "#1a1c1c",
        "secondary-fixed": "#c6c6c6",
        "secondary-container": "#454747",
        "secondary": "#c6c6c6",
        "on-tertiary": "#1b1c1c",
        "on-error": "#690005",
        "outline": "#919191",
        "on-tertiary-container": "#000000",
        "surface-dim": "#131313",
        "error-container": "#93000a",
        "surface-container-lowest": "#0e0e0e",
        "primary-container": "#d4d4d4",
        "on-error-container": "#ffdad6",
        "inverse-primary": "#5d5f5f",
        "inverse-on-surface": "#303030",
        "surface": "#131313",
        "primary-fixed": "#5d5f5f",
        "on-tertiary-fixed": "#ffffff",
        "background": "#131313",
        "surface-container": "#1f1f1f"
      },
      fontFamily: {
        "headline": ["Newsreader"],
        "body": ["Inter"],
        "label": ["Inter"]
      },
      borderRadius: {
        "DEFAULT": "0rem",
        "lg": "0rem",
        "xl": "0rem",
        "full": "9999px"
      }
    }
  }
}
JS, 'before');

    wp_enqueue_script('noxxe-stitch-tailwind');
}
add_action('wp_enqueue_scripts', 'noxxe_stitch_enqueue_assets');

function noxxe_stitch_bootstrap_pages(): void
{
    $pages = [
        'about' => 'About',
        'collection' => 'Collection',
        'lookbook' => 'Lookbook',
        'product' => 'Product',
        'terms' => 'Terms',
        'privacy-policy' => 'Privacy Policy',
    ];

    foreach ($pages as $slug => $title) {
        $existing = get_page_by_path($slug, OBJECT, 'page');

        if ($existing instanceof WP_Post) {
            continue;
        }

        wp_insert_post([
            'post_title' => $title,
            'post_name' => $slug,
            'post_type' => 'page',
            'post_status' => 'publish',
        ]);
    }
}
add_action('after_switch_theme', 'noxxe_stitch_bootstrap_pages');
