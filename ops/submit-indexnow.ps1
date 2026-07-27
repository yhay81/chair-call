param(
  [Parameter(Mandatory = $true)]
  [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$key = 'b7f2c8a1d4e6490fa35b218c76e9d042'
$hostName = ([Uri]$BaseUrl).Host
$body = @{
  host = $hostName
  key = $key
  keyLocation = "$BaseUrl/$key.txt"
  urlList = @(
    "$BaseUrl/",
    "$BaseUrl/create",
    "$BaseUrl/guide",
    "$BaseUrl/privacy"
  )
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri 'https://api.indexnow.org/indexnow' `
  -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body $body
