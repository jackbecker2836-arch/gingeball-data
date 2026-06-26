Absolutely — **Batch 6 \= RPV \+ IIB \+ PTV**.

This is the context/translation batch:

RPV \= rebounding / possession-recovery value  
IIB \= lineup impact / on-off backbone  
PTV \= portability / translation value

This batch answers:

Did the player finish possessions?  
Did the team actually work with him?  
Does the value survive outside the exact context that created it?

The v2.2 file maps these differently: **RPV** uses defensive proof profile \+ position, **IIB** uses team role \+ combined offensive/defensive court roles, and **PTV** uses team role \+ portability. It also keeps the same posterior formula, while noting PTV is currently `1.000` reliability/pass-through.

# **Batch 6 shared shell**

For **RPV**:

μ\_prior \=  
defensive\_position\_cascade\_prior\_RPV(team\_role × defensive\_role × position)

n\_eff \=  
possessions × esf(team\_role)

RPV\_bayesian \=  
w\_RPV × RPV\_raw  
\+  
(1 − w\_RPV) × μ\_RPV\_hook

For **IIB**:

μ\_prior \=  
combined\_role\_cascade\_prior\_IIB(team\_role × offensive\_role × defensive\_role)

n\_eff \=  
possessions × esf(team\_role)

IIB\_bayesian \=  
w\_IIB × IIB\_raw  
\+  
(1 − w\_IIB) × μ\_IIB\_hook

For **PTV**, current v2.2 behavior is different:

PTV reliability \= 1.000  
current locked behavior \= pass-through / no prior shrinkage

So right now:

PTV\_bayesian \= PTV\_raw  
w\_PTV \= 1.000

But the hooks below still matter because they should become either:

1\. diagnostic portability flags now  
2\. optional future PTV shrinkage layer later  
3\. explanatory UI context for why a player’s value does or does not translate

So for PTV I’ll give the **future shrinkage math**, but mark it as optional until you decide PTV should stop being pass-through.

Component reliabilities:

RPV r \= .688  
IIB r \= .576  
PTV r \= 1.000 currently pass-through

---

# **Part 1 — RPV shrink hooks**

## **What RPV means**

RPV \= Rebounding / Possession Recovery Value

Casual-fan translation:

Does this player actually help his team finish possessions and recover value?

Not:

Did he collect a lot of rebounds?

RPV has to separate:

real contested boards  
scheme-created boards  
empty individual rebounds  
offensive rebound pressure  
tapout value  
small-ball rebounding  
boxout value  
team DREB lift  
transition leak cost

The older shrinkage notes already had this exact direction: uncontested board shrinkage, scheme rebound shrinkage, offensive rebound gravity, putback luck, role-position splits, opponent ORB adjustment, empty-board shrinkage, foul/physicality shrinkage, and competition validation.

---

## **1\. Uncontested rebound shrinkage**

CSV hook family:

uncontested rebound shrinkage;  
credit contested boards, shrink empty collection

## **Meaning**

Some players collect rebounds because the scheme funnels boards to them. That is useful, but it is not the same as winning contested possessions.

## **Signals**

ContestedDREBShare  
ContestedOREBShare  
UncontestedReboundShare  
ReboundChanceConversion  
TeamBoxoutSupport  
ReboundDifficulty

## **Math**

ContestedRecoveryValue \=  
z(ContestedDREBShare)  
\+ z(ContestedOREBShare)  
\+ z(ReboundChanceConversion)  
\+ z(ReboundDifficulty)

EmptyCollection \=  
z(UncontestedReboundShare)  
\+ z(TeamBoxoutSupport)

Δμ\_uncontested \=  
β\_contested × ContestedRecoveryValue  
− β\_empty × EmptyCollection

μ\_hook \=  
μ\_prior \+ Δμ\_uncontested

SE\_hook \=  
SE\_evidence × exp(  
  γ\_empty × EmptyCollection  
− γ\_contested × max(ContestedRecoveryValue, 0\)  
)

## **Basketball meaning**

A player gets more RPV trust for winning real contested boards.  
He gets less RPV trust for collecting rebounds the scheme already secured.

---

## **2\. Scheme rebound dependency shrink**

CSV hook family:

scheme rebound shrinkage;  
separate individual boards from team possession-finishing lift

## **Signals**

