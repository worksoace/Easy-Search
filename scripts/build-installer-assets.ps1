$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$rootDir = Split-Path -Parent $PSScriptRoot
$buildDir = Join-Path $rootDir "build"
$iconPath = Join-Path $rootDir "appicon.png"
$headerPath = Join-Path $buildDir "installerHeader.bmp"
$sidebarPath = Join-Path $buildDir "installerSidebar.bmp"

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

function New-Color([int]$r, [int]$g, [int]$b) {
  return [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function New-RoundedRectPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2

  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function Save-HeaderBitmap {
  $bitmap = New-Object System.Drawing.Bitmap 150, 57
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.Rectangle]::new(0, 0, 150, 57)),
      (New-Color 243 235 220),
      (New-Color 214 190 154),
      0.0
    )
    $graphics.FillRectangle($background, 0, 0, 150, 57)
    $background.Dispose()

    $accentBrush = New-Object System.Drawing.SolidBrush (New-Color 117 74 33)
    $graphics.FillRectangle($accentBrush, 0, 0, 150, 6)
    $accentBrush.Dispose()

    if (Test-Path $iconPath) {
      $icon = [System.Drawing.Image]::FromFile($iconPath)
      try {
        $graphics.DrawImage($icon, 10, 10, 36, 36)
      }
      finally {
        $icon.Dispose()
      }
    }

    $titleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 11, [System.Drawing.FontStyle]::Bold)
    $subtitleFont = New-Object System.Drawing.Font("Segoe UI", 6.5, [System.Drawing.FontStyle]::Regular)
    $titleBrush = New-Object System.Drawing.SolidBrush (New-Color 76 49 23)
    $subtitleBrush = New-Object System.Drawing.SolidBrush (New-Color 120 87 55)

    try {
      $graphics.DrawString("Easy Search", $titleFont, $titleBrush, 53, 11)
      $graphics.DrawString("Offline Bible study setup", $subtitleFont, $subtitleBrush, 54, 28)
    }
    finally {
      $titleFont.Dispose()
      $subtitleFont.Dispose()
      $titleBrush.Dispose()
      $subtitleBrush.Dispose()
    }

    $bitmap.Save($headerPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

function Save-SidebarBitmap {
  $bitmap = New-Object System.Drawing.Bitmap 164, 314
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      ([System.Drawing.Rectangle]::new(0, 0, 164, 314)),
      (New-Color 98 63 31),
      (New-Color 33 22 11),
      90.0
    )
    $graphics.FillRectangle($background, 0, 0, 164, 314)
    $background.Dispose()

    $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 255, 240, 214))
    $graphics.FillEllipse($glowBrush, -18, -8, 150, 92)
    $graphics.FillEllipse($glowBrush, 38, 150, 120, 120)
    $glowBrush.Dispose()

    $cardPath = New-RoundedRectPath -x 18 -y 22 -width 128 -height 104 -radius 16
    $cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(34, 255, 255, 255))
    $graphics.FillPath($cardBrush, $cardPath)
    $cardBrush.Dispose()
    $cardPath.Dispose()

    if (Test-Path $iconPath) {
      $icon = [System.Drawing.Image]::FromFile($iconPath)
      try {
        $graphics.DrawImage($icon, 42, 38, 78, 78)
      }
      finally {
        $icon.Dispose()
      }
    }

    $titleFont = New-Object System.Drawing.Font("Segoe UI Semibold", 18, [System.Drawing.FontStyle]::Bold)
    $bodyFont = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
    $smallFont = New-Object System.Drawing.Font("Segoe UI Semibold", 8.5, [System.Drawing.FontStyle]::Regular)
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 250, 244, 235))
    $softBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 239, 225, 206))
    $goldBrush = New-Object System.Drawing.SolidBrush (New-Color 226 194 140)

    try {
      $graphics.DrawString("Easy", $titleFont, $whiteBrush, 21, 144)
      $graphics.DrawString("Search", $titleFont, $whiteBrush, 21, 171)

      $paragraph = "Local dictionary, verses, concordance, and Bible names in one offline app."
      $graphics.DrawString($paragraph, $bodyFont, $softBrush, [System.Drawing.RectangleF]::new(22, 214, 118, 50))

      $graphics.DrawString("Fast setup", $smallFont, $goldBrush, 22, 279)
      $graphics.DrawString("Works offline", $smallFont, $goldBrush, 82, 279)
    }
    finally {
      $titleFont.Dispose()
      $bodyFont.Dispose()
      $smallFont.Dispose()
      $whiteBrush.Dispose()
      $softBrush.Dispose()
      $goldBrush.Dispose()
    }

    $bitmap.Save($sidebarPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  }
  finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

Save-HeaderBitmap
Save-SidebarBitmap

Write-Host "Created $headerPath"
Write-Host "Created $sidebarPath"
