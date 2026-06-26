Absolutely — **Batch 3 \= PVA \+ SGV \+ SAV**.

These three are all offensive-side components, so they use the **offensive proof-profile cascade**:

team role × offensive role

That means the prior is not “league average.” It is the pooled, role-aware prior for players with the same offensive job and same team-role leverage. The v2.2 doc locks that COV, PVA, SGV, MIV, and SAV all feed from the offensive proof profile, while the final Bayesian value still uses `bayesian = w·observed + (1-w)·prior_mean` and `w = priorSD² / (priorSD² + SE²)`.

# **Batch 3 shared shell**

For every hook below:

μ\_prior \= offensive\_cascade\_prior(component, team\_role × offensive\_role)

priorSD\_base \= Henderson/cascade between-cell variance

n\_eff \= possessions × esf(team\_role)

SE\_base \= σ\_resid\_component × sqrt(med\_poss / n\_eff)

SE\_evidence \= SE\_base × evidence\_multiplier

μ\_hook \= μ\_prior \+ hook\_prior\_adjustment

SE\_hook \= SE\_evidence × hook\_context\_multiplier

w \= priorSD\_hook² / (priorSD\_hook² \+ SE\_hook²)

bayesian\_component \=  
w × raw\_component  
\+  
(1 − w) × μ\_hook

Component reliabilities:

PVA r \= .842  
SGV r \= .903  
SAV r \= .536

So **SGV and PVA should normally shrink less than MIV/COV**, because they are more stable, while **SAV still needs heavier shotmaking/sample shrinkage** because shotmaking noise can fool the model. The v2.2 doc has SGV and PVA as high-reliability components and SAV as materially noisier.

---

# **Part 1 — PVA shrink hooks**

## **What PVA means**

PVA \= Possession Value Added

PVA is not just “did the possession end well?”

It asks:

How much possession value did this player actually own?

That is the key word: **own**.

A rim-running big, corner spacer, cutter, or dunker can add value without creating the whole value. PVA has to separate:

created value  
preserved value  
finished value  
rescued value  
spoonfed value

The older shrinkage notes say the same thing directly: PVA should credit players for possession value they actually created, not just value they finished.

## **PVA shared formula**

PVA\_bayes \=  
w\_PVA × PVA\_raw  
\+  
(1 − w\_PVA) × μ\_PVA\_hook

Where:

μ\_PVA\_hook \=  
μ\_PVA\_prior  
\+ ownership\_adjustment  
\+ context\_adjustment  
− dependency\_penalty  
− empty\_value\_penalty

The big PVA rule:

Do not subtract value because a player is dependent.  
Move him toward the correct dependent-role prior.

That keeps the system fair. A lob big still gets value. He just does not get credited like the person who created the lob.

---

## **1\. Self-created rim / FTr prior**

CSV hook family:

self-created rim/FTr prior;  
separate self-created rim attempts from spoonfed catches

### **Signals**

SelfRimShare  
UnassistedRimRate  
RimFTr  
DriveRimValue  
AssistedRimShare  
EliteCreatorOverlap  
RimTOVRate

### **Math**

SelfCreatedRimValue \=  
z(UnassistedRimRate)  
\+ z(DriveRimValue)  
\+ z(RimFTr)  
− z(RimTOVRate)

DependencyRisk \=  
z(AssistedRimShare)  
\+ z(EliteCreatorOverlap)

Δμ\_self\_rim \=  
β\_self × SelfCreatedRimValue  
− β\_dep × DependencyRisk

μ\_hook \=  
μ\_prior \+ Δμ\_self\_rim

M\_context \=  
exp(  
  γ\_dep × DependencyRisk  
− γ\_self × max(SelfCreatedRimValue, 0\)  
)

SE\_hook \=  
SE\_evidence × M\_context

### **Basketball meaning**

A rim pressure player who gets there himself gets protected.  
A player who only finishes spoonfed catches gets pulled toward dependent-finisher prior.

---

## **2\. Endpoint / value-receiver prior**

CSV hook family:

endpoint/value-receiver prior;  
credit made shots but discount advantage creation

### **Signals**

EndpointFinishValue  
CatchFinishShare  
AdvantageAlreadyCreatedShare  
SelfCreatedAfterCatchValue  
OneDribbleAdvantageValue  
CreatorOverlap

### **Math**

ReceiverDependency \=  
z(CatchFinishShare)  
\+ z(AdvantageAlreadyCreatedShare)  
\+ z(CreatorOverlap)

ReceiverOwnership \=  
z(SelfCreatedAfterCatchValue)  
\+ z(OneDribbleAdvantageValue)

Δμ\_endpoint \=  
β\_finish × z(EndpointFinishValue)  
\+ β\_own × ReceiverOwnership  
− β\_dep × ReceiverDependency

μ\_hook \=  
μ\_prior \+ Δμ\_endpoint

M\_context \=  
exp(  
  γ\_dep × ReceiverDependency  
− γ\_own × max(ReceiverOwnership, 0\)  
)

### **Basketball meaning**

He gets credit for finishing value.  
He does not get full possession-value ownership if the advantage was already created.

---

## **3\. Preservation-value split**

CSV hook family:

preservation-value split;  
credit only value maintained or improved after receiving advantage

### **Signals**

EP\_before\_touch  
EP\_after\_touch  
AdvantagePreservedRate  
AdvantageImprovedRate  
AdvantageKilledRate  
QuickDecisionValue

### **Math**

IncrementalAdvantageValue \=  
EP\_after\_touch − EP\_before\_touch

PreservationScore \=  
z(AdvantagePreservedRate)  
\+ z(AdvantageImprovedRate)  
\+ z(QuickDecisionValue)  
− z(AdvantageKilledRate)

Δμ\_preservation \=  
β\_iav × z(IncrementalAdvantageValue)  
\+ β\_preserve × PreservationScore

μ\_hook \=  
μ\_prior \+ Δμ\_preservation

M\_context \=  
exp(  
  γ\_kill × z(AdvantageKilledRate)  
− γ\_iav × max(z(IncrementalAdvantageValue), 0\)  
)

### **Basketball meaning**

A connector gets real PVA if he keeps the defense rotating.  
He shrinks if he receives advantage and kills it.

---

## **4\. Creator-vs-receiver split**

CSV hook family:

creator-vs-receiver split;  
credit value added after catch, not advantage already created

This is close to preservation-value, but it is broader. It applies to secondary creators, wings, and guards who catch the ball after the first action.

### **Signals**

ValueBeforeCatch  
ValueAfterCatch  
SecondSideCreationValue  
SelfCreatedAfterCatchShare  
StarCreatedShare  
ResetRate

### **Math**

CreatedAfterCatch \=  
z(ValueAfterCatch − ValueBeforeCatch)  
\+ z(SecondSideCreationValue)  
\+ z(SelfCreatedAfterCatchShare)

PreCreatedDependency \=  
z(StarCreatedShare)  
\+ z(ValueBeforeCatch)

Δμ\_creator\_receiver \=  
β\_create × CreatedAfterCatch  
− β\_precreated × PreCreatedDependency  
− β\_reset × z(ResetRate)

μ\_hook \=  
μ\_prior \+ Δμ\_creator\_receiver

SE\_hook \=  
SE\_evidence × exp(  
  γ\_precreated × PreCreatedDependency  
\+ γ\_reset × z(ResetRate)  
− γ\_create × max(CreatedAfterCatch, 0\)  
)

### **Basketball meaning**

If he creates the second advantage, trust him.  
If he simply receives the first advantage, shrink him.

---

## **5\. Assisted-vs-unassisted rim split**

CSV hook family:

assisted-vs-unassisted rim split;  
spoonfed lobs/dunks shrink toward dependent-finisher prior

This one should use rate shrinkage inside the component.

### **Rate math**

posterior\_assisted\_rim \=  
n\_ast / (n\_ast \+ k\_ast) × observed\_assisted\_rim  
\+  
k\_ast / (n\_ast \+ k\_ast) × prior\_assisted\_rim

posterior\_unassisted\_rim \=  
n\_unast / (n\_unast \+ k\_unast) × observed\_unassisted\_rim  
\+  
k\_unast / (n\_unast \+ k\_unast) × prior\_unassisted\_rim

But in v2.2, `k_ast` and `k_unast` should be **computed from dispersion**, not guessed.

### **Ownership weights**

assisted\_lob\_ownership ≈ 0.30–0.40  
assisted\_layup\_ownership ≈ 0.40–0.50  
unassisted\_rim\_ownership ≈ 0.85–0.95  
putback\_ownership ≈ 0.60–0.70  
post\_created\_ownership ≈ 0.75–0.85

### **Combined PVA**

RimPVA\_owned \=  
assisted\_share × posterior\_assisted\_rim × assisted\_ownership  
\+  
unassisted\_share × posterior\_unassisted\_rim × unassisted\_ownership  
\+  
putback\_share × posterior\_putback × putback\_ownership

Δμ\_rim\_split \=  
β\_rim × z(RimPVA\_owned)

μ\_hook \=  
μ\_prior \+ Δμ\_rim\_split

### **Basketball meaning**

A lob big gets credit for hands, timing, catch radius, and finishing.  
He does not get primary-creator ownership for the pass that created the dunk.

---

## **6\. Roll / DHO possession value prior**

CSV hook family:

roll/DHO possession value prior;  
split screener credit from handler-created advantage

### **Signals**

RollManPPP  
DHOActionValue  
ScreenAssistValue  
ShortRollPassValue  
HandlerCreatedAdvantageShare  
SlipGravityValue  
RollTOVRate

### **Math**

ScreenOwnedValue \=  
z(ScreenAssistValue)  
\+ z(ShortRollPassValue)  
\+ z(SlipGravityValue)  
\+ z(DHOActionValue)  
− z(RollTOVRate)

HandlerDependency \=  
z(HandlerCreatedAdvantageShare)

Δμ\_roll\_DHO \=  
β\_screen × ScreenOwnedValue  
\+ β\_rollppp × z(RollManPPP)  
− β\_handler × HandlerDependency

μ\_hook \=  
μ\_prior \+ Δμ\_roll\_DHO

