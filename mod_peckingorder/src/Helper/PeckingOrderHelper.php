<?php

/**
 * @package     Pecking Order
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later
 */

namespace ChaoticFishDesign\Module\PeckingOrder\Site\Helper;

\defined('_JEXEC') or die;

use Joomla\CMS\Application\CMSApplicationInterface;
use Joomla\CMS\Cache\CacheControllerFactoryInterface;
use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\CMS\Uri\Uri;
use Joomla\Registry\Registry;

/**
 * Reads the chart file (CSV or JSON), cleans it, caches it, and works out the
 * settings the layout needs. The browser builds the chart; PHP only builds a
 * plain nested list for visitors without JavaScript.
 */
class PeckingOrderHelper
{
    public const MAX_ROWS   = 5000;
    public const MAX_LENGTH = 4000;
    public const MAX_BYTES  = 5242880;

    /** Columns the chart uses. Anything else in the file stays on the server. */
    public const COLUMNS = ['id', 'parent', 'unit', 'name', 'title', 'roles', 'department', 'office', 'email', 'phone', 'location', 'photo',
        'description', 'deputy_of', 'also_reports_to', 'placement', 'vacant', 'accent', 'width', 'background', 'color', 'deputy_style', 'start_date', 'link', 'class', 'columns', 'group_titles', 'stack'];

    /** Field types for visibility. Name, title and unit (the chart's structure) are always shown. */
    public const FIELD_TYPES = [
        'vis_org'     => ['roles', 'department', 'description', 'start_date', 'link'],
        'vis_contact' => ['email', 'phone'],
        'vis_place'   => ['office', 'location'],
        'vis_photo'   => ['photo', 'photo_srcset', 'photo_large'],
    ];

    /** Defaults: Public (1) for organization and photo, Registered (2) for contact and place. */
    public const FIELD_DEFAULTS = ['vis_org' => 1, 'vis_contact' => 2, 'vis_place' => 2, 'vis_photo' => 1];

    /**
     * @return array{rows: array<int, array<string, string>>, tree: array, error: ?string, admin: bool, vars: string, file: string}
     */
    public function getChart(Registry $params, CMSApplicationInterface $app): array
    {
        $user  = $app->getIdentity();
        $admin = $user && $user->authorise('core.manage', 'com_modules');
        $out   = ['updated' => '', 'rows' => [], 'tree' => [], 'error' => null, 'admin' => (bool) $admin, 'vars' => $this->styleVars($params), 'file' => ''];

        $value = $this->sourceValue($params);

        $out['file'] = trim(explode('#', $value, 2)[0]);

        if ($out['file'] === '') {
            $out['error'] = Text::_('MOD_PECKINGORDER_ERR_NO_FILE');

            return $out;
        }

        $path = $this->resolvePath($value);

        if ($path === null) {
            $out['error'] = Text::sprintf('MOD_PECKINGORDER_ERR_BAD_FILE', $out['file']);

            return $out;
        }

        try {
            $out['rows']    = $this->loadRows($path);
            $out['updated'] = date('Y-m-d', (int) filemtime($path));
        } catch (\Throwable $e) {
            $out['error'] = Text::sprintf('MOD_PECKINGORDER_ERR_READ', $out['file'], $e->getMessage());

            return $out;
        }

        if (!$out['rows']) {
            $out['error'] = Text::sprintf('MOD_PECKINGORDER_ERR_EMPTY', $out['file']);

            return $out;
        }

        $out['rows'] = $this->forViewer($out['rows'], $params, $user ? $user->getAuthorisedViewLevels() : [1]);
        $out['tree'] = $this->buildTree($out['rows']);

        return $out;
    }

