$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$spriteDir = Join-Path $PSScriptRoot "assets\sprites"
New-Item -ItemType Directory -Path $spriteDir -Force | Out-Null

$palette = @{
  "." = [System.Drawing.Color]::Transparent
  "K" = [System.Drawing.Color]::FromArgb(255, 24, 24, 24)
  "G" = [System.Drawing.Color]::FromArgb(255, 98, 184, 90)
  "L" = [System.Drawing.Color]::FromArgb(255, 192, 234, 164)
  "R" = [System.Drawing.Color]::FromArgb(255, 225, 74, 74)
  "W" = [System.Drawing.Color]::FromArgb(255, 238, 245, 255)
  "Y" = [System.Drawing.Color]::FromArgb(255, 255, 215, 95)
  "O" = [System.Drawing.Color]::FromArgb(255, 230, 164, 52)
  "B" = [System.Drawing.Color]::FromArgb(255, 115, 140, 86)
  "S" = [System.Drawing.Color]::FromArgb(255, 160, 223, 246)
  "C" = [System.Drawing.Color]::FromArgb(255, 212, 246, 255)
  "D" = [System.Drawing.Color]::FromArgb(255, 122, 88, 58)
  "E" = [System.Drawing.Color]::FromArgb(255, 95, 68, 45)
  "F" = [System.Drawing.Color]::FromArgb(255, 78, 165, 72)
  "H" = [System.Drawing.Color]::FromArgb(255, 62, 133, 58)
}

function New-Sprite {
  param(
    [string]$Name,
    [string[]]$Rows
  )

  $h = $Rows.Length
  $w = $Rows[0].Length
  $scale = 2
  $bmp = [System.Drawing.Bitmap]::new(
    [int]($w * $scale),
    [int]($h * $scale),
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  )

  for ($y = 0; $y -lt $h; $y++) {
    $row = $Rows[$y]
    for ($x = 0; $x -lt $w; $x++) {
      $ch = $row[$x]
      $key = [string]$ch
      if (-not $palette.ContainsKey($key)) { continue }
      $color = $palette[$key]
      if ($color.A -eq 0) { continue }
      for ($py = 0; $py -lt $scale; $py++) {
        for ($px = 0; $px -lt $scale; $px++) {
          $bmp.SetPixel($x * $scale + $px, $y * $scale + $py, $color)
        }
      }
    }
  }

  $outPath = Join-Path $spriteDir $Name
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

# Player frames (retro dino, Mario-like frame timing)
New-Sprite "player_idle_0.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"...KGGLLGGKK....",
"..KGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
".KGGGLLLLGGGK...",
"..KGGGGGGGGK....",
"..KGGK..KGGK....",
"..KGGK..KGGK....",
"...KK....KK.....",
"................"
)

New-Sprite "player_run_0.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"...KGGLLGGKK....",
"..KGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
"..KGGLLLLGGK....",
"...KGGGGGGK.....",
"...KGGK.KGK.....",
"..KGGK...KGGK...",
"..KK......KK....",
"................"
)

New-Sprite "player_run_1.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"...KGGLLGGKK....",
"..KGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
"..KGGLLLLGGK....",
"...KGGGGGGK.....",
"...KGGK..KGK....",
"...KGGK.KGGK....",
"....KK...KK.....",
"................"
)

New-Sprite "player_run_2.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"...KGGLLGGKK....",
"..KGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
"..KGGLLLLGGK....",
"...KGGGGGGK.....",
"..KGGK..KGGK....",
"..KGK....KGGK...",
"...KK.....KK....",
"................"
)

New-Sprite "player_jump_0.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"...KGGLLGGKK....",
"..KGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
"..KGGLLLLGGK....",
"...KGGGGGGK.....",
"...KGGK.KGGK....",
"....KGK.KGK.....",
"....KK...KK.....",
"................"
)

New-Sprite "player_fall_0.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"..KGGGLLGGGK....",
".KGGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
".KGGGLLLLGGGK...",
"..KGGGGGGGGK....",
"...KGGGGGGK.....",
"..KGGK..KGGK....",
"..KGGK..KGGK....",
"...KK....KK.....",
"................"
)

New-Sprite "player_skid_0.png" @(
"................",
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"..KGGGLLGGGK....",
".KGGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
"..KGGLLLLGGK....",
"...KGGGGGGK.....",
"...KGGK.KGK.....",
"..KGGK..KGGK....",
".KGGK....KGGK...",
".KK.......KK....",
"................"
)

New-Sprite "player_hurt_0.png" @(
"................",
".....KKKK.......",
"....KRRRRK......",
"...KRRLLRRK.....",
"..KRRRLLRRRK....",
".KRRRRRRRRRRK...",
".KRRRKKKKRRRK...",
".KRRRRRRRRRRK...",
".KRRRLLLLRRRK...",
".KRRRLLLLRRRK...",
"..KRRRRRRRRK....",
"...KRRRRRRK.....",
"..KRRK..KRRK....",
"..KRRK..KRRK....",
"...KK....KK.....",
"................"
)

