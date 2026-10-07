# PowerShell Lightweight Local Web Server for Danso Simulator
# Windows 기본 내장 .NET HttpListener 사용 (Node.js/Python 무설치 실행)

param(
    [switch]$NoBrowser
)

$port = 8080
$prefix = "http://localhost:$port/"
$baseDir = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "🎋 초등 3학년 단소 시뮬레이터 로컬 서버가 시작되었습니다!" -ForegroundColor Yellow
    Write-Host "👉 접속 주소: $prefix" -ForegroundColor Cyan
    Write-Host "👉 종료하려면 이 창에서 Ctrl + C 를 누르세요." -ForegroundColor Gray
    Write-Host "==========================================================" -ForegroundColor Green

    # 기본 브라우저 자동 실행
    if (-not $NoBrowser) {
        Start-Process $prefix
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($urlPath)) {
            $urlPath = "index.html"
        }

        $filePath = Join-Path $baseDir $urlPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # MIME type 매핑
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            switch ($ext) {
                ".html" { $mime = "text/html; charset=utf-8" }
                ".css"  { $mime = "text/css; charset=utf-8" }
                ".js"   { $mime = "application/javascript; charset=utf-8" }
                ".json" { $mime = "application/json; charset=utf-8" }
                ".png"  { $mime = "image/png" }
                ".jpg"  { $mime = "image/jpeg" }
                ".svg"  { $mime = "image/svg+xml" }
                ".mp3"  { $mime = "audio/mpeg" }
                ".wav"  { $mime = "audio/wav" }
            }

            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "서버 실행 오류: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
}
