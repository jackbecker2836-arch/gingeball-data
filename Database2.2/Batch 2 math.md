Yes — **Batch 2 \= remaining COV shrink hooks**, using the corrected v2.2 architecture.

Core update I’m applying from the new MD:

No hard k=5 fallback.  
No thin-cell raw AVG/STDEV.  
No target-row self-shrinkage.  
Use the empirical-Bayes pooling cascade.  
Use player-level leave-one-out on anchors.  
Use Henderson III computed k\_level values.  
Use canonical role-on-team esf to scale trust.

The MD locks COV as an offensive-proof-profile component, meaning COV pulls its prior from **team role × offensive role**, then runs through the posterior formula:

bayesian \= w · observed \+ (1 − w) · prior\_mean

w \= priorSD² / (priorSD² \+ SE²)

It also locks the cascade structure from global → court role → leverage tier × court role → cross-season team role × court role → per-season team role × court role × season.

# **Batch 2 — Remaining COV Shrink Hooks**

Shared COV shell for every hook below:

μ\_prior \= cascade\_prior\_COV(player-season, team\_role × offensive\_role)

priorSD\_base \= Henderson/cascade between-cell variance  
n\_eff \= possessions × esf(team\_role)

SE\_base \= σ\_resid\_COV × sqrt(med\_poss / n\_eff)

SE\_evidence \= SE\_base × evidence\_multiplier

μ\_hook \= μ\_prior \+ hook\_prior\_adjustment

SE\_hook \= SE\_evidence × hook\_context\_multiplier

w \= priorSD\_hook² / (priorSD\_hook² \+ SE\_hook²)

COV\_bayesian \=  
w × COV\_raw  
\+  
(1 − w) × μ\_hook

Where COV reliability check still targets:

r\_COV ≈ .765 at median possessions

The hook’s job is not to randomly subtract points. The hook tells the model **what basketball context should move the prior, SE, or both.**

---

# **1\. Hub Team-Validation \+ Empty-Control Shrink**

CSV hook:

hub team-validation \+ empty-control shrinkage;  
raw creation must lift team/lineup offense

## **Meaning**

This is for high-touch players who control the offense. The raw COV might look huge because the player has the ball constantly, but Gingeball asks:

Did all that control actually create better offense?

This is the Trae/Harden/Dame-style logic when the player still runs the offense but should not automatically get cornerstone-level trust.

## **Signals**

TeamLift \= z(team\_ORtg\_on \- team\_ORtg\_off)  
HalfcourtLift \= z(halfcourt\_ORtg\_after\_touch)  
TopDefLift \= z(COV\_or\_ORtg\_vs\_top10\_defenses)  
ECI \= Empty Control Index  
TOVBurden \= live\_ball\_TOV \+ bad\_pass\_TOV \+ late\_clock\_TOV \+ charge\_rate  
HubResp \= usage \+ time\_of\_possession \+ on\_ball\_creation\_load

Empty Control Index:

ECI \=  
z(time\_of\_possession)  
\+ z(dribbles\_per\_touch)  
\+ z(late\_clock\_self\_FGA)  
\+ z(turnover\_rate)  
\- z(team\_shot\_quality\_after\_touch)

## **Math**

Δμ\_hub \=  
β\_team × TeamLift  
\+ β\_halfcourt × HalfcourtLift  
\+ β\_topdef × TopDefLift  
\- β\_empty × ECI  
\- β\_tov × TOVBurden

μ\_hook \=  
μ\_prior \+ Δμ\_hub

SE multiplier:

M\_context \=  
exp(  
  γ\_empty × ECI  
\+ γ\_tov × TOVBurden  
\- γ\_team × max(TeamLift, 0\)  
\- γ\_topdef × max(TopDefLift, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

Optional priorSD modifier, mild:

priorSD\_hook \=  
priorSD\_base × exp(  
  \- δ\_empty × max(ECI, 0\) × HubResp  
)

## **Interpretation**

If a player dominates the ball and the team offense is still mediocre, COV shrinks hard. If the same player carries a good half-court offense and survives top defenses, the model trusts him.

---

# **2\. Advantage-Preservation Prior**

CSV hook:

advantage-preservation prior;  
shrink if the advantage was fully created before his touch

## **Meaning**

This is for connectors. Some players are great because they keep an advantage alive. Others get credit because a star already created the entire advantage before they touched the ball.

Gingeball separates:

Did he preserve/extend the advantage?  
or  
Did he simply receive an already-created advantage?

## **Signals**

EP\_before\_touch \= expected possession value when player receives ball  
EP\_after\_touch \= expected possession value after player action  
IAV \= Incremental Advantage Value \= EP\_after\_touch \- EP\_before\_touch

PreCreatedAdvShare \= share of touches where EP\_before\_touch was already high  
AdvKilledRate \= advantage touches that end in reset / bad shot / turnover  
QuickDecisionValue \= value of passes/drives/shots within quick decision window  
StarCreatedShare \= share of advantage touches created by primary engine

## **Math**

Δμ\_adv\_preserve \=  
β\_iav × z(IAV)  
\+ β\_quick × z(QuickDecisionValue)  
\- β\_precreated × z(PreCreatedAdvShare)  
\- β\_kill × z(AdvKilledRate)

μ\_hook \=  
μ\_prior \+ Δμ\_adv\_preserve

SE multiplier:

M\_context \=  
exp(  
  γ\_starcreated × ExcessStarCreatedShare  
\+ γ\_precreated × PreCreatedAdvShare  
\+ γ\_kill × AdvKilledRate  
\- γ\_iav × max(IAV, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

Where:

ExcessStarCreatedShare \=  
max(0, StarCreatedShare \- expected\_star\_created\_share\_for\_role)

## **Interpretation**

A role player who catches, swings, and keeps the defense rotating gets real COV credit. A player who simply receives wide-open advantage created by Luka/Jokic/SGA gets shrunk toward role prior.

---

# **3\. Low-Creation Prior**

CSV hook:

low-creation prior;  
shrink any creation signal unless closeout decisions prove real value

## **Meaning**

This is for players whose offensive role is not supposed to create offense. Usually spacers, finishers, low-usage wings, low-touch bigs.

The model should assume:

Creation is not real unless there is proof.

## **Signals**

CloseoutDecisionValue \= value after attacking closeout  
SecondSideValue \= value after defense already tilted  
SelfCreatedAdvShare \= unassisted advantage creation share  
ForcedCreationRate \= late-clock / self-created attempts outside normal role  
EmptyTouchRate \= touches that produce no advantage

## **Math**

Δμ\_low\_creation \=  
β\_closeout × z(CloseoutDecisionValue)  
\+ β\_secondside × z(SecondSideValue)  
\+ β\_selfcreate × z(SelfCreatedAdvShare)  
\- β\_forced × z(ForcedCreationRate)  
\- β\_empty × z(EmptyTouchRate)

μ\_hook \=  
μ\_prior \+ Δμ\_low\_creation

SE multiplier:

M\_context \=  
exp(  
  γ\_forced × ForcedCreationRate  
\+ γ\_empty × EmptyTouchRate  
\- γ\_closeout × max(CloseoutDecisionValue, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

If a stationary spacer occasionally drives a closeout and creates a good shot, that is real. If his COV only appears from tiny-sample self-creation noise, it shrinks back toward low-creation prior.

---

# **4\. Second-Side Creation Prior**

CSV hook:

second-side creation prior;  
shrink if value only appears beside a primary engine

## **Meaning**

This is for players who attack after the defense has already been bent.

The key question:

Can he create a second advantage,  
or does he only look good when a primary engine already did the hard part?

## **Signals**

SecondSideAdvValue \= value after receiving against tilted defense  
NoPrimaryEngineCOV \= COV when primary engine is off  
PrimaryEngineOverlap \= share of creation possessions next to primary engine  
LineupDiversity \= number/variety of lineups where creation survives  
StarterContextValue \= value against starter-heavy opponent units

## **Math**

Δμ\_second\_side \=  
β\_second × z(SecondSideAdvValue)  
\+ β\_noengine × z(NoPrimaryEngineCOV)  
\+ β\_diversity × z(LineupDiversity)  
\+ β\_starter × z(StarterContextValue)  
\- β\_overlap × z(ExcessPrimaryEngineOverlap)

μ\_hook \=  
μ\_prior \+ Δμ\_second\_side

SE multiplier:

M\_context \=  
exp(  
  γ\_overlap × ExcessPrimaryEngineOverlap  
\- γ\_noengine × max(NoPrimaryEngineCOV, 0\)  
\- γ\_diversity × max(LineupDiversity, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

Good second-side creators keep value even when the first engine is gone. Dependent second-side players shrink because their COV is really star-overlap COV.

---

# **5\. Screen / DHO / Short-Roll Creation Prior**

CSV hook:

screen/DHO/short-roll creation prior;  
validate by team shot quality after actions

## **Meaning**

This is for bigs and connective forwards whose COV does not come from traditional dribbling. Their creation comes from screens, handoffs, short rolls, slips, rescreens, and forcing coverage decisions.

## **Signals**

ActionShotQualityLift \= team shot quality after screen/DHO/roll action  
ScreenAssistValue \= estimated value from screen assists and created shots  
ShortRollDecisionValue \= pass/finish/read value after short roll  
DHOAdvantageValue \= value after handoff actions  
CoverageDistortion \= blitz/switch/drop confusion created  
ShortRollTOV \= turnovers/bad resets after short-roll touches  
SpoonfedRollShare \= roll value fully created by guard

## **Math**

Δμ\_screen\_hub \=  
β\_sq × z(ActionShotQualityLift)  
\+ β\_screen × z(ScreenAssistValue)  
\+ β\_shortroll × z(ShortRollDecisionValue)  
\+ β\_dho × z(DHOAdvantageValue)  
\+ β\_coverage × z(CoverageDistortion)  
\- β\_tov × z(ShortRollTOV)  
\- β\_spoonfed × z(SpoonfedRollShare)

μ\_hook \=  
μ\_prior \+ Δμ\_screen\_hub

SE multiplier:

M\_context \=  
exp(  
  γ\_spoonfed × SpoonfedRollShare  
\+ γ\_tov × ShortRollTOV  
\- γ\_shortroll × max(ShortRollDecisionValue, 0\)  
\- γ\_sq × max(ActionShotQualityLift, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

A big who screens, slips, short-rolls, and creates open shots gets COV credit. A lob big who just receives the advantage from a guard gets mostly PVA, not full COV.

---

# **6\. Low-Creation Finisher Prior**

CSV hook:

low-creation finisher prior;  
creation claims require screen, roll, or short-roll evidence

## **Meaning**

This is for finishers. Their default COV should be low unless they prove they create through screens, rolls, seals, DHOs, or short-roll reads.

## **Signals**

SelfCreatedRimShare  
ScreenCreationValue  
RollGravityValue  
ShortRollPassValue  
SealCreationValue  
AssistedFinishShare  
CatchFinishOnlyShare

## **Math**

Δμ\_finisher\_creation \=  
β\_selfrim × z(SelfCreatedRimShare)  
\+ β\_screen × z(ScreenCreationValue)  
\+ β\_rollgrav × z(RollGravityValue)  
\+ β\_shortpass × z(ShortRollPassValue)  
\+ β\_seal × z(SealCreationValue)  
\- β\_assisted × z(AssistedFinishShare)  
\- β\_catchonly × z(CatchFinishOnlyShare)

μ\_hook \=  
μ\_prior \+ Δμ\_finisher\_creation

SE multiplier:

M\_context \=  
exp(  
  γ\_assisted × AssistedFinishShare  
\+ γ\_catchonly × CatchFinishOnlyShare  
\- γ\_screen × max(ScreenCreationValue, 0\)  
\- γ\_shortroll × max(ShortRollPassValue, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

A finisher can be valuable without being a creator. This prevents the model from mistaking finishing value for creation value.

---

# **7\. Grenade Context Prior**

CSV hook:

grenade context prior;  
credit true received grenades,  
penalize self-created late-clock messes

## **Meaning**

This is about late-clock possessions. Some players are victims of bad possessions and bail the team out. Others create the mess, then get fake credit for taking the shot.

## **Signals**

TrueGrenadeReceivedRate \= received pass with \<=5 seconds and no prior blame  
GrenadeSolvedValue \= value produced from true grenades  
SelfCreatedMessRate \= long touch / dribble / stalled possession before late-clock shot  
GrenadePassedToTeammatesRate \= passes to teammates with \<=5 seconds  
LateClockTOVRate  
LateClockBailoutValue

## **Math**

Δμ\_grenade \=  
β\_received × z(TrueGrenadeReceivedRate)  
\+ β\_solved × z(GrenadeSolvedValue)  
\+ β\_bailout × z(LateClockBailoutValue)  
\- β\_selfmess × z(SelfCreatedMessRate)  
\- β\_dumped × z(GrenadePassedToTeammatesRate)  
\- β\_lctov × z(LateClockTOVRate)

μ\_hook \=  
μ\_prior \+ Δμ\_grenade

SE multiplier:

M\_context \=  
exp(  
  γ\_selfmess × SelfCreatedMessRate  
\+ γ\_dumped × GrenadePassedToTeammatesRate  
\+ γ\_lctov × LateClockTOVRate  
\- γ\_solved × max(GrenadeSolvedValue, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

True bailout creation gets protected. Empty late-clock self-creation gets punished. Dumping grenades to teammates shrinks COV.

---

# **8\. Post / Elbow Hub Team-Validation Prior**

CSV hook:

post/elbow hub team-validation prior;  
high-touch hub owns offensive ceiling and turnover cost

## **Meaning**

This is for Jokic/Sabonis/Sengun-style hubs and smaller post/elbow organizers. They may not create like guards, but they can run offense through the elbow/post.

The question:

Does the offense actually improve when the ball flows through him?

## **Signals**

ElbowTouchValue  
PostPassShotQuality  
DHOShotQuality  
HubAssistQuality  
TeamORtgOn  
HalfcourtORtgOn  
TopDefenseHubValue  
HubTOVBurden  
PostStallRate

## **Math**

Δμ\_post\_hub \=  
β\_elbow × z(ElbowTouchValue)  
\+ β\_postpass × z(PostPassShotQuality)  
\+ β\_dho × z(DHOShotQuality)  
\+ β\_assistq × z(HubAssistQuality)  
\+ β\_team × z(TeamORtgOn)  
\+ β\_halfcourt × z(HalfcourtORtgOn)  
\+ β\_topdef × z(TopDefenseHubValue)  
\- β\_tov × z(HubTOVBurden)  
\- β\_stall × z(PostStallRate)

μ\_hook \=  
μ\_prior \+ Δμ\_post\_hub

SE multiplier:

M\_context \=  
exp(  
  γ\_tov × HubTOVBurden  
\+ γ\_stall × PostStallRate  
\- γ\_team × max(TeamORtgOn, 0\)  
\- γ\_topdef × max(TopDefenseHubValue, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

High-touch hubs get ownership. If the offense works, they get real COV. If they stall possessions or turn it over, they cannot hide behind touch volume.

---

# **9\. Movement-Created Decision Prior**

CSV hook:

movement-created decision prior;  
credit relocation and chase-induced rotations

## **Meaning**

This is for players who create COV without classic on-ball control. They create decisions by moving, relocating, cutting, forcing chase, and bending defensive attention.

## **Signals**

RelocationAdvantageValue  
ChaseRotationValue  
MovementCatchDecisionValue  
CutCreatedAdvantage  
NoTouchGravityAdvantage  
HandoffRelocationValue  
PreCreatedAdvShare

## **Math**

Δμ\_movement\_decision \=  
β\_reloc × z(RelocationAdvantageValue)  
\+ β\_chase × z(ChaseRotationValue)  
\+ β\_decision × z(MovementCatchDecisionValue)  
\+ β\_cut × z(CutCreatedAdvantage)  
\+ β\_notouch × z(NoTouchGravityAdvantage)  
\+ β\_handoff × z(HandoffRelocationValue)  
\- β\_precreated × z(PreCreatedAdvShare)

μ\_hook \=  
μ\_prior \+ Δμ\_movement\_decision

SE multiplier:

M\_context \=  
exp(  
  γ\_precreated × PreCreatedAdvShare  
\- γ\_chase × max(ChaseRotationValue, 0\)  
\- γ\_decision × max(MovementCatchDecisionValue, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

The box score may not show this kind of creation. Gingeball gives COV credit if movement actually forces rotations and creates decisions.

---

# **10\. Assist-Quality vs Assist-Count Shrinkage**

CSV hook:

assist-quality vs assist-count shrinkage;  
reward organization,  
punish empty assists and turnovers

## **Meaning**

This catches inflated assist totals. A player can rack up assists because teammates are elite shotmakers, not because he created great shots.

## **Signals**

PotentialAssists  
ActualAssists  
ExpectedPointsAfterPass  
ActualPointsAfterPass  
AssistConversion  
RolePriorAssistConversion  
TeammateShotmakingExcess  
BadPassTOVRate  
EmptyAssistRate

## **Rate model**

Use a beta-binomial style posterior for assist conversion, but do **not** hand-set k blindly. The effective prior strength should be estimated from the role/cell distribution.

AssistConversion\_obs \=  
ActualAssists / PotentialAssists

AssistConversion\_post \=  
PotentialAssists / (PotentialAssists \+ k\_assist\_cell) × AssistConversion\_obs  
\+  
k\_assist\_cell / (PotentialAssists \+ k\_assist\_cell) × AssistConversion\_prior

Where:

AssistConversion\_prior \=  
cascade prior conversion for team\_role × offensive\_role

and:

k\_assist\_cell \=  
computed from beta-binomial / empirical-Bayes dispersion

Then use the posterior conversion inside the COV hook:

AssistQualityValue \=  
z(ExpectedPointsAfterPass)  
\+ z(AssistConversion\_post \- AssistConversion\_prior)  
\- z(TeammateShotmakingExcess)

## **COV math**

Δμ\_assist\_quality \=  
β\_xpts × z(ExpectedPointsAfterPass)  
\+ β\_conv × z(AssistConversion\_post \- AssistConversion\_prior)  
\- β\_teammate × z(TeammateShotmakingExcess)  
\- β\_emptyast × z(EmptyAssistRate)  
\- β\_badtov × z(BadPassTOVRate)

μ\_hook \=  
μ\_prior \+ Δμ\_assist\_quality

SE multiplier:

M\_context \=  
exp(  
  γ\_teammate × TeammateShotmakingExcess  
\+ γ\_emptyast × EmptyAssistRate  
\+ γ\_badtov × BadPassTOVRate  
\- γ\_xpts × max(ExpectedPointsAfterPass, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

This is the difference between:

“I passed to great shooters”

and:

“I created great shots”

The first gets shrunk. The second gets trusted.

---

# **11\. Off-Ball Created-Advantage Prior**

CSV hook:

off-ball created-advantage prior;  
credit gravity-created openings,  
not box-score assists

## **Meaning**

This is rare in the CSV but important. Some players create offense without touching the ball: relocation shooters, movement shooters, screeners, cutters, gravity stars.

COV usually loves touches. This hook gives credit for creation without touch.

## **Signals**

GravityOpeningValue  
DefenderChaseRate  
HelpShiftWithoutTouch  
CutWindowCreated  
ScreenAwayAdvantage  
RelocationCreatedShotQuality  
TouchlessAdvantageShare  
BoxScoreAssistDependence

## **Math**

Δμ\_offball\_creation \=  
β\_gravity × z(GravityOpeningValue)  
\+ β\_chase × z(DefenderChaseRate)  
\+ β\_helpshift × z(HelpShiftWithoutTouch)  
\+ β\_cutwindow × z(CutWindowCreated)  
\+ β\_screenaway × z(ScreenAwayAdvantage)  
\+ β\_relocsq × z(RelocationCreatedShotQuality)  
\- β\_boxassist × z(BoxScoreAssistDependence)

μ\_hook \=  
μ\_prior \+ Δμ\_offball\_creation

SE multiplier:

M\_context \=  
exp(  
  γ\_proxy × proxy\_uncertainty  
\+ γ\_boxassist × BoxScoreAssistDependence  
\- γ\_gravity × max(GravityOpeningValue, 0\)  
\- γ\_touchless × max(TouchlessAdvantageShare, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

## **Interpretation**

This prevents Gingeball from being box-score blind. A player can create advantage by forcing a defender to chase him even if he never records an assist.

---

# **Updated role-context handling for all COV hooks**

The old CSV text often says:

team role: bench/rotation context

Under v2.2, that becomes role-specific, not generic:

| Role | COV trust interpretation |
| ----- | ----- |
| **FC** | Must validate the offense because the team is built around him. |
| **HM** | Must survive real starter load and matchup quality. |
| **RS** | Trusted narrow starter; do not over-credit broad creation outside lane. |
| **TS** | Conditional starter; shrink if creation is matchup-selected. |
| **6M** | Bench engine; needs starter/closing validation. |
| **CR** | Stable rotation player; shrink if value only appears next to stars. |
| **SS** | Veteran narrow specialist; creation is heavily context-checked. |
| **EN** | Activity player; creation must become actual advantage, not chaos. |
| **DEV** | Young inflated-rep player; hard SE inflation unless signals are strong. |
| **GT** | Low-leverage sample; little real COV trust. |
| **DNP/INA** | No court-value grade. |

The canonical vocabulary matters because **RS, TS, and DEV are no longer the same thing**. The MD explicitly splits narrow trusted starters, conditional starters, and inflated developmental minutes because they require different shrinkage behavior.

# **Final Batch 2 implementation row additions**

For every COV hook family, store:

component \= COV  
hook\_family

team\_role  
offensive\_role  
availability  
esf  
evidence\_state  
evidence\_multiplier

L1\_key  
L2\_key  
L3\_key  
L4\_key  
L5\_key

lambda\_L1  
lambda\_L2  
lambda\_L3  
lambda\_L4

prior\_mean\_cascade  
priorSD\_base  
SE\_base

hook\_signal\_1  
hook\_signal\_2  
hook\_signal\_3  
hook\_signal\_4  
hook\_signal\_5

mu\_hook  
context\_multiplier  
priorSD\_hook  
SE\_hook

COV\_raw  
COV\_bayesian  
posterior\_weight  
calibration\_flag

# **Batch 2 bottom line**

The remaining COV hooks all use the same architecture:

1\. Start with role-aware COV prior from the pooling cascade.  
2\. Use Role on Team esf to scale trust.  
3\. Use evidence\_state to inflate SE.  
4\. Use the hook to adjust prior mean and/or SE.  
5\. Blend raw COV with hooked prior.

The basketball version:

Creation is not just touches.  
Creation is not just assists.  
Creation is not just usage.  
Creation is not just being near a star.

Gingeball asks whether the player actually created advantage,  
whether the advantage survived harder contexts,  
and whether the raw number should be trusted for his specific job.

Batch 3 should be **PVA \+ SGV \+ SAV**, because those three are where scoring, spacing, finishing, shot context, and “spoonfed value” start separating hard.

