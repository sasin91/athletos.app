@props([
    'variant' => 'primary',
    'size' => 'default',
    'href' => null,
    'type' => 'button',
    'disabled' => false
])

@php
$baseClasses = 'inline-flex items-center font-medium border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

$variantClasses = [
    'primary' => 'text-white bg-blue-600 border-transparent shadow-sm hover:bg-blue-700 focus:ring-blue-500 dark:focus:ring-offset-gray-800',
    'secondary' => 'text-gray-700 bg-white border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800',
    'outline' => 'text-gray-700 bg-white border-gray-300 shadow-sm hover:bg-gray-50 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800'
];

$sizeClasses = [
    'sm' => 'px-3 py-2 text-xs rounded-md',
    'default' => 'px-4 py-2 text-sm rounded-lg',
    'lg' => 'px-6 py-3 text-sm font-semibold rounded-lg'
];

$classes = $baseClasses . ' ' . $variantClasses[$variant] . ' ' . $sizeClasses[$size];

if ($variant === 'primary' && $size === 'lg') {
    $classes .= ' group';
}
@endphp

@if($href)
    <a href="{{ $href }}" {{ $attributes->merge(['class' => $classes]) }}>
        {{ $slot }}
    </a>
@else
    <button 
        type="{{ $type }}" 
        {{ $disabled ? 'disabled' : '' }}
        {{ $attributes->merge(['class' => $classes]) }}
    >
        {{ $slot }}
    </button>
@endif
