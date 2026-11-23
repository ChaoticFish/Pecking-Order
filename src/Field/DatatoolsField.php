<?php

/**
 * @package     Pecking Order
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later
 */

namespace ChaoticFishDesign\Module\PeckingOrder\Site\Field;

\defined('_JEXEC') or die;

use ChaoticFishDesign\Module\PeckingOrder\Site\Helper\PeckingOrderHelper;
use Joomla\CMS\Factory;
use Joomla\CMS\Form\FormField;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Session\Session;
use Joomla\CMS\Uri\Uri;
use Joomla\Registry\Registry;

/**
 * "Data tools" in the module settings: templates, Studio, and a live check
 * and preview of the file currently picked.
 */
class DatatoolsField extends FormField
{
    protected $type = 'Datatools';

    protected function getLabel()
    {
        return '';
    }

    /** The only files allowed in a folder this tool will lock. */
    private const SAFE_FILES = '/^(.+\.(csv|json)|\.htaccess|index\.html?|web\.config)$/i';

    /** Top-level folders that must never be locked, whatever they contain. */
    private const CORE_DIRS = ['administrator', 'api', 'cache', 'cli', 'components', 'images', 'includes', 'language', 'layouts',
        'libraries', 'media', 'modules', 'plugins', 'templates', 'tmp', 'files'];

