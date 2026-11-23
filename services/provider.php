<?php

/**
 * @package     Pecking Order
 * @copyright   (C) 2026 Chaotic Fish Design
 * @license     GNU General Public License version 2 or later
 */

\defined('_JEXEC') or die;

use Joomla\CMS\Extension\Service\Provider\HelperFactory;
use Joomla\CMS\Extension\Service\Provider\Module;
use Joomla\CMS\Extension\Service\Provider\ModuleDispatcherFactory;
use Joomla\DI\Container;
use Joomla\DI\ServiceProviderInterface;

return new class () implements ServiceProviderInterface {
    public function register(Container $container): void
    {
        $container->registerServiceProvider(new ModuleDispatcherFactory('\\ChaoticFishDesign\\Module\\PeckingOrder'));
        $container->registerServiceProvider(new HelperFactory('\\ChaoticFishDesign\\Module\\PeckingOrder\\Site\\Helper'));
        $container->registerServiceProvider(new Module());
    }
};
