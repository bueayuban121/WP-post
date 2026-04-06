<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="site-shell">
    <header class="site-header">
        <div class="site-header__inner">
            <a class="brand-mark" href="<?php echo esc_url(home_url('/')); ?>">NOX<span>XE</span></a>
            <nav class="nav-links">
                <a href="<?php echo esc_url(home_url('/')); ?>">Home</a>
                <a href="<?php echo esc_url(home_url('/shop')); ?>">Shop</a>
                <a href="<?php echo esc_url(home_url('/blog')); ?>">Journal</a>
                <a href="<?php echo esc_url(home_url('/about')); ?>">About</a>
            </nav>
        </div>
    </header>
