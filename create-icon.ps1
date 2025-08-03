# PowerShell script to create PNG icon for Activity Bar from SVG content
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

# Create a bitmap
$bitmap = New-Object System.Drawing.Bitmap(128, 128)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Set background to transparent
$graphics.Clear([System.Drawing.Color]::Transparent)

# Define the gray color for VS Code compatibility
$grayColor = [System.Drawing.Color]::FromArgb(133, 133, 133)  # #858585
$lightGrayColor = [System.Drawing.Color]::FromArgb(180, 133, 133, 133)  # #858585 with opacity
$mediumGrayColor = [System.Drawing.Color]::FromArgb(230, 133, 133, 133)  # #858585 with higher opacity

# Create pens and brushes
$pen = New-Object System.Drawing.Pen($grayColor, 3)
$thinPen = New-Object System.Drawing.Pen($grayColor, 2.5)
$messagePen = New-Object System.Drawing.Pen($lightGrayColor, 1.5)
$brush = New-Object System.Drawing.SolidBrush($mediumGrayColor)
$dotBrush = New-Object System.Drawing.SolidBrush($grayColor)

# Draw main circle outline
$graphics.DrawEllipse($pen, 6, 6, 116, 116)

# Draw main chat bubble
$graphics.DrawRectangle($thinPen, 25, 30, 38, 24)
# Chat bubble tail
$tailPoints = @(
    (New-Object System.Drawing.Point(25, 50)),
    (New-Object System.Drawing.Point(20, 58)),
    (New-Object System.Drawing.Point(30, 54))
)
$graphics.FillPolygon($brush, $tailPoints)

# Draw message lines in main bubble
$graphics.DrawLine($messagePen, 30, 36, 55, 36)
$graphics.DrawLine($messagePen, 30, 42, 50, 42)
$graphics.DrawLine($messagePen, 30, 48, 45, 48)

# Draw secondary chat bubble
$graphics.DrawRectangle($thinPen, 65, 45, 38, 24)
# Secondary bubble tail
$tailPoints2 = @(
    (New-Object System.Drawing.Point(103, 65)),
    (New-Object System.Drawing.Point(108, 73)),
    (New-Object System.Drawing.Point(98, 69))
)
$graphics.FillPolygon($brush, $tailPoints2)

# Draw message lines in secondary bubble  
$graphics.DrawLine($messagePen, 70, 51, 95, 51)
$graphics.DrawLine($messagePen, 70, 57, 90, 57)
$graphics.DrawLine($messagePen, 70, 63, 85, 63)

# Draw gear icon (simplified)
$graphics.DrawEllipse($messagePen, 84, 24, 12, 12)
$graphics.FillEllipse($dotBrush, 88, 28, 4, 4)

# Draw activity dots
$graphics.FillEllipse($dotBrush, 32, 82, 5, 5)
$lightDotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 133, 133, 133))
$graphics.FillEllipse($lightDotBrush, 42, 82, 5, 5)
$veryLightDotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(128, 133, 133, 133))
$graphics.FillEllipse($veryLightDotBrush, 52, 82, 5, 5)

# Draw notification badge
$graphics.FillEllipse($brush, 86, 41, 8, 8)

# Clean up graphics
$graphics.Dispose()

# Save as activity bar icon PNG
$bitmap.Save("activity-bar-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Host "activity-bar-icon.png created successfully!"