IndividualDREBRate  
TeamDREBLiftOnCourt  
BoxoutDependency  
TeammateBoxoutShare  
SchemeFunnelShare  
OpponentOREBAllowedOnCourt

## **Math**

TeamReboundLift \=  
z(TeamDREBLiftOnCourt)  
− z(OpponentOREBAllowedOnCourt)

SchemeDependency \=  
z(BoxoutDependency)  
\+ z(TeammateBoxoutShare)  
\+ z(SchemeFunnelShare)

Δμ\_scheme\_rebound \=  
β\_teamlift × TeamReboundLift  
\+ β\_individual × z(IndividualDREBRate)  
− β\_scheme × SchemeDependency

μ\_hook \=  
μ\_prior \+ Δμ\_scheme\_rebound

## **Basketball meaning**

Individual rebounds count more if the team actually rebounds better with him.  
If his boards do not lift team DREB, shrink the box-score boards.

---

## **3\. Offensive rebound gravity shrink**

CSV hook family:

offensive rebound gravity;  
credit pressure, tapouts, extra possessions, shrink transition leaks

## **Signals**

ContestedORBShare  
TapoutValue  
OREBGravity  
SecondChanceShotQuality  
CrashPressure  
TransitionLeakCost  
OverTheBackRate

## **Math**

ORBOwnedValue \=  
z(ContestedORBShare)  
\+ z(TapoutValue)  
\+ z(OREBGravity)  
\+ z(SecondChanceShotQuality)  
\+ z(CrashPressure)  
− z(TransitionLeakCost)  
− z(OverTheBackRate)

Δμ\_ORB \=  
β\_orb × ORBOwnedValue

μ\_hook \=  
μ\_prior \+ Δμ\_ORB

SE\_hook \=  
SE\_evidence × exp(  
  γ\_transition × z(TransitionLeakCost)  
\+ γ\_foul × z(OverTheBackRate)  
− γ\_orb × max(ORBOwnedValue, 0\)  
)

## **Basketball meaning**

Crashing is valuable if it creates extra possessions.  
It shrinks if it gives up transition or creates fouls.

---

## **4\. Putback luck shrinkage**

CSV hook family:

putback luck shrinkage;  
small putback samples regress to role prior

## **Rate math**

posterior\_putback\_rate \=  
n\_putback / (n\_putback \+ k\_putback\_cell) × observed\_putback\_rate  
\+  
k\_putback\_cell / (n\_putback \+ k\_putback\_cell) × prior\_putback\_rate

But `k_putback_cell` should be computed from empirical dispersion, not guessed.

## **Hook**

PutbackOwnedValue \=  
z(posterior\_putback\_rate)  
\+ z(PutbackDifficulty)  
\+ z(ContestedPutbackShare)  
− z(PutbackSmallSampleFlag)

Δμ\_putback \=  
β\_putback × PutbackOwnedValue

## **Basketball meaning**

A few lucky putbacks do not create a rebounding-value monster.  
Repeated contested putback pressure does.

---

## **5\. Role-position rebound split**

CSV hook family:

rebound role-position shrinkage;  
separate value as 4, as 5, with center, without center

## **Meaning**

RPV needs position context. A wing grabbing boards as a small-ball 4 is not the same as a center cleaning glass as the only big.

## **Splits**

RPV\_as\_3  
RPV\_as\_4  
RPV\_as\_5  
RPV\_with\_true\_center  
RPV\_without\_true\_center

Each split gets its own posterior:

RPV\_role\_split\_bayes \=  
w\_split × RPV\_role\_split\_raw  
\+  
(1 − w\_split) × μ\_role\_position\_prior

Then combine:

RPV\_combined \=  
Σ role\_position\_share × RPV\_role\_split\_bayes

## **Basketball meaning**

A small-ball 5 sample cannot drive the full player grade unless it has enough possessions.

---

## **6\. Small-ball 5 rebound shrinkage**

CSV hook family:

small-ball 5 rebound shrinkage;  
protect or penalize based on whether rebounding survives center responsibilities

## **Signals**

RPV\_smallball5  
RPV\_normal\_role  
TeamDREB\_smallball5  
OpponentOREB\_smallball5  
PhysicalMismatchPenalty  
SwitchBenefit

## **Math**

delta\_smallball \=  
RPV\_smallball5 − RPV\_normal\_role

