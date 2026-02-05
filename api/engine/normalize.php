<?php
declare(strict_types=1);

function adsafe_normalize(string $text): string {
  $t = $text;
  // CRLF -> LF
  $t = str_replace(["\r\n", "\r"], "\n", $t);
  // whitespace collapse
  $t = preg_replace('/\s+/u', ' ', $t) ?? $t;
  // special chars (❌ ✕ × -> x)
  $t = preg_replace('/❌|✕|×/u', ' x ', $t) ?? $t;
  $t = preg_replace('/\s+/u', ' ', $t) ?? $t;
  // punctuation -> space
  $t = preg_replace('/[!?.,;:·\-–—]/u', ' ', $t) ?? $t;
  $t = preg_replace('/\s+/u', ' ', $t) ?? $t;
  // percent unify
  $t = preg_replace('/\s*퍼\s*센\s*트\s*/iu', '%', $t) ?? $t;
  $t = preg_replace('/\s*%\s*/u', '%', $t) ?? $t;
  $t = trim($t);
  $t = mb_strtolower($t, 'UTF-8');
  return $t;
}

