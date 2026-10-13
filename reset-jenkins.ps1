# Reset Jenkins Security and Passwords to admin123
$ErrorActionPreference = "Stop"

try {
    Write-Host "Stopping Jenkins service..." -ForegroundColor Cyan
    Stop-Service -Name Jenkins -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    $configPath = "C:\ProgramData\Jenkins\.jenkins\config.xml"
    if (Test-Path $configPath) {
        Write-Host "Modifying Jenkins configuration to disable login prompt..." -ForegroundColor Cyan
        $content = Get-Content $configPath -Raw

        # Set useSecurity to false
        $content = $content -replace '<useSecurity>.*?</useSecurity>', '<useSecurity>false</useSecurity>'

        # Replace authorizationStrategy with Unsecured
        $content = $content -replace '(?s)<authorizationStrategy.*?</authorizationStrategy>', '<authorizationStrategy class="hudson.security.AuthorizationStrategy$Unsecured"/>'

        # Replace securityRealm with None
        $content = $content -replace '(?s)<securityRealm.*?</securityRealm>', '<securityRealm class="hudson.security.SecurityRealm$None"/>'

        Set-Content -Path $configPath -Value $content -Force
        Write-Host "Config updated successfully." -ForegroundColor Green
    }

    # Also reset password hash for all user accounts to admin123
    $userFiles = Get-ChildItem "C:\ProgramData\Jenkins\.jenkins\users\*\config.xml" -ErrorAction SilentlyContinue
    foreach ($f in $userFiles) {
        Write-Host "Setting password for user in $($f.Directory.Name)..." -ForegroundColor Cyan
        $uContent = Get-Content $f.FullName -Raw
        $uContent = $uContent -replace '<passwordHash>.*?</passwordHash>', '<passwordHash>#jbcrypt:$2a$10$aTCpqRz6xfl1pmvMmhVSoeItSnZSfKrIMA1w7ZbKnieIa/8pwFR1m</passwordHash>'
        Set-Content -Path $f.FullName -Value $uContent -Force
    }

    Write-Host "Starting Jenkins service..." -ForegroundColor Cyan
    Start-Service -Name Jenkins
    Write-Host "Waiting for Jenkins to initialize..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host " SUCCESS! Jenkins security has been unlocked!" -ForegroundColor Green
    Write-Host " Open http://localhost:8080 in your browser." -ForegroundColor Green
    Write-Host " Username: balakumaran" -ForegroundColor Yellow
    Write-Host " Password: admin123" -ForegroundColor Yellow
    Write-Host "======================================================" -ForegroundColor Green
} catch {
    Write-Host "Error occurred: $_" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
