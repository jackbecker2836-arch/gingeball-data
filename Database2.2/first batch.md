Yes. Here’s the cleaner full pass by **season**, using this mapping:

2021 row \= 2020-21 season  
2022 row \= 2021-22 season  
2023 row \= 2022-23 season  
2024 row \= 2023-24 season  
2025 row \= 2024-25 season

Not touching 2025-26 here.

I’m only listing changes I’d actually make. Leaving someone off means I think the current role is acceptable or too borderline to force.

# **Global fixes first**

Before any season-specific role changes:

| Issue | Fix |
| ----- | ----- |
| `Blake Hinson` with `bbref_id = cunnica01` | This is **Cade Cunningham**, not Blake Hinson. Canonicalize the player name. |
| FC stored as `effective_role = FC` while `label_name = Heavy-Minute Starter` | Final files should display **Franchise Cornerstone** cleanly when `effective_role = FC`. |
| Injured stars getting downgraded by availability | Do not solve injury through role-on-team. Add injury/availability later. |
| High usage being treated as FC | Stop doing that. Trae/Harden/Dame/Maxey/etc. can be high-usage engines without being FC. |
| Tactical Starter being too broad | Use it for conditional starter/fit starter/matchup starter, not every uncertain starter. |

# **2020-21 season**

## **Franchise Cornerstone changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Stephen Curry | Heavy-Minute Starter | **Franchise Cornerstone** | Warriors’ entire offense/identity still ran through Curry. Obvious FC. |
| Joel Embiid | Heavy-Minute Starter | **Franchise Cornerstone** | Philly was Embiid-centered. MVP-level burden. |
| Jimmy Butler | Heavy-Minute Starter | **Franchise Cornerstone** | Miami’s identity, closing offense, and playoff structure were Butler-centered. |
| Kawhi Leonard | Heavy-Minute Starter | **Franchise Cornerstone** | Clippers were built around Kawhi as the playoff axis. |
| Kevin Durant | Heavy-Minute Starter | **Franchise Cornerstone** | Nets’ top-end identity still centered around KD even with Harden/Kyrie. |
| Karl-Anthony Towns | Heavy-Minute Starter | **Franchise Cornerstone** | Minnesota had not yet shifted fully to Ant. KAT was still the franchise-status big. |
| Bradley Beal | Heavy-Minute Starter | **Franchise Cornerstone** | 2020-21 Washington was still Beal’s franchise ecosystem. |
| Zion Williamson | Heavy-Minute Starter | **Franchise Cornerstone** | Point-Zion season; New Orleans was clearly trying to build around him. |
| Anthony Edwards | Franchise Cornerstone | **Heavy-Minute Starter** | Rookie Ant was a huge future piece, but not the actual 2020-21 franchise axis yet. |
| Darius Garland | Franchise Cornerstone | **Heavy-Minute Starter** | Not yet the team-building center. Emerging guard, not FC. |
| Jamal Murray | Franchise Cornerstone | **Heavy-Minute Starter** | Denver’s franchise cornerstone was Jokić. Murray was the co-star. |
| James Harden | Franchise Cornerstone | **Heavy-Minute Starter** | Split Rockets/Nets season. High usage, but not clean franchise-cornerstone status. |

## **Other 2020-21 changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Jalen Brunson | Core Rotational Player | **Sixth Man / Impact Sub** | More accurate as Dallas’ bench creator/impact guard. |
| Spencer Dinwiddie | Active DNP | **Inactive / injury-status separate** | ACL absence, not coach’s-decision DNP. |
| T.J. Warren | Active DNP | **Inactive / injury-status separate** | Injury absence, not actual Active DNP. |
| Jaren Jackson Jr. | Tactical Starter | **Heavy-Minute Starter with injury flag** | When active, Memphis viewed him as a core starter, not tactical. |

# **2021-22 season**

