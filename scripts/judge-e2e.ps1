$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"login":"admin","password":"admin123"}'
$h = @{ Authorization = "Bearer $($login.data.accessToken)" }

$tests = [ordered]@{
  'AC (expect ACCEPTED)' = @{ slug = 'fibonacci-number'; code = @'
#include <bits/stdc++.h>
using namespace std;
int main(){ long long n; cin>>n; long long a=0,b=1; for(long long i=0;i<n;i++){ long long t=a+b; a=b; b=t; } cout<<a<<endl; }
'@ }
  'WA (expect WRONG_ANSWER)' = @{ slug = 'fibonacci-number'; code = @'
#include <bits/stdc++.h>
using namespace std;
int main(){ long long n; cin>>n; cout<<n<<endl; }
'@ }
  'CE (expect COMPILATION_ERROR)' = @{ slug = 'fibonacci-number'; code = 'int main( { return 0 }' }
  'TLE (expect TIME_LIMIT_EXCEEDED)' = @{ slug = 'fibonacci-number'; code = @'
#include <bits/stdc++.h>
int main(){ volatile long long x=0; while(true){ x++; } }
'@ }
  'RE (expect RUNTIME_ERROR)' = @{ slug = 'fibonacci-number'; code = @'
#include <bits/stdc++.h>
int main(){ int* p = nullptr; *p = 1; return 0; }
'@ }
}

$ids = [ordered]@{}
foreach ($name in $tests.Keys) {
  $t = $tests[$name]
  $body = @{ problemSlug = $t.slug; languageId = 'cpp17'; sourceCode = $t.code } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/submissions" -Method Post -ContentType 'application/json' -Headers $h -Body $body
  $ids[$name] = $r.data.submission.id
}

$deadline = (Get-Date).AddSeconds(60)
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
  Write-Output ("{0,-34} -> {1}" -f $name, $v)
}