posterior\_delta\_smallball \=  
w\_delta × delta\_smallball\_raw  
\+  
(1 − w\_delta) × delta\_smallball\_prior\_for\_role

Δμ\_smallball \=  
β\_delta × z(posterior\_delta\_smallball)  
\+ β\_switch × z(SwitchBenefit)  
− β\_mismatch × z(PhysicalMismatchPenalty)

## **Basketball meaning**

If the player survives as a small-ball 5, trust portability.  
If his team gets crushed on the glass, shrink the small-ball value.

---

## **7\. Opponent ORB strength adjustment**

CSV hook family:

opponent ORB strength adjustment;  
good rebounding against good rebounding opponents earns trust

## **Signals**

OpponentORBStrength  
OpponentCrashRate  
TeamDREBAllowed  
ContestedDREBvsStrongCrashTeams

## **Math**

StrengthAdjustedRPV \=  
RPV\_raw  
\+ β\_opponent × z(OpponentORBStrength)  
\+ β\_crash × z(OpponentCrashRate)

Then shrink `StrengthAdjustedRPV`, not raw RPV:

RPV\_bayesian \=  
w\_RPV × StrengthAdjustedRPV  
\+  
(1 − w\_RPV) × μ\_hook

## **Basketball meaning**

Boards against weak rebounding teams get less validation.  
Boards against elite crash teams get more validation.

---

## **8\. Empty-board shrinkage**

CSV hook family:

empty board shrinkage;  
individual boards shrink if team possession recovery does not improve

## **Signals**

IndividualReboundRate  
TeamDREBLift  
TeamOREBLift  
OpponentSecondChancePointsAllowed  
BoardLeakRate

## **Math**

EmptyBoardRisk \=  
z(IndividualReboundRate)  
− z(TeamDREBLift)  
− z(TeamOREBLift)  
\+ z(OpponentSecondChancePointsAllowed)  
\+ z(BoardLeakRate)

Δμ\_empty\_board \=  
β\_teamlift × z(TeamDREBLift \+ TeamOREBLift)  
− β\_empty × max(EmptyBoardRisk, 0\)

## **Basketball meaning**

If he rebounds but the team does not finish possessions better, the individual boards are partially empty.

---

## **9\. Foul / physicality rebound shrinkage**

CSV hook family:

foul / physicality shrinkage;  
credit physical rebounding, shrink loose-ball and over-the-back cost

## **Signals**

PhysicalBoxoutValue  
LooseBallWinRate  
OverTheBackRate  
LooseBallFoulRate  
ReboundFoulTrouble

## **Math**

LegalPhysicalRebounding \=  
z(PhysicalBoxoutValue)  
\+ z(LooseBallWinRate)  
− z(OverTheBackRate)  
− z(LooseBallFoulRate)  
− z(ReboundFoulTrouble)

Δμ\_physical\_RPV \=  
β\_physical × LegalPhysicalRebounding

SE\_hook \=  
SE\_evidence × exp(  
  γ\_foul × (z(OverTheBackRate) \+ z(LooseBallFoulRate))  
− γ\_physical × max(LegalPhysicalRebounding, 0\)  
)

---

## **10\. Competition validation**

CSV hook family:

competition validation;  
rebounding value must survive against elite size/crash pressure

## **Signals**

RPV\_vs\_top10\_ORB\_teams  
RPV\_vs\_big\_lineups  
RPV\_vs\_playoff\_size  
HighLeverageRPV

## **Math**

CompetitionRPV \=  
0.50 × z(RegularSeasonRPV)  
\+ 0.25 × z(RPV\_vs\_top10\_ORB\_teams)  
\+ 0.15 × z(RPV\_vs\_big\_lineups)  
\+ 0.10 × z(HighLeverageRPV)

Δμ\_comp\_RPV \=  
β\_comp × CompetitionRPV

## **Basketball meaning**

Rebounding that disappears against real size shrinks.  
Rebounding that survives elite crash pressure earns trust.

---

# **Part 2 — IIB shrink hooks**

## **What IIB means**

IIB \= lineup impact / on-off / RAPM backbone

Casual-fan translation:

Did lineups actually work with him, after adjusting for who he played with and against?

IIB is dangerous because raw lineup data lies all the time:

star overlap  
bench-unit dominance  
opponent shooting luck  
tiny lineup samples  
garbage time  
collinearity  
schedule strength  
role-position samples