## **Franchise Cornerstone changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Stephen Curry | Heavy-Minute Starter | **Franchise Cornerstone** | Title team still orbited around Curry’s gravity. |
| Joel Embiid | Heavy-Minute Starter | **Franchise Cornerstone** | Clear Philly axis. |
| Jimmy Butler | Heavy-Minute Starter | **Franchise Cornerstone** | Miami’s best-player/team-identity piece. |
| Ja Morant | Heavy-Minute Starter | **Franchise Cornerstone** | Memphis’ breakout identity fully centered on Ja. |
| LaMelo Ball | Heavy-Minute Starter | **Franchise Cornerstone** | Charlotte was treating him as the franchise guard. |
| Cade Cunningham / mislabeled Blake Hinson | Franchise Cornerstone flag already present | **Keep FC, fix name** | Detroit’s rebuild was Cade-centered. |
| Anthony Edwards | Franchise Cornerstone | **Heavy-Minute Starter** | Still not quite the full Wolves franchise axis yet; KAT still mattered heavily. |
| Darius Garland | Franchise Cornerstone | **Heavy-Minute Starter** | All-Star leap, but not true franchise-cornerstone status. |
| Jalen Brunson | Franchise Cornerstone | **Heavy-Minute Starter** | Dallas role was big, especially playoffs, but Luka was the ecosystem. |
| James Harden | Franchise Cornerstone | **Heavy-Minute Starter** | Nets/Sixers split; no longer a clean FC. |
| Tyrese Haliburton | Franchise Cornerstone | **Heavy-Minute Starter** | Split Kings/Pacers season. Future FC, but not full-season FC yet. |
| Tyrese Maxey | Franchise Cornerstone | **Heavy-Minute Starter** | Major leap, but Embiid was the franchise axis. |

## **Other 2021-22 changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Jordan Poole | Tactical Starter | **Sixth Man / Impact Sub** | Better described as Golden State’s bench/secondary scoring pressure piece. |
| Bobby Portis | Tactical Starter | **Sixth Man / Impact Sub** | Bucks’ high-impact reserve/spot starter. |
| Jaren Jackson Jr. | Tactical Starter | **Heavy-Minute Starter** | Defensive core starter, not tactical. |
| Klay Thompson | Heavy-Minute Starter | **Tactical Starter / Heavy-Minute borderline** | Midseason return/ramp-up; not a clean full-year heavy-minute starter. |
| Austin Reaves | Core Rotational Player | **Situational Specialist / Core Rotational borderline** | Rookie role was useful but not truly core yet. |

# **2022-23 season**

## **Franchise Cornerstone changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Stephen Curry | Heavy-Minute Starter | **Franchise Cornerstone** | Still the Warriors’ organizing force. |
| Joel Embiid | Heavy-Minute Starter | **Franchise Cornerstone** | MVP season; obvious FC. |
| Jimmy Butler | Heavy-Minute Starter | **Franchise Cornerstone** | Miami’s playoff identity was still Butler. |
| Ja Morant | Heavy-Minute Starter | **Franchise Cornerstone** | Memphis was still Ja-centered. |
| Paolo Banchero | Heavy-Minute Starter | **Franchise Cornerstone** | Orlando immediately made him the offensive future. |
| LaMelo Ball | Heavy-Minute Starter | **Franchise Cornerstone with availability flag** | Charlotte’s team-building still centered on him, even with health issues. |
| Cade Cunningham / mislabeled Blake Hinson | Franchise Cornerstone flag present | **Keep FC, fix name** | Injury season, but Detroit’s role intent was still Cade-centered. |
| Darius Garland | Franchise Cornerstone | **Heavy-Minute Starter** | Mitchell was the higher-burden offensive star after the trade. |
| Jamal Murray | Franchise Cornerstone | **Heavy-Minute Starter** | Championship co-star, not the franchise axis. |
| James Harden | Franchise Cornerstone | **Heavy-Minute Starter** | Embiid team. Harden was the organizer, not FC. |
| Tyrese Maxey | Franchise Cornerstone | **Heavy-Minute Starter** | Important third/second guard, not FC. |

## **Borderline FC calls for 2022-23**

| Player | My lean | Reason |
| ----- | ----- | ----- |
| Trae Young | **Keep FC for 2022-23 only** | This is probably the last season where FC is still defensible. The skepticism was rising, but Atlanta still treated him as the center. |
| Damian Lillard | **Keep FC** | Last clean Portland cornerstone year. |
| De’Aaron Fox | **Keep FC** | Kings breakthrough season; Fox was still clearly treated as a franchise-level guard. |
| Anthony Edwards | **Keep FC or HM** | I’d personally allow FC starting here, but HM is defensible if you want Ant’s FC jump to begin in 2023-24. |

