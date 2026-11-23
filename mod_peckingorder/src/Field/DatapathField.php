<?php

/**
 * @package     Pecking Order
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later
 */

namespace ChaoticFishDesign\Module\PeckingOrder\Site\Field;

\defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Form\Field\TextField;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\CMS\Router\Route;
use Joomla\Registry\Registry;

/**
 * File path with a Browse button. The button opens the full Media Manager
 * (every folder the Filesystem - Local plugin lists, not just images) and
 * writes the picked file's site-relative path into the box.
 */
class DatapathField extends TextField
{
    protected $type = 'Datapath';

    protected function getInput()
    {
        $input = parent::getInput();

        if ($this->readonly || $this->disabled) {
            return $input;
        }

        $app  = Factory::getApplication();
        $user = $app->getIdentity();

        if (!$user || !$user->authorise('core.manage', 'com_media')) {
            return $input;
        }

        $wa = $app->getDocument()->getWebAssetManager();
        $wa->getRegistry()->addExtensionRegistryFile('mod_peckingorder');
        // The media field's own script brings in Joomla's dialog, which the Browse button reuses.
        $wa->useScript('webcomponent.field-media')->useStyle('mod_peckingorder.admin')->useScript('mod_peckingorder.admin');

        foreach (['JSELECT', 'JCLOSE', 'MOD_PECKINGORDER_BROWSE_NOT_DATA', 'MOD_PECKINGORDER_BROWSE_NOT_LOCAL', 'MOD_PECKINGORDER_BROWSE_NO_DIALOG'] as $key) {
            Text::script($key);
        }

        $url = Route::_('index.php?option=com_media&view=media&tmpl=component&mediatypes=3&asset=com_modules&author=' . (int) $user->id . '&path=' . $this->startFolder((string) $this->value), false);
        $e   = static fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');

        return '<div class="input-group pko-pathgroup">' . $input
            . '<button type="button" class="btn btn-primary pko-browse" data-input="' . $e($this->id) . '" data-url="' . $e($url) . '" data-title="' . $e(Text::_('MOD_PECKINGORDER_BROWSE_TITLE')) . '">'
            . $e(Text::_('MOD_PECKINGORDER_BROWSE')) . '</button></div>';
    }

    /** Opens where the current file is, else in files, else in the first folder the Media Manager knows. */
    private function startFolder(string $value): string
    {
        $dirs = [];
        $plg  = PluginHelper::getPlugin('filesystem', 'local');

        if ($plg) {
            $list = (new Registry($plg->params))->get('directories', []);

            foreach (\is_string($list) ? (array) json_decode($list) : (array) $list as $d) {
                $d = trim((string) (\is_object($d) ? ($d->directory ?? '') : ($d['directory'] ?? '')), '/');

                if ($d !== '') {
                    $dirs[] = $d;
                }
            }
        }

        if (!$dirs) {
            $dirs = ['images', 'files'];
        }

        $value = trim(str_replace('\\', '/', $value), '/');

        foreach ($dirs as $d) {
            if ($value !== '' && str_starts_with($value . '/', $d . '/')) {
                $rest = trim(\dirname(substr($value, \strlen($d))), '/.');

                return 'local-' . $d . ':/' . $rest;
            }
        }

        return 'local-' . (\in_array('files', $dirs, true) ? 'files' : $dirs[0]) . ':/';
    }
}