The older shrinkage notes call IIB vulnerable to lineup context, teammate overlap, opponent shooting luck, role collinearity, and sample size.

---

## **1\. Star-overlap shrinkage**

CSV hook family:

star-overlap shrinkage;  
lineup value must survive without the superstar

## **Signals**

SuperstarOverlap  
NonStarMinutesImpact  
LineupDiversity  
WithoutStarIIB  
WithStarIIB  
RoleCollinearity

## **Math**

IndependentLineupImpact \=  
z(NonStarMinutesImpact)  
\+ z(WithoutStarIIB)  
\+ z(LineupDiversity)  
− z(RoleCollinearity)

StarDependency \=  
z(SuperstarOverlap)  
\+ z(WithStarIIB − WithoutStarIIB)

Δμ\_star\_overlap\_IIB \=  
β\_independent × IndependentLineupImpact  
− β\_star × StarDependency

μ\_hook \=  
μ\_prior \+ Δμ\_star\_overlap\_IIB

SE\_hook \=  
SE\_evidence × exp(  
  γ\_star × StarDependency  
− γ\_independent × max(IndependentLineupImpact, 0\)  
)

## **Basketball meaning**

If the lineups only work because Jokic/SGA/Luka is on the floor, IIB shrinks.  
If the player survives without the star, IIB gets trusted.

---

## **2\. Opponent shooting luck shrinkage**

CSV hook family:

opponent shooting luck shrinkage;  
adjust observed IIB before posterior

## **Signals**

Opponent3PLuck  
OpponentFTLuck  
OpponentMidrangeLuck  
OpponentRimFinishingLuck  
ExpectedOpponentShotValue  
ActualOpponentShotValue

## **Math**

First adjust observed value:

LuckAdjustedIIB \=  
IIB\_raw  
− β\_3p × Opponent3PLuck  
− β\_ft × OpponentFTLuck  
− β\_mid × OpponentMidrangeLuck  
− β\_rim × OpponentRimFinishingLuck

Then shrink:

IIB\_bayesian \=  
w\_IIB × LuckAdjustedIIB  
\+  
(1 − w\_IIB) × μ\_hook

## **Basketball meaning**

If opponents randomly missed open shots when he played, raw on/off was inflated.  
Use luck-adjusted IIB before Bayesian shrinkage.

---

## **3\. Tiny-lineup sample shrinkage**

CSV hook family:

tiny-lineup sample shrinkage;  
small lineup samples collapse toward role prior

## **Signals**

LineupPossessions  
TopLineupPossessions  
LineupSampleFragmentation  
GarbagePossessions  
CompetitivePossessions

## **Math**

n\_lineup\_eff \=  
CompetitivePossessions  
\+ λ\_garbage × GarbagePossessions

Use:

λ\_garbage \= 0.10–0.25

Then:

SE\_lineup \=  
σ\_resid\_IIB × sqrt(med\_poss / n\_lineup\_eff)

and:

SE\_hook \=  
max(SE\_evidence, SE\_lineup)

## **Basketball meaning**

A \+18 lineup in 70 possessions should barely move the player grade.

---

## **4\. Bench-unit shrinkage**

CSV hook family:

bench-unit shrinkage;  
dominating bench groups should not equal starter impact

## **Signals**

BenchOnlyShare  
StarterMinutesImpact  
ClosingLineupImpact  
OpponentBenchShare  
StarterContextIIB

## **Math**

BenchDominance \=  
z(BenchOnlyShare)  
\+ z(OpponentBenchShare)  
− z(StarterMinutesImpact)  
− z(ClosingLineupImpact)

Δμ\_bench\_IIB \=  
β\_starter × z(StarterContextIIB)  
− β\_bench × BenchDominance

SE\_hook \=  
SE\_evidence × exp(  
  γ\_bench × BenchDominance  
− γ\_starter × max(z(StarterContextIIB), 0\)  
)

## **Basketball meaning**

Winning bench minutes is good.  
It just does not automatically prove starter-level lineup impact.

---

## **5\. Garbage-time shrinkage**

CSV hook family:

garbage-time shrinkage;  
low-leverage possessions count partially or not at all

## **Math**

n\_eff \=  
competitive\_possessions  
\+ λ\_garbage × garbage\_time\_possessions

λ\_garbage \= 0.10–0.25

If role is GT:

n\_eff \=  
n\_eff × esf\_GT