## **Other 2022-23 changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Malik Monk | Core Rotational Player | **Sixth Man / Impact Sub** | Sacramento bench scoring/pressure role. |
| Austin Reaves | Tactical Starter | **Core Rotational / Tactical Starter** | Useful playoff piece, but not heavy-minute yet. |
| Walker Kessler | Tactical Starter | **Tactical Starter / Heavy-Minute Starter borderline** | Rookie starting center value was real, but role still developing. |
| Jonathan Isaac | Energy / Spark Plug | **Situational Specialist** | Defensive specialist/managed role, not energy. |
| Jordan Clarkson | Heavy-Minute Starter | **Sixth Man / Impact Sub / Tactical Starter** | Utah scorer role was high usage but not true heavy-starter trust. |
| Cameron Johnson | Heavy-Minute Starter | **Tactical Starter** | Useful starter, but role-specific. |

# **2023-24 season**

This is where the FC bucket needs a serious cleanup.

## **Franchise Cornerstone changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Stephen Curry | Heavy-Minute Starter | **Franchise Cornerstone** | Warriors still built around Curry’s gravity. |
| Joel Embiid | Heavy-Minute Starter | **Franchise Cornerstone** | Philly still Embiid-centered; injury is separate. |
| Paolo Banchero | Heavy-Minute Starter | **Franchise Cornerstone** | Orlando’s offense and future were clearly Paolo-centered. |
| Victor Wembanyama | Heavy-Minute Starter | **Franchise Cornerstone** | Obvious from day one. Spurs’ entire project became Wemby. |
| Cade Cunningham / mislabeled Blake Hinson | Franchise Cornerstone flag present | **Keep FC, fix name** | Detroit’s rebuild still centered on Cade. |
| Scottie Barnes | Heavy-Minute Starter | **Franchise Cornerstone** | Post-Siakam/OG transition made Scottie the Raptors’ main axis. |
| Anthony Edwards | Franchise Cornerstone | **Keep FC** | By 2023-24, Ant as FC is clean. |
| Trae Young | Franchise Cornerstone | **Heavy-Minute Starter** | This is where I’d officially stop treating Trae as FC. Still primary engine, but no longer clean franchise-cornerstone status. |
| Damian Lillard | Franchise Cornerstone | **Heavy-Minute Starter** | Milwaukee was Giannis’ team. Dame was a high-level co-star. |
| Darius Garland | Franchise Cornerstone | **Heavy-Minute Starter** | Not the Cavs’ franchise axis. |
| Jamal Murray | Franchise Cornerstone | **Heavy-Minute Starter** | Jokić ecosystem. |
| James Harden | Franchise Cornerstone | **Heavy-Minute Starter** | Clippers organizer, not FC. |
| Tyrese Maxey | Franchise Cornerstone | **Heavy-Minute Starter** | Star leap, but Embiid was still the franchise axis. |
| LeBron James | Franchise Cornerstone | **Heavy-Minute Starter** | Still elite, but by this stage FC is too strong as a team-building label. |

## **Other 2023-24 changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Klay Thompson | Heavy-Minute Starter | **Tactical Starter / Sixth Man borderline** | Role became conditional and bench-adjacent. |
| Draymond Green | Tactical Starter | **Heavy-Minute Starter with availability/discipline flag** | When available, not tactical; his absence issue is separate. |
| Immanuel Quickley | Tactical Starter | **Heavy-Minute Starter** | After Toronto trade, starting-guard burden became real. |
| Jonathan Isaac | Core Rotational Player | **Situational Specialist** | High-impact defensive role, but minute/usage-limited. |
| Grayson Allen | Heavy-Minute Starter | **Tactical Starter** | Heavy minutes, but role-specific spacer, not high-burden starter. |
| Tyus Jones | Heavy-Minute Starter | **Tactical Starter / Heavy-Minute borderline** | Starter by roster context, but not a heavy-burden pillar. |
| Jordan Poole | Heavy-Minute Starter | **Tactical Starter** | High usage did not equal high-trust starter value. |
| Malcolm Brogdon | Tactical Starter | **Sixth Man / Impact Sub** | Better as reserve/secondary organizer. |
| Russell Westbrook | Core Rotational Player | **Energy / Spark Plug / Sixth Man borderline** | Pressure/change-of-pace role. |
| Chris Paul | Sixth Man / Impact Sub | **Keep** | This one is correct for Warriors CP3. |

# **2024-25 season**

This is **2024-25**, not the 2025-26 pass we already discussed.