SE\_hook \=  
SE\_evidence × exp(  
  γ\_handler × HandlerDependency  
\+ γ\_tov × z(RollTOVRate)  
− γ\_screen × max(ScreenOwnedValue, 0\)  
)

### **Basketball meaning**

A screener who creates advantage through screens, slips, DHOs, and short-roll reads gets real PVA.  
A pure roll finisher next to an elite handler shrinks toward dependent-roll prior.

---

## **7\. Post-touch value prior**

CSV hook family:

post-touch value prior;  
separate scoring, passing, foul pressure, and turnover burden

### **Signals**

PostScoringValue  
PostPassShotQuality  
PostFTr  
PostDoubleTeamValue  
PostTOVRate  
PostStallRate  
TeamORtgAfterPostTouch

### **Math**

PostOwnedValue \=  
z(PostScoringValue)  
\+ z(PostPassShotQuality)  
\+ z(PostFTr)  
\+ z(PostDoubleTeamValue)  
\+ z(TeamORtgAfterPostTouch)  
− z(PostTOVRate)  
− z(PostStallRate)

Δμ\_post \=  
β\_post × PostOwnedValue

μ\_hook \=  
μ\_prior \+ Δμ\_post

SE\_hook \=  
SE\_evidence × exp(  
  γ\_tov × z(PostTOVRate)  
\+ γ\_stall × z(PostStallRate)  
− γ\_team × max(z(TeamORtgAfterPostTouch), 0\)  
)

### **Basketball meaning**

Post value is not just post scoring.  
Passing, foul pressure, double-team punishment, and turnover burden all matter.

---

## **8\. True-grenade possession value prior**

CSV hook family:

true-grenade possession value prior;  
separate rescue value from clock-kill blame

### **Signals**

TrueGrenadeReceivedRate  
GrenadeSolvedValue  
SelfCreatedMessRate  
LateClockBailoutValue  
GrenadeDumpRate  
LateClockTOVRate

### **Math**

GrenadeRescueValue \=  
z(TrueGrenadeReceivedRate)  
\+ z(GrenadeSolvedValue)  
\+ z(LateClockBailoutValue)  
− z(LateClockTOVRate)

ClockKillBlame \=  
z(SelfCreatedMessRate)  
\+ z(GrenadeDumpRate)

Δμ\_grenade\_PVA \=  
β\_rescue × GrenadeRescueValue  
− β\_blame × ClockKillBlame

μ\_hook \=  
μ\_prior \+ Δμ\_grenade\_PVA

SE\_hook \=  
SE\_evidence × exp(  
  γ\_blame × ClockKillBlame  
− γ\_rescue × max(GrenadeRescueValue, 0\)  
)

### **Basketball meaning**

If he inherited a dead possession and saved it, protect him.  
If he created the dead possession, shrink him.

---

## **9\. Possession-stability prior**

CSV hook family:

possession-stability prior;  
value comes from avoiding negative outcomes more than finishing plays

### **Signals**

LowTOVRate  
BadPossessionAvoidance  
ResetQuality  
FoulAvoidance  
AdvantagePreservation  
LowUsageCleanPossessionRate

### **Math**

StabilityValue \=  
z(BadPossessionAvoidance)  
\+ z(ResetQuality)  
\+ z(AdvantagePreservation)  
\+ z(LowUsageCleanPossessionRate)  
− z(TOVRate)  
− z(OffensiveFoulRate)

Δμ\_stability \=  
β\_stable × StabilityValue

μ\_hook \=  
μ\_prior \+ Δμ\_stability

SE\_hook \=  
SE\_evidence × exp(  
  \- γ\_stable × max(StabilityValue, 0\)  
)

### **Basketball meaning**

Some players add value by not wrecking possessions.  
Low-usage clean decisions should count, but not as creation.

---

## **10\. High-responsibility possession value prior**

CSV hook family:

high-responsibility possession value prior;  
separate self-created value from usage volume

### **Signals**

UsageLoad  
SelfCreatedValue  
TeamORtgOn  
HalfcourtEfficiency  
TOVBurden  
LateClockBurden  
TopDefenseValue

### **Math**

HighRespOwnedValue \=  
z(SelfCreatedValue)  
\+ z(TeamORtgOn)  
\+ z(HalfcourtEfficiency)  
\+ z(TopDefenseValue)  
− z(TOVBurden)  
− z(LateClockBurden)

UsageInflation \=  
max(0, z(UsageLoad) − z(SelfCreatedValue))

Δμ\_high\_resp \=  
β\_owned × HighRespOwnedValue  
− β\_usage × UsageInflation

μ\_hook \=  
μ\_prior \+ Δμ\_high\_resp

SE\_hook \=  
SE\_evidence × exp(  
  γ\_usage × UsageInflation  
− γ\_owned × max(HighRespOwnedValue, 0\)  
)

### **Basketball meaning**

A high-usage player gets credit only if the usage turns into owned value.  
Usage alone is not PVA.

---

## **11\. Off-screen / off-ball action value prior**

CSV hook family:

off-screen possession value prior;  
off-ball action value prior;  
separate gravity-generated value from endpoint finishing

### **Signals**

OffScreenShotQuality  
MovementCreatedAdvantage  
GravityGeneratedValue  
CurlValue  
FlareValue  
EndpointFinishShare  
StarCreatedOpenLookShare

