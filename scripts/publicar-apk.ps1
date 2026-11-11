# Compila el APK de Android y lo publica como release de GitHub.
#
#   .\scripts\publicar-apk.ps1                 compila y publica la versión de app.json
#   .\scripts\publicar-apk.ps1 -SoloCompilar   compila sin subir nada
#
# Si existe el logo propio de assets/local, el APK lo usa como ícono y marca.
# Necesita Android Studio y, para publicar, GitHub CLI (gh) con sesión iniciada.

param(
  [switch]$SoloCompilar
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$version = (Get-Content app.json -Raw | ConvertFrom-Json).expo.version
$etiqueta = "v$version"
$salida = Join-Path $raiz 'dist-apk'
$apk = Join-Path $salida 'control-viajes.apk'

$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk'

if (-not $SoloCompilar) {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw 'Falta GitHub CLI. Instalalo desde https://cli.github.com y corré "gh auth login".'
  }
  # En Windows PowerShell, redirigir la salida de error de un programa con 'Stop' corta el script
  $ErrorActionPreference = 'Continue'
  gh release view $etiqueta *> $null
  $existe = $LASTEXITCODE -eq 0
  $ErrorActionPreference = 'Stop'
  if ($existe) {
    throw "Ya existe el release $etiqueta. Subí la versión en app.json (por ejemplo 1.0.1) y volvé a correr el script."
  }
}

Write-Host "`nGenerando el proyecto de Android (versión $version)..." -ForegroundColor Yellow
npx expo prebuild --platform android --no-install
if ($LASTEXITCODE -ne 0) { throw 'Falló expo prebuild' }

# CMake nuevo para las rutas largas de Windows (ver README)
$cmake = Join-Path $env:ANDROID_HOME 'cmake\3.31.6'
if (Test-Path $cmake) {
  $sdk = $env:ANDROID_HOME -replace '\\', '\\' -replace ':', '\:'
  $cm = $cmake -replace '\\', '\\' -replace ':', '\:'
  Set-Content -Encoding ascii android\local.properties "sdk.dir=$sdk", "cmake.dir=$cm"
}

Write-Host "`nCompilando el APK..." -ForegroundColor Yellow
Push-Location android
try {
  .\gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
  if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación' }
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force $salida | Out-Null
Copy-Item android\app\build\outputs\apk\release\app-release.apk $apk -Force

$mb = [math]::Round((Get-Item $apk).Length / 1MB, 1)
Write-Host "`nAPK listo: $apk ($mb MB)" -ForegroundColor Green

if ($SoloCompilar) { return }

Write-Host "`nPublicando $etiqueta en GitHub..." -ForegroundColor Yellow
gh release create $etiqueta $apk --title "Control de viajes $version" --notes "APK para Android. Descargalo desde el celular, abrilo y aceptá instalar apps desconocidas."
if ($LASTEXITCODE -ne 0) { throw 'Falló la publicación en GitHub' }

$repo = gh repo view --json nameWithOwner -q .nameWithOwner
Write-Host "`nListo. Link fijo para descargar la última versión:" -ForegroundColor Green
Write-Host "https://github.com/$repo/releases/latest/download/control-viajes.apk"
