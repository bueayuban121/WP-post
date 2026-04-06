<?php
declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function noxxe_stitch_render(string $slug): void
{
    $path = get_template_directory() . '/raw/' . $slug . '.html';

    if (! file_exists($path)) {
        status_header(404);
        echo '<main class="min-h-screen bg-black text-white p-10">Missing Stitch template: ' . esc_html($slug) . '</main>';
        return;
    }

    $html = (string) file_get_contents($path);
    $html = noxxe_stitch_fix_encoding($html);

    $styles = [];
    if (preg_match_all('/<style[^>]*>(.*?)<\/style>/is', $html, $matches)) {
        $styles = $matches[1];
    }

    preg_match('/<body[^>]*class="([^"]*)"/i', $html, $bodyClassMatch);
    $bodyClasses = $bodyClassMatch[1] ?? '';

    if (! preg_match('/<body[^>]*>(.*)<\/body>/is', $html, $bodyMatch)) {
        echo '<main class="min-h-screen bg-black text-white p-10">Invalid Stitch markup.</main>';
        return;
    }

    $body = $bodyMatch[1];
    $body = noxxe_stitch_rewrite_links($body);

    echo '<div class="' . esc_attr(trim($bodyClasses)) . '">';
    foreach ($styles as $style) {
        echo '<style>' . wp_strip_all_tags($style, true) . '</style>';
    }
    echo $body;
    echo '</div>';
}

function noxxe_stitch_fix_encoding(string $html): string
{
    $replacements = [
        'â€œ' => '"',
        'â€' => '"',
        'â€”' => '-',
        'â€"' => '-',
        'Â©' => '&copy;',
        'â€™' => "'",
        'â€˜' => "'",
    ];

    return strtr($html, $replacements);
}

function noxxe_stitch_rewrite_links(string $body): string
{
    if (! class_exists('DOMDocument')) {
        return str_replace('href="/"', 'href="' . esc_url(home_url('/')) . '"', $body);
    }

    $previous = libxml_use_internal_errors(true);
    $dom = new DOMDocument('1.0', 'UTF-8');
    $dom->loadHTML('<?xml encoding="utf-8" ?><div id="noxxe-stitch-root">' . $body . '</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    $anchors = $dom->getElementsByTagName('a');
    foreach ($anchors as $anchor) {
        $href = trim((string) $anchor->getAttribute('href'));
        $label = strtolower(trim(preg_replace('/\s+/', ' ', $anchor->textContent)));

        if ($href === '/') {
            $anchor->setAttribute('href', home_url('/'));
            continue;
        }

        if ($href !== '#' && $href !== '') {
            continue;
        }

        $target = noxxe_stitch_route_for_label($label);
        if ($target !== null) {
            $anchor->setAttribute('href', $target);
        }
    }

    $forms = $dom->getElementsByTagName('form');
    if ($forms->length > 0) {
        $forms->item(0)?->setAttribute('id', 'newsletter');
        $forms->item(0)?->setAttribute('action', home_url('/'));
        $forms->item(0)?->setAttribute('method', 'post');
    }

    $root = $dom->getElementById('noxxe-stitch-root');
    if (! $root) {
        return $body;
    }

    $output = '';
    foreach ($root->childNodes as $child) {
        $output .= $dom->saveHTML($child);
    }

    return $output;
}

function noxxe_stitch_route_for_label(string $label): ?string
{
    if ($label === '') {
        return null;
    }

    $map = [
        '/collection/' => ['shop', 'shop transit kit', 'full inventory'],
        '/lookbook/' => ['lookbook', 'explore journey', 'view high-end journal'],
        '/about/' => ['about', 'equip your journey', 'schedule arrival'],
        '/terms/' => ['service terms'],
        '/privacy-policy/' => ['privacy policy'],
        '/#newsletter' => ['manifest', 'join the manifest', 'join the departure gate'],
    ];

    foreach ($map as $path => $labels) {
        if (in_array($label, $labels, true)) {
            return home_url($path);
        }
    }

    return null;
}
