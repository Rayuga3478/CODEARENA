$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
function J($r) { $r | ConvertTo-Json -Depth 6 -Compress }

$stats = Invoke-RestMethod "$base/users/stats/platform"
"STATS: $(J $stats.data)"

$lb = Invoke-RestMethod "$base/users?limit=3"
"LEADERBOARD: $(J $lb.data.data)"
"COUNTRIES: $(J $lb.data.countries)"

$week = Invoke-RestMethod "$base/users?period=week&limit=3"
"WEEKLY: $(J $week.data.data)"

$login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body (@{ login = 'admin'; password = 'admin123' } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($login.data.accessToken)" }

$probs = Invoke-RestMethod "$base/problems?limit=3&sortBy=solvedCount" -Headers $h
"PROBLEMS: $(J ($probs.data.data | Select-Object slug, difficulty, solvedCount, acceptanceRate, userStatus))"

$range = Invoke-RestMethod "$base/problems?minRating=800&maxRating=1200&status=solved" -Headers $h
"SOLVED 800-1200: $($range.data.pagination.total)"

$contests = Invoke-RestMethod "$base/contests"
foreach ($c in $contests.data.data) {
  $d = Invoke-RestMethod "$base/contests/$($c.id)" -Headers $h
  $s = Invoke-RestMethod "$base/contests/$($c.id)/standings"
  "CONTEST $($c.status) '$($c.title)': registered=$($d.data.contest.isRegistered) problems=$(J ($d.data.contest.problems | ForEach-Object label)) standings=$($s.data.standings.Count)"
}

$prof = Invoke-RestMethod "$base/users/admin"
$u = $prof.data.user
"PROFILE: rank=$($u.globalRank) solved=$($u.solvedCount) streak=$($u.currentStreak)/$($u.maxStreak) days=$(@($u.activity.PSObject.Properties).Count) tags=$(J ($u.tagStats | Select-Object -First 3)) langs=$(J $u.languageStats)"

$code = "#include <bits/stdc++.h>`nint main(){long long a,b; std::cin>>a>>b; std::cout<<a+b<<std::endl;}"
$run = Invoke-RestMethod "$base/submissions/run" -Method Post -Headers $h -ContentType 'application/json' -Body (@{ problemSlug = 'fibonacci-number'; languageId = 'cpp17'; sourceCode = $code; input = "40 2" } | ConvertTo-Json)
"RUN queued: $($run.data.runId)"
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 700
  $r = Invoke-RestMethod "$base/submissions/run/$($run.data.runId)" -Headers $h
  if ($r.data.run.status -notin @('QUEUED', 'RUNNING')) { "RUN RESULT: $(J $r.data.run)"; break }
}
