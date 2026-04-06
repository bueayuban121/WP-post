<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function noxxe_temp_theme_setup(): void
{
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
    add_theme_support('align-wide');
    add_theme_support('responsive-embeds');
    add_theme_support('custom-logo');
}
add_action('after_setup_theme', 'noxxe_temp_theme_setup');