    protected function getInput()
    {
        $app = Factory::getApplication();
        $wa  = $app->getDocument()->getWebAssetManager();
        $wa->getRegistry()->addExtensionRegistryFile('mod_peckingorder');
        $wa->useStyle('mod_peckingorder.chart')->useStyle('mod_peckingorder.admin')->useScript('mod_peckingorder.admin');

        foreach (
            [
                'MOD_PECKINGORDER_TOOLS_NO_FILE', 'MOD_PECKINGORDER_TOOLS_URL_ONLY', 'MOD_PECKINGORDER_TOOLS_LOADING',
                'MOD_PECKINGORDER_TOOLS_FAILED', 'MOD_PECKINGORDER_TOOLS_OK', 'MOD_PECKINGORDER_TOOLS_PROBLEMS',
                'MOD_PECKINGORDER_TOOLS_SAVE_FIRST', 'MOD_PECKINGORDER_TOOLS_PUBLIC', 'MOD_PECKINGORDER_TOOLS_PRIVATE',
                'MOD_PECKINGORDER_TOOLS_PROTECT', 'MOD_PECKINGORDER_TOOLS_UNSAVED',
            ] as $key
        ) {
            Text::script($key);
        }

        $media  = rtrim(Uri::root(true), '/') . '/media/mod_peckingorder/';
        $e      = static fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
        $form   = $this->form;
        $fileF  = $form ? $form->getField('data_file', 'params') : false;
        $pathF  = $form ? $form->getField('data_path', 'params') : false;
        $fileId = $e($fileF ? $fileF->id : 'jform_params_data_file');
        $pathId = $e($pathF ? $pathF->id : 'jform_params_data_path');

        // The saved file, read here on the server so Check and Studio work even once its folder is locked.
        $helper = new PeckingOrderHelper();
        $params = new Registry($form ? $form->getValue('params') : []);
        $saved  = trim(explode('#', $helper->sourceValue($params), 2)[0]);
        $full   = $saved !== '' ? $helper->resolvePath($saved) : null;
        $user   = $app->getIdentity();
        $canDo  = $user && $user->authorise('core.manage', 'com_modules');

        // Lock the saved file's folder (token-checked link from the button below).
        if ($canDo && $full && $app->getInput()->getInt('pko_protect') === 1 && Session::checkToken('get')) {
            [$ok, $msg] = $this->protect(\dirname($full));
            $app->enqueueMessage($msg, $ok ? 'success' : 'warning');
        }

        $copy = '';

        if ($canDo && $full && filesize($full) <= PeckingOrderHelper::MAX_BYTES) {
            $copy = '<script type="application/json" class="pko-tools-saved">'
                . json_encode((string) file_get_contents($full), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . '</script>';
        }

        $here    = Uri::getInstance();
        $here->setVar('pko_protect', 1);
        $here->setVar(Session::getFormToken(), 1);
        $protect = $full ? $here->toString() : '';

        $rows = [
            ['id', 'MOD_PECKINGORDER_REF_ID'], ['parent', 'MOD_PECKINGORDER_REF_PARENT'], ['unit', 'MOD_PECKINGORDER_REF_UNIT'],
            ['name, title', 'MOD_PECKINGORDER_REF_NAME'], ['roles', 'MOD_PECKINGORDER_REF_ROLES'], ['deputy_of', 'MOD_PECKINGORDER_REF_DEPUTY'],
            ['placement', 'MOD_PECKINGORDER_REF_PLACEMENT'], ['vacant', 'MOD_PECKINGORDER_REF_VACANT'], ['description', 'MOD_PECKINGORDER_REF_DESC'],
            ['also_reports_to', 'MOD_PECKINGORDER_REF_ALSO'], ['department, office, location, email, phone', 'MOD_PECKINGORDER_REF_CONTACT'],
            ['photo', 'MOD_PECKINGORDER_REF_PHOTO'], ['accent', 'MOD_PECKINGORDER_REF_ACCENT'],
            ['columns', 'MOD_PECKINGORDER_REF_COLUMNS'], ['group_titles', 'MOD_PECKINGORDER_REF_GROUP_TITLES'], ['stack', 'MOD_PECKINGORDER_REF_STACK'],
            ['width', 'MOD_PECKINGORDER_REF_WIDTH'], ['background', 'MOD_PECKINGORDER_REF_BG'], ['color', 'MOD_PECKINGORDER_REF_COLOR'],
        ];
        $ref = '';

        foreach ($rows as [$col, $key]) {
            $ref .= '<tr><td><code>' . $e($col) . '</code></td><td>' . $e(Text::_($key)) . '</td></tr>';
        }

        $btn = static fn ($href, $label, $extra = '') => '<a class="btn btn-sm btn-outline-secondary" href="' . $e($href) . '"' . $extra . '>' . $e(Text::_($label)) . '</a>';

        return '<div class="pko-tools" data-root="' . $e(Uri::root()) . '" data-file-field="' . $fileId . '" data-path-field="' . $pathId
            . '" data-source-name="jform[params][data_source]" data-saved="' . $e($saved) . '" data-protect="' . $e($protect)
            . '" data-studio="' . $e($media . 'studio/pecking-order-studio.html') . '">' . $copy
            . '<p class="pko-tools-hint">' . $e(Text::_('MOD_PECKINGORDER_TOOLS_INTRO')) . '</p>'
            . '<div class="pko-tools-row">'
            . $btn($media . 'samples/pecking-order-template.csv', 'MOD_PECKINGORDER_TOOLS_TEMPLATE', ' download')
            . $btn($media . 'samples/pecking-order-sample.csv', 'MOD_PECKINGORDER_TOOLS_SAMPLE_CSV', ' download')
            . $btn($media . 'samples/pecking-order-sample.json', 'MOD_PECKINGORDER_TOOLS_SAMPLE_JSON', ' download')
            . $btn($media . 'studio/pecking-order-studio.html', 'MOD_PECKINGORDER_TOOLS_STUDIO', ' target="_blank" rel="noopener"')
            . '</div>'
            . '<div class="pko-tools-row">'
            . '<button type="button" class="btn btn-sm btn-primary" data-pko-check>' . $e(Text::_('MOD_PECKINGORDER_TOOLS_CHECK')) . '</button>'
            . '<button type="button" class="btn btn-sm btn-outline-secondary" data-pko-open>' . $e(Text::_('MOD_PECKINGORDER_TOOLS_OPEN')) . '</button>'
            . '</div>'
            . '<div class="pko-tools-result" aria-live="polite"></div>'
            . '<div class="pko-tools-privacy" aria-live="polite"></div>'
            . '<div class="pko pko-tools-chart" data-list-at="0" hidden><div class="pko-view"><div class="pko-stage"><ul class="pko-tree"></ul></div></div></div>'
            . '<details class="pko-tools-ref"><summary>' . $e(Text::_('MOD_PECKINGORDER_TOOLS_REF')) . '</summary>'
            . '<table class="table table-sm"><tbody>' . $ref . '</tbody></table>'
            . '<p class="pko-tools-hint">' . $e(Text::_('MOD_PECKINGORDER_REF_NOTE')) . '</p></details>'
            . '</div>';
    }

    /**
     * Writes a deny-all .htaccess (Apache 2.2 and 2.4) and a blank index.html into a folder,
     * but only a dedicated chart folder: inside the site, not a core folder, holding nothing but
     * CSV/JSON files, with no subfolders and no existing .htaccess of someone else's.
     *
     * @return array{0: bool, 1: string}
     */
    private function protect(string $dir): array
    {
        $root = realpath(JPATH_ROOT);
        $dir  = realpath($dir);

        if (!$root || !$dir || $dir === $root || !str_starts_with($dir, $root . DIRECTORY_SEPARATOR)) {
            return [false, Text::_('MOD_PECKINGORDER_PROTECT_OUTSIDE')];
        }

        $relative = str_replace('\\', '/', substr($dir, \strlen($root) + 1));
        $top      = strtolower(explode('/', $relative)[0]);

        if (!str_contains($relative, '/') && \in_array($top, self::CORE_DIRS, true)) {
            return [false, Text::sprintf('MOD_PECKINGORDER_PROTECT_CORE', $relative)];
        }

        foreach (scandir($dir) ?: [] as $item) {
            if ($item === '.' || $item === '..') {
                continue;
            }

            if (is_dir($dir . '/' . $item) || !preg_match(self::SAFE_FILES, $item)) {
                return [false, Text::sprintf('MOD_PECKINGORDER_PROTECT_MIXED', $relative, $item)];
            }
        }

        $ht = $dir . '/.htaccess';

        if (is_file($ht) && !str_contains((string) file_get_contents($ht), 'Pecking Order')) {
            return [false, Text::sprintf('MOD_PECKINGORDER_PROTECT_EXISTING', $relative)];
        }

        $rules = "# Pecking Order: keeps chart data private. The module still reads it through PHP.\n"
            . "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n"
            . "<IfModule !mod_authz_core.c>\n  Order deny,allow\n  Deny from all\n</IfModule>\n";

        if (file_put_contents($ht, $rules) === false) {
            return [false, Text::sprintf('MOD_PECKINGORDER_PROTECT_WRITE', $relative)];
        }

        if (!is_file($dir . '/index.html')) {
            file_put_contents($dir . '/index.html', '<!DOCTYPE html><title></title>');
        }

        return [true, Text::sprintf('MOD_PECKINGORDER_PROTECT_DONE', $relative)];
    }
}