### **Math**

OffBallOwnedValue \=  
z(OffScreenShotQuality)  
\+ z(MovementCreatedAdvantage)  
\+ z(GravityGeneratedValue)  
\+ z(CurlValue)  
\+ z(FlareValue)  
− z(StarCreatedOpenLookShare)

EndpointDependency \=  
z(EndpointFinishShare)

Δμ\_offball\_PVA \=  
β\_offball × OffBallOwnedValue  
− β\_endpoint × EndpointDependency

μ\_hook \=  
μ\_prior \+ Δμ\_offball\_PVA

### **Basketball meaning**

A movement shooter can own possession value before the catch.  
But simple endpoint finishing off a star-created action should not be overcredited.

---

# **Part 2 — SGV shrink hooks**

## **What SGV means**

SGV \= Spacing / Gravity Value

SGV asks:

Does the defense actually have to care about him?

Not:

Did he make some open threes?

That distinction is everything. SGV is where the model stops a stationary corner shooter from being treated like Steph Curry. The older shrinkage doc says exactly that: SGV is where you stop stationary corner players from being graded like movement superstars.

## **SGV shared formula**

SGV\_bayes \=  
w\_SGV × SGV\_raw  
\+  
(1 − w\_SGV) × μ\_SGV\_hook

SGV has high reliability, so it usually should not get crushed. But the **hook** decides whether the SGV is real gravity or just easy context.

---

## **1\. Corner / wide-open spacer prior**

CSV hook family:

corner/wide-open spacer prior;  
shrink star-created looks and corner-only shooting

### **Signals**

Corner3PPosterior  
AboveBreak3PPosterior  
WideOpenShare  
StarCreatedOpenLookShare  
DefenderDistance  
CornerOnlyShare

### **Math**

CornerDependency \=  
z(WideOpenShare)  
\+ z(StarCreatedOpenLookShare)  
\+ z(CornerOnlyShare)

PortableSpacing \=  
z(AboveBreak3PPosterior)  
\+ z(TightDefenderMakeRate)  
\+ z(DefenderRespect)

Δμ\_corner \=  
β\_corner × z(Corner3PPosterior)  
\+ β\_portable × PortableSpacing  
− β\_dep × CornerDependency

μ\_hook \=  
μ\_prior \+ Δμ\_corner

SE\_hook \=  
SE\_evidence × exp(  
  γ\_dep × CornerDependency  
− γ\_portable × max(PortableSpacing, 0\)  
)

### **Basketball meaning**

A corner spacer can be valuable.  
But corner-only, wide-open, star-created shooting gets a narrower SGV prior than movement or pull-up gravity.

---

## **2\. Secondary pull-up / spot-up gravity prior**

CSV hook family:

secondary pull-up/spot-up gravity prior;  
discount star-created open looks

### **Signals**

PullUp3PPosterior  
SpotUp3PPosterior  
AboveBreakShare  
SelfCreated3PShare  
StarCreatedOpenLookShare  
DefenderChaseRate

### **Math**

SelfOwnedGravity \=  
z(PullUp3PPosterior)  
\+ z(SelfCreated3PShare)  
\+ z(AboveBreakShare)  
\+ z(DefenderChaseRate)

StarCreatedDependency \=  
z(StarCreatedOpenLookShare)

Δμ\_secondary\_gravity \=  
β\_self × SelfOwnedGravity  
\+ β\_spotup × z(SpotUp3PPosterior)  
− β\_star × StarCreatedDependency

SE\_hook \=  
SE\_evidence × exp(  
  γ\_star × StarCreatedDependency  
− γ\_self × max(SelfOwnedGravity, 0\)  
)

### **Basketball meaning**

Secondary shooting gravity is real if defenders chase him and he can shoot above the break or off movement.  
If he only gets star-created open looks, SGV shrinks.

---

## **3\. Pull-up / creation gravity prior**

CSV hook family:

pull-up/creation gravity prior;  
shrink reputation if attempts do not bend help coverage

### **Signals**

PullUp3PARate  
PullUp3PPosterior  
HighScreenPullUpThreat  
HelpAtNailShift  
BigAtLevelRate  
SelfCreated3PShare  
LowAttemptReputationPenalty

### **Math**

CreationGravity \=  
z(PullUp3PARate)  
\+ z(PullUp3PPosterior)  
\+ z(HighScreenPullUpThreat)  
\+ z(HelpAtNailShift)  
\+ z(BigAtLevelRate)  
\+ z(SelfCreated3PShare)

Δμ\_pullup \=  
β\_creation\_gravity × CreationGravity  
− β\_reputation × z(LowAttemptReputationPenalty)

μ\_hook \=  
μ\_prior \+ Δμ\_pullup

SE\_hook \=  
SE\_evidence × exp(  
  γ\_low\_attempt × z(LowAttemptReputationPenalty)  
− γ\_gravity × max(CreationGravity, 0\)  
)

### **Basketball meaning**

Pull-up gravity means the defense bends before the shot.  
Reputation without attempts or coverage reaction shrinks.

---

## **4\. Movement gravity prior**

CSV hook family:

movement gravity prior;  
wider prior than stationary spacer because defense must chase

