<?php

/**
 * @package     Pecking Order
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Language\Text;

/**
 * @var \stdClass                 $module
 * @var \Joomla\Registry\Registry $params
 * @var \Joomla\CMS\Application\CMSApplicationInterface $app
 * @var array                     $chart
 */

// Visitors see nothing when the file is missing or broken; site managers see why.
if ($chart['error'] && !$chart['admin']) {
    return;
}

$wa = $app->getDocument()->getWebAssetManager();
$wa->getRegistry()->addExtensionRegistryFile('mod_peckingorder');
$wa->useStyle('mod_peckingorder.chart')->useScript('mod_peckingorder.chart');

$e      = static fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
$id     = 'pko-' . (int) $module->id;
$sfx    = trim((string) $params->get('moduleclass_sfx', ''));
$mode   = $params->get('mode', 'sparkle') === 'sad' ? 'sad' : 'sparkle';
$bp     = ['sm' => 576, 'md' => 768, 'lg' => 992, 'xl' => 1200];
$mobAt  = (string) $params->get('mobile_at', 'md');
$listAt = $params->get('mobile_layout', 'list') === 'chart' ? 0
    : ($bp[$mobAt] ?? max(0, min(2000, (int) $params->get('list_at', 640))));
$depth  = max(0, min(20, (int) $params->get('start_depth', 0)));
$wrapAt = max(0, min(50, (int) $params->get('wrap_at', 6)));
$show   = static fn ($key) => (int) $params->get($key, 1) === 1;
$errors = $chart['admin'] && $show('show_errors') ? '1' : '0';
$cardBg    = trim((string) $params->get('card_bg', ''));
$cardColor = trim((string) $params->get('card_color', ''));
$isColor   = static fn ($c) => (bool) preg_match('/^(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d.,%\s\/]+\)|var\(\s*--[\w-]+\s*(,\s*(#[0-9a-f]{3,8}|[a-z]{3,20}|(rgb|hsl)a?\([\d.,%\s\/]+\))\s*)?\))$/i', $c);
$cardBg    = $isColor($cardBg) ? $cardBg : '';
$cardColor = $isColor($cardColor) ? $cardColor : '';
$expAt   = (int) $params->get('show_export', 1);
$export  = $expAt > 0 && \in_array($expAt, $app->getIdentity()->getAuthorisedViewLevels(), true);
$page    = $params->get('page_size', 'letter') === 'a4' ? 'a4' : 'letter';
$orient  = \in_array($params->get('page_orient', 'auto'), ['auto', 'landscape', 'portrait'], true) ? $params->get('page_orient', 'auto') : 'auto';
$expName = trim(preg_replace('/[^\w.-]+/', '-', (string) $params->get('export_name', 'org-chart')), '-.') ?: 'org-chart';
$dir     = $params->get('direction', 'down') === 'right' ? 'right' : 'down';
$depSty  = \in_array($params->get('deputy_style', 'inside'), ['inside', 'beside', 'stem'], true) ? $params->get('deputy_style', 'inside') : 'inside';
$legend  = trim((string) $params->get('legend', ''));
$dotted = \in_array($params->get('dotted_lines', 'hover'), ['hover', 'always', 'off'], true) ? $params->get('dotted_lines', 'hover') : 'hover';

$item = static function (array $row, bool $dep = false) use ($e): string {
    $vac  = preg_match('/^(1|y|yes|true|x)$/i', (string) ($row['vacant'] ?? ''));
    $name = (string) ($row['name'] ?? '');
    $name = $name !== '' ? $name : ($vac ? Text::_('MOD_PECKINGORDER_OPEN_ROLE') : '');
    $bits = array_filter([
        ($row['unit'] ?? '') !== '' ? '<strong>' . $e($row['unit']) . '</strong>' : '',
        ($row['title'] ?? '') !== '' ? '<span class="pko-title">' . $e($row['title']) . '</span>' : '',
        $name !== '' ? $e($name) : '',
    ]);

    return implode(' · ', $bits);
};

