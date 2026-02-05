<?php
declare(strict_types=1);

function adsafe_rules(): array {
  static $rules = null;
  if (is_array($rules)) return $rules;
  $path = __DIR__ . '/rules_data.json';
  if (!file_exists($path)) {
    $rules = [];
    return $rules;
  }
  $raw = file_get_contents($path);
  if ($raw === false) {
    $rules = [];
    return $rules;
  }
  $decoded = json_decode($raw, true);
  $rules = is_array($decoded) ? $decoded : [];
  return $rules;
}