### **Signals**

Movement3PPosterior  
OffScreen3PA  
Relocation3PA  
ChaseRate  
TopLockRate  
MovementShotDifficulty  
GravityWithoutTouch

### **Math**

MovementGravity \=  
z(Movement3PPosterior)  
\+ z(OffScreen3PA)  
\+ z(Relocation3PA)  
\+ z(ChaseRate)  
\+ z(TopLockRate)  
\+ z(GravityWithoutTouch)

Δμ\_movement\_SGV \=  
β\_move × MovementGravity

μ\_hook \=  
μ\_prior \+ Δμ\_movement\_SGV

Prior SD can widen mildly:

priorSD\_hook \=  
priorSD\_base × exp(  
  δ\_move × max(MovementGravity, 0\)  
)

SE\_hook \=  
SE\_evidence × exp(  
  \- γ\_move × max(MovementGravity, 0\)  
)

### **Basketball meaning**

Movement shooters deserve less shrinkage than stationary spacers because the defense has to chase them.

---

## **5\. Connector-spacing prior**

CSV hook family:

connector-spacing prior;  
value depends on staying guarded without overclaiming gravity

### **Signals**

GuardedRate  
HelpOffRate  
QuickSwingValue  
CloseoutAttackValue  
LowUsageSpacingIntegrity  
IgnoredRate

### **Math**

ConnectorSpacing \=  
z(GuardedRate)  
\+ z(QuickSwingValue)  
\+ z(CloseoutAttackValue)  
\+ z(LowUsageSpacingIntegrity)  
− z(IgnoredRate)  
− z(HelpOffRate)

Δμ\_connector\_spacing \=  
β\_conn × ConnectorSpacing

μ\_hook \=  
μ\_prior \+ Δμ\_connector\_spacing

SE\_hook \=  
SE\_evidence × exp(  
  γ\_ignored × z(IgnoredRate)  
− γ\_conn × max(ConnectorSpacing, 0\)  
)

### **Basketball meaning**

A connector does not need superstar gravity.  
He just needs to stay guarded enough to preserve offensive shape.

---

## **6\. Drive gravity prior**

CSV hook family:

drive gravity prior;  
spacing value comes from collapsing help, not shooting gravity

### **Signals**

PaintTouchHelpRate  
KickoutCreation  
RimPressureGravity  
DriveCollapseValue  
NonShootingSpacingCost

### **Math**

DriveGravity \=  
z(PaintTouchHelpRate)  
\+ z(KickoutCreation)  
\+ z(RimPressureGravity)  
\+ z(DriveCollapseValue)  
− z(NonShootingSpacingCost)

Δμ\_drive\_SGV \=  
β\_drive × DriveGravity

μ\_hook \=  
μ\_prior \+ Δμ\_drive\_SGV

SE\_hook \=  
SE\_evidence × exp(  
  γ\_spacing\_cost × z(NonShootingSpacingCost)  
− γ\_drive × max(DriveGravity, 0\)  
)

### **Basketball meaning**

Some players create spacing by forcing help into the paint.  
They should get SGV even if they are not shooters.

---

## **7\. Vertical-spacing prior**

CSV hook family:

vertical-spacing prior;  
credit lob pressure but discount non-spacing lineup cost

### **Signals**

LobThreatValue  
DunkerSpotGravity  
RimRunPressure  
HelpTagRate  
NonSpacingCost  
CloggedPaintRate

### **Math**

VerticalGravity \=  
z(LobThreatValue)  
\+ z(DunkerSpotGravity)  
\+ z(RimRunPressure)  
\+ z(HelpTagRate)  
− z(NonSpacingCost)  
− z(CloggedPaintRate)

Δμ\_vertical \=  
β\_vert × VerticalGravity

μ\_hook \=  
μ\_prior \+ Δμ\_vertical

SE\_hook \=  
SE\_evidence × exp(  
  γ\_clog × z(CloggedPaintRate)  
\+ γ\_nonspace × z(NonSpacingCost)  
− γ\_vert × max(VerticalGravity, 0\)  
)

### **Basketball meaning**

A lob threat spaces vertically.  
But if he also kills lineup spacing, that gets priced in.

---

## **8\. Roll / pop gravity prior**

CSV hook family:

roll/pop gravity prior;  
balance vertical pressure or pop gravity against spacing cost

### **Signals**

RollGravity  
Pop3PPosterior  
PickAndPopVolume  
RollHelpTagRate  
SpacingCost  
ShortRollPunishValue

### **Math**

RollPopGravity \=  
z(RollGravity)  
\+ z(Pop3PPosterior)  
\+ z(PickAndPopVolume)  
\+ z(RollHelpTagRate)  
\+ z(ShortRollPunishValue)  
− z(SpacingCost)

Δμ\_rollpop \=  
β\_rollpop × RollPopGravity

μ\_hook \=  
μ\_prior \+ Δμ\_rollpop

### **Basketball meaning**

Roll gravity and pop gravity both count, but the model checks whether the big actually improves spacing or just occupies the dunker/paint.

---

## **9\. Frontcourt gravity prior**

CSV hook family:

frontcourt gravity prior;  
shrink if touches crowd spacing without payoff