Then SE rises:

SE\_base \=  
σ\_resid\_IIB × sqrt(med\_poss / n\_eff)

## **Basketball meaning**

Garbage-time lineup impact should not move TCV much.

---

## **6\. No-center / with-center split**

CSV hook family:

no-center / with-center split shrinkage;  
test whether lineup value survives without true center cover

## **Signals**

IIB\_without\_true\_center  
IIB\_with\_true\_center  
NoCenterPossessions  
WithCenterPossessions  
SmallBallRole  
RimProtectionBehindShare

## **Math**

delta\_no\_center \=  
IIB\_without\_true\_center − IIB\_with\_true\_center

posterior\_delta\_no\_center \=  
w\_delta × delta\_no\_center\_raw  
\+  
(1 − w\_delta) × group\_delta\_prior

Δμ\_no\_center\_IIB \=  
β\_delta × posterior\_delta\_no\_center  
− β\_cover × z(RimProtectionBehindShare)

## **Basketball meaning**

If his lineup value collapses without a center, that gets exposed.  
If he survives small-ball/no-center contexts, that is portability evidence.

---

## **7\. Collinearity shrinkage**

CSV hook family:

collinearity shrinkage;  
tight teammate overlap reduces independent evidence

## **Signals**

TeammateOverlapHHI  
MostCommonLineupShare  
SameStarPairingShare  
LineupDiversity  
RoleRedundancy

## **Math**

LineupCollinearity \=  
HHI(teammate\_overlap\_distribution)

priorSD\_hook \=  
priorSD\_base / (1 \+ δ\_collinearity × LineupCollinearity)

And:

SE\_hook \=  
SE\_evidence × exp(  
  γ\_collinearity × LineupCollinearity  
− γ\_diversity × max(z(LineupDiversity), 0\)  
)

## **Basketball meaning**

If he always plays with the same star or same four-man group, the lineup signal is less independent.

---

## **8\. Role-position split shrinkage**

CSV hook family:

role-position split shrinkage;  
separate IIB as 1/2/3/4/5 or lineup responsibility

## **Splits**

IIB\_as\_1  
IIB\_as\_2  
IIB\_as\_3  
IIB\_as\_4  
IIB\_as\_5

Each:

posterior\_IIB\_position \=  
w\_pos × observed\_IIB\_position  
\+  
(1 − w\_pos) × position\_role\_prior

Combined:

IIB\_position\_blend \=  
Σ position\_share × posterior\_IIB\_position

## **Basketball meaning**

A tiny small-ball or emergency-position sample cannot define the full player.

---

## **9\. Team-strength / schedule shrinkage**

CSV hook family:

team-strength schedule shrinkage;  
adjust lineup impact for opponent quality

## **Signals**

OpponentStrengthGap  
OpponentNetRating  
OpponentHalfcourtStrength  
OpponentInjuryContext  
HomeRoadContext

## **Math**

ScheduleAdjustedIIB \=  
IIB\_raw  
− β\_strength × OpponentStrengthGap  
− β\_injury × OpponentInjuryContext  
\+ β\_road × RoadContextDifficulty

Then:

IIB\_bayesian \=  
w\_IIB × ScheduleAdjustedIIB  
\+  
(1 − w\_IIB) × μ\_hook

## **Basketball meaning**

Lineup dominance against weakened or bad opponents gets shrunk.  
Lineup value against real opponents gets trusted.

---

## **10\. Lineup diversity trust bonus**

CSV hook family:

lineup diversity trust;  
positive impact across many contexts widens prior / lowers uncertainty

## **Signals**

LineupDiversity  
PositiveImpactAcrossLineups  
RoleDiversity  
TeammateDiversity  
StarterBenchBlendSuccess

## **Math**

DiversityTrust \=  
z(LineupDiversity)  
\+ z(PositiveImpactAcrossLineups)  
\+ z(RoleDiversity)  
\+ z(TeammateDiversity)  
\+ z(StarterBenchBlendSuccess)

SE\_hook \=  
SE\_evidence × exp(  
  \- γ\_diversity × max(DiversityTrust, 0\)  
)

Optional:

priorSD\_hook \=  
priorSD\_base × exp(  
  δ\_diversity × max(DiversityTrust, 0\)  
)

## **Basketball meaning**

If he helps many different lineups, the model trusts the signal more.

---

