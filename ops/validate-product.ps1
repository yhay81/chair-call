$ErrorActionPreference = 'Stop'

$required = @(
  'DECISIONS.md',
  'EXPERIMENT.md',
  'METRICS.md',
  'PRIVACY.md',
  'SECURITY.md',
  'STACK.md',
  'public/app.css',
  'public/app.js',
  'public/og.png'
)

foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required release file: $path"
  }
}

$surfacePaths = @('src/ui', 'public/app.js', 'public/app.css')
$surfaceText = foreach ($path in $surfacePaths) {
  if (Test-Path -LiteralPath $path -PathType Container) {
    Get-ChildItem -LiteralPath $path -File -Recurse | Get-Content -Raw
  } else {
    Get-Content -Raw -LiteralPath $path
  }
}
$joinedSurface = $surfaceText -join "`n"
if ($joinedSurface -match 'style=') {
  throw 'Inline style attributes are not permitted.'
}
if ($joinedSurface -match '30日で判定|30日間の実験|MVP|実験中|収益性|検証プロジェクト') {
  throw 'Experiment or portfolio meta copy leaked into the product surface.'
}
if ($joinedSurface -match '<h1[^>]*>[^<]{24,}</h1>') {
  throw 'Oversized text-led product branding is not permitted.'
}

$worker = Get-Content -Raw -LiteralPath 'src/worker.tsx'
$listing = Get-Content -Raw -LiteralPath 'src/data/listing.ts'
if ($listing -notmatch 'instagram\.com' -or $listing -notmatch 'line\.me' -or $listing -notmatch 'x\.com') {
  throw 'The contact allowlist boundary is missing from the product implementation.'
}
if ($worker -match 'applicant|phone_number|face_image|payment') {
  throw 'Applicant profiles, photos, phone numbers, and payment do not belong in the first release schema.'
}

Write-Output 'Release contract passed: short-lived public calls without applicant storage.'