### **Signals**

PostGravity  
ElbowGravity  
ShortRollGravity  
PaintCrowding  
TeamSpacingWithPlayer  
FrontcourtTouchValue

### **Math**

FrontcourtGravity \=  
z(PostGravity)  
\+ z(ElbowGravity)  
\+ z(ShortRollGravity)  
\+ z(FrontcourtTouchValue)  
− z(PaintCrowding)  
− z(SpacingDamage)

Δμ\_frontcourt \=  
β\_frontcourt × FrontcourtGravity

SE\_hook \=  
SE\_evidence × exp(  
  γ\_crowd × z(PaintCrowding)  
− γ\_frontcourt × max(FrontcourtGravity, 0\)  
)

### **Basketball meaning**

A frontcourt player only gets SGV if his touches force defensive attention or open teammates.  
Crowding the floor without payoff shrinks.

---

## **10\. Late-clock gravity prior**

CSV hook family:

late-clock gravity prior;  
credit defensive attention only if it creates rescue outlets

### **Signals**

LateClockAttention  
BailoutSpacingValue  
LateClockOutletValue  
TrueGrenadeSpacing  
SelfCreatedMessRate

### **Math**

LateClockGravity \=  
z(LateClockAttention)  
\+ z(BailoutSpacingValue)  
\+ z(LateClockOutletValue)  
\+ z(TrueGrenadeSpacing)  
− z(SelfCreatedMessRate)

Δμ\_lateclock\_SGV \=  
β\_late × LateClockGravity

μ\_hook \=  
μ\_prior \+ Δμ\_lateclock\_SGV

### **Basketball meaning**

Late-clock gravity matters if it gives the offense a real escape valve.  
It does not count if the player created the late-clock mess himself.

---

## **11\. Low-scoring spacing prior**

CSV hook family:

low-scoring spacing prior;  
credit only if defender respects him enough to preserve shape

### **Signals**

DefenderRespectRate  
IgnoredRate  
HelpOffRate  
SpacingShapePreserved  
LowUsageThreat

### **Math**

LowScoringSpacing \=  
z(DefenderRespectRate)  
\+ z(SpacingShapePreserved)  
\+ z(LowUsageThreat)  
− z(IgnoredRate)  
− z(HelpOffRate)

Δμ\_low\_scoring\_spacing \=  
β\_shape × LowScoringSpacing

### **Basketball meaning**

A low scorer can still space if the defense respects him.  
If defenses ignore him, SGV shrinks no matter what his raw percentage says.

---

# **Part 3 — SAV shrink hooks**

## **What SAV means**

SAV \= Shot / Scoring Advantage Value

SAV is lower-driver right now, but it is where the model prevents noisy shotmaking from sneaking into TCV.

SAV asks:

How believable is this player’s scoring/shot value after accounting for shot context, volume, difficulty, and role?

The old shrinkage notes explicitly say SAV needs shrinkage so it does not become noisy later, especially for small shooting samples, assisted-value dependence, corner-only shooting, wide-open makes, shot-clock difficulty, role-player efficiency, and competition validation.

## **SAV shared formula**

SAV\_bayes \=  
w\_SAV × SAV\_raw  
\+  
(1 − w\_SAV) × μ\_SAV\_hook

Because SAV reliability is only `.536`, SAV needs more regression than SGV/PVA.

---

## **1\. Catch-and-shoot beta-binomial posterior**

CSV hook family:

catch-and-shoot beta-binomial posterior;  
wide-open and small-sample makes regress strongly

### **Rate math**

posterior\_CnS\_3P \=  
makes\_CnS \+ α\_role  
/  
attempts\_CnS \+ α\_role \+ β\_role

Equivalent:

posterior\_CnS\_3P \=  
n / (n \+ k\_role) × observed\_CnS\_3P  
\+  
k\_role / (n \+ k\_role) × prior\_CnS\_3P

Where:

k\_role \= computed from role/cell shooting dispersion

### **SAV hook**

Δμ\_CnS \=  
β\_cns × z(posterior\_CnS\_3P)  
− β\_wide × z(WideOpenShare)  
− β\_small × z(SmallSampleFlag)

μ\_hook \=  
μ\_prior \+ Δμ\_CnS

### **Basketball meaning**

Wide-open catch-and-shoot heaters regress.  
The model credits shooting, but not every 42% open-shot season becomes real shotmaking advantage.

---

## **2\. Rim / FT scoring posterior**

CSV hook family:

rim/FT scoring posterior;  
shot value comes from paint pressure and foul drawing

### **Signals**

RimEfficiencyPosterior  
FreeThrowRate  
AndOneRate  
SelfCreatedRimShare  
AssistedRimShare  
WhistleDependency  
PlayoffFTrValidation

### **Math**

RimFTShotValue \=  
z(RimEfficiencyPosterior)  
\+ z(FreeThrowRate)  
\+ z(AndOneRate)  
\+ z(SelfCreatedRimShare)  
\+ z(PlayoffFTrValidation)  
− z(AssistedRimShare)  
− z(WhistleDependency)

Δμ\_rimFT\_SAV \=  
β\_rimft × RimFTShotValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_whistle × z(WhistleDependency)  
\+ γ\_assisted × z(AssistedRimShare)  
− γ\_self × max(z(SelfCreatedRimShare), 0\)  
)