## **Franchise Cornerstone changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Stephen Curry | Heavy-Minute Starter | **Franchise Cornerstone** | Warriors were still Curry-shaped. |
| Joel Embiid | Heavy-Minute Starter | **Franchise Cornerstone with availability flag** | Philly still built around Embiid, even if the season was an availability mess. |
| Paolo Banchero | Heavy-Minute Starter | **Franchise Cornerstone** | Orlando’s primary offensive/team-building axis. |
| Victor Wembanyama | Heavy-Minute Starter | **Franchise Cornerstone** | Spurs’ obvious franchise axis. |
| Cade Cunningham / mislabeled Blake Hinson | Franchise Cornerstone flag present | **Keep FC, fix name** | Detroit’s team identity ran through Cade. |
| Scottie Barnes | Heavy-Minute Starter | **Franchise Cornerstone** | Raptors’ primary development/identity piece. |
| Ja Morant | Heavy-Minute Starter | **Franchise Cornerstone with availability flag** | Memphis still built around Ja when active. |
| Trae Young | Franchise Cornerstone | **Heavy-Minute Starter** | Primary engine, but no longer viewed as clean FC. |
| Damian Lillard | Franchise Cornerstone | **Heavy-Minute Starter** | Still huge role, but Giannis is the Bucks cornerstone. |
| Darius Garland | Franchise Cornerstone | **Heavy-Minute Starter** | Excellent starter/co-engine, not FC. |
| Jamal Murray | Franchise Cornerstone | **Heavy-Minute Starter** | Jokić remains the Nuggets’ axis. |
| James Harden | Franchise Cornerstone | **Heavy-Minute Starter** | Clippers organizer, not franchise cornerstone. |
| De’Aaron Fox | Franchise Cornerstone | **Heavy-Minute Starter** | No longer clean FC by 2024-25 context. |
| Tyrese Maxey | Franchise Cornerstone | **Heavy-Minute Starter** | Very important, but still not a clean franchise-axis label with Embiid context. |
| LeBron James | Franchise Cornerstone | **Heavy-Minute Starter** | Still elite, but not the long-term franchise-axis label by 2024-25. |

## **Other 2024-25 changes**

| Player | Current | Change to | Reason |
| ----- | ----- | ----- | ----- |
| Chet Holmgren | Tactical Starter | **Heavy-Minute Starter** | Injury separate. When active, he is core starter, not tactical. |
| Amen Thompson | Tactical Starter | **Heavy-Minute Starter** | Role/impact outgrew tactical label. |
| Zion Williamson | Tactical Starter | **Heavy-Minute Starter with availability flag** | Not tactical. Availability is separate. |
| Bradley Beal | Heavy-Minute Starter | **Tactical Starter / Sixth Man borderline** | Role became conditional and less team-structural. |
| Jordan Poole | Heavy-Minute Starter | **Tactical Starter / Sixth Man-style engine** | High usage, shaky team-trust value. |
| Cam Thomas | Heavy-Minute Starter | **Sixth Man / Impact Sub / Tactical Starter** | Scoring volume, but not clean heavy-starter trust. |
| Anfernee Simons | Heavy-Minute Starter | **Sixth Man / Impact Sub / Tactical Starter** | Scoring guard pressure more than stable heavy-starter status. |
| Norman Powell | Heavy-Minute Starter | **Sixth Man / Impact Sub / Heavy-Minute borderline** | Scoring role is high value, but bucket depends on starter/bench context. |
| Malik Monk | Tactical Starter | **Sixth Man / Impact Sub** | Classic impact reserve. |
| Collin Sexton | Tactical Starter | **Sixth Man / Impact Sub** | Scoring-pressure guard, not tactical starter. |
| Malcolm Brogdon | Tactical Starter | **Sixth Man / Impact Sub** | Reserve organizer/secondary creator. |
| T.J. McConnell | Energy / Spark Plug | **Sixth Man / Impact Sub** | Real second-unit engine, not just energy. |
| Ty Jerome | Core Rotational Player | **Sixth Man / Impact Sub** | Bench offensive engine role. |
| Jalen Wilson | Sixth Man / Impact Sub | **Core Rotational Player** | Rotation wing, not true sixth man. |
| Royce O’Neale | Sixth Man / Impact Sub | **Core Rotational Player** | Connector/defensive rotation piece. |
| Corey Kispert | Sixth Man / Impact Sub | **Core Rotational / Situational Specialist** | Shooter role, not true impact-sub engine. |
| Kevin Love | Energy / Spark Plug | **Situational Specialist** | Veteran spacing/rebounding/passing specialist. |
| Delon Wright | Energy / Spark Plug | **Situational Specialist** | Defensive guard specialist. |
| Jarred Vanderbilt | Energy / Spark Plug | **Situational Specialist / Core Rotational** | Defense/rebounding specialist, not spark plug. |
| Taylor Hendricks | Active DNP | **Inactive / injury-status separate** | Injury should not be Active DNP. |
| Elfrid Payton | Core Rotational Player | **Active DNP / Situational Specialist** | Not a regular core rotation player. |
| Ron Holland / Ronald Holland II | Duplicate-looking rows | **Canonicalize one player row** | Avoid duplicate identity contamination. |