New-Sprite "player_win_0.png" @(
".....KKKK.......",
"....KGGGGK......",
"...KGGLLGGK.....",
"..KGGGLLGGGK....",
".KGGGGGGGGGGK...",
".KGGGGRRGGGGK...",
".KGGGGGGGGGGK...",
".KGGGLLLLGGGK...",
"..KGGLLLLGGK....",
"...KGGGGGGK.....",
"..KGGK..KGGK....",
"..KGGK..KGGK....",
".KGGK....KGGK...",
".KK........KK...",
"................",
"................"
)

# Enemy (goomba-like dino critter)
New-Sprite "enemy_walk_0.png" @(
"................",
"................",
"....KKKKKK......",
"...KBBBBBBK.....",
"..KBBBBBBBBK....",
"..KBBBKBBBBK....",
"..KBBBBBBBBK....",
"..KBBBBBBBBK....",
"..KBBBBBBBBK....",
"...KBBKKBBK.....",
"...KWW..WWK.....",
"..KWWK..KWWK....",
"..KK......KK....",
"................",
"................",
"................"
)

New-Sprite "enemy_walk_1.png" @(
"................",
"................",
"....KKKKKK......",
"...KBBBBBBK.....",
"..KBBBBBBBBK....",
"..KBBBKBBBBK....",
"..KBBBBBBBBK....",
"..KBBBBBBBBK....",
"..KBBBBBBBBK....",
"...KBBKKBBK.....",
"...KWW..WWK.....",
"...KWWK.KWWK....",
"....KK...KK.....",
"................",
"................",
"................"
)

# Coin frames
New-Sprite "coin_0.png" @(
"................",
"................",
"......YY........",
"....YYYYYY......",
"...YYOOOOYY.....",
"...YOOOOOOY.....",
"..YYOOOOOOYY....",
"..YYOOOOOOYY....",
"...YOOOOOOY.....",
"...YYOOOOYY.....",
"....YYYYYY......",
"......YY........",
"................",
"................",
"................",
"................"
)

New-Sprite "coin_1.png" @(
"................",
"................",
".......YY.......",
"......YYYY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YYYY......",
".......YY.......",
"................",
"................",
"................",
"................"
)

New-Sprite "coin_2.png" @(
"................",
"................",
"......YY........",
"....YYYYYY......",
"...YYOOOOYY.....",
"...YOOOOOOY.....",
"..YYOOOOOOYY....",
"..YYOOOOOOYY....",
"...YOOOOOOY.....",
"...YYOOOOYY.....",
"....YYYYYY......",
"......YY........",
"................",
"................",
"................",
"................"
)

New-Sprite "coin_3.png" @(
"................",
"................",
".......YY.......",
"......YYYY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YOOY......",
"......YYYY......",
".......YY.......",
"................",
"................",
"................",
"................"
)

# Power crystal frames
New-Sprite "power_0.png" @(
"................",
".......S........",
"......SSS.......",
".....SSCSS......",
"....SSCCCSS.....",
"...SSCCCCCSS....",
"....SSCCCSS.....",
".....SSCSS......",
"......SSS.......",
".......S........",
".......K........",
"......KKK.......",
"................",
"................",
"................",
"................"
)

New-Sprite "power_1.png" @(
"................",
".......C........",
"......CCC.......",
".....CCSCC......",
"....CCSSSCC.....",
"...CCSSSSSCC....",
"....CCSSSCC.....",
".....CCSCC......",
"......CCC.......",
".......C........",
".......K........",
"......KKK.......",
"................",
"................",
"................",
"................"
)

# Environment tiles / props
New-Sprite "tile_ground_top.png" @(
"FFFFFFFFFFFFFFFF",
"HHHHHHHHHHHHHHHH",
"DEDEDEDEDEDEDEDE",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED"
)

New-Sprite "tile_ground_fill.png" @(
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED",
"DDDDDDDDDDDDDDDD",
"EDEDEDEDEDEDEDED"
)

New-Sprite "tile_platform_stone.png" @(
"KKKKKKKKKKKKKKKK",
"BBBBBBBBBBBBBBBB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB",
"BEBEBEBEBEBEBEBE",
"EBEBEBEBEBEBEBEB"
)

New-Sprite "tile_platform_tech.png" @(
"KKKKKKKKKKKKKKKK",
"SSSSSSSSSSSSSSSS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS",
"SCSCSCSCSCSCSCSC",
"CSCSCSCSCSCSCSCS"
)

New-Sprite "prop_bush_0.png" @(
"................",
"................",
"....FFFFFF......",
"..FFFFFFFFFF....",
".FFFHHHHHHFFF...",
".FFHHHHHHHHFF...",
".FFHHHHHHHHFF...",
".FFFHHHHHHFFF...",
"..FFFFFFFFFF....",
"....FFFFFF......",
"................",
"................",
"................",
"................",
"................",
"................"
)

New-Sprite "prop_bush_1.png" @(
"................",
"................",
"......FFFF......",
"....FFFFFFFF....",
"..FFFHHHHHHFFF..",
".FFHHHHHHHHHHFF.",
".FFHHHHHHHHHHFF.",
"..FFFHHHHHHFFF..",
"....FFFFFFFF....",
"......FFFF......",
"................",
"................",
"................",
"................",
"................",
"................"
)

Write-Output "Sprite PNG files generated in $spriteDir"