# **Part 3 — PTV hooks**

## **What PTV means**

PTV \= Portability / Translation Value

Casual-fan translation:

Does the player’s value travel to harder contexts?

This asks:

Can he survive playoffs?  
Can he play with starters?  
Can he play without one specific star?  
Can he handle different schemes?  
Can opponents target him?  
Does his value work in more than one lineup shape?

Important: **PTV is currently pass-through** because locked reliability is `1.000`. So right now, these hooks should be stored as portability diagnostics unless you decide to activate PTV shrinkage.

The older shrinkage notes list exactly the right PTV hook families: regular-season-only shrinkage, playoff sample-size shrinkage, scheme-target shrinkage, non-portable offense, whistle translation, spacing translation, defensive translation, late-clock validation, starter-context validation, and injury/fatigue context shrinkage.

---

## **Current locked PTV math**

PTV\_bayesian \= PTV\_raw  
w\_PTV \= 1.000

Diagnostic hooks produce:

PTV\_translation\_flags  
PTV\_context\_risk  
PTV\_explanation

Optional future shrink version:

PTV\_bayesian \=  
w\_PTV\_future × PTV\_raw  
\+  
(1 − w\_PTV\_future) × μ\_PTV\_hook

where `w_PTV_future` only exists if you lower PTV reliability below `1.000` or make PTV a modeled translation component rather than pass-through.

---

## **1\. Regular-season-only shrinkage**

regular-season-only shrinkage;  
value must survive top defenses and high leverage

## **Signals**

RegularSeasonValue  
TopDefenseValue  
HighLeverageValue  
PlayoffOrPlayInValue  
OpponentGameplanAttention

## **Optional future math**

μ\_PTV\_regular \=  
0.50 × z(RegularSeasonValue)  
\+ 0.30 × z(TopDefenseValue)  
\+ 0.20 × z(HighLeverageValue)

Then:

μ\_hook \=  
μ\_prior \+ β\_translation × μ\_PTV\_regular

## **Diagnostic now**

RegularSeasonOnlyRisk \=  
max(0, RegularSeasonValue − TopDefenseValue)  
\+ max(0, RegularSeasonValue − HighLeverageValue)

## **Meaning**

Regular-season value that disappears against serious defenses gets flagged.

---

## **2\. Playoff sample-size shrinkage**

playoff sample-size shrinkage;  
small playoff samples regress toward regular-season translation prior

## **Math**

posterior\_playoff\_value \=  
n\_playoff / (n\_playoff \+ k\_playoff\_cell) × observed\_playoff\_value  
\+  
k\_playoff\_cell / (n\_playoff \+ k\_playoff\_cell) × regular\_season\_translation\_prior

`k_playoff_cell` should be computed from dispersion, not guessed.

## **Meaning**

Do not overreact to one good or bad playoff series.

---

## **3\. Scheme-target shrinkage**

scheme-target shrinkage;  
opponents can hunt non-portable weaknesses

## **Signals**

MatchupTargetRate  
DefensiveWeakLinkRate  
SwitchHuntRate  
FoulHuntRate  
CoverageExposureRate  
SurvivalAfterTargetRate

## **Math**

TargetRisk \=  
z(MatchupTargetRate)  
\+ z(DefensiveWeakLinkRate)  
\+ z(SwitchHuntRate)  
\+ z(FoulHuntRate)  
\+ z(CoverageExposureRate)  
− z(SurvivalAfterTargetRate)

Δμ\_scheme\_target \=  
− β\_target × TargetRisk

Diagnostic:

PTV\_scheme\_target\_flag \= TargetRisk

## **Meaning**

If opponents can choose him as the pressure point, his value translates worse.

---

## **4\. Non-portable offense shrinkage**

non-portable offense shrinkage;  
one-coverage or one-context offense gets flagged

## **Signals**

ValueVsSwitch  
ValueVsDrop  
ValueVsZone  
ValueVsBlitz  
ValueVsTopLock  
OneCoverageDependency

## **Math**

CoveragePortability \=  
z(ValueVsSwitch)  
\+ z(ValueVsDrop)  
\+ z(ValueVsZone)  
\+ z(ValueVsBlitz)  
\+ z(ValueVsTopLock)  
− z(OneCoverageDependency)

Δμ\_offense\_portability \=  
β\_coverages × CoveragePortability

## **Meaning**