    /**
     * The file setting to use. Data source picks one field; modules saved before the switch existed
     * keep the old rule (the Media Manager file if set, otherwise the path).
     */
    public function sourceValue(Registry $params): string
    {
        $media  = (string) $params->get('data_file', '');
        $path   = (string) $params->get('data_path', '');
        $source = (string) $params->get('data_source', '');

        $hasMedia = trim(explode('#', $media, 2)[0]) !== '';
        $hasPath  = trim($path) !== '';

        // The chosen source wins; if it's empty, the other one is used, so a module set up
        // before this switch existed doesn't go blank when it's next saved.
        if ($source === 'path') {
            return $hasPath ? $path : $media;
        }

        if ($source === 'media') {
            return $hasMedia ? $media : $path;
        }

        return $hasMedia ? $media : $path;
    }

    /**
     * What this visitor may see: only the chart's own columns, minus field types above their access,
     * plus ShrinkRay's resized photos where they exist. Runs per request, after the parse cache.
     */
    public function forViewer(array $rows, Registry $params, array $levels): array
    {
        $levels = array_map('intval', $levels);
        $hidden = [];

        foreach (self::FIELD_TYPES as $key => $fields) {
            $level = (int) $params->get($key, self::FIELD_DEFAULTS[$key]);

            if ($level < 0 || !\in_array($level, $levels, true)) {
                array_push($hidden, ...$fields);
            }
        }

        $keep   = array_flip(array_diff(self::COLUMNS, $hidden));
        $photos = !\in_array('photo', $hidden, true) ? $this->shrinkray() : null;
        $out    = [];

        foreach ($rows as $row) {
            $row = array_intersect_key($row, $keep);

            if ($photos && ($row['photo'] ?? '') !== '') {
                $row += $this->photoCopies($row['photo'], $photos);
            }

            $out[] = $row;
        }

        return $out;
    }

    /**
     * ShrinkRay's output settings, if it's installed and enabled. Pecking Order only reads the
     * copies ShrinkRay has already made; it never makes any itself.
     */
    private function shrinkray(): ?array
    {
        if (!PluginHelper::isEnabled('system', 'shrinkray')) {
            return null;
        }

        $plugin = PluginHelper::getPlugin('system', 'shrinkray');
        $p      = new Registry($plugin->params ?? '');
        $dir    = trim(str_replace('\\', '/', (string) $p->get('output_dir', 'images/_sized')), '/');

        return $dir === '' ? null : ['dir' => $dir, 'by' => (string) $p->get('size_by', 'width')];
    }

    /**
     * For a photo under /images, ShrinkRay's WebP copies: images/a/b/pat.jpg → {output}/a/b/pat--333.webp.
     * Only copies newer than the original count. Returns photo_srcset (width-based) and photo_large.
     */
    private function photoCopies(string $photo, array $cfg): array
    {
        $base = rtrim(Uri::root(true), '/') . '/';
        $rel  = str_starts_with($photo, $base) ? substr($photo, \strlen($base)) : ltrim($photo, '/');

        if (!str_starts_with($rel, 'images/') || str_contains($rel, '..')) {
            return [];
        }

        $orig = JPATH_ROOT . '/' . $rel;

        if (!is_file($orig)) {
            return [];
        }

        $sub   = \dirname(substr($rel, \strlen('images/')));
        $name  = pathinfo($rel, PATHINFO_FILENAME);
        $dir   = $cfg['dir'] . ($sub === '.' ? '' : '/' . $sub);
        $files = glob(JPATH_ROOT . '/' . $dir . '/' . str_replace(['*', '?', '['], ['\\*', '\\?', '\\['], $name) . '--*.webp') ?: [];
        $when  = filemtime($orig);
        $set   = [];

        foreach ($files as $f) {
            if (preg_match('/--(\d+)\.webp$/', $f, $m) && filemtime($f) >= $when) {
                $set[(int) $m[1]] = $base . $dir . '/' . rawurlencode(basename($f)) . '?v=' . filemtime($f);
            }
        }

        if (!$set) {
            return [];
        }

        ksort($set);
        $out = ['photo_large' => end($set)];

        if ($cfg['by'] === 'width') {
            $out['photo_srcset'] = implode(', ', array_map(static fn ($w, $u) => $u . ' ' . $w . 'w', array_keys($set), $set));
        }

        return $out;
    }