$list = static function (array $nodes) use (&$list, $item, $e): string {
    if (!$nodes) {
        return '';
    }

    $html = '<ul>';

    foreach ($nodes as $n) {
        $html .= '<li>' . $item($n['row']);

        // A heading-only box (a unit with no name or title) just lists its people.
        $headOnly = ($n['row']['unit'] ?? '') !== '' && ($n['row']['name'] ?? '') === '' && ($n['row']['title'] ?? '') === '';

        foreach ($n['deps'] as $i => $d) {
            $members = $n['members'][$i] ?? [];

            if (strtolower(trim((string) ($d['placement'] ?? ''))) === 'team') {
                // A team: its name, then its people.
                $html .= '<br><strong>' . $e((string) (($d['name'] ?? '') ?: ($d['title'] ?? ''))) . '</strong>'
                    . ($members ? ': ' . implode(', ', array_map(static fn ($m) => $item($m, true), $members)) : '');
                continue;
            }

            $html .= '<br>' . ($headOnly ? '' : $e(Text::_('MOD_PECKINGORDER_DEPUTY')) . ': ') . $item($d, true);

            foreach ($members as $m) {
                $html .= '<br>' . $item($m, true);
            }
        }

        $html .= $list($n['kids']) . '</li>';
    }

    return $html . '</ul>';
};
?>
<div class="pko<?php echo $sfx !== '' ? ' ' . $e($sfx) : ''; ?>" id="<?php echo $id; ?>" data-pko-auto data-mode="<?php echo $mode; ?>"
    data-unit-desc="<?php echo $show('unit_desc') ? '1' : '0'; ?>" data-show-errors="<?php echo $errors; ?>" data-list-at="<?php echo $listAt; ?>" data-dotted="<?php echo $dotted; ?>" data-start-depth="<?php echo $depth; ?>" data-wrap-at="<?php echo $wrapAt; ?>" data-card-bg="<?php echo $e($cardBg); ?>" data-card-color="<?php echo $e($cardColor); ?>"
    data-export="<?php echo $export ? '1' : '0'; ?>" data-export-title="<?php echo $e(trim((string) $params->get('export_title', ''))); ?>" data-export-date="<?php echo (int) $params->get('export_date', 1) === 1 ? '1' : '0'; ?>" data-export-name="<?php echo $e($expName); ?>" data-page="<?php echo $page; ?>" data-orient="<?php echo $e($orient); ?>"
    data-dir="<?php echo $dir; ?>" data-deputy-style="<?php echo $e($depSty); ?>" data-filters="<?php echo $show('show_filters') ? '1' : '0'; ?>" data-legend="<?php echo $e($legend); ?>" data-new-days="<?php echo max(0, min(730, (int) $params->get('new_days', 90))); ?>"
    data-fx-off="<?php echo $e(implode(',', array_filter(['school', 'swim', 'ping', 'trail', 'reel', 'depth', 'rooster', 'konami', 'tags'], static fn ($k) => (int) $params->get('fx_' . $k, 1) === 0))); ?>"
    data-updated="<?php echo $e($chart['updated'] ?? ''); ?>" data-show-updated="<?php echo $show('show_updated') ? '1' : '0'; ?>" data-list-toggle="<?php echo $show('show_list_toggle') ? '1' : '0'; ?>"
    style="<?php echo $e($chart['vars']); ?>">
    <?php if ($chart['error']) : ?>
        <p class="pko-admin"><?php echo $e(Text::_('MOD_PECKINGORDER_ADMIN_ONLY')); ?> <?php echo $e($chart['error']); ?></p>
    <?php else : ?>
        <?php if ($show('show_search') || $show('show_zoom') || $show('show_mode_toggle') || $show('show_list_toggle') || $export) : ?>
            <div class="pko-bar">
                <?php if ($show('show_search')) : ?>
                    <input class="form-control form-control-sm pko-search" type="search" placeholder="<?php echo $e(Text::_('MOD_PECKINGORDER_FIND')); ?>" aria-label="<?php echo $e(Text::_('MOD_PECKINGORDER_FIND_LABEL')); ?>">
                    <button class="btn btn-sm btn-outline-secondary pko-clear" type="button" aria-label="<?php echo $e(Text::_('MOD_PECKINGORDER_CLEAR')); ?>" hidden>×</button>
                    <span class="pko-count" aria-live="polite"></span>
                <?php endif; ?>
                <?php if ($show('show_zoom')) : ?>
                    <div class="pko-zoom">
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-act="out" aria-label="<?php echo $e(Text::_('MOD_PECKINGORDER_ZOOM_OUT')); ?>">−</button>
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-act="fit"><?php echo $e(Text::_('MOD_PECKINGORDER_FIT')); ?></button>
                        <button class="btn btn-sm btn-outline-secondary" type="button" data-act="in" aria-label="<?php echo $e(Text::_('MOD_PECKINGORDER_ZOOM_IN')); ?>">+</button>
                    </div>
                <?php endif; ?>
                <?php if ($show('show_mode_toggle')) : ?>
                    <button class="btn btn-sm btn-outline-secondary pko-mode" type="button" aria-pressed="false"></button>
                <?php endif; ?>
            </div>
            <p class="pko-sadnote" hidden></p>
        <?php endif; ?>
        <ul class="pko-errs" hidden></ul>
        <div class="pko-view"><div class="pko-stage"><ul class="pko-tree"></ul></div></div>
        <?php if ($show('show_help')) : ?>
            <p class="pko-help"><?php echo $e(Text::_('MOD_PECKINGORDER_HELP')); ?></p>
        <?php endif; ?>
        <dialog class="pko-dlg">
            <div class="pko-dlg-head"></div>
            <div class="pko-dlg-body"></div>
        </dialog>
        <div class="pko-nojs"><?php echo $list($chart['tree']); ?></div>
        <script type="application/json" class="pko-i18n"><?php
            $words = [];
            foreach (['openRole' => 'OPEN_ROLE', 'status' => 'W_STATUS', 'department' => 'W_DEPARTMENT', 'office' => 'W_OFFICE', 'location' => 'W_LOCATION',
                'email' => 'W_EMAIL', 'phone' => 'W_PHONE', 'deputyTo' => 'W_DEPUTY_TO', 'reportsTo' => 'W_REPORTS_TO', 'alsoReportsTo' => 'W_ALSO_REPORTS_TO',
                'deputy' => 'DEPUTY', 'deputies' => 'W_DEPUTIES', 'members' => 'W_MEMBERS', 'partOf' => 'W_PART_OF', 'teams' => 'W_TEAMS', 'directReports' => 'W_DIRECT_REPORTS', 'linkHere' => 'W_LINK_HERE', 'copyLink' => 'W_COPY_LINK',
                'linkCopied' => 'W_LINK_COPIED', 'rightClickCopy' => 'W_RIGHT_CLICK_COPY', 'close' => 'W_CLOSE', 'found' => 'W_FOUND', 'noOne' => 'W_NO_ONE',
                'nOfM' => 'W_N_OF_M', 'toggle' => 'W_TOGGLE', 'sadOn' => 'W_SAD_ON', 'sadOff' => 'W_SAD_OFF',
                'exportBtn' => 'W_EXPORT', 'exportScope' => 'W_EXPORT_SCOPE', 'asShown' => 'W_AS_SHOWN', 'everything' => 'W_EVERYTHING', 'svg' => 'W_SVG', 'png' => 'W_PNG',
                'pdf' => 'W_PDF', 'print' => 'W_PRINT', 'exportBusy' => 'W_EXPORT_BUSY', 'exportBusySad' => 'W_EXPORT_BUSY_SAD', 'exportDone' => 'W_EXPORT_DONE',
                'exportFail' => 'W_EXPORT_FAIL', 'asOf' => 'W_AS_OF', 'filter' => 'W_FILTER', 'allDepartments' => 'W_ALL_DEPARTMENTS', 'allLocations' => 'W_ALL_LOCATIONS',
                'allRoles' => 'W_ALL_ROLES', 'openRoles' => 'W_OPEN_ROLES', 'clearFilters' => 'W_CLEAR_FILTERS', 'filterCount' => 'W_FILTER_COUNT', 'filterNone' => 'W_FILTER_NONE',
                'legend' => 'W_LEGEND', 'wholeChart' => 'W_WHOLE_CHART', 'focusBranch' => 'W_FOCUS_BRANCH', 'crumbs' => 'W_CRUMBS',
                'newHire' => 'W_NEW_HIRE', 'started' => 'W_STARTED', 'helpWanted' => 'W_HELP_WANTED', 'jobLink' => 'W_JOB_LINK', 'konami' => 'W_KONAMI', 'konamiSad' => 'W_KONAMI_SAD',
                'soon' => 'W_SOON', 'starts' => 'W_STARTS', 'updated' => 'W_UPDATED', 'listView' => 'W_LIST_VIEW'] as $k => $key) {
                $words[$k] = Text::_('MOD_PECKINGORDER_' . $key);
            }
            $words['sad'] = array_values(array_filter(array_map(
                static fn ($i) => ($t = Text::_('MOD_PECKINGORDER_SAD_' . $i)) === 'MOD_PECKINGORDER_SAD_' . $i ? '' : $t,
                range(1, 8)
            )));
            echo json_encode($words, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE);
        ?></script>
        <script type="application/json" class="pko-data"><?php echo json_encode($chart['rows'], JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE); ?></script>
    <?php endif; ?>
</div>