# **My final FC recommendation by season**

This is the cleaner cornerstone set I’d use.

## **2020-21 FC**

Nikola Jokić  
Giannis Antetokounmpo  
Luka Dončić  
Stephen Curry  
Joel Embiid  
LeBron James  
Kevin Durant  
Kawhi Leonard  
Jimmy Butler  
Jayson Tatum  
Damian Lillard  
Devin Booker  
Donovan Mitchell  
Trae Young  
Shai Gilgeous-Alexander  
Karl-Anthony Towns  
Bradley Beal  
Zion Williamson  
De’Aaron Fox

I would **not** have rookie Anthony Edwards or early Garland as FC yet.

## **2021-22 FC**

Nikola Jokić  
Giannis Antetokounmpo  
Luka Dončić  
Stephen Curry  
Joel Embiid  
LeBron James  
Kevin Durant  
Jimmy Butler  
Jayson Tatum  
Damian Lillard  
Devin Booker  
Donovan Mitchell  
Trae Young  
Shai Gilgeous-Alexander  
Ja Morant  
LaMelo Ball  
Cade Cunningham  
De’Aaron Fox

I would **not** have Brunson, Maxey, Garland, Harden, or Haliburton as FC yet.

## **2022-23 FC**

Nikola Jokić  
Giannis Antetokounmpo  
Luka Dončić  
Stephen Curry  
Joel Embiid  
Jayson Tatum  
Jimmy Butler  
Shai Gilgeous-Alexander  
Ja Morant  
Devin Booker  
Donovan Mitchell  
Damian Lillard  
Jalen Brunson  
Tyrese Haliburton  
Paolo Banchero  
Cade Cunningham  
LaMelo Ball  
De’Aaron Fox  
Trae Young  
Anthony Edwards

Trae is still defensible here, but this is the last year I’d be comfortable with it.

## **2023-24 FC**

Nikola Jokić  
Giannis Antetokounmpo  
Luka Dončić  
Stephen Curry  
Joel Embiid  
Jayson Tatum  
Shai Gilgeous-Alexander  
Jalen Brunson  
Tyrese Haliburton  
Anthony Edwards  
Paolo Banchero  
Victor Wembanyama  
Cade Cunningham  
Scottie Barnes  
Devin Booker  
Donovan Mitchell  
Ja Morant

This is where I would remove Trae, Dame, Harden, Garland, Jamal, Maxey, and LeBron from FC.

## **2024-25 FC**

Nikola Jokić  
Giannis Antetokounmpo  
Luka Dončić  
Stephen Curry  
Joel Embiid  
Jayson Tatum  
Shai Gilgeous-Alexander  
Jalen Brunson  
Tyrese Haliburton  
Anthony Edwards  
Paolo Banchero  
Victor Wembanyama  
Cade Cunningham  
Scottie Barnes  
Devin Booker  
Donovan Mitchell  
Ja Morant

Same strict standard as 2023-24. The big thing: **primary engine does not automatically equal FC**.

# **Cleanest implementation rule**

For the file update later, I would apply changes in this order:

1\. Fix identity/name errors first.  
2\. Apply FC promotions/demotions.  
3\. Fix obvious starter/bench role errors.  
4\. Fix injury/availability mislabels.  
5\. Leave borderline cases unchanged until a separate review pass.

The biggest role-on-team correction across the whole dataset is this:

Trae / Harden / Dame / Maxey / Garland / Jamal-type players  
can have huge offensive proof profiles  
without receiving Franchise Cornerstone role-on-team status.

That distinction is exactly what will make the shrinkage layer smarter instead of just rewarding usage.