    /**
     * Only real CSV or JSON files inside the site folder. No URLs, no stream wrappers.
     */
    public function resolvePath(string $value): ?string
    {
        $value = rawurldecode(trim(explode('#', $value, 2)[0]));

        if ($value === '' || preg_match('#^[a-z][a-z0-9+.-]*:#i', $value) || str_contains($value, "\0")) {
            return null;
        }

        $root = realpath(JPATH_ROOT);
        $full = realpath(JPATH_ROOT . '/' . ltrim($value, '/\\'));

        if (!$root || !$full || !is_file($full) || !str_starts_with($full, $root . DIRECTORY_SEPARATOR)) {
            return null;
        }

        if (!\in_array(strtolower(pathinfo($full, PATHINFO_EXTENSION)), ['csv', 'json'], true)) {
            return null;
        }

        return $full;
    }

    /**
     * Parsed rows, cached against the file's modified time and size, so edits show up straight away.
     */
    public function loadRows(string $path): array
    {
        $size = (int) filesize($path);

        if ($size > self::MAX_BYTES) {
            throw new \RuntimeException(Text::_('MOD_PECKINGORDER_ERR_TOO_BIG'));
        }

        $key   = md5($path . '|' . filemtime($path) . '|' . $size);
        $cache = Factory::getContainer()->get(CacheControllerFactoryInterface::class)
            ->createCacheController('output', ['defaultgroup' => 'mod_peckingorder', 'caching' => true, 'lifetime' => 43200]);

        $hit = $cache->get($key);

        if (\is_string($hit) && ($rows = json_decode($hit, true)) !== null) {
            return $rows;
        }

        $text = (string) file_get_contents($path);
        $rows = strtolower(pathinfo($path, PATHINFO_EXTENSION)) === 'json' ? $this->parseJson($text) : $this->parseCsv($text);
        $rows = $this->clean($rows);

        $cache->store(json_encode($rows), $key);

        return $rows;
    }

    public function parseCsv(string $text): array
    {
        $text = preg_replace('/^\xEF\xBB\xBF/', '', $text);
        $fh   = fopen('php://temp', 'r+');
        fwrite($fh, $text);
        rewind($fh);

        $head = null;
        $rows = [];

        while (($cells = fgetcsv($fh, 0, ',', '"', '')) !== false) {
            if (!array_filter($cells, static fn ($c) => trim((string) $c) !== '')) {
                continue;
            }

            if ($head === null) {
                $head = array_map(static fn ($h) => strtolower(trim((string) $h)), $cells);
                continue;
            }

            $row = [];

            foreach ($head as $i => $h) {
                if ($h !== '') {
                    $row[$h] = trim((string) ($cells[$i] ?? ''));
                }
            }

            $rows[] = $row;
        }

        fclose($fh);

        return $rows;
    }

    public function parseJson(string $text): array
    {
        $data = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', $text), true, 64, JSON_THROW_ON_ERROR);

        if (!\is_array($data)) {
            return [];
        }

        $list = array_is_list($data) ? $data : (isset($data['people']) && \is_array($data['people']) ? $data['people'] : [$data]);
        $out  = [];
        $this->walk($list, '', $out, 0);

        return $out;
    }