### **Basketball meaning**

Paint scoring is more believable when it is self-created and foul-pressure driven.  
Pure assisted rim finishing belongs more in PVA than SAV.

---

## **3\. Rim finishing beta-binomial posterior**

CSV hook family:

rim finishing beta-binomial posterior;  
assisted finish rates regress to role prior

### **Rate math**

Split by context:

posterior\_assisted\_lob  
posterior\_assisted\_layup  
posterior\_unassisted\_rim  
posterior\_post\_rim  
posterior\_putback

Each gets:

posterior\_rate\_context \=  
n\_context / (n\_context \+ k\_context) × observed\_rate\_context  
\+  
k\_context / (n\_context \+ k\_context) × prior\_rate\_context

Then:

RimFinishSAV \=  
Σ context\_share × posterior\_rate\_context × difficulty\_weight\_context

Difficulty weights:

assisted\_lob \< assisted\_layup \< putback \< post-created \< drive-created

### **Basketball meaning**

Not all rim finishing is equally owned.  
A self-created drive finish is harder and more portable than a spoonfed dunk.

---

## **4\. Low-usage efficiency posterior**

CSV hook family:

low-usage efficiency posterior;  
shrink pristine-context shooting toward connector prior

### **Signals**

UsageRate  
Efficiency  
WideOpenShare  
StarOverlap  
SelfCreatedShotShare  
ValueWithoutStar

### **Math**

PristineContext \=  
z(WideOpenShare)  
\+ z(StarOverlap)  
− z(SelfCreatedShotShare)

LowUsageEfficiencyValue \=  
z(Efficiency)  
\+ z(ValueWithoutStar)  
− z(PristineContext)

Δμ\_low\_usage \=  
β\_eff × LowUsageEfficiencyValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_pristine × PristineContext  
− γ\_no\_star × max(z(ValueWithoutStar), 0\)  
)

### **Basketball meaning**

Efficient low-usage scoring is real, but it should not be treated like self-created scoring unless it survives outside pristine context.

---

## **5\. Low-volume shot posterior**

CSV hook family:

low-volume shot posterior;  
do not overreact to low-attempt efficiency

### **Signals**

ShotAttempts  
ShotValueRaw  
ShotDifficulty  
RolePriorShotValue

### **Math**

VolumeCredibility \=  
log(1 \+ ShotAttempts)

SE\_hook \=  
SE\_evidence × exp(  
  γ\_lowvol / max(VolumeCredibility, small\_number)  
)

Alternative rate version:

posterior\_shot\_value \=  
n / (n \+ k\_role) × observed\_shot\_value  
\+  
k\_role / (n \+ k\_role) × role\_prior\_shot\_value

### **Basketball meaning**

A player going 18-for-36 from some zone should not swing SAV.  
Small samples get pulled back.

---

## **6\. Late-clock shot posterior**

CSV hook family:

late-clock shot posterior;  
high variance shrinks unless sample is real and context is true grenade

### **Signals**

LateClockShotValue  
TrueGrenadeReceivedRate  
SelfCreatedLateClockMess  
LateClockVolume  
LateClockTOV  
BailoutDifficulty

### **Math**

TrueLateClockValue \=  
z(LateClockShotValue)  
\+ z(TrueGrenadeReceivedRate)  
\+ z(BailoutDifficulty)  
− z(SelfCreatedLateClockMess)  
− z(LateClockTOV)

Δμ\_late\_SAV \=  
β\_late × TrueLateClockValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_variance × z(1 / max(LateClockVolume, small\_number))  
\+ γ\_selfmess × z(SelfCreatedLateClockMess)  
− γ\_truegrenade × max(z(TrueGrenadeReceivedRate), 0\)  
)

### **Basketball meaning**

Real bailout shotmaking gets protected.  
Tiny-sample late-clock nonsense shrinks.  
Self-created late-clock messes do not get rewarded.

---

## **7\. Mixed shot-profile posterior**

CSV hook family:

mixed shot-profile posterior;  
shrink hot pull-up/midrange runs toward role prior

### **Signals**

PullUpMidrangeValue  
PullUp3PValue  
RimValue  
CatchShootValue  
ShotProfileDiversity  
HotZoneSmallSample  
SelfCreatedShotDifficulty

### **Math**

ShotProfileCredibility \=  
z(ShotProfileDiversity)  
\+ z(SelfCreatedShotDifficulty)  
− z(HotZoneSmallSample)

MixedShotValue \=  
z(PullUpMidrangeValue)  
\+ z(PullUp3PValue)  
\+ z(RimValue)  
\+ z(CatchShootValue)  
\+ ShotProfileCredibility

Δμ\_mixed \=  
β\_mixed × MixedShotValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_hotzone × z(HotZoneSmallSample)  
− γ\_diverse × max(z(ShotProfileDiversity), 0\)  
)

### **Basketball meaning**

Diverse shotmaking is more believable than one hot pocket of attempts.

---

## **8\. Shot-difficulty posterior**

CSV hook family:

shot-difficulty posterior;  
late-clock and pull-up making must stabilize over sample

