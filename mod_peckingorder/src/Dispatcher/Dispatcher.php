<?php

/**
 * @package     Pecking Order
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later
 */

namespace ChaoticFishDesign\Module\PeckingOrder\Site\Dispatcher;

\defined('_JEXEC') or die;

use Joomla\CMS\Dispatcher\AbstractModuleDispatcher;
use Joomla\CMS\Helper\HelperFactoryAwareInterface;
use Joomla\CMS\Helper\HelperFactoryAwareTrait;

class Dispatcher extends AbstractModuleDispatcher implements HelperFactoryAwareInterface
{
    use HelperFactoryAwareTrait;

    protected function getLayoutData(): array
    {
        $data          = parent::getLayoutData();
        $data['chart'] = $this->getHelperFactory()
            ->getHelper('PeckingOrderHelper')
            ->getChart($data['params'], $this->getApplication());

        return $data;
    }
}