    private function walk(array $list, string $parent, array &$out, int $depth): void
    {
        if ($depth > 60) {
            return;
        }

        foreach ($list as $o) {
            if (!\is_array($o)) {
                continue;
            }

            $row = [];

            foreach ($o as $k => $v) {
                if ($k === 'children') {
                    continue;
                }

                if (\is_array($v)) {
                    $v = implode(';', array_map(static fn ($x) => \is_scalar($x) ? (string) $x : '', $v));
                } elseif ($v === true) {
                    $v = '1';
                } elseif ($v === false || $v === null || !\is_scalar($v)) {
                    $v = '';
                }

                $row[strtolower((string) $k)] = trim((string) $v);
            }

            if ($parent !== '' && ($row['parent'] ?? '') === '') {
                $row['parent'] = $parent;
            }

            $out[] = $row;

            if (isset($o['children']) && \is_array($o['children'])) {
                $this->walk($o['children'], (string) ($row['id'] ?? ''), $out, $depth + 1);
            }
        }
    }

    /**
     * Limits sizes, keeps simple column names only, checks colors, and makes photo paths work from any page.
     */
    public function clean(array $rows): array
    {
        $out  = [];
        $base = rtrim(Uri::root(true), '/') . '/';

        foreach (\array_slice($rows, 0, self::MAX_ROWS) as $row) {
            $clean = [];

            foreach ($row as $k => $v) {
                if (!preg_match('/^[a-z0-9_]{1,40}$/', (string) $k)) {
                    continue;
                }

                $clean[$k] = mb_substr((string) $v, 0, self::MAX_LENGTH);
            }

            foreach (['accent', 'background', 'color'] as $key) {
                if (($clean[$key] ?? '') !== '' && !$this->isColor($clean[$key])) {
                    $clean[$key] = '';
                }
            }

            // Job posting links: web addresses, mailto: or site paths only.
            if (($clean['link'] ?? '') !== '') {
                $link          = trim($clean['link']);
                $clean['link'] = preg_match('#^(https?:|mailto:)#i', $link) || !preg_match('#^[a-z][a-z0-9+.-]*:#i', $link) ? $link : '';
            }

            // Your own CSS classes: plain class names, never ours (pko-…, is-…), at most 8.
            if (($clean['class'] ?? '') !== '') {
                $classes        = preg_split('/[\s,]+/', $clean['class'], -1, PREG_SPLIT_NO_EMPTY);
                $classes        = array_filter($classes, fn ($c) => preg_match('/^-?[_a-zA-Z][_a-zA-Z0-9-]*$/', $c) && !preg_match('/^(pko-|is-)/i', $c));
                $clean['class'] = implode(' ', \array_slice(array_values($classes), 0, 8));
            }

            // Layout columns: people per row inside a card (1 to 6), shared titles, stacking a leader's reports.
            if (($clean['columns'] ?? '') !== '' && !preg_match('/^[1-6]$/', trim($clean['columns']))) {
                $clean['columns'] = '';
            }

            foreach (['group_titles', 'stack'] as $key) {
                if (($clean[$key] ?? '') !== '' && !preg_match('/^(1|0|y|n|x|yes|no|true|false|on|off)$/i', trim($clean[$key]))) {
                    $clean[$key] = '';
                }
            }

            if (($clean['start_date'] ?? '') !== '' && !preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', trim($clean['start_date']))) {
                $clean['start_date'] = '';
            }

            if (($clean['width'] ?? '') !== '') {
                $w              = (int) $clean['width'];
                $clean['width'] = $w >= 120 && $w <= 900 ? (string) $w : '';
            }

            if (($clean['photo'] ?? '') !== '') {
                $photo = trim(explode('#', $clean['photo'], 2)[0]);

                if (preg_match('#^https?://#i', $photo) || str_starts_with($photo, '/')) {
                    $clean['photo'] = $photo;
                } elseif (preg_match('#^[a-z][a-z0-9+.-]*:#i', $photo)) {
                    $clean['photo'] = '';
                } else {
                    $clean['photo'] = $base . ltrim($photo, './');
                }
            }

            $out[] = $clean;
        }

        return $out;
    }

    public function isColor(string $v): bool
    {
        return (bool) preg_match('/^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d.,%\s\/]+\)|var\(\s*--[\w-]+\s*(,\s*(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d.,%\s\/]+\))\s*)?\))$/i', trim($v));
    }