If he only beats one coverage, the offense is less portable.  
If he beats multiple coverages, trust it more.

---

## **5\. Whistle translation shrinkage**

whistle translation shrinkage;  
regular-season foul pressure may not translate

## **Signals**

RegularSeasonFTr  
HighLeverageFTr  
PlayoffFTr  
WhistleDependency  
NonWhistleScoringValue

## **Math**

WhistleTranslation \=  
z(PlayoffFTr)  
\+ z(HighLeverageFTr)  
\+ z(NonWhistleScoringValue)  
− z(WhistleDependency)

Δμ\_whistle \=  
β\_whistle × WhistleTranslation

## **Meaning**

If his scoring value depends on regular-season whistles, playoff translation risk rises.

---

## **6\. Spacing translation shrinkage**

spacing translation shrinkage;  
corner-only or wide-open shooting must survive guarded context

## **Signals**

GuardedShotAttemptRate  
MovementShooting  
AboveBreakShooting  
CornerOnlyDependency  
WideOpenDependency  
TopDefenseSpacing

## **Math**

SpacingTranslation \=  
z(GuardedShotAttemptRate)  
\+ z(MovementShooting)  
\+ z(AboveBreakShooting)  
\+ z(TopDefenseSpacing)  
− z(CornerOnlyDependency)  
− z(WideOpenDependency)

Δμ\_spacing\_translation \=  
β\_spacing × SpacingTranslation

## **Meaning**

Corner-only shooters can be valuable, but their spacing is less portable if defenses can ignore or crowd it.

---

## **7\. Defensive translation shrinkage**

defensive translation shrinkage;  
defense must survive harder matchups and less scheme protection

## **Signals**

MatchupDifficulty  
TopOffenseDSV  
TopOffenseDPC  
SchemeProtection  
Switchability  
NoCenterSurvival

## **Math**

DefensiveTranslation \=  
z(MatchupDifficulty)  
\+ z(TopOffenseDSV)  
\+ z(TopOffenseDPC)  
\+ z(Switchability)  
\+ z(NoCenterSurvival)  
− z(SchemeProtection)

Δμ\_defensive\_translation \=  
β\_defense × DefensiveTranslation

## **Meaning**

Defense that depends on being hidden or protected translates worse.

---

## **8\. Late-clock validation**

late-clock validation;  
portable players can create or survive when the first action dies

## **Signals**

LateClockEfficiency  
TrueGrenadeValue  
LateClockCreation  
LateClockPassingValue  
AirDribbleTax  
SelfCreatedMessRate

## **Math**

LateClockTranslation \=  
z(LateClockEfficiency)  
\+ z(TrueGrenadeValue)  
\+ z(LateClockCreation)  
\+ z(LateClockPassingValue)  
− z(AirDribbleTax)  
− z(SelfCreatedMessRate)

Δμ\_lateclock\_PTV \=  
β\_late × LateClockTranslation

## **Meaning**

Late-clock value translates if he solves possessions.  
It does not translate if he creates dead possessions.

---

## **9\. Starter-context validation**

starter-context validation;  
bench production must survive starter and closing units

## **Signals**

ValueVsStarters  
StarterLineupValue  
ClosingLineupValue  
BenchUnitDependency  
OpponentBenchShare

## **Math**

StarterContextTranslation \=  
z(ValueVsStarters)  
\+ z(StarterLineupValue)  
\+ z(ClosingLineupValue)  
− z(BenchUnitDependency)  
− z(OpponentBenchShare)

Δμ\_starter\_context \=  
β\_starter × StarterContextTranslation

## **Meaning**

Bench dominance is useful.  
But PTV asks whether it works against real starter contexts.

---

## **10\. Injury / fatigue context shrinkage**

injury / fatigue context shrinkage;  
availability changes effective sample, not role label

This aligns with the MD point that `role_on_team` should not be overloaded as health status; availability/health needs its own field.

## **Math**

health\_context\_weight \=  
case  
  full:    1.00  
  limited: 0.70–0.90  
  out:     no court-value grade

n\_eff\_health \=  
n\_eff × health\_context\_weight

Then:

SE\_health \=  
σ\_resid\_component × sqrt(med\_poss / n\_eff\_health)

## **Meaning**

Injury does not change what role a player had.  
It changes how much we trust the sample.

---

# **Role-specific interpretation for Batch 6**

