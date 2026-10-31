$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"login":"admin","password":"admin123"}'
$h = @{ Authorization = "Bearer $($login.data.accessToken)" }

$tests = [ordered]@{
  'PY AC (expect ACCEPTED)' = @'
n = int(input())
a, b = 0, 1
for _ in range(n):
    a, b = b, a + b
print(a)
'@
  'PY WA (expect WRONG_ANSWER)' = @'
n = int(input())
print(n)
'@
  'PY SYNTAX (expect COMPILATION_ERROR)' = 'def f(:\n    pass'
  'PY TLE (expect TIME_LIMIT_EXCEEDED)' = @'
while True:
    pass
'@
  'PY RE (expect RUNTIME_ERROR)' = @'
print(1 // 0)
'@
}

$ids = [ordered]@{}
foreach ($name in $tests.Keys) {
  $body = @{ problemSlug = 'fibonacci-number'; languageId = 'python3'; sourceCode = $tests[$name] } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/submissions" -Method Post -ContentType 'application/json' -Headers $h -Body $body
  $ids[$name] = $r.data.submission.id
}

$deadline = (Get-Date).AddSeconds(90)
$final = @{}
while ((Get-Date) -lt $deadline -and $final.Count -lt $ids.Count) {
  foreach ($name in $ids.Keys) {
    if ($final.ContainsKey($name)) { continue }
    $s = (Invoke-RestMethod -Uri "$base/submissions/$($ids[$name])" -Headers $h).data.submission
    if ($s.verdict -notin 'QUEUED','JUDGING') { $final[$name] = $s }
  }
  Start-Sleep -Milliseconds 700
}

foreach ($name in $ids.Keys) {
  $v = if ($final.ContainsKey($name)) { "$($final[$name].verdict) ($($final[$name].executionTimeMs)ms)" } else { 'STILL PENDING' }
  Write-Output ("{0,-38} -> {1}" -f $name, $v)
}