    /**
     * Nested list for visitors without JavaScript (and search engines). Mirrors the browser's rules:
     * deputies sit with their leader, missing parents and loops go to the top.
     */
    public function buildTree(array $rows): array
    {
        $byId = [];

        foreach ($rows as $r) {
            $id = (string) ($r['id'] ?? '');

            if ($id !== '' && !isset($byId[$id])) {
                $byId[$id] = ['row' => $r, 'deps' => [], 'kids' => [], 'up' => null];
            }
        }

        foreach ($byId as $id => &$n) {
            $dep = (string) ($n['row']['deputy_of'] ?? '');
            $par = (string) ($n['row']['parent'] ?? '');

            if ($dep !== '' && $dep !== $id && isset($byId[$dep])) {
                $n['up']  = $dep;
                $n['dep'] = true;
            } elseif ($par !== '' && $par !== $id && isset($byId[$par])) {
                $n['up'] = $par;
            }
        }

        unset($n);

        foreach (array_keys($byId) as $id) {
            $seen = [$id => true];

            for ($p = $byId[$id]['up']; $p !== null; $p = $byId[$p]['up']) {
                if (isset($seen[$p])) {
                    $byId[$id]['up'] = null;
                    break;
                }

                $seen[$p] = true;
            }
        }

        $roots = [];

        foreach ($byId as $id => $n) {
            if ($n['up'] === null) {
                $roots[] = $id;
            } elseif (!empty($n['dep'])) {
                $byId[$n['up']]['deps'][] = $id;
            } else {
                $byId[$n['up']]['kids'][] = $id;
            }
        }

        // Deputies keep their own deputies, so a team (placement team) lists its people.
        $make = static function (string $id) use (&$make, $byId): array {
            $n = $byId[$id];

            return [
                'row'     => $n['row'],
                'deps'    => array_map(static fn ($d) => $byId[$d]['row'], $n['deps']),
                'members' => array_map(static fn ($d) => array_map(static fn ($m) => $byId[$m]['row'], $byId[$d]['deps']), $n['deps']),
                'kids'    => array_map($make, $n['kids']),
            ];
        };

        return array_map($make, $roots);
    }

    /**
     * Inline CSS variables from the Look settings, each one checked.
     */
    public function styleVars(Registry $params): string
    {
        $vars  = [];
        $style = (string) $params->get('line_style', 'solid');
        $vars['--pko-ls'] = \in_array($style, ['solid', 'dashed', 'dotted'], true) ? $style : 'solid';

        foreach (['line_color' => '--pko-line', 'accent' => '--pko-base'] as $key => $var) {
            $c = trim((string) $params->get($key, ''));

            if ($c !== '' && $this->isColor($c)) {
                $vars[$var] = $c;
            }
        }

        $bg = (string) $params->get('chart_bg', 'default');

        if ($bg === 'transparent') {
            $vars['--pko-viewbg'] = 'transparent';
            $vars['--pko-viewbd'] = 'transparent';
        } elseif ($bg === 'custom' && $this->isColor((string) $params->get('chart_bg_color', ''))) {
            $vars['--pko-viewbg'] = trim((string) $params->get('chart_bg_color'));
        }

        if ($bg !== 'transparent' && (int) $params->get('chart_border', 1) === 0) {
            $vars['--pko-viewbd'] = 'transparent';
        }

        $vars['--pko-cardw'] = max(160, min(420, (int) $params->get('card_width', 250))) . 'px';
        $vars['--pko-gap']   = max(12, min(64, (int) $params->get('gap', 28))) . 'px';

        $h = trim((string) $params->get('chart_height', ''));

        if (preg_match('/^\d{2,4}(px|vh|rem|em)$/', $h)) {
            $vars['--pko-h'] = $h;
        }

        $css = '';

        foreach ($vars as $k => $v) {
            $css .= $k . ':' . $v . ';';
        }

        return $css;
    }
}