| Role | RPV / IIB / PTV interpretation |
| ----- | ----- |
| **FC** | Team-context burden is massive. If lineups collapse without him, IIB/PTV should show real lift, but weak portability gets exposed. |
| **HM** | Needs starter-context validation. RPV/IIB should survive normal full-strength lineups. |
| **RS** | Narrow trusted starter. Credit in-lane value, avoid broad portability overclaim. |
| **TS** | Matchup/fit starter. Shrink if value is opponent-specific or lineup-picked. |
| **6M** | Bench engine. IIB/PTV need starter and closing validation. |
| **CR** | Stable rotation. Value should survive more than one lineup, but not necessarily carry lineups. |
| **SS** | Specialist. High context dependence expected; shrink broad claims, preserve narrow value. |
| **EN** | Energy. Rebounds/pressure/activity must finish possessions or shift real lineup value. |
| **DEV** | Inflated reps. Strong SE inflation unless value survives real contexts. |
| **GT** | Low-leverage samples barely move RPV/IIB/PTV. |
| **DNP/INA** | No court-value grade. |

# **RPV vs IIB vs PTV difference**

| Component | Question | Fake signal it catches |
| ----- | ----- | ----- |
| **RPV** | Did he finish or recover possessions? | Empty boards, scheme rebounds, putback luck |
| **IIB** | Did lineups actually work with him? | Star overlap, opponent luck, bench-only dominance |
| **PTV** | Does the value travel? | Regular-season-only value, one-coverage offense, playoff targeting |

Clean version:

RPV \= possession completion.  
IIB \= lineup truth.  
PTV \= translation truth.

# **Batch 6 implementation fields**

For RPV:

player\_id  
season  
component \= RPV  
team\_role  
defensive\_role  
primary\_position  
availability  
esf  
evidence\_state

L1\_key \= season × team\_role × defensive\_role × position  
L2\_key \= team\_role × defensive\_role × position  
L3\_key \= leverage\_tier × defensive\_role × position  
L4\_key \= defensive\_role × position  
L5\_key \= global\_RPV

prior\_mean\_cascade  
priorSD\_base  
RPV\_raw  
possessions  
n\_eff  
team\_DREB\_lift  
contested\_rebound\_share  
uncontested\_rebound\_share  
scheme\_dependency  
ORB\_pressure  
transition\_leak\_cost  
mu\_hook  
SE\_hook  
posterior\_weight  
RPV\_bayesian

For IIB:

player\_id  
season  
component \= IIB  
team\_role  
offensive\_role  
defensive\_role  
availability  
esf  
evidence\_state

L1\_key \= season × team\_role × offensive\_role × defensive\_role  
L2\_key \= team\_role × offensive\_role × defensive\_role  
L3\_key \= leverage\_tier × offensive\_role × defensive\_role  
L4\_key \= offensive\_role × defensive\_role  
L5\_key \= global\_IIB

prior\_mean\_cascade  
priorSD\_base  
IIB\_raw  
luck\_adjusted\_IIB  
possessions  
n\_eff  
star\_overlap  
lineup\_diversity  
lineup\_collinearity  
opponent\_shooting\_luck  
bench\_only\_share  
starter\_context\_value  
mu\_hook  
SE\_hook  
posterior\_weight  
IIB\_bayesian

For PTV:

player\_id  
season  
component \= PTV  
team\_role  
availability  
esf  
evidence\_state

PTV\_raw  
PTV\_bayesian\_current \= PTV\_raw

portability\_flags  
regular\_season\_only\_risk  
scheme\_target\_risk  
coverage\_portability  
whistle\_translation  
spacing\_translation  
defensive\_translation  
late\_clock\_translation  
starter\_context\_translation  
health\_context\_weight

# **Batch 6 bottom line**

RPV stops rebounds from lying.  
IIB stops lineup numbers from lying.  
PTV stops regular-season/context-specific value from pretending it travels.

Public-facing version:

Gingeball does not just ask whether the player produced.  
It asks whether the possession was actually secured, whether the lineup actually worked,  
and whether that value survives when the context gets harder.

That completes the six-batch shrinkage-hook architecture:

Batch 1: COV paint-touch creation  
Batch 2: remaining COV  
Batch 3: PVA / SGV / SAV  
Batch 4: MIV  
Batch 5: DSV / DPC  
Batch 6: RPV / IIB / PTV

