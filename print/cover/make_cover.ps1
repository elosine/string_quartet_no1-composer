# THE COVER TEMPLATE -- one generator for every piece (PLAN 2b-P step 2, 2026-10-03).
#
# FOR A NEW PIECE: edit print/cover/cover.json (title, subtitle, name) and run
#
#     powershell -ExecutionPolicy Bypass -File print/cover/make_cover.ps1
#     powershell -ExecutionPolicy Bypass -File print/cover/make_cover.ps1 -Format tabloid-landscape
#
# It writes print/cover/cover-<format>.svg, which tools/export_print.js --cover on reads. Nothing else changes.
#
# THE HOUSE STYLE, measured off the reference score Litany.pdf (piece #4, its day 36) and unchanged since:
#   EngraversGothic BT, black, centred, no added tracking
#   title : subtitle : name  =  1 : 0.65 : 0.5
#   the title's baseline 27.1 % down the sheet; a second title line 1.15 title-heights below the first
#   the subtitle 1.25 title-heights under the last title line; the name 1.60 title-heights under the subtitle
#   the title's size FOR THE SHEET: 8.455 pt per inch of the sheet's short side (letter 72 pt, tabloid 93 pt --
#   piece #4's two numbers; A3 comes to 98.8), then shrunk in half points until EVERY line fits the margins
#   (piece #5's lesson: a long ensemble line at 0.65 x title can be wider than the title itself)
#
# The sheet's size comes from print/formats.json, the file the exporter reads, so the cover is drawn at exactly
# the sheet that is printed. Its history: piece #4's make_cover.ps1 (four trial sheets into a scratch folder) and
# piece #5's make_cover_septet.ps1 (one sheet, the words inside the script) -- both in their own repositories.
param(
  [string]$Format = "",      # a name in print/formats.json; empty = its default
  [string]$Words = "",       # the words file; empty = print/cover/cover.json
  [double]$TitlePt = 0,      # the title's starting size; 0 = the house size for the sheet
  [string]$Out = ""          # the SVG to write; empty = print/cover/cover-<format>.svg
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

# ---- the house constants
$FONT = "EngraversGothic BT"
$MARGIN_IN = 0.75
$PT_PER_SHORT_INCH = 8.455
$FIRST_FRAC = 0.271
$SUB_RATIO = 0.65
$NAME_RATIO = 0.5
$LINE_ADV = 1.15       # title-heights from one title line to the next (and sub-heights between subtitle lines)
$SUB_DROP = 1.25       # title-heights from the last title baseline to the first subtitle baseline
$NAME_DROP = 1.60      # title-heights from the last subtitle baseline to the name

# ---- the sheet
$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$fmts = Get-Content -Raw -Encoding UTF8 (Join-Path $ROOT "print\formats.json") | ConvertFrom-Json
if (-not $Format) { $Format = $fmts.default }
$F = $fmts.formats.$Format
if (-not $F) { throw "unknown format '$Format' -- print/formats.json has: " + (($fmts.formats.PSObject.Properties | ForEach-Object { $_.Name }) -join ", ") }
$perIn = 1.0
if ($F.unit -eq "mm") { $perIn = 25.4 }
$WIn = [double]$F.w / $perIn
$HIn = [double]$F.h / $perIn

# ---- the words
if (-not $Words) { $Words = Join-Path $PSScriptRoot "cover.json" }
$cfg = Get-Content -Raw -Encoding UTF8 $Words | ConvertFrom-Json
$titleLines = @(); if ($cfg.title) { $titleLines = @($cfg.title) }
$subLines = @(); if ($cfg.subtitle) { $subLines = @($cfg.subtitle) }
$NAME = [string]$cfg.name
if ($titleLines.Count -lt 1) { throw "$Words has no title" }

# ---- the face, and a way to measure it
try { $fam = New-Object System.Drawing.FontFamily($FONT) }
catch { throw "the cover's face '$FONT' is not installed on this machine -- install it; a fallback face is not the house style" }
$sf = [System.Drawing.StringFormat]::GenericTypographic
$bmp = New-Object System.Drawing.Bitmap(10, 10)
$g = [System.Drawing.Graphics]::FromImage($bmp)
function Get-W { param([string]$Txt, [double]$Pt)
  $f = New-Object System.Drawing.Font($fam, $Pt, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
  $w = $g.MeasureString($Txt, $f, 100000, $sf).Width * 72.0 / $g.DpiX
  $f.Dispose(); return [double]$w
}
# the widest line at a given title size, each line at its own ratio
function Get-Widest { param([double]$Tp)
  $w = 0.0
  foreach ($l in $titleLines) { $x = Get-W $l $Tp; if ($x -gt $w) { $w = $x } }
  foreach ($l in $subLines) { $x = Get-W $l ($Tp * $SUB_RATIO); if ($x -gt $w) { $w = $x } }
  if ($NAME) { $x = Get-W $NAME ($Tp * $NAME_RATIO); if ($x -gt $w) { $w = $x } }
  return $w
}

# ---- the size: the house size for the sheet, shrunk until EVERY line fits the margins
$maxWpt = ($WIn - 2 * $MARGIN_IN) * 72.0
$housePt = [math]::Round([math]::Min($WIn, $HIn) * $PT_PER_SHORT_INCH * 2) / 2
if ($TitlePt -gt 0) { $housePt = $TitlePt }
$titlePt = $housePt
while (($titlePt -gt 8) -and ((Get-Widest $titlePt) -gt $maxWpt)) { $titlePt = $titlePt - 0.5 }
$subPt = $titlePt * $SUB_RATIO
$namePt = $titlePt * $NAME_RATIO

# ---- the lines
$wpt = [math]::Round($WIn * 72.0, 2); $hpt = [math]::Round($HIn * 72.0, 2)
$cx = [math]::Round($wpt / 2, 2)
# data-w = the line's width in pt AS MEASURED HERE, with the real face. tools/check_print_front.js compares it with what the
# browser draws: a face that fell back silently draws a different width, and that is the only way anyone would know.
function Add-Line { param([string]$Txt, [double]$Y, [double]$Pt)
  $t = [System.Security.SecurityElement]::Escape($Txt)
  $w = [math]::Round((Get-W $Txt $Pt), 1)
  return "    <text x=""$cx"" y=""$([math]::Round($Y,2))"" font-size=""$([math]::Round($Pt,2))"" data-w=""$w"">$t</text>"
}
$lines = @()
$y = $hpt * $FIRST_FRAC
for ($i = 0; $i -lt $titleLines.Count; $i++) {
  if ($i -gt 0) { $y = $y + $titlePt * $LINE_ADV }
  $lines += Add-Line $titleLines[$i] $y $titlePt
}
for ($i = 0; $i -lt $subLines.Count; $i++) {
  if ($i -eq 0) { $y = $y + $titlePt * $SUB_DROP } else { $y = $y + $subPt * $LINE_ADV }
  $lines += Add-Line $subLines[$i] $y $subPt
}
if ($NAME) {
  $y = $y + $titlePt * $NAME_DROP
  $lines += Add-Line $NAME $y $namePt
}

if (-not $Out) { $Out = Join-Path $PSScriptRoot "cover-$Format.svg" }
$doc = "<svg xmlns=""http://www.w3.org/2000/svg"" width=""${wpt}pt"" height=""${hpt}pt"" viewBox=""0 0 $wpt $hpt"">`n" +
       "  <rect width=""100%"" height=""100%"" fill=""#ffffff""/>`n" +
       "  <g font-family=""$FONT"" fill=""#000000"" text-anchor=""middle"">`n" + ($lines -join "`n") + "`n  </g>`n</svg>`n"
[System.IO.File]::WriteAllText($Out, $doc, (New-Object System.Text.UTF8Encoding $false))

# ---- the report (BEFORE the graphics are disposed -- measuring after Dispose throws)
$widest = Get-Widest $titlePt
"cover-{0}   {1:N2} x {2:N2} in   title {3:N1}  subtitle {4:N1}  name {5:N1} pt   (the house size for this sheet {6:N1})" -f $Format, $WIn, $HIn, $titlePt, $subPt, $namePt, $housePt
"widest line {0:N0} pt of {1:N0} available   last baseline {2:N0} pt ({3:P0} down)" -f $widest, $maxWpt, $y, ($y / $hpt)
if ($titlePt -lt $housePt) { "NOTE  the type was shrunk from {0:N1} to {1:N1} pt so that every line fits -- a long subtitle may read better as two lines (a list in cover.json)" -f $housePt, $titlePt }
$g.Dispose(); $bmp.Dispose()
"wrote $Out"