### **Signals**

ShotDifficulty  
PullUpShare  
ContestedShare  
LateClockShare  
ExpectedShotValue  
ActualShotValue  
AttemptVolume

### **Math**

DifficultyOverperformance \=  
z(ActualShotValue − ExpectedShotValue)

DifficultyCredibility \=  
z(AttemptVolume)  
\+ z(PullUpShare)  
\+ z(ContestedShare)  
\+ z(LateClockShare)

Δμ\_difficulty \=  
β\_over × DifficultyOverperformance  
\+ β\_cred × DifficultyCredibility

SE\_hook \=  
SE\_evidence × exp(  
  γ\_noise × z(1 / max(AttemptVolume, small\_number))  
− γ\_diff × max(DifficultyCredibility, 0\)  
)

### **Basketball meaning**

Tough-shot makers need sample.  
The model should not crown a player off one hot contested-shot season.

---

## **9\. Post / midrange shot posterior**

CSV hook family:

post/midrange shot posterior;  
tough-shot and foul-draw value must stabilize

### **Signals**

PostShotValue  
MidrangeValue  
FoulDrawFromPost  
PostTurnoverRate  
TouchVolume  
DoubleTeamPunish

### **Math**

PostMidValue \=  
z(PostShotValue)  
\+ z(MidrangeValue)  
\+ z(FoulDrawFromPost)  
\+ z(DoubleTeamPunish)  
− z(PostTurnoverRate)

Δμ\_post\_mid \=  
β\_postmid × PostMidValue

SE\_hook \=  
SE\_evidence × exp(  
  γ\_lowtouch × z(1 / max(TouchVolume, small\_number))  
\+ γ\_tov × z(PostTurnoverRate)  
− γ\_foul × max(z(FoulDrawFromPost), 0\)  
)

### **Basketball meaning**

Post/midrange scoring is real if it stabilizes and creates fouls or double-team punishment.  
Otherwise it is noisy tough-shot diet.

---

## **10\. Movement shooting / movement-shot posterior**

CSV hook family:

movement shooting posterior;  
movement-shot posterior;  
volume/difficulty stabilizes more than wide-open makes

### **Signals**

Movement3PPosterior  
OffScreenVolume  
RelocationVolume  
ChaseDifficulty  
DefenderTrailRate  
WideOpenShare  
StationaryShare

### **Math**

MovementShotCredibility \=  
z(Movement3PPosterior)  
\+ z(OffScreenVolume)  
\+ z(RelocationVolume)  
\+ z(ChaseDifficulty)  
\+ z(DefenderTrailRate)  
− z(WideOpenShare)  
− z(StationaryShare)

Δμ\_movement\_SAV \=  
β\_move\_shot × MovementShotCredibility

priorSD\_hook \=  
priorSD\_base × exp(  
  δ\_move × max(MovementShotCredibility, 0\)  
)

SE\_hook \=  
SE\_evidence × exp(  
  γ\_stationary × z(StationaryShare)  
− γ\_move × max(MovementShotCredibility, 0\)  
)

### **Basketball meaning**

Movement shooting should shrink less than stationary catch-and-shoot because the shot difficulty and defensive attention are higher.

---

# **Role-context handling across Batch 3**

The old CSV often says things like:

bench/rotation context  
starter sample  
DNP/low-court-evidence context  
effective sample reduced if situational, bench-only, or opponent-dependent

In v2.2, those become the canonical Role on Team math:

FC/HM \= high trust, but high validation burden  
RS \= trusted narrow lane, do not over-credit broad creation  
TS \= conditional/matchup context  
6M \= bench engine, needs starter/closing validation  
CR \= stable role context  
SS \= veteran narrow specialist, strong context shrink  
EN \= activity must become value  
DEV \= young inflated reps, hard SE inflation  
GT \= low-leverage discount  
DNP/INA \= no court-value grade

The doc locks that Role on Team sets effective-sample trust through `n_eff = esf·n`, with lower esf creating bigger SE and more shrinkage; it also locks the expanded vocabulary and the split between Role Starter, Tactical Starter, and Developmental.

# **Batch 3 implementation fields**

For PVA/SGV/SAV rows, store:

player\_id  
season  
component  
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
priorSD\_hook

raw\_component\_value  
possessions  
n\_eff

rate\_subposterior\_1  
rate\_subposterior\_2  
rate\_subposterior\_3

hook\_signal\_1  
hook\_signal\_2  
hook\_signal\_3  
hook\_signal\_4  
hook\_signal\_5

mu\_hook  
context\_multiplier  
SE\_base  
SE\_hook  
posterior\_weight  
bayesian\_component\_value  
shrinkage\_reason\_flags  
calibration\_flag

# **Batch 3 bottom line**

PVA \= who actually owned possession value?  
SGV \= did the defense actually care?  
SAV \= how believable is the shot/scoring value?

The clean Gingeball principle:

PVA stops spoonfed value from becoming creation value.  
SGV stops open-shot making from becoming gravity.  
SAV stops hot shooting from becoming permanent scoring truth.

Batch 4 should be **MIV**, because that is the component where activity, movement, cutting, screening, and “looks busy” noise need the heaviest shrinkage.

